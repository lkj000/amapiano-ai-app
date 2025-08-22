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
  };
}

// Generates an amapiano track from a text prompt
export const generateTrack = api<GenerateTrackRequest, GenerateTrackResponse>(
  { expose: true, method: "POST", path: "/generate/track" },
  async (req) => {
    // Validate input
    if (!req.prompt || req.prompt.trim().length === 0) {
      throw APIError.invalidArgument("Prompt is required");
    }

    if (req.bpm && (req.bpm < 80 || req.bpm > 160)) {
      throw APIError.invalidArgument("BPM must be between 80 and 160");
    }

    if (req.duration && (req.duration < 30 || req.duration > 600)) {
      throw APIError.invalidArgument("Duration must be between 30 and 600 seconds");
    }

    try {
      // Simulate AI music generation with more realistic processing
      const trackId = Math.floor(Math.random() * 1000000);
      const audioFileName = `generated_${trackId}.wav`;
      const stemsData = {
        drums: `stems/${trackId}_drums.wav`,
        bass: `stems/${trackId}_bass.wav`,
        piano: `stems/${trackId}_piano.wav`,
        other: `stems/${trackId}_other.wav`
      };

      // Generate mock audio data (in real implementation, this would call AI service)
      const mockAudioBuffer = Buffer.from("mock audio data for track generation");
      await generatedTracks.upload(audioFileName, mockAudioBuffer);

      // Upload mock stem files
      const mockStemBuffer = Buffer.from("mock stem data");
      for (const stemFile of Object.values(stemsData)) {
        await generatedTracks.upload(stemFile, mockStemBuffer);
      }

      // Store in database
      await musicDB.exec`
        INSERT INTO generated_tracks (prompt, genre, mood, bpm, key_signature, file_url, stems_data)
        VALUES (${req.prompt}, ${req.genre}, ${req.mood || null}, ${req.bpm || 120}, ${req.keySignature || "C"}, ${audioFileName}, ${JSON.stringify(stemsData)})
      `;

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
          bpm: req.bpm || 120,
          keySignature: req.keySignature || "C",
          duration: req.duration || 180
        }
      };
    } catch (error) {
      console.error("Track generation error:", error);
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
}

export interface GenerateLoopResponse {
  id: number;
  audioUrl: string;
  metadata: {
    category: string;
    bpm: number;
    bars: number;
    keySignature: string;
  };
}

// Generates specific amapiano loops and patterns
export const generateLoop = api<GenerateLoopRequest, GenerateLoopResponse>(
  { expose: true, method: "POST", path: "/generate/loop" },
  async (req) => {
    // Validate input
    if (req.bpm && (req.bpm < 80 || req.bpm > 160)) {
      throw APIError.invalidArgument("BPM must be between 80 and 160");
    }

    if (req.bars && (req.bars < 1 || req.bars > 16)) {
      throw APIError.invalidArgument("Bars must be between 1 and 16");
    }

    try {
      const loopId = Math.floor(Math.random() * 1000000);
      const fileName = `loop_${req.category}_${loopId}.wav`;

      // Generate mock loop data
      const mockLoopBuffer = Buffer.from("mock loop data for " + req.category);
      await generatedTracks.upload(fileName, mockLoopBuffer);

      const audioUrl = generatedTracks.publicUrl(fileName);

      return {
        id: loopId,
        audioUrl,
        metadata: {
          category: req.category,
          bpm: req.bpm || 120,
          bars: req.bars || 4,
          keySignature: req.keySignature || "C"
        }
      };
    } catch (error) {
      console.error("Loop generation error:", error);
      throw APIError.internal("Failed to generate loop");
    }
  }
);

export interface GetGenerationHistoryRequest {
  limit?: number;
  genre?: Genre;
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
    createdAt: Date;
  }>;
}

// Gets the user's generation history
export const getGenerationHistory = api<GetGenerationHistoryRequest, GetGenerationHistoryResponse>(
  { expose: true, method: "GET", path: "/generate/history" },
  async (req) => {
    let query = `SELECT id, prompt, genre, mood, bpm, key_signature, file_url, created_at FROM generated_tracks WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (req.genre) {
      query += ` AND genre = $${paramIndex}`;
      params.push(req.genre);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

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
      created_at: Date;
    }>(query, ...params);

    return {
      tracks: tracks.map(track => ({
        id: track.id,
        prompt: track.prompt,
        genre: track.genre,
        mood: track.mood,
        bpm: track.bpm,
        keySignature: track.key_signature,
        fileUrl: track.file_url,
        createdAt: track.created_at
      }))
    };
  }
);

export interface GetGenerationStatsResponse {
  totalGenerations: number;
  generationsByGenre: Record<Genre, number>;
  generationsByMood: Record<string, number>;
  averageBpm: number;
  popularKeySignatures: Array<{key: string, count: number}>;
}

// Gets statistics about generated content
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

    return {
      totalGenerations,
      generationsByGenre,
      generationsByMood,
      averageBpm,
      popularKeySignatures: keyResults.map(row => ({
        key: row.key_signature,
        count: row.count
      }))
    };
  }
);
