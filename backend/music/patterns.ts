import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import type { Genre, PatternCategory, Pattern } from "./types";
import log from "encore.dev/log";

export interface ListPatternsRequest {
  genre?: Genre;
  category?: PatternCategory;
  bpm?: number;
  keySignature?: string;
  complexity?: 'simple' | 'intermediate' | 'advanced' | 'expert';
  culturalAuthenticity?: 'traditional' | 'modern' | 'fusion';
  limit?: number;
  offset?: number;
}

export interface ListPatternsResponse {
  patterns: Pattern[];
  total: number;
  categories: Record<PatternCategory, number>;
}

export interface CreatePatternRequest {
  name: string;
  category: PatternCategory;
  genre: Genre;
  patternData: any;
  bpm?: number;
  keySignature?: string;
  bars?: number;
  complexity?: 'simple' | 'intermediate' | 'advanced' | 'expert';
  culturalSignificance?: string;
  description?: string;
  tags?: string[];
}

// Comprehensive authentic amapiano patterns
const BUILTIN_PATTERNS: Partial<Pattern>[] = [
  // Log Drum Patterns
  {
    name: "Classic Amapiano Log Drum Foundation",
    category: "drum_pattern",
    genre: "amapiano",
    patternData: {
      pattern: "x-.-x-x-.-x-.-x-",
      swing: 0.15,
      velocity: [100, 60, 85, 95, 60, 85, 60, 95],
      culturalOrigin: "Traditional South African log drum"
    },
    bpm: 115,
    keySignature: "Cm",
    bars: 4,
    complexity: "intermediate",
    culturalSignificance: "The foundational log drum pattern that defines amapiano's signature sound",
    description: "Traditional log drum pattern with characteristic syncopation and swing"
  },
  {
    name: "Advanced Log Drum Syncopation",
    category: "drum_pattern",
    genre: "amapiano",
    patternData: {
      pattern: "x-x.x-x.x-x.x-x.",
      swing: 0.18,
      velocity: [100, 65, 90, 70, 95, 65, 90, 70],
      fills: ["x-xx-x-x"]
    },
    bpm: 118,
    keySignature: "Fm",
    bars: 8,
    complexity: "advanced",
    culturalSignificance: "Complex syncopated pattern showing rhythmic sophistication",
    description: "Advanced log drum pattern with intricate syncopation and ghost notes"
  },
  {
    name: "Sparse Log Drum Minimalist",
    category: "drum_pattern",
    genre: "amapiano",
    patternData: {
      pattern: "x---x---x---x---",
      swing: 0.12,
      velocity: [100, 0, 0, 0, 95, 0, 0, 0],
      emphasis: "downbeats"
    },
    bpm: 112,
    keySignature: "Dm",
    bars: 2,
    complexity: "simple",
    culturalSignificance: "Minimalist approach emphasizing space and groove",
    description: "Sparse log drum pattern for minimalist arrangements"
  },

  // Chord Progressions (Gospel-influenced)
  {
    name: "Gospel Amapiano I-vi-IV-V",
    category: "chord_progression",
    genre: "amapiano",
    patternData: {
      chords: ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
      progression: "I-vi-IV-V",
      voicing: "gospel",
      extensions: [9, 7, 7, 'sus4']
    },
    bpm: 110,
    keySignature: "C",
    bars: 4,
    complexity: "intermediate",
    culturalSignificance: "Gospel-rooted progression central to amapiano's emotional depth",
    description: "Classic gospel-influenced progression with extended voicings"
  },
  {
    name: "Jazz-influenced ii-V-I-vi",
    category: "chord_progression",
    genre: "private_school_amapiano",
    patternData: {
      chords: ["Dm7", "G7", "Cmaj7", "Am7"],
      progression: "ii-V-I-vi",
      voicing: "jazz",
      extensions: [7, 7, 7, 7],
      substitutions: ["Dm9", "G13", "Cmaj9", "Am9"]
    },
    bpm: 112,
    keySignature: "C",
    bars: 4,
    complexity: "advanced",
    culturalSignificance: "Shows South African jazz influence in sophisticated amapiano",
    description: "Jazz-influenced progression with extended harmonies"
  },
  {
    name: "Descending IV-iii-ii-I",
    category: "chord_progression",
    genre: "amapiano",
    patternData: {
      chords: ["Fmaj7", "Em7", "Dm7", "Cmaj7"],
      progression: "IV-iii-ii-I",
      voicing: "soulful",
      extensions: [7, 7, 7, 7]
    },
    bpm: 115,
    keySignature: "C",
    bars: 4,
    complexity: "intermediate",
    culturalSignificance: "Descending progression common in South African jazz and gospel",
    description: "Soulful descending progression with smooth voice leading"
  },
  {
    name: "Modal Amapiano Am-G-F-E",
    category: "chord_progression",
    genre: "amapiano",
    patternData: {
      chords: ["Am7", "G7", "Fmaj7", "E7"],
      progression: "i-VII-VI-V",
      voicing: "modal",
      mode: "aeolian"
    },
    bpm: 118,
    keySignature: "Am",
    bars: 8,
    complexity: "advanced",
    culturalSignificance: "Modal harmony reflecting African musical traditions",
    description: "Modal progression with characteristic African harmonic movement"
  },

  // Bass Patterns
  {
    name: "Walking Bass Jazz Style",
    category: "bass_pattern",
    genre: "private_school_amapiano",
    patternData: {
      notes: ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3"],
      rhythm: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      swing: 0.1,
      articulation: "staccato"
    },
    bpm: 110,
    keySignature: "C",
    bars: 2,
    complexity: "advanced",
    culturalSignificance: "Jazz walking bass adapted for amapiano groove",
    description: "Jazz-influenced walking bass line with chromatic passing tones"
  },
  {
    name: "Syncopated Bass Groove",
    category: "bass_pattern",
    genre: "amapiano",
    patternData: {
      notes: ["C2", "C2", "G2", "C2", "F2"],
      rhythm: [1, 0.5, 0.5, 1, 1],
      syncopation: true,
      root_emphasis: true
    },
    bpm: 115,
    keySignature: "C",
    bars: 4,
    complexity: "intermediate",
    culturalSignificance: "Syncopated bass supporting log drum rhythm",
    description: "Syncopated bass pattern complementing log drum foundation"
  },
  {
    name: "Deep House Bass Foundation",
    category: "bass_pattern",
    genre: "amapiano",
    patternData: {
      notes: ["C1", "C1", "C1", "C1"],
      rhythm: [1, 1, 1, 1],
      sustained: true,
      filter_envelope: "low_pass"
    },
    bpm: 118,
    keySignature: "C",
    bars: 1,
    complexity: "simple",
    culturalSignificance: "Deep house influence on amapiano",
    description: "Sustained sub-bass providing deep house foundation"
  },

  // Melodic Patterns
  {
    name: "Gospel Pentatonic Melody",
    category: "melody",
    genre: "amapiano",
    patternData: {
      notes: ["C4", "D4", "E4", "G4", "A4", "G4", "E4", "D4"],
      rhythm: [0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 1],
      scale: "C major pentatonic",
      articulation: "legato",
      expression: "gospel_melisma"
    },
    bpm: 110,
    keySignature: "C",
    bars: 4,
    complexity: "intermediate",
    culturalSignificance: "Pentatonic melody reflecting gospel traditions",
    description: "Gospel-influenced pentatonic melody with characteristic phrasing"
  },
  {
    name: "Saxophone Jazz Riff",
    category: "melody",
    genre: "private_school_amapiano",
    patternData: {
      notes: ["Bb4", "C5", "D5", "Eb5", "F5", "D5", "Bb4"],
      rhythm: [0.5, 0.25, 0.25, 0.5, 1, 0.5, 1],
      scale: "Bb jazz minor",
      articulation: "staccato",
      swing: 0.2
    },
    bpm: 112,
    keySignature: "Bb",
    bars: 2,
    complexity: "advanced",
    culturalSignificance: "Jazz sophistication in private school amapiano",
    description: "Sophisticated jazz saxophone riff"
  },

  // Percussion Patterns
  {
    name: "Shaker Subtle Groove",
    category: "percussion_pattern",
    genre: "amapiano",
    patternData: {
      pattern: "xxxxxxxxxxxxxxxx",
      velocity: [40, 35, 45, 38, 42, 36, 44, 39, 41, 37, 43, 38, 40, 36, 42, 38],
      swing: 0.08,
      texture: "subtle"
    },
    bpm: 115,
    keySignature: "Cm",
    bars: 1,
    complexity: "simple",
    culturalSignificance: "Subtle percussion adding texture and movement",
    description: "Continuous shaker pattern for rhythmic texture"
  },
  {
    name: "African Percussion Polyrhythm",
    category: "percussion_pattern",
    genre: "amapiano",
    patternData: {
      pattern: "x-x-x-x-x-x-x-x-",
      counterpattern: "x---x---x---x---",
      polyrhythmic: true,
      layers: 2
    },
    bpm: 118,
    keySignature: "Fm",
    bars: 4,
    complexity: "expert",
    culturalSignificance: "Traditional African polyrhythmic percussion",
    description: "Complex polyrhythmic percussion showing African musical heritage"
  },

  // Arpeggio Patterns
  {
    name: "Piano Arpeggio Cmaj9",
    category: "arpeggio",
    genre: "amapiano",
    patternData: {
      notes: ["C3", "E3", "G3", "B3", "D4"],
      chord: "Cmaj9",
      pattern: "ascending",
      rhythm: [0.25, 0.25, 0.25, 0.25, 0.5],
      voicing: "open"
    },
    bpm: 110,
    keySignature: "C",
    bars: 2,
    complexity: "intermediate",
    culturalSignificance: "Arpeggiated chords creating movement and texture",
    description: "Flowing piano arpeggio pattern"
  }
];

// Initialize built-in patterns
async function initializeBuiltinPatterns() {
  try {
    const count = await musicDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM patterns
    `;

    if (!count || count.count === 0) {
      log.info("Initializing built-in amapiano pattern library");

      for (const pattern of BUILTIN_PATTERNS) {
        await musicDB.exec`
          INSERT INTO patterns (
            name,
            category,
            genre,
            pattern_data,
            bpm,
            key_signature,
            bars,
            complexity,
            cultural_significance,
            description,
            created_at
          ) VALUES (
            ${pattern.name},
            ${pattern.category},
            ${pattern.genre},
            ${JSON.stringify(pattern.patternData)},
            ${pattern.bpm},
            ${pattern.keySignature},
            ${pattern.bars},
            ${pattern.complexity},
            ${pattern.culturalSignificance || ''},
            ${pattern.description || ''},
            NOW()
          )
        `;
      }

      log.info("Built-in patterns initialized", { count: BUILTIN_PATTERNS.length });
    }
  } catch (error) {
    log.warn("Failed to initialize built-in patterns", { error: (error as Error).message });
  }
}

// Initialize on module load
initializeBuiltinPatterns();

// List available amapiano patterns
export const listPatterns = api<ListPatternsRequest, ListPatternsResponse>(
  { expose: true, method: "GET", path: "/patterns" },
  async (req) => {
    try {
      let query = `SELECT * FROM patterns WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (req.genre) {
        query += ` AND genre = $${paramIndex}`;
        params.push(req.genre);
        paramIndex++;
      }

      if (req.category) {
        query += ` AND category = $${paramIndex}`;
        params.push(req.category);
        paramIndex++;
      }

      if (req.bpm !== undefined) {
        query += ` AND bpm BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(req.bpm - 5, req.bpm + 5);
        paramIndex += 2;
      }

      if (req.keySignature) {
        query += ` AND key_signature = $${paramIndex}`;
        params.push(req.keySignature);
        paramIndex++;
      }

      if (req.complexity) {
        query += ` AND complexity = $${paramIndex}`;
        params.push(req.complexity);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = await musicDB.rawQueryRow<{ count: number }>(countQuery, ...params);
      const total = countResult?.count || 0;

      // Add pagination
      query += ` ORDER BY created_at DESC`;
      
      if (req.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(req.limit);
        paramIndex++;
      } else {
        query += ` LIMIT 50`;
      }

      if (req.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(req.offset);
      }

      const rawPatterns = await musicDB.rawQueryAll<any>(query, ...params);

      // Map database snake_case to TypeScript camelCase
      const patterns: Pattern[] = rawPatterns.map((p: any) => ({
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

      // Get category distribution
      const categoryCounts = await musicDB.queryAll<{ category: PatternCategory; count: number }>`
        SELECT category, COUNT(*) as count
        FROM patterns
        GROUP BY category
      `;

      const categories = categoryCounts.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {} as Record<PatternCategory, number>);

      log.info("Patterns listed", { 
        count: patterns.length, 
        total,
        filters: { genre: req.genre, category: req.category, complexity: req.complexity }
      });

      return {
        patterns,
        total,
        categories
      };

    } catch (error) {
      log.error("Failed to list patterns", { error: (error as Error).message });
      throw APIError.internal("Failed to list patterns");
    }
  }
);

// Create custom pattern
export const createPattern = api<CreatePatternRequest, Pattern>(
  { expose: true, method: "POST", path: "/patterns" },
  async (req) => {
    try {
      // Validate pattern data
      if (!req.patternData || typeof req.patternData !== 'object') {
        throw APIError.invalidArgument("Pattern data must be a valid object");
      }

      const result = await musicDB.queryRow<Pattern>`
        INSERT INTO patterns (
          name,
          category,
          genre,
          pattern_data,
          bpm,
          key_signature,
          bars,
          complexity,
          cultural_significance,
          description,
          created_at
        ) VALUES (
          ${req.name},
          ${req.category},
          ${req.genre},
          ${JSON.stringify(req.patternData)},
          ${req.bpm || null},
          ${req.keySignature || null},
          ${req.bars || 4},
          ${req.complexity || 'intermediate'},
          ${req.culturalSignificance || ''},
          ${req.description || ''},
          NOW()
        )
        RETURNING *
      `;

      if (!result) {
        throw new Error("Failed to create pattern");
      }

      log.info("Pattern created", { id: result.id, name: req.name, category: req.category });

      return result;

    } catch (error) {
      log.error("Failed to create pattern", { error: (error as Error).message });
      throw APIError.internal("Failed to create pattern");
    }
  }
);

// Get pattern details
export const getPattern = api(
  { expose: true, method: "GET", path: "/patterns/:id" },
  async ({ id }: { id: number }): Promise<Pattern> => {
    try {
      const rawPattern = await musicDB.queryRow<any>`
        SELECT * FROM patterns WHERE id = ${id}
      `;

      if (!rawPattern) {
        throw APIError.notFound("Pattern not found");
      }

      // Map database snake_case to TypeScript camelCase
      const pattern: Pattern = {
        id: rawPattern.id,
        name: rawPattern.name,
        category: rawPattern.category,
        genre: rawPattern.genre,
        patternData: rawPattern.pattern_data,
        bpm: rawPattern.bpm,
        keySignature: rawPattern.key_signature,
        bars: rawPattern.bars,
        complexity: rawPattern.complexity,
        culturalSignificance: rawPattern.cultural_significance,
        description: rawPattern.description,
        usageCount: rawPattern.usage_count,
        createdAt: rawPattern.created_at
      };

      return pattern;

    } catch (error) {
      log.error("Failed to get pattern", { error: (error as Error).message, id });
      throw error instanceof APIError ? error : APIError.internal("Failed to get pattern");
    }
  }
);

// Search patterns by cultural significance
export const searchPatternsByCulture = api(
  { expose: true, method: "GET", path: "/patterns/search/cultural" },
  async ({ query, genre }: { query: string; genre?: Genre }): Promise<{ patterns: Pattern[] }> => {
    try {
      let sqlQuery = `
        SELECT * FROM patterns 
        WHERE cultural_significance ILIKE $1
          OR description ILIKE $1
          OR name ILIKE $1
      `;
      const params: any[] = [`%${query}%`];

      if (genre) {
        sqlQuery += ` AND genre = $2`;
        params.push(genre);
      }

      sqlQuery += ` ORDER BY created_at DESC LIMIT 20`;

      const rawPatterns = await musicDB.rawQueryAll<any>(sqlQuery, ...params);

      // Map database snake_case to TypeScript camelCase
      const patterns: Pattern[] = rawPatterns.map((p: any) => ({
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

      log.info("Cultural pattern search", { query, resultsCount: patterns.length });

      return { patterns };

    } catch (error) {
      log.error("Cultural search failed", { error: (error as Error).message, query });
      throw APIError.internal("Failed to search patterns");
    }
  }
);

// Get patterns by complexity
export const getPatternsByComplexity = api(
  { expose: true, method: "GET", path: "/patterns/complexity/:level" },
  async ({ level, genre, category }: { 
    level: string;
    genre?: Genre;
    category?: PatternCategory;
  }): Promise<{ patterns: Pattern[] }> => {
    try {
      let query = `SELECT * FROM patterns WHERE complexity = $1`;
      const params: any[] = [level];
      let paramIndex = 2;

      if (genre) {
        query += ` AND genre = $${paramIndex}`;
        params.push(genre);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT 30`;

      const rawPatterns = await musicDB.rawQueryAll<any>(query, ...params);

      // Map database snake_case to TypeScript camelCase
      const patterns: Pattern[] = rawPatterns.map((p: any) => ({
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

      log.info("Patterns by complexity", { level, count: patterns.length });

      return { patterns };

    } catch (error) {
      log.error("Failed to get patterns by complexity", { error: (error as Error).message, level });
      throw APIError.internal("Failed to get patterns");
    }
  }
);

// Delete pattern
export const deletePattern = api(
  { expose: true, method: "DELETE", path: "/patterns/:id" },
  async ({ id }: { id: number }): Promise<{ success: boolean }> => {
    try {
      const result = await musicDB.exec`
        DELETE FROM patterns WHERE id = ${id}
      `;

      log.info("Pattern deleted", { id });

      return { success: true };

    } catch (error) {
      log.error("Pattern deletion failed", { error: (error as Error).message, id });
      throw APIError.internal("Failed to delete pattern");
    }
  }
);

// Get recommended patterns based on current project
export const getRecommendedPatterns = api(
  { expose: true, method: "GET", path: "/patterns/recommendations" },
  async ({ genre, bpm, keySignature }: {
    genre: Genre;
    bpm?: number;
    keySignature?: string;
  }): Promise<{ patterns: Pattern[] }> => {
    try {
      let query = `SELECT * FROM patterns WHERE genre = $1`;
      const params: any[] = [genre];
      let paramIndex = 2;

      // Match BPM if provided
      if (bpm) {
        query += ` AND (bpm IS NULL OR bpm BETWEEN $${paramIndex} AND $${paramIndex + 1})`;
        params.push(bpm - 5, bpm + 5);
        paramIndex += 2;
      }

      // Match key if provided
      if (keySignature) {
        query += ` AND (key_signature IS NULL OR key_signature = $${paramIndex})`;
        params.push(keySignature);
        paramIndex++;
      }

      query += ` ORDER BY RANDOM() LIMIT 5`;

      const rawPatterns = await musicDB.rawQueryAll<any>(query, ...params);

      // Map database snake_case to TypeScript camelCase
      const patterns: Pattern[] = rawPatterns.map((p: any) => ({
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

      log.info("Pattern recommendations", { genre, count: patterns.length });

      return { patterns };

    } catch (error) {
      log.error("Failed to get recommendations", { error: (error as Error).message, genre });
      throw APIError.internal("Failed to get pattern recommendations");
    }
  }
);
