import log from "encore.dev/log";
import { musicDB } from "../db";
import type { Genre, Pattern } from "../types";

export interface PatternContext {
  currentProject: {
    genre: Genre;
    bpm?: number;
    keySignature?: string;
    existingPatterns: string[];
    complexity?: string;
  };
  userPreferences: {
    favoritePatterns: string[];
    culturalAuthenticity?: string;
    skillLevel?: string;
  };
  creativeGoal?: 'learning' | 'production' | 'experimentation';
}

export interface PatternRecommendation {
  pattern: Pattern;
  relevanceScore: number;
  reasoning: string[];
  musicTheory: string;
  culturalContext: string;
  usageExample: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  complementaryPatterns: string[];
}

export interface RecommendationSet {
  primary: PatternRecommendation[];
  alternatives: PatternRecommendation[];
  progressive: PatternRecommendation[];
  culturallySignificant: PatternRecommendation[];
}

export class IntelligentPatternRecommender {
  private patternUsageHistory: Map<string, number> = new Map();
  private patternSuccessRates: Map<string, number> = new Map();
  private userPatternPreferences: Map<string, Set<string>> = new Map();

  async getRecommendations(
    context: PatternContext,
    limit: number = 10
  ): Promise<RecommendationSet> {
    log.info('Generating pattern recommendations', {
      genre: context.currentProject.genre,
      bpm: context.currentProject.bpm,
      existingPatterns: context.currentProject.existingPatterns.length
    });

    const candidatePatterns = await this.fetchCandidatePatterns(context);
    
    const scoredPatterns = await this.scorePatterns(candidatePatterns, context);
    
    const sortedPatterns = scoredPatterns.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const primary = sortedPatterns.slice(0, Math.min(limit, sortedPatterns.length));

    const alternatives = sortedPatterns
      .filter(p => !primary.includes(p))
      .filter(p => this.isSimilarToAny(p, primary))
      .slice(0, 5);

    const progressive = this.getProgressiveRecommendations(primary, context);

    const culturallySignificant = sortedPatterns
      .filter(p => p.pattern.culturalSignificance && p.pattern.culturalSignificance >= 0.8)
      .slice(0, 5);

    return {
      primary,
      alternatives,
      progressive,
      culturallySignificant
    };
  }

  private async fetchCandidatePatterns(context: PatternContext): Promise<Pattern[]> {
    const { genre, bpm, keySignature } = context.currentProject;

    try {
      const query = `
        SELECT 
          id, name, category, genre, pattern_data, bpm, key_signature,
          bars, complexity, cultural_significance, description,
          usage_count, created_at
        FROM patterns
        WHERE genre = $1
        ${bpm ? 'AND bpm BETWEEN $2 AND $3' : ''}
        ${keySignature ? `AND key_signature = $${bpm ? 4 : 2}` : ''}
        ORDER BY usage_count DESC, cultural_significance DESC
        LIMIT 50
      `;

      const params: any[] = [genre];
      if (bpm) {
        params.push(bpm - 5, bpm + 5);
      }
      if (keySignature) {
        params.push(keySignature);
      }

      const rawPatterns = await musicDB.rawQueryAll<any>(query, ...params);

      return rawPatterns.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        genre: p.genre,
        patternData: p.pattern_data,
        bpm: p.bpm,
        keySignature: p.key_signature,
        bars: p.bars,
        complexity: p.complexity,
        culturalSignificance: p.cultural_significance,
        description: p.description,
        usageCount: p.usage_count,
        createdAt: p.created_at
      }));

    } catch (error) {
      log.error('Failed to fetch candidate patterns', {
        error: (error as Error).message
      });
      return [];
    }
  }

  private async scorePatterns(
    patterns: Pattern[],
    context: PatternContext
  ): Promise<PatternRecommendation[]> {
    return patterns.map(pattern => {
      const scores = {
        genreMatch: this.scoreGenreMatch(pattern, context),
        bpmCompatibility: this.scoreBpmCompatibility(pattern, context),
        keyCompatibility: this.scoreKeyCompatibility(pattern, context),
        complexityFit: this.scoreComplexityFit(pattern, context),
        culturalRelevance: this.scoreCulturalRelevance(pattern, context),
        novelty: this.scoreNovelty(pattern, context),
        userPreference: this.scoreUserPreference(pattern, context),
        complementarity: this.scoreComplementarity(pattern, context)
      };

      const weights = {
        genreMatch: 0.25,
        bpmCompatibility: 0.15,
        keyCompatibility: 0.15,
        complexityFit: 0.10,
        culturalRelevance: 0.15,
        novelty: 0.05,
        userPreference: 0.10,
        complementarity: 0.05
      };

      const relevanceScore = Object.entries(scores).reduce(
        (total, [key, score]) => total + score * weights[key as keyof typeof weights],
        0
      );

      const reasoning = this.generateReasoning(scores, pattern, context);
      const musicTheory = this.generateMusicTheory(pattern);
      const culturalContext = this.generateCulturalContext(pattern);
      const usageExample = this.generateUsageExample(pattern);
      const difficulty = this.assessDifficulty(pattern);
      const complementaryPatterns = this.findComplementaryPatterns(pattern, patterns);

      return {
        pattern,
        relevanceScore,
        reasoning,
        musicTheory,
        culturalContext,
        usageExample,
        difficulty,
        complementaryPatterns
      };
    });
  }

  private scoreGenreMatch(pattern: Pattern, context: PatternContext): number {
    if (pattern.genre === context.currentProject.genre) {
      return 1.0;
    }
    
    const genreCompatibility: Record<string, string[]> = {
      'amapiano': ['private_school_amapiano'],
      'private_school_amapiano': ['amapiano']
    };

    const compatible = genreCompatibility[context.currentProject.genre] || [];
    if (compatible.includes(pattern.genre)) {
      return 0.7;
    }

    return 0.3;
  }

  private scoreBpmCompatibility(pattern: Pattern, context: PatternContext): number {
    if (!context.currentProject.bpm || !pattern.bpm) {
      return 0.5;
    }

    const bpmDiff = Math.abs(pattern.bpm - context.currentProject.bpm);
    
    if (bpmDiff <= 2) return 1.0;
    if (bpmDiff <= 5) return 0.8;
    if (bpmDiff <= 10) return 0.5;
    if (bpmDiff <= 20) return 0.3;
    
    return 0.1;
  }

  private scoreKeyCompatibility(pattern: Pattern, context: PatternContext): number {
    if (!context.currentProject.keySignature || !pattern.keySignature) {
      return 0.5;
    }

    if (pattern.keySignature === context.currentProject.keySignature) {
      return 1.0;
    }

    const relativeKeys: Record<string, string[]> = {
      'C': ['Am', 'F', 'G'],
      'Am': ['C', 'F', 'G'],
      'G': ['Em', 'C', 'D'],
      'D': ['Bm', 'G', 'A'],
      'A': ['F#m', 'D', 'E'],
      'E': ['C#m', 'A', 'B']
    };

    const related = relativeKeys[context.currentProject.keySignature] || [];
    if (related.includes(pattern.keySignature)) {
      return 0.7;
    }

    return 0.3;
  }

  private scoreComplexityFit(pattern: Pattern, context: PatternContext): number {
    if (!context.userPreferences.skillLevel) {
      return 0.5;
    }

    const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const patternComplexity = pattern.complexity || 'intermediate';
    const userSkill = context.userPreferences.skillLevel;

    const patternLevel = skillLevels.indexOf(patternComplexity);
    const userLevel = skillLevels.indexOf(userSkill);

    if (patternLevel === userLevel) return 1.0;
    if (Math.abs(patternLevel - userLevel) === 1) return 0.7;
    if (Math.abs(patternLevel - userLevel) === 2) return 0.4;
    
    return 0.2;
  }

  private scoreCulturalRelevance(pattern: Pattern, context: PatternContext): number {
    const culturalScore = pattern.culturalSignificance || 0.5;

    if (context.userPreferences.culturalAuthenticity === 'authentic') {
      return culturalScore;
    }

    return culturalScore * 0.7 + 0.3;
  }

  private scoreNovelty(pattern: Pattern, context: PatternContext): number {
    const isUsed = context.currentProject.existingPatterns.includes(pattern.id.toString());
    if (isUsed) return 0.0;

    const usageCount = pattern.usageCount || 0;
    
    if (usageCount < 10) return 1.0;
    if (usageCount < 50) return 0.7;
    if (usageCount < 100) return 0.5;
    
    return 0.3;
  }

  private scoreUserPreference(pattern: Pattern, context: PatternContext): number {
    const favorites = context.userPreferences.favoritePatterns || [];
    
    if (favorites.includes(pattern.id.toString())) {
      return 1.0;
    }

    if (favorites.length > 0) {
      return 0.5;
    }

    return 0.7;
  }

  private scoreComplementarity(pattern: Pattern, context: PatternContext): number {
    if (context.currentProject.existingPatterns.length === 0) {
      return 1.0;
    }

    return 0.8;
  }

  private generateReasoning(
    scores: Record<string, number>,
    pattern: Pattern,
    context: PatternContext
  ): string[] {
    const reasoning: string[] = [];

    if (scores.genreMatch >= 0.9) {
      reasoning.push(`Perfect genre match for ${context.currentProject.genre}`);
    }

    if (scores.bpmCompatibility >= 0.8 && context.currentProject.bpm) {
      reasoning.push(`BPM (${pattern.bpm}) closely matches your project (${context.currentProject.bpm})`);
    }

    if (scores.keyCompatibility >= 0.9 && context.currentProject.keySignature) {
      reasoning.push(`Same key signature (${pattern.keySignature}) ensures harmonic compatibility`);
    }

    if (scores.culturalRelevance >= 0.8) {
      reasoning.push(`Highly culturally significant pattern (${((pattern.culturalSignificance || 0) * 100).toFixed(0)}%)`);
    }

    if (scores.complexityFit >= 0.9) {
      reasoning.push(`Complexity level matches your skill (${context.userPreferences.skillLevel})`);
    }

    if (scores.novelty >= 0.9) {
      reasoning.push('Fresh pattern you haven\'t used before');
    }

    return reasoning;
  }

  private generateMusicTheory(pattern: Pattern): string {
    if (pattern.category === 'chord_progression') {
      return `This progression uses ${pattern.bars || 4} bars with ${pattern.complexity || 'intermediate'} harmonic complexity. ${pattern.description || ''}`;
    } else if (pattern.category === 'drum_pattern') {
      return `A ${pattern.complexity || 'intermediate'} drum pattern featuring ${pattern.description || 'rhythmic elements'}`;
    }
    
    return pattern.description || 'Musical pattern for creative use';
  }

  private generateCulturalContext(pattern: Pattern): string {
    const culturalScore = pattern.culturalSignificance || 0.5;

    if (culturalScore >= 0.9) {
      return 'Highly authentic pattern used in traditional amapiano productions. Preserves core cultural elements.';
    } else if (culturalScore >= 0.7) {
      return 'Culturally rooted pattern with modern adaptations. Balances tradition and innovation.';
    } else if (culturalScore >= 0.5) {
      return 'Contemporary pattern influenced by amapiano traditions.';
    }
    
    return 'Creative pattern for experimental productions.';
  }

  private generateUsageExample(pattern: Pattern): string {
    if (pattern.category === 'chord_progression') {
      return `Use this as your main harmonic foundation. Layer with log drums and bass to create the signature amapiano sound.`;
    } else if (pattern.category === 'drum_pattern') {
      return `Start with this drum pattern as your rhythmic backbone. Add piano chords and bass for a complete groove.`;
    }
    
    return `Incorporate this pattern into your arrangement for authentic ${pattern.genre} character.`;
  }

  private assessDifficulty(pattern: Pattern): PatternRecommendation['difficulty'] {
    const complexity = pattern.complexity || 'intermediate';
    
    if (complexity === 'simple') return 'beginner';
    if (complexity === 'intermediate') return 'intermediate';
    if (complexity === 'advanced') return 'advanced';
    if (complexity === 'expert') return 'expert';
    
    return 'intermediate';
  }

  private findComplementaryPatterns(pattern: Pattern, allPatterns: Pattern[]): string[] {
    const complementary: string[] = [];

    if (pattern.category === 'chord_progression') {
      const drumPatterns = allPatterns.filter(p => 
        p.category === 'drum_pattern' &&
        Math.abs((p.bpm || 0) - (pattern.bpm || 0)) <= 5
      );
      complementary.push(...drumPatterns.slice(0, 3).map(p => p.id.toString()));
    } else if (pattern.category === 'drum_pattern') {
      const chordPatterns = allPatterns.filter(p => 
        p.category === 'chord_progression' &&
        p.keySignature === pattern.keySignature
      );
      complementary.push(...chordPatterns.slice(0, 3).map(p => p.id.toString()));
    }

    return complementary;
  }

  private getProgressiveRecommendations(
    currentRecommendations: PatternRecommendation[],
    context: PatternContext
  ): PatternRecommendation[] {
    const difficulties: PatternRecommendation['difficulty'][] = 
      ['beginner', 'intermediate', 'advanced', 'expert'];
    
    const currentDifficulty = context.userPreferences.skillLevel || 'intermediate';
    const currentIndex = difficulties.indexOf(currentDifficulty as any);
    
    if (currentIndex < difficulties.length - 1) {
      const nextDifficulty = difficulties[currentIndex + 1];
      return currentRecommendations.filter(r => r.difficulty === nextDifficulty).slice(0, 3);
    }

    return [];
  }

  private isSimilarToAny(
    pattern: PatternRecommendation,
    patterns: PatternRecommendation[]
  ): boolean {
    return patterns.some(p => 
      p.pattern.category === pattern.pattern.category &&
      Math.abs((p.pattern.bpm || 0) - (pattern.pattern.bpm || 0)) <= 5 &&
      p.pattern.keySignature === pattern.pattern.keySignature
    );
  }

  async trackPatternUsage(patternId: string, success: boolean): Promise<void> {
    const currentUsage = this.patternUsageHistory.get(patternId) || 0;
    this.patternUsageHistory.set(patternId, currentUsage + 1);

    if (success) {
      const currentSuccess = this.patternSuccessRates.get(patternId) || 0;
      this.patternSuccessRates.set(patternId, currentSuccess + 1);
    }

    try {
      await musicDB.exec`
        UPDATE patterns
        SET usage_count = usage_count + 1
        WHERE id = ${parseInt(patternId)}
      `;
    } catch (error) {
      log.warn('Failed to update pattern usage count', {
        patternId,
        error: (error as Error).message
      });
    }
  }

  getRecommenderStatistics() {
    return {
      totalPatternsTracked: this.patternUsageHistory.size,
      totalUsageEvents: Array.from(this.patternUsageHistory.values()).reduce((a, b) => a + b, 0),
      averageSuccessRate: this.calculateAverageSuccessRate(),
      topPatterns: this.getTopPatterns(10)
    };
  }

  private calculateAverageSuccessRate(): number {
    if (this.patternUsageHistory.size === 0) return 0;

    const totalSuccess = Array.from(this.patternSuccessRates.values()).reduce((a, b) => a + b, 0);
    const totalUsage = Array.from(this.patternUsageHistory.values()).reduce((a, b) => a + b, 0);

    return totalUsage > 0 ? totalSuccess / totalUsage : 0;
  }

  private getTopPatterns(limit: number): Array<{ patternId: string; usage: number; successRate: number }> {
    const patterns = Array.from(this.patternUsageHistory.entries())
      .map(([patternId, usage]) => ({
        patternId,
        usage,
        successRate: (this.patternSuccessRates.get(patternId) || 0) / usage
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);

    return patterns;
  }
}

export const patternRecommender = new IntelligentPatternRecommender();
