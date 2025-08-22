import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { generatedTracks } from "./storage";
import type { Genre, Mood } from "./types";

export interface GenerateTrackRequest {
  prompt: string;
  genre: Genre;
  mood?: Mood;
  bpm?: number;
  keySignature?: string;
  duration?: number;
  sourceAnalysisId?: number;
  advancedOptions?: {
    arrangement?: "minimal" | "standard" | "complex";
    instrumentation?: string[];
    mixingStyle?: "raw" | "polished" | "vintage";
    energyLevel?: "low" | "medium" | "high";
    culturalAuthenticity?: "traditional" | "modern" | "fusion";
  };
}

export interface GenerateTrackResponse {
  id: number;
  audioUrl: string;
  stems: {
    drums: string;
    bass: string;
    piano: string;
    other: string;
  };
  metadata: {
    bpm: number;
    keySignature: string;
    duration: number;
    arrangement: string;
    instrumentation: string[];
    qualityScore: number;
  };
  processingTime: number;
  generationDetails: {
    promptAnalysis: string;
    styleCharacteristics: string[];
    technicalSpecs: {
      sampleRate: number;
      bitDepth: number;
      format: string;
    };
  };
}

// Enhanced track generation with advanced options and better quality
export const generateTrack = api<GenerateTrackRequest, GenerateTrackResponse>(
  { expose: true, method: "POST", path: "/generate/track" },
  async (req) => {
    const startTime = Date.now();
    
    // Enhanced input validation
    if (!req.prompt || req.prompt.trim().length === 0) {
      throw APIError.invalidArgument("Prompt is required");
    }

    if (req.prompt.length > 1000) {
      throw APIError.invalidArgument("Prompt must be less than 1000 characters");
    }

    if (req.bpm && (req.bpm < 80 || req.bpm > 160)) {
      throw APIError.invalidArgument("BPM must be between 80 and 160");
    }

    if (req.duration && (req.duration < 30 || req.duration > 600)) {
      throw APIError.invalidArgument("Duration must be between 30 and 600 seconds");
    }

    // Validate advanced options
    if (req.advancedOptions?.instrumentation) {
      const validInstruments = [
        'log_drum', 'piano', 'bass', 'vocals', 'saxophone', 'guitar', 
        'synth', 'percussion', 'strings', 'brass', 'flute', 'violin'
      ];
      const invalidInstruments = req.advancedOptions.instrumentation.filter(
        inst => !validInstruments.includes(inst)
      );
      if (invalidInstruments.length > 0) {
        throw APIError.invalidArgument(
          `Invalid instruments: ${invalidInstruments.join(', ')}. Valid options: ${validInstruments.join(', ')}`
        );
      }
    }

    try {
      // Enhanced source analysis integration
      let sourceData = null;
      if (req.sourceAnalysisId) {
        const analysis = await musicDB.queryRow<{
          id: number;
          analysis_data: any;
        }>`
          SELECT id, analysis_data FROM audio_analysis WHERE id = ${req.sourceAnalysisId}
        `;
        
        if (analysis) {
          sourceData = analysis.analysis_data;
          console.log(`Generating track based on analysis ID: ${req.sourceAnalysisId}`);
        }
      }

      const trackId = Math.floor(Math.random() * 1000000);
      const audioFileName = `generated_${trackId}.wav`;
      
      // Enhanced stem generation with better organization
      const stemsData = {
        drums: `stems/${trackId}_drums.wav`,
        bass: `stems/${trackId}_bass.wav`,
        piano: `stems/${trackId}_piano.wav`,
        other: `stems/${trackId}_other.wav`
      };

      // Generate mock audio data with enhanced metadata
      const mockAudioBuffer = Buffer.from("mock high-quality audio data for track generation");
      await generatedTracks.upload(audioFileName, mockAudioBuffer);

      // Upload enhanced mock stem files
      const mockStemBuffer = Buffer.from("mock high-quality stem data");
      for (const stemFile of Object.values(stemsData)) {
        await generatedTracks.upload(stemFile, mockStemBuffer);
      }

      // Enhanced BPM logic based on genre and source
      let finalBpm = req.bpm || 120;
      if (sourceData && !req.bpm) {
        finalBpm = sourceData.bpm;
      } else if (!req.bpm) {
        // Genre-appropriate BPM ranges
        if (req.genre === "private_school_amapiano") {
          finalBpm = Math.floor(Math.random() * 15) + 105; // 105-120
        } else {
          finalBpm = Math.floor(Math.random() * 15) + 110; // 110-125
        }
      }

      // Enhanced key signature logic
      let finalKey = req.keySignature || "C";
      if (sourceData && !req.keySignature) {
        finalKey = sourceData.keySignature;
      } else if (!req.keySignature) {
        const commonKeys = req.genre === "private_school_amapiano" 
          ? ["Dm", "Am", "Gm", "Fm", "Bb", "Eb"]
          : ["C", "F", "G", "Am", "Dm", "Em"];
        finalKey = commonKeys[Math.floor(Math.random() * commonKeys.length)];
      }

      // Enhanced arrangement and instrumentation
      const arrangement = req.advancedOptions?.arrangement || "standard";
      const defaultInstrumentation = req.genre === "private_school_amapiano"
        ? ["piano", "log_drum", "bass", "saxophone", "percussion"]
        : ["piano", "log_drum", "bass", "vocals", "percussion"];
      
      const instrumentation = req.advancedOptions?.instrumentation || defaultInstrumentation;

      // Prompt analysis for better generation
      const promptAnalysis = analyzePrompt(req.prompt, req.genre);
      
      // Style characteristics based on genre and prompt
      const styleCharacteristics = generateStyleCharacteristics(req.genre, req.mood, promptAnalysis);

      // Quality score based on various factors
      const qualityScore = calculateQualityScore(req, sourceData);

      // Store enhanced track data in database
      await musicDB.exec`
        INSERT INTO generated_tracks (
          prompt, 
          genre, 
          mood, 
          bpm, 
          key_signature, 
          file_url, 
          stems_data, 
          source_analysis_id,
          processing_time_ms,
          transformation_type,
          quality_rating
        )
        VALUES (
          ${req.prompt}, 
          ${req.genre}, 
          ${req.mood || null}, 
          ${finalBpm}, 
          ${finalKey}, 
          ${audioFileName}, 
          ${JSON.stringify(stemsData)}, 
          ${req.sourceAnalysisId || null},
          ${Date.now() - startTime},
          ${sourceData ? "remix" : "original"},
          ${qualityScore}
        )
      `;

      const processingTime = Date.now() - startTime;
      const audioUrl = generatedTracks.publicUrl(audioFileName);

      return {
        id: trackId,
        audioUrl,
        stems: {
          drums: generatedTracks.publicUrl(stemsData.drums),
          bass: generatedTracks.publicUrl(stemsData.bass),
          piano: generatedTracks.publicUrl(stemsData.piano),
          other: generatedTracks.publicUrl(stemsData.other)
        },
        metadata: {
          bpm: finalBpm,
          keySignature: finalKey,
          duration: req.duration || 180,
          arrangement,
          instrumentation,
          qualityScore
        },
        processingTime,
        generationDetails: {
          promptAnalysis,
          styleCharacteristics,
          technicalSpecs: {
            sampleRate: 44100,
            bitDepth: 24,
            format: "WAV"
          }
        }
      };
    } catch (error) {
      console.error("Track generation error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to generate track");
    }
  }
);

export interface GenerateLoopRequest {
  category: "log_drum" | "piano" | "percussion" | "bass";
  genre: Genre;
  bpm?: number;
  bars?: number;
  keySignature?: string;
  complexity?: "simple" | "intermediate" | "advanced";
  style?: string;
}

export interface GenerateLoopResponse {
  id: number;
  audioUrl: string;
  metadata: {
    category: string;
    bpm: number;
    bars: number;
    keySignature: string;
    complexity: string;
    style: string;
    qualityScore: number;
  };
  processingTime: number;
  loopDetails: {
    pattern: string;
    characteristics: string[];
    technicalSpecs: {
      sampleRate: number;
      bitDepth: number;
      format: string;
    };
  };
}

// Enhanced loop generation with better categorization and quality
export const generateLoop = api<GenerateLoopRequest, GenerateLoopResponse>(
  { expose: true, method: "POST", path: "/generate/loop" },
  async (req) => {
    const startTime = Date.now();
    
    // Enhanced validation
    if (req.bpm && (req.bpm < 80 || req.bpm > 160)) {
      throw APIError.invalidArgument("BPM must be between 80 and 160");
    }

    if (req.bars && (req.bars < 1 || req.bars > 16)) {
      throw APIError.invalidArgument("Bars must be between 1 and 16");
    }

    const validComplexities = ["simple", "intermediate", "advanced"];
    if (req.complexity && !validComplexities.includes(req.complexity)) {
      throw APIError.invalidArgument(`Complexity must be one of: ${validComplexities.join(', ')}`);
    }

    try {
      const loopId = Math.floor(Math.random() * 1000000);
      const fileName = `loop_${req.category}_${loopId}.wav`;

      // Enhanced BPM logic for loops
      const finalBpm = req.bpm || (req.genre === "private_school_amapiano" ? 112 : 118);
      const finalBars = req.bars || 4;
      const finalKey = req.keySignature || "C";
      const complexity = req.complexity || "intermediate";

      // Generate style based on category and genre
      const style = generateLoopStyle(req.category, req.genre, complexity);

      // Generate pattern description
      const pattern = generatePatternDescription(req.category, complexity, req.genre);

      // Generate characteristics
      const characteristics = generateLoopCharacteristics(req.category, req.genre, complexity);

      // Calculate quality score
      const qualityScore = 0.85 + (Math.random() * 0.15); // 0.85-1.0

      // Generate mock loop data with enhanced metadata
      const mockLoopBuffer = Buffer.from(`mock high-quality loop data for ${req.category}`);
      await generatedTracks.upload(fileName, mockLoopBuffer);

      const processingTime = Date.now() - startTime;
      const audioUrl = generatedTracks.publicUrl(fileName);

      return {
        id: loopId,
        audioUrl,
        metadata: {
          category: req.category,
          bpm: finalBpm,
          bars: finalBars,
          keySignature: finalKey,
          complexity,
          style,
          qualityScore
        },
        processingTime,
        loopDetails: {
          pattern,
          characteristics,
          technicalSpecs: {
            sampleRate: 44100,
            bitDepth: 24,
            format: "WAV"
          }
        }
      };
    } catch (error) {
      console.error("Loop generation error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to generate loop");
    }
  }
);

export interface GetGenerationHistoryRequest {
  limit?: number;
  genre?: Genre;
  sortBy?: "date" | "quality" | "duration";
  sortOrder?: "asc" | "desc";
  filterBy?: {
    hasSourceAnalysis?: boolean;
    minQuality?: number;
    transformationType?: "original" | "remix" | "amapianorize";
  };
}

export interface GetGenerationHistoryResponse {
  tracks: Array<{
    id: number;
    prompt: string;
    genre: Genre;
    mood?: string;
    bpm?: number;
    keySignature?: string;
    fileUrl?: string;
    qualityRating?: number;
    processingTime?: number;
    transformationType?: string;
    createdAt: Date;
  }>;
  totalCount: number;
  averageQuality: number;
  statistics: {
    totalGenerations: number;
    averageProcessingTime: number;
    genreDistribution: Record<Genre, number>;
  };
}

// Enhanced generation history with better filtering and statistics
export const getGenerationHistory = api<GetGenerationHistoryRequest, GetGenerationHistoryResponse>(
  { expose: true, method: "GET", path: "/generate/history" },
  async (req) => {
    let query = `SELECT id, prompt, genre, mood, bpm, key_signature, file_url, quality_rating, processing_time_ms, transformation_type, created_at FROM generated_tracks WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Enhanced filtering
    if (req.genre) {
      query += ` AND genre = $${paramIndex}`;
      params.push(req.genre);
      paramIndex++;
    }

    if (req.filterBy?.hasSourceAnalysis !== undefined) {
      if (req.filterBy.hasSourceAnalysis) {
        query += ` AND source_analysis_id IS NOT NULL`;
      } else {
        query += ` AND source_analysis_id IS NULL`;
      }
    }

    if (req.filterBy?.minQuality) {
      query += ` AND quality_rating >= $${paramIndex}`;
      params.push(req.filterBy.minQuality);
      paramIndex++;
    }

    if (req.filterBy?.transformationType) {
      query += ` AND transformation_type = $${paramIndex}`;
      params.push(req.filterBy.transformationType);
      paramIndex++;
    }

    // Enhanced sorting
    const sortBy = req.sortBy || "date";
    const sortOrder = req.sortOrder || "desc";
    
    switch (sortBy) {
      case "quality":
        query += ` ORDER BY quality_rating ${sortOrder.toUpperCase()}`;
        break;
      case "duration":
        query += ` ORDER BY processing_time_ms ${sortOrder.toUpperCase()}`;
        break;
      default:
        query += ` ORDER BY created_at ${sortOrder.toUpperCase()}`;
    }

    if (req.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(req.limit);
    } else {
      query += ` LIMIT 50`;
    }

    const tracks = await musicDB.rawQueryAll<{
      id: number;
      prompt: string;
      genre: Genre;
      mood?: string;
      bpm?: number;
      key_signature?: string;
      file_url?: string;
      quality_rating?: number;
      processing_time_ms?: number;
      transformation_type?: string;
      created_at: Date;
    }>(query, ...params);

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_generations,
        AVG(processing_time_ms) as avg_processing_time,
        AVG(quality_rating) as avg_quality
      FROM generated_tracks
    `;
    const stats = await musicDB.queryRow<{
      total_generations: number;
      avg_processing_time: number;
      avg_quality: number;
    }>(statsQuery);

    // Get genre distribution
    const genreDistQuery = `
      SELECT genre, COUNT(*) as count 
      FROM generated_tracks 
      GROUP BY genre
    `;
    const genreResults = await musicDB.queryAll<{genre: Genre, count: number}>(genreDistQuery);
    const genreDistribution = genreResults.reduce((acc, row) => {
      acc[row.genre] = row.count;
      return acc;
    }, {} as Record<Genre, number>);

    return {
      tracks: tracks.map(track => ({
        id: track.id,
        prompt: track.prompt,
        genre: track.genre,
        mood: track.mood,
        bpm: track.bpm,
        keySignature: track.key_signature,
        fileUrl: track.file_url,
        qualityRating: track.quality_rating,
        processingTime: track.processing_time_ms,
        transformationType: track.transformation_type,
        createdAt: track.created_at
      })),
      totalCount: stats?.total_generations || 0,
      averageQuality: Math.round((stats?.avg_quality || 0) * 100) / 100,
      statistics: {
        totalGenerations: stats?.total_generations || 0,
        averageProcessingTime: Math.round(stats?.avg_processing_time || 0),
        genreDistribution
      }
    };
  }
);

export interface GetGenerationStatsResponse {
  totalGenerations: number;
  generationsByGenre: Record<Genre, number>;
  generationsByMood: Record<string, number>;
  averageBpm: number;
  popularKeySignatures: Array<{key: string, count: number}>;
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  processingStats: {
    averageTime: number;
    fastestTime: number;
    slowestTime: number;
  };
  trendsOverTime: Array<{
    date: string;
    count: number;
    averageQuality: number;
  }>;
}

// Enhanced statistics with more detailed analytics
export const getGenerationStats = api<void, GetGenerationStatsResponse>(
  { expose: true, method: "GET", path: "/generate/stats" },
  async () => {
    // Get total count
    const totalResult = await musicDB.queryRow<{count: number}>`
      SELECT COUNT(*) as count FROM generated_tracks
    `;
    const totalGenerations = totalResult?.count || 0;

    // Get counts by genre
    const genreResults = await musicDB.queryAll<{genre: Genre, count: number}>`
      SELECT genre, COUNT(*) as count 
      FROM generated_tracks 
      GROUP BY genre
    `;
    const generationsByGenre = genreResults.reduce((acc, row) => {
      acc[row.genre] = row.count;
      return acc;
    }, {} as Record<Genre, number>);

    // Get counts by mood
    const moodResults = await musicDB.queryAll<{mood: string, count: number}>`
      SELECT mood, COUNT(*) as count 
      FROM generated_tracks 
      WHERE mood IS NOT NULL
      GROUP BY mood
    `;
    const generationsByMood = moodResults.reduce((acc, row) => {
      acc[row.mood] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Get average BPM
    const bpmResult = await musicDB.queryRow<{avg_bpm: number}>`
      SELECT AVG(bpm) as avg_bpm 
      FROM generated_tracks 
      WHERE bpm IS NOT NULL
    `;
    const averageBpm = Math.round(bpmResult?.avg_bpm || 120);

    // Get popular key signatures
    const keyResults = await musicDB.queryAll<{key_signature: string, count: number}>`
      SELECT key_signature, COUNT(*) as count
      FROM generated_tracks
      WHERE key_signature IS NOT NULL
      GROUP BY key_signature
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get quality distribution
    const qualityResults = await musicDB.queryAll<{quality_range: string, count: number}>`
      SELECT 
        CASE 
          WHEN quality_rating >= 0.8 THEN 'high'
          WHEN quality_rating >= 0.6 THEN 'medium'
          ELSE 'low'
        END as quality_range,
        COUNT(*) as count
      FROM generated_tracks
      WHERE quality_rating IS NOT NULL
      GROUP BY quality_range
    `;
    
    const qualityDistribution = qualityResults.reduce((acc, row) => {
      acc[row.quality_range as keyof typeof acc] = row.count;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    // Get processing statistics
    const processingStats = await musicDB.queryRow<{
      avg_time: number;
      min_time: number;
      max_time: number;
    }>`
      SELECT 
        AVG(processing_time_ms) as avg_time,
        MIN(processing_time_ms) as min_time,
        MAX(processing_time_ms) as max_time
      FROM generated_tracks
      WHERE processing_time_ms IS NOT NULL
    `;

    // Get trends over time (last 30 days)
    const trendsResults = await musicDB.queryAll<{
      date: string;
      count: number;
      avg_quality: number;
    }>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(quality_rating) as avg_quality
      FROM generated_tracks
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    return {
      totalGenerations,
      generationsByGenre,
      generationsByMood,
      averageBpm,
      popularKeySignatures: keyResults.map(row => ({
        key: row.key_signature,
        count: row.count
      })),
      qualityDistribution,
      processingStats: {
        averageTime: Math.round(processingStats?.avg_time || 0),
        fastestTime: processingStats?.min_time || 0,
        slowestTime: processingStats?.max_time || 0
      },
      trendsOverTime: trendsResults.map(row => ({
        date: row.date,
        count: row.count,
        averageQuality: Math.round((row.avg_quality || 0) * 100) / 100
      }))
    };
  }
);

// Helper functions for enhanced generation

function analyzePrompt(prompt: string, genre: Genre): string {
  const keywords = {
    energy: ['energetic', 'high-energy', 'upbeat', 'driving', 'powerful'],
    mood: ['chill', 'relaxed', 'mellow', 'soulful', 'emotional', 'deep'],
    instruments: ['piano', 'saxophone', 'guitar', 'drums', 'bass', 'vocals'],
    style: ['jazzy', 'sophisticated', 'raw', 'polished', 'traditional', 'modern']
  };

  const analysis = [];
  const lowerPrompt = prompt.toLowerCase();

  for (const [category, words] of Object.entries(keywords)) {
    const found = words.filter(word => lowerPrompt.includes(word));
    if (found.length > 0) {
      analysis.push(`${category}: ${found.join(', ')}`);
    }
  }

  return analysis.length > 0 ? analysis.join('; ') : 'General amapiano characteristics detected';
}

function generateStyleCharacteristics(genre: Genre, mood?: Mood, promptAnalysis?: string): string[] {
  const baseCharacteristics = genre === "private_school_amapiano" 
    ? ["Jazz-influenced harmonies", "Sophisticated chord progressions", "Subtle percussion"]
    : ["Deep log drums", "Soulful piano melodies", "Rhythmic percussion"];

  const moodCharacteristics = {
    chill: ["Relaxed tempo", "Smooth transitions"],
    energetic: ["Driving rhythm", "Dynamic arrangement"],
    soulful: ["Emotional depth", "Rich harmonies"],
    jazzy: ["Complex chords", "Improvised elements"],
    deep: ["Atmospheric pads", "Sub-bass emphasis"],
    mellow: ["Gentle dynamics", "Warm tones"]
  };

  if (mood && moodCharacteristics[mood]) {
    baseCharacteristics.push(...moodCharacteristics[mood]);
  }

  return baseCharacteristics;
}

function calculateQualityScore(req: GenerateTrackRequest, sourceData?: any): number {
  let score = 0.7; // Base score

  // Prompt quality
  if (req.prompt.length > 50) score += 0.1;
  if (req.prompt.includes('amapiano')) score += 0.05;

  // Advanced options
  if (req.advancedOptions) score += 0.1;

  // Source analysis bonus
  if (sourceData) score += 0.1;

  // Genre-specific bonus
  if (req.genre === "private_school_amapiano") score += 0.05;

  return Math.min(1.0, score);
}

function generateLoopStyle(category: string, genre: Genre, complexity: string): string {
  const styles = {
    log_drum: {
      amapiano: ["classic", "deep", "punchy"],
      private_school_amapiano: ["subtle", "refined", "minimal"]
    },
    piano: {
      amapiano: ["soulful", "gospel", "emotional"],
      private_school_amapiano: ["jazzy", "sophisticated", "complex"]
    },
    percussion: {
      amapiano: ["rhythmic", "driving", "traditional"],
      private_school_amapiano: ["textural", "ambient", "nuanced"]
    },
    bass: {
      amapiano: ["deep", "foundational", "groovy"],
      private_school_amapiano: ["walking", "melodic", "sophisticated"]
    }
  };

  const categoryStyles = styles[category as keyof typeof styles]?.[genre] || ["standard"];
  return categoryStyles[Math.floor(Math.random() * categoryStyles.length)];
}

function generatePatternDescription(category: string, complexity: string, genre: Genre): string {
  const patterns = {
    log_drum: {
      simple: "x-x-.-x-",
      intermediate: "x-x-.-x-x-.-x-.-",
      advanced: "x-x.x-x.x-x.x-x."
    },
    piano: {
      simple: "C-Am-F-G",
      intermediate: "Cmaj7-Am7-Fmaj7-G7",
      advanced: "Cmaj9-Am7add11-Fmaj7#11-G13sus4"
    },
    percussion: {
      simple: "x.x.x.x.",
      intermediate: "x.x.x.x.x.x.x.x.",
      advanced: "x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x."
    },
    bass: {
      simple: "C-C-F-G",
      intermediate: "C-E-F-G-A-G-F-E",
      advanced: "C-E-G-C-F-A-C-F-G-B-D-G"
    }
  };

  return patterns[category as keyof typeof patterns]?.[complexity] || "Standard pattern";
}

function generateLoopCharacteristics(category: string, genre: Genre, complexity: string): string[] {
  const baseCharacteristics = {
    log_drum: ["Deep resonance", "Rhythmic foundation"],
    piano: ["Harmonic richness", "Melodic expression"],
    percussion: ["Rhythmic texture", "Dynamic accents"],
    bass: ["Low-end foundation", "Groove support"]
  };

  const genreCharacteristics = genre === "private_school_amapiano"
    ? ["Sophisticated", "Refined", "Jazz-influenced"]
    : ["Traditional", "Soulful", "Energetic"];

  const complexityCharacteristics = {
    simple: ["Straightforward", "Easy to follow"],
    intermediate: ["Moderately complex", "Engaging"],
    advanced: ["Highly complex", "Intricate"]
  };

  return [
    ...baseCharacteristics[category as keyof typeof baseCharacteristics],
    ...genreCharacteristics,
    ...complexityCharacteristics[complexity]
  ];
}
