import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { secret } from "encore.dev/config";
import { OpenAI } from "openai";
import { auraXCore } from "./encore.service";
import type { AuraXContext } from "./aura-x/types";
import log from "encore.dev/log";

const openAIKey = secret("OpenAIKey");

export interface EducationalContent {
  id: number;
  title: string;
  description: string;
  type: 'tutorial' | 'lesson' | 'tip' | 'cultural_insight' | 'technique';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: 'production' | 'cultural_history' | 'music_theory' | 'mixing' | 'arrangement';
  content: string;
  audioExamples?: string[];
  videoUrl?: string;
  tags: string[];
  estimatedTimeMinutes: number;
  prerequisites?: string[];
  learningObjectives: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPath {
  id: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalLessons: number;
  estimatedHours: number;
  contents: EducationalContent[];
  prerequisites?: string[];
  outcomes: string[];
}

export interface CulturalInsight {
  id: number;
  title: string;
  description: string;
  culturalContext: string;
  musicalElements: string[];
  historicalBackground: string;
  modernRelevance: string;
  audioExamples: string[];
  relatedGenres: string[];
  keyFigures: string[];
  createdAt: Date;
}

export interface InteractiveTutorial {
  id: number;
  title: string;
  description: string;
  steps: TutorialStep[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  estimatedTime: number;
  completionRate: number;
}

export interface TutorialStep {
  id: number;
  title: string;
  instruction: string;
  actionType: 'click' | 'drag' | 'input' | 'listen' | 'observe';
  targetElement?: string;
  expectedResult: string;
  hints: string[];
  audioDemo?: string;
  videoDemo?: string;
}

export interface UserProgress {
  userId: string;
  completedTutorials: number[];
  completedLessons: number[];
  currentLearningPaths: number[];
  skillLevels: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
  totalTimeSpent: number;
  achievements: string[];
  lastActivity: Date;
}

export class EducationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: openAIKey() });
  }

  async generateEducationalContent(
    topic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    category: 'production' | 'cultural_history' | 'music_theory' | 'mixing' | 'arrangement'
  ): Promise<EducationalContent> {
    try {
      log.info("Generating educational content", { topic, difficulty, category });

      // AURA-X: Use Educational Framework for adaptive content generation
      let auraXContent = null;
      try {
        log.info("Using AURA-X Educational Framework for adaptive content");
        const auraXContext: AuraXContext = {
          culture: {
            region: 'south_africa',
            musicGenre: 'amapiano',
            authenticity: 'traditional',
            language: 'english'
          },
          user: {
            id: 'learner_' + Date.now(),
            role: 'student',
            skillLevel: difficulty === 'expert' ? 'expert' : difficulty,
            preferences: {}
          },
          session: {
            sessionId: `education_${Date.now()}`,
            educationalPath: topic,
            currentContext: 'education'
          }
        };

        auraXCore.updateContext(auraXContext);

        auraXContent = await auraXCore.executeModuleOperation(
          'educational_framework',
          'recommend_content',
          { context: auraXContext }
        );
        
        log.info("AURA-X educational recommendations received", {
          recommendationsCount: auraXContent?.recommendations?.length || 0
        });
      } catch (error) {
        log.warn("AURA-X educational framework unavailable, using standard generation", { 
          error: (error as Error).message 
        });
      }

      const prompt = `
        Create comprehensive educational content about ${topic} in the context of Amapiano music production.
        
        Target difficulty: ${difficulty}
        Category: ${category}
        
        ${auraXContent?.culturalContext ? `Cultural Context from AURA-X: ${auraXContent.culturalContext}` : ''}
        
        Focus on:
        - Cultural authenticity and respect for South African musical traditions
        - Practical application in modern music production
        - Historical context and cultural significance
        - Technical skills and music theory relevant to Amapiano
        - Real-world examples and applications
        
        The content should be engaging, culturally sensitive, and practically useful for music producers.
        Include specific techniques, cultural insights, and learning objectives.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in Amapiano music production and education. Generate educational content in JSON format matching the requested schema." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("AI returned empty content.");
      }

      const result = { object: JSON.parse(content) };

      // Store in database
      const contentResult = await musicDB.queryRow<{ id: number; created_at: Date }>`
        INSERT INTO educational_content (
          title, description, type, difficulty, category,
          content, tags, estimated_time_minutes, prerequisites,
          learning_objectives, created_at, updated_at
        ) VALUES (
          ${result.object.title},
          ${result.object.description},
          ${'tutorial'},
          ${result.object.difficulty},
          ${result.object.category},
          ${result.object.content},
          ${JSON.stringify(result.object.tags)},
          ${result.object.estimatedTimeMinutes},
          ${JSON.stringify(result.object.prerequisites || [])},
          ${JSON.stringify(result.object.learningObjectives)},
          NOW(),
          NOW()
        )
        RETURNING id, created_at
      `;

      if (!contentResult) {
        throw new Error("Failed to store educational content");
      }

      log.info("Educational content generated and stored", { 
        contentId: contentResult.id,
        topic 
      });

      return {
        id: contentResult.id,
        title: result.object.title,
        description: result.object.description,
        type: 'tutorial',
        difficulty: result.object.difficulty,
        category: result.object.category,
        content: result.object.content,
        tags: result.object.tags,
        estimatedTimeMinutes: result.object.estimatedTimeMinutes,
        prerequisites: result.object.prerequisites,
        learningObjectives: result.object.learningObjectives,
        createdAt: contentResult.created_at,
        updatedAt: contentResult.created_at
      };

    } catch (error) {
      log.error("Failed to generate educational content", { 
        error: (error as Error).message,
        topic 
      });
      throw APIError.internal("Failed to generate educational content");
    }
  }

  async generateCulturalInsight(topic: string): Promise<CulturalInsight> {
    try {
      log.info("Generating cultural insight", { topic });

      const prompt = `
        Create a comprehensive cultural insight about ${topic} in relation to Amapiano music and South African musical traditions.
        
        Include:
        - Deep cultural context and significance
        - Musical elements and characteristics
        - Historical background and evolution
        - Modern relevance and adaptation
        - Related genres and influences
        - Key figures and contributors
        
        Ensure cultural sensitivity and accuracy. Draw from authentic South African musical traditions,
        gospel influences, jazz heritage, and township music history.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in Amapiano music and South African cultural traditions. Generate cultural insights in JSON format matching the requested schema." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("AI returned empty content.");
      }

      const result = { object: JSON.parse(content) };

      // Store in database
      const insightResult = await musicDB.queryRow<{ id: number; created_at: Date }>`
        INSERT INTO cultural_insights (
          title, description, cultural_context, musical_elements,
          historical_background, modern_relevance, related_genres,
          key_figures, created_at
        ) VALUES (
          ${result.object.title},
          ${result.object.description},
          ${result.object.culturalContext},
          ${JSON.stringify(result.object.musicalElements)},
          ${result.object.historicalBackground},
          ${result.object.modernRelevance},
          ${JSON.stringify(result.object.relatedGenres)},
          ${JSON.stringify(result.object.keyFigures)},
          NOW()
        )
        RETURNING id, created_at
      `;

      if (!insightResult) {
        throw new Error("Failed to store cultural insight");
      }

      log.info("Cultural insight generated and stored", { 
        insightId: insightResult.id,
        topic 
      });

      return {
        id: insightResult.id,
        title: result.object.title,
        description: result.object.description,
        culturalContext: result.object.culturalContext,
        musicalElements: result.object.musicalElements,
        historicalBackground: result.object.historicalBackground,
        modernRelevance: result.object.modernRelevance,
        audioExamples: [], // To be populated with actual audio examples
        relatedGenres: result.object.relatedGenres,
        keyFigures: result.object.keyFigures,
        createdAt: insightResult.created_at
      };

    } catch (error) {
      log.error("Failed to generate cultural insight", { 
        error: (error as Error).message,
        topic 
      });
      throw APIError.internal("Failed to generate cultural insight");
    }
  }

  async createLearningPath(
    title: string,
    description: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    contentIds: number[]
  ): Promise<LearningPath> {
    try {
      // Get content details
      const contents = await musicDB.queryAll<EducationalContent>`
        SELECT * FROM educational_content 
        WHERE id = ANY(${contentIds})
        ORDER BY difficulty, estimated_time_minutes
      `;

      const totalTime = contents.reduce((sum, content) => sum + content.estimatedTimeMinutes, 0);
      const estimatedHours = Math.ceil(totalTime / 60);

      // Generate learning outcomes based on content
      const outcomes = await this.generateLearningOutcomes(contents);

      // Store learning path
      const pathResult = await musicDB.queryRow<{ id: number }>`
        INSERT INTO learning_paths (
          title, description, difficulty, total_lessons,
          estimated_hours, content_ids, outcomes, created_at
        ) VALUES (
          ${title},
          ${description},
          ${difficulty},
          ${contents.length},
          ${estimatedHours},
          ${JSON.stringify(contentIds)},
          ${JSON.stringify(outcomes)},
          NOW()
        )
        RETURNING id
      `;

      if (!pathResult) {
        throw new Error("Failed to create learning path");
      }

      log.info("Learning path created", { 
        pathId: pathResult.id,
        title,
        totalLessons: contents.length 
      });

      return {
        id: pathResult.id,
        title,
        description,
        difficulty,
        totalLessons: contents.length,
        estimatedHours,
        contents,
        outcomes
      };

    } catch (error) {
      log.error("Failed to create learning path", { 
        error: (error as Error).message,
        title 
      });
      throw APIError.internal("Failed to create learning path");
    }
  }

  private async generateLearningOutcomes(contents: EducationalContent[]): Promise<string[]> {
    try {
      const prompt = `
        Based on these educational contents, generate specific learning outcomes that students will achieve:
        
        ${contents.map(c => `- ${c.title}: ${c.description}`).join('\n')}
        
        Create 5-8 clear, measurable learning outcomes that describe what students will be able to do
        after completing this learning path.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in Amapiano music education. Generate clear learning outcomes based on the content provided." },
          { role: "user", content: prompt }
        ],
      });

      const result = { text: completion.choices[0].message.content || "" };

      // Parse outcomes from the response
      const outcomes = result.text
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim())
        .filter(outcome => outcome.length > 0);

      return outcomes;

    } catch (error) {
      log.warn("Failed to generate learning outcomes, using default", { error: (error as Error).message });
      
      return [
        "Understand core Amapiano production techniques",
        "Apply cultural authenticity principles in music creation",
        "Master professional mixing and arrangement skills",
        "Develop appreciation for South African musical heritage"
      ];
    }
  }
}

// Create singleton instance
const educationService = new EducationService();

// API endpoints
export const generateTutorial = api(
  { expose: true, method: "POST", path: "/education/generate-tutorial" },
  async ({ 
    topic, 
    difficulty, 
    category 
  }: { 
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: 'production' | 'cultural_history' | 'music_theory' | 'mixing' | 'arrangement';
  }): Promise<EducationalContent> => {
    return await educationService.generateEducationalContent(topic, difficulty, category);
  }
);

export const generateCulturalInsight = api(
  { expose: true, method: "POST", path: "/education/generate-insight" },
  async ({ topic }: { topic: string }): Promise<CulturalInsight> => {
    return await educationService.generateCulturalInsight(topic);
  }
);

export const createLearningPath = api(
  { expose: true, method: "POST", path: "/education/learning-paths" },
  async ({ 
    title, 
    description, 
    difficulty, 
    contentIds 
  }: { 
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    contentIds: number[];
  }): Promise<LearningPath> => {
    return await educationService.createLearningPath(title, description, difficulty, contentIds);
  }
);

export const getEducationalContent = api(
  { expose: true, method: "GET", path: "/education/content" },
  async ({ 
    category, 
    difficulty, 
    limit = 20, 
    offset = 0 
  }: { 
    category?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ content: EducationalContent[]; total: number }> => {
    try {
      let whereClause = "1=1";
      const params: any[] = [];

      if (category) {
        whereClause += ` AND category = $${params.length + 1}`;
        params.push(category);
      }

      if (difficulty) {
        whereClause += ` AND difficulty = $${params.length + 1}`;
        params.push(difficulty);
      }

      const content = await musicDB.queryAll<EducationalContent>`
        SELECT * FROM educational_content 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await musicDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count FROM educational_content 
        WHERE ${whereClause}
      `;

      return {
        content,
        total: countResult?.count || 0
      };

    } catch (error) {
      log.error("Failed to get educational content", { error: (error as Error).message });
      throw APIError.internal("Failed to get educational content");
    }
  }
);

export const getLearningPaths = api(
  { expose: true, method: "GET", path: "/education/learning-paths" },
  async ({ 
    difficulty, 
    limit = 10, 
    offset = 0 
  }: { 
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ paths: LearningPath[]; total: number }> => {
    try {
      let whereClause = "1=1";
      const params: any[] = [];

      if (difficulty) {
        whereClause += ` AND difficulty = $${params.length + 1}`;
        params.push(difficulty);
      }

      const pathsData = await musicDB.queryAll<{
        id: number;
        title: string;
        description: string;
        difficulty: string;
        total_lessons: number;
        estimated_hours: number;
        content_ids: string;
        outcomes: string;
      }>`
        SELECT * FROM learning_paths 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Get content for each path
      const paths: LearningPath[] = await Promise.all(
        pathsData.map(async (pathData) => {
          const contentIds = JSON.parse(pathData.content_ids);
          const contents = await musicDB.queryAll<EducationalContent>`
            SELECT * FROM educational_content 
            WHERE id = ANY(${contentIds})
            ORDER BY difficulty, estimated_time_minutes
          `;

          return {
            id: pathData.id,
            title: pathData.title,
            description: pathData.description,
            difficulty: pathData.difficulty as any,
            totalLessons: pathData.total_lessons,
            estimatedHours: pathData.estimated_hours,
            contents,
            outcomes: JSON.parse(pathData.outcomes)
          };
        })
      );

      const countResult = await musicDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count FROM learning_paths 
        WHERE ${whereClause}
      `;

      return {
        paths,
        total: countResult?.count || 0
      };

    } catch (error) {
      log.error("Failed to get learning paths", { error: (error as Error).message });
      throw APIError.internal("Failed to get learning paths");
    }
  }
);

export const getCulturalInsights = api(
  { expose: true, method: "GET", path: "/education/cultural-insights" },
  async ({ 
    limit = 20, 
    offset = 0 
  }: { 
    limit?: number;
    offset?: number;
  }): Promise<{ insights: CulturalInsight[]; total: number }> => {
    try {
      const insights = await musicDB.queryAll<{
        id: number;
        title: string;
        description: string;
        cultural_context: string;
        musical_elements: string;
        historical_background: string;
        modern_relevance: string;
        related_genres: string;
        key_figures: string;
        created_at: Date;
      }>`
        SELECT * FROM cultural_insights 
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const formattedInsights: CulturalInsight[] = insights.map(insight => ({
        id: insight.id,
        title: insight.title,
        description: insight.description,
        culturalContext: insight.cultural_context,
        musicalElements: JSON.parse(insight.musical_elements),
        historicalBackground: insight.historical_background,
        modernRelevance: insight.modern_relevance,
        audioExamples: [], // To be populated with actual audio examples
        relatedGenres: JSON.parse(insight.related_genres),
        keyFigures: JSON.parse(insight.key_figures),
        createdAt: insight.created_at
      }));

      const countResult = await musicDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count FROM cultural_insights
      `;

      return {
        insights: formattedInsights,
        total: countResult?.count || 0
      };

    } catch (error) {
      log.error("Failed to get cultural insights", { error: (error as Error).message });
      throw APIError.internal("Failed to get cultural insights");
    }
  }
);

// Built-in tutorial content
export const initializeBuiltinContent = api(
  { expose: true, method: "POST", path: "/education/initialize" },
  async (): Promise<{ message: string; contentCount: number }> => {
    try {
      const builtinTopics = [
        { topic: "Log Drum Programming", difficulty: "beginner" as const, category: "production" as const },
        { topic: "Amapiano Chord Progressions", difficulty: "intermediate" as const, category: "music_theory" as const },
        { topic: "Cultural Authenticity in Modern Production", difficulty: "intermediate" as const, category: "cultural_history" as const },
        { topic: "Professional Amapiano Mixing Techniques", difficulty: "advanced" as const, category: "mixing" as const },
        { topic: "South African Musical Heritage", difficulty: "beginner" as const, category: "cultural_history" as const }
      ];

      const createdContent = await Promise.all(
        builtinTopics.map(({ topic, difficulty, category }) =>
          educationService.generateEducationalContent(topic, difficulty, category)
        )
      );

      // Generate some cultural insights
      const culturalTopics = [
        "Township Jazz Influence on Amapiano",
        "Gospel Traditions in South African House Music",
        "The Evolution of Amapiano from Kwaito"
      ];

      const createdInsights = await Promise.all(
        culturalTopics.map(topic => educationService.generateCulturalInsight(topic))
      );

      log.info("Built-in educational content initialized", { 
        tutorialCount: createdContent.length,
        insightCount: createdInsights.length 
      });

      return {
        message: "Built-in educational content initialized successfully",
        contentCount: createdContent.length + createdInsights.length
      };

    } catch (error) {
      log.error("Failed to initialize built-in content", { error: (error as Error).message });
      throw APIError.internal("Failed to initialize built-in content");
    }
  }
);