import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { objectStorage, sampleLibrary } from "./storage";
import { audioFormatConverter } from "./audio-formats";
import type { Genre, SampleCategory, Sample } from "./types";
import log from "encore.dev/log";

export interface ListSamplesRequest {
  genre?: Genre;
  category?: SampleCategory;
  tags?: string[];
  bpm?: number;
  keySignature?: string;
  limit?: number;
  offset?: number;
}

export interface ListSamplesResponse {
  samples: any[];
  total: number;
  categories: any;
}

export interface UploadSampleRequest {
  name: string;
  category: SampleCategory;
  genre: Genre;
  audioData: string; // Base64 encoded
  bpm?: number;
  keySignature?: string;
  tags?: string[];
  culturalSignificance?: string;
  description?: string;
}

export interface UploadSampleResponse {
  id: number;
  name: string;
  fileUrl: string;
  category: SampleCategory;
}

export interface ProcessSampleRequest {
  sampleId: number;
  operations: {
    normalize?: boolean;
    trimSilence?: boolean;
    convertFormat?: 'wav' | 'mp3' | 'flac';
    resample?: number;
  };
}

// Comprehensive amapiano sample library
const BUILTIN_SAMPLES: Partial<Sample>[] = [
  // Log Drum Samples
  {
    name: "Traditional Log Drum 1",
    category: "log_drum",
    genre: "amapiano",
    bpm: 115,
    keySignature: "Cm",
    durationSeconds: 2,
    tags: ["authentic", "traditional", "deep"],
    description: "Traditional South African log drum sound with deep resonance",
    culturalSignificance: "Signature amapiano sound rooted in traditional African percussion"
  },
  {
    name: "Modern Log Drum Punch",
    category: "log_drum",
    genre: "amapiano",
    bpm: 118,
    keySignature: "Fm",
    durationSeconds: 1.5,
    tags: ["modern", "punchy", "tight"],
    description: "Contemporary log drum with enhanced low-end and punch"
  },
  {
    name: "Log Drum with Release",
    category: "log_drum",
    genre: "amapiano",
    bpm: 112,
    keySignature: "Dm",
    durationSeconds: 3,
    tags: ["atmospheric", "long-tail"],
    description: "Log drum with extended release for atmospheric productions"
  },

  // Piano Samples
  {
    name: "Gospel Piano Cmaj7",
    category: "piano",
    genre: "amapiano",
    bpm: 110,
    keySignature: "C",
    durationSeconds: 4,
    tags: ["gospel", "soulful", "authentic"],
    description: "Warm Cmaj7 chord with gospel-influenced voicing",
    culturalSignificance: "Reflects South African church music traditions"
  },
  {
    name: "Jazz Piano Dm9",
    category: "piano",
    genre: "private_school_amapiano",
    bpm: 112,
    keySignature: "D",
    durationSeconds: 4,
    tags: ["jazz", "sophisticated", "complex"],
    description: "Jazz-influenced Dm9 chord for sophisticated productions"
  },
  {
    name: "Soulful Piano Am7",
    category: "piano",
    genre: "amapiano",
    bpm: 115,
    keySignature: "A",
    durationSeconds: 5,
    tags: ["emotional", "soulful", "deep"],
    description: "Emotional Am7 chord with rich harmonics"
  },

  // Bass Samples
  {
    name: "Deep Sub Bass C",
    category: "bass",
    genre: "amapiano",
    bpm: 115,
    keySignature: "C",
    durationSeconds: 2,
    tags: ["deep", "sub", "foundation"],
    description: "Deep sub-bass note for low-end foundation"
  },
  {
    name: "Walking Bass Line",
    category: "bass",
    genre: "amapiano",
    bpm: 118,
    keySignature: "F",
    durationSeconds: 8,
    tags: ["melodic", "walking", "jazzy"],
    description: "Jazz-influenced walking bass pattern",
    culturalSignificance: "Shows jazz influence in amapiano"
  },

  // Percussion Samples
  {
    name: "Shaker Loop Subtle",
    category: "percussion",
    genre: "amapiano",
    bpm: 115,
    keySignature: "Cm",
    durationSeconds: 4,
    tags: ["subtle", "texture", "rhythm"],
    description: "Subtle shaker pattern for rhythmic texture"
  },
  {
    name: "Clap Traditional",
    category: "percussion",
    genre: "amapiano",
    bpm: 118,
    keySignature: "Fm",
    durationSeconds: 1,
    tags: ["traditional", "accent"],
    description: "Traditional hand clap for rhythmic accents"
  },

  // Saxophone Samples (Private School Amapiano)
  {
    name: "Smooth Sax Melody Bb",
    category: "saxophone",
    genre: "private_school_amapiano",
    bpm: 110,
    keySignature: "Bb",
    durationSeconds: 8,
    tags: ["smooth", "melodic", "sophisticated"],
    description: "Smooth saxophone melody for sophisticated productions",
    culturalSignificance: "Reflects jazz sophistication in private school amapiano"
  },
  {
    name: "Sax Riff Jazzy",
    category: "saxophone",
    genre: "private_school_amapiano",
    bpm: 112,
    keySignature: "Eb",
    durationSeconds: 4,
    tags: ["jazzy", "riff", "expressive"],
    description: "Expressive jazz-influenced saxophone riff"
  },

  // Vocal Samples
  {
    name: "Vocal Chant Traditional",
    category: "vocals",
    genre: "amapiano",
    bpm: 115,
    keySignature: "Cm",
    durationSeconds: 8,
    tags: ["traditional", "cultural", "authentic"],
    description: "Traditional South African vocal chant",
    culturalSignificance: "Preserves traditional South African vocal traditions"
  },
  {
    name: "Gospel Vocal Phrase",
    category: "vocals",
    genre: "amapiano",
    bpm: 110,
    keySignature: "C",
    durationSeconds: 12,
    tags: ["gospel", "soulful", "emotional"],
    description: "Gospel-influenced vocal phrase with emotional depth",
    culturalSignificance: "Reflects gospel roots of amapiano"
  }
];

// Initialize built-in samples on first run
async function initializeBuiltinSamples() {
  try {
    const count = await musicDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM samples
    `;

    if (!count || count.count === 0) {
      log.info("Initializing built-in amapiano sample library");

      for (const sample of BUILTIN_SAMPLES) {
        // In production, you would generate or load actual audio files
        // For now, we'll create database entries with placeholder URLs
        const fileName = `${sample.category}/${sample.name?.replace(/\s+/g, '_').toLowerCase()}.wav`;
        
        await musicDB.exec`
          INSERT INTO samples (
            name,
            category,
            genre,
            file_url,
            bpm,
            key_signature,
            duration_seconds,
            tags,
            description,
            cultural_significance,
            created_at
          ) VALUES (
            ${sample.name},
            ${sample.category},
            ${sample.genre},
            ${fileName},
            ${sample.bpm},
            ${sample.keySignature},
            ${sample.durationSeconds},
            ${JSON.stringify(sample.tags || [])},
            ${sample.description || ''},
            ${sample.culturalSignificance || ''},
            NOW()
          )
        `;
      }

      log.info("Built-in samples initialized", { count: BUILTIN_SAMPLES.length });
    }
  } catch (error) {
    log.warn("Failed to initialize built-in samples", { error: (error as Error).message });
  }
}

// Initialize on module load
initializeBuiltinSamples();

// List available amapiano samples
export const listSamples = api<ListSamplesRequest, ListSamplesResponse>(
  { expose: true, method: "GET", path: "/samples" },
  async (req) => {
    try {
      let query = `SELECT * FROM samples WHERE 1=1`;
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

      if (req.tags && req.tags.length > 0) {
        query += ` AND tags && $${paramIndex}::jsonb`;
        params.push(JSON.stringify(req.tags));
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

      const rawSamples = await musicDB.rawQueryAll<any>(query, ...params);

      log.info("Samples listed", { 
        count: rawSamples.length, 
        total,
        filters: { genre: req.genre, category: req.category }
      });

      const samples = rawSamples.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        genre: s.genre,
        fileUrl: s.file_url,
        createdAt: s.created_at
      }));

      return {
        samples,
        total,
        categories: {}
      };

    } catch (error) {
      log.error("Failed to list samples", { error: (error as Error).message });
      throw APIError.internal("Failed to list samples");
    }
  }
);

// Upload custom sample
export const uploadSample = api<UploadSampleRequest, UploadSampleResponse>(
  { expose: true, method: "POST", path: "/samples/upload" },
  async (req) => {
    try {
      // Validate audio data
      if (!req.audioData) {
        throw APIError.invalidArgument("Audio data is required");
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(req.audioData, 'base64');

      // Validate buffer size (max 50MB)
      if (audioBuffer.length > 50 * 1024 * 1024) {
        throw APIError.invalidArgument("Sample file too large (max 50MB)");
      }

      // Process and upload sample
      const fileName = `${req.category}/${req.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.wav`;
      
      const { url } = await objectStorage.uploadSample(audioBuffer, fileName, req.category, {
        normalize: true,
        trimSilence: true,
        metadata: {
          bpm: req.bpm?.toString() || '',
          keySignature: req.keySignature || '',
          culturalSignificance: req.culturalSignificance || ''
        }
      });

      // Get audio metadata
      const metadata = await audioFormatConverter.extractMetadata(audioBuffer);

      // Store in database
      const result = await musicDB.queryRow<{ id: number }>`
        INSERT INTO samples (
          name,
          category,
          genre,
          file_url,
          bpm,
          key_signature,
          duration_seconds,
          tags,
          description,
          cultural_significance,
          created_at
        ) VALUES (
          ${req.name},
          ${req.category},
          ${req.genre},
          ${fileName},
          ${req.bpm || null},
          ${req.keySignature || null},
          ${metadata.duration},
          ${JSON.stringify(req.tags || [])},
          ${req.description || ''},
          ${req.culturalSignificance || ''},
          NOW()
        )
        RETURNING id
      `;

      if (!result) {
        throw new Error("Failed to store sample in database");
      }

      log.info("Sample uploaded successfully", { 
        id: result.id, 
        name: req.name,
        category: req.category,
        size: audioBuffer.length
      });

      return {
        id: result.id,
        name: req.name,
        fileUrl: url,
        category: req.category
      };

    } catch (error) {
      log.error("Sample upload failed", { error: (error as Error).message });
      throw APIError.internal("Failed to upload sample");
    }
  }
);

// Get sample details
export const getSample = api(
  { expose: true, method: "GET", path: "/samples/:id" },
  async ({ id }: { id: number }): Promise<Sample> => {
    try {
      const sample = await musicDB.queryRow<Sample>`
        SELECT * FROM samples WHERE id = ${id}
      `;

      if (!sample) {
        throw APIError.notFound("Sample not found");
      }

      return {
        ...sample,
        fileUrl: sample.fileUrl ? sampleLibrary.publicUrl(sample.fileUrl) : undefined
      };

    } catch (error) {
      log.error("Failed to get sample", { error: (error as Error).message, id });
      throw error instanceof APIError ? error : APIError.internal("Failed to get sample");
    }
  }
);

// Process sample (normalize, convert, etc.)
export const processSample = api<ProcessSampleRequest, { success: boolean; newUrl: string }>(
  { expose: true, method: "POST", path: "/samples/:sampleId/process" },
  async (req) => {
    try {
      const sample = await musicDB.queryRow<Sample>`
        SELECT * FROM samples WHERE id = ${req.sampleId}
      `;

      if (!sample) {
        throw APIError.notFound("Sample not found");
      }

      if (!sample.fileUrl) {
        throw APIError.invalidArgument("Sample has no file URL");
      }

      // Download current sample
      const buffer = await objectStorage.downloadSample(sample.category, sample.fileUrl);

      let processedBuffer = buffer;

      // Apply operations
      if (req.operations.normalize) {
        log.info("Normalizing sample", { sampleId: req.sampleId });
        processedBuffer = await audioFormatConverter.normalizeAudio(processedBuffer, -18);
      }

      if (req.operations.trimSilence) {
        log.info("Trimming silence from sample", { sampleId: req.sampleId });
        processedBuffer = await audioFormatConverter.trimSilence(processedBuffer);
      }

      if (req.operations.resample) {
        log.info("Resampling sample", { sampleId: req.sampleId, targetRate: req.operations.resample });
        processedBuffer = await audioFormatConverter.resample(processedBuffer, req.operations.resample);
      }

      if (req.operations.convertFormat) {
        log.info("Converting sample format", { sampleId: req.sampleId, format: req.operations.convertFormat });
        processedBuffer = await audioFormatConverter.convert(processedBuffer, {
          targetFormat: req.operations.convertFormat,
          quality: 'lossless'
        });
      }

      // Upload processed version
      const newFileName = `${sample.category}/processed_${Date.now()}_${sample.fileUrl}`;
      const { url } = await objectStorage.uploadSample(processedBuffer, newFileName, sample.category);

      // Update database
      await musicDB.exec`
        UPDATE samples 
        SET file_url = ${newFileName},
            updated_at = NOW()
        WHERE id = ${req.sampleId}
      `;

      log.info("Sample processed successfully", { sampleId: req.sampleId, newUrl: url });

      return {
        success: true,
        newUrl: url
      };

    } catch (error) {
      log.error("Sample processing failed", { error: (error as Error).message, sampleId: req.sampleId });
      throw APIError.internal("Failed to process sample");
    }
  }
);

// Delete sample
export const deleteSample = api(
  { expose: true, method: "DELETE", path: "/samples/:id" },
  async ({ id }: { id: number }): Promise<{ success: boolean }> => {
    try {
      const sample = await musicDB.queryRow<Sample>`
        SELECT * FROM samples WHERE id = ${id}
      `;

      if (!sample) {
        throw APIError.notFound("Sample not found");
      }

      if (!sample.fileUrl) {
        throw APIError.invalidArgument("Sample has no file URL");
      }

      // Delete from storage
      await objectStorage.deleteSample(sample.category, sample.fileUrl);

      // Delete from database
      await musicDB.exec`
        DELETE FROM samples WHERE id = ${id}
      `;

      log.info("Sample deleted", { id, name: sample.name });

      return { success: true };

    } catch (error) {
      log.error("Sample deletion failed", { error: (error as Error).message, id });
      throw error instanceof APIError ? error : APIError.internal("Failed to delete sample");
    }
  }
);

// Search samples by cultural significance
export const searchSamplesByCulture = api(
  { expose: true, method: "GET", path: "/samples/search/cultural" },
  async ({ query, genre }: { query: string; genre?: Genre }): Promise<{ samples: Sample[] }> => {
    try {
      let sqlQuery = `
        SELECT * FROM samples 
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

      const samples = await musicDB.rawQueryAll<Sample>(sqlQuery, ...params);

      return {
        samples: samples.map(s => ({
          ...s,
          fileUrl: s.fileUrl ? sampleLibrary.publicUrl(s.fileUrl) : undefined
        }))
      };

    } catch (error) {
      log.error("Cultural search failed", { error: (error as Error).message, query });
      throw APIError.internal("Failed to search samples");
    }
  }
);
