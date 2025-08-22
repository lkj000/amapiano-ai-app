import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { extractedStems } from "./storage";
import type { StemSeparation, DetectedPattern } from "./types";

export interface AnalyzeAudioRequest {
  sourceUrl: string;
  sourceType: "youtube" | "upload" | "url" | "tiktok";
}

export interface AnalyzeAudioResponse {
  id: number;
  stems: StemSeparation;
  patterns: DetectedPattern[];
  metadata: {
    bpm: number;
    keySignature: string;
    genre: string;
    duration: number;
  };
}

// Analyzes audio from various sources to extract stems and patterns
export const analyzeAudio = api<AnalyzeAudioRequest, AnalyzeAudioResponse>(
  { expose: true, method: "POST", path: "/analyze/audio" },
  async (req) => {
    // Validate input
    if (!req.sourceUrl || req.sourceUrl.trim().length === 0) {
      throw APIError.invalidArgument("Source URL is required");
    }

    // Basic URL validation
    if (req.sourceType === "youtube" && !req.sourceUrl.includes("youtube.com") && !req.sourceUrl.includes("youtu.be")) {
      throw APIError.invalidArgument("Invalid YouTube URL");
    }
    if (req.sourceType === "tiktok" && !req.sourceUrl.includes("tiktok.com")) {
      throw APIError.invalidArgument("Invalid TikTok URL");
    }
    if (req.sourceType === "url") {
      try {
        new URL(req.sourceUrl);
      } catch {
        throw APIError.invalidArgument("Invalid URL format");
      }
    }

    try {
      const analysisId = Math.floor(Math.random() * 1000000);

      // Mock stem separation results
      const stemFiles = {
        drums: `analysis_${analysisId}_drums.wav`,
        bass: `analysis_${analysisId}_bass.wav`,
        piano: `analysis_${analysisId}_piano.wav`,
        vocals: `analysis_${analysisId}_vocals.wav`,
        other: `analysis_${analysisId}_other.wav`
      };

      // Upload mock stem files
      const mockStemBuffer = Buffer.from("mock stem data for analysis");
      for (const [stem, fileName] of Object.entries(stemFiles)) {
        await extractedStems.upload(fileName, mockStemBuffer);
      }

      // Mock pattern detection with more realistic data
      const detectedPatterns: DetectedPattern[] = [
        {
          type: "drum_pattern",
          confidence: 0.95,
          data: { 
            pattern: "kick-snare-kick-snare", 
            velocity: [100, 80, 100, 80],
            logDrum: { notes: ["C1", "C1", "rest", "C1"], timing: [0, 0.5, 1, 1.5] }
          },
          timeRange: { start: 0, end: 4 }
        },
        {
          type: "bass_pattern",
          confidence: 0.88,
          data: { 
            notes: ["C2", "F2", "G2", "C2"], 
            rhythm: "quarter",
            style: "walking"
          },
          timeRange: { start: 0, end: 4 }
        },
        {
          type: "chord_progression",
          confidence: 0.92,
          data: { 
            chords: ["Cmaj7", "Fmaj7", "G7", "Am7"], 
            progression: "I-IV-V-vi",
            voicing: "jazz"
          },
          timeRange: { start: 0, end: 8 }
        }
      ];

      // Determine genre based on patterns (mock logic)
      const isPrivateSchool = detectedPatterns.some(p => 
        p.type === "chord_progression" && 
        p.data.chords?.some((chord: string) => chord.includes("maj7") || chord.includes("9"))
      );

      const analysisData = {
        bpm: 118, // Mock BPM for "Footsteps in the dark" use case
        keySignature: "F#m", // Mock Key for "Footsteps in the dark" use case
        genre: isPrivateSchool ? "private_school_amapiano" : "amapiano",
        duration: 180,
        stems: stemFiles,
        patterns: detectedPatterns
      };

      // Store analysis in database
      await musicDB.exec`
        INSERT INTO audio_analysis (source_url, source_type, analysis_data, extracted_stems, detected_patterns)
        VALUES (${req.sourceUrl}, ${req.sourceType}, ${JSON.stringify(analysisData)}, ${JSON.stringify(stemFiles)}, ${JSON.stringify(detectedPatterns)})
      `;

      return {
        id: analysisId,
        stems: {
          drums: extractedStems.publicUrl(stemFiles.drums),
          bass: extractedStems.publicUrl(stemFiles.bass),
          piano: extractedStems.publicUrl(stemFiles.piano),
          vocals: extractedStems.publicUrl(stemFiles.vocals),
          other: extractedStems.publicUrl(stemFiles.other)
        },
        patterns: detectedPatterns,
        metadata: {
          bpm: analysisData.bpm,
          keySignature: analysisData.keySignature,
          genre: analysisData.genre,
          duration: 180
        }
      };
    } catch (error) {
      console.error("Audio analysis error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to analyze audio");
    }
  }
);

export interface ExtractPatternsRequest {
  audioUrl: string;
  genre: "amapiano" | "private_school_amapiano";
}

export interface ExtractPatternsResponse {
  patterns: DetectedPattern[];
  suggestions: {
    logDrumPattern?: any;
    pianoChords?: any;
    bassline?: any;
    percussion?: any;
  };
}

// Extracts specific amapiano patterns from audio
export const extractPatterns = api<ExtractPatternsRequest, ExtractPatternsResponse>(
  { expose: true, method: "POST", path: "/analyze/patterns" },
  async (req) => {
    // Validate input
    if (!req.audioUrl || req.audioUrl.trim().length === 0) {
      throw APIError.invalidArgument("Audio URL is required");
    }

    try {
      // Mock pattern extraction specific to amapiano
      const patterns: DetectedPattern[] = [
        {
          type: "drum_pattern",
          confidence: 0.94,
          data: {
            logDrum: { notes: ["C1", "C1", "rest", "C1"], timing: [0, 0.5, 1, 1.5] },
            kick: { pattern: "x...x...x...x...", velocity: [100, 0, 0, 0, 90, 0, 0, 0] }
          },
          timeRange: { start: 0, end: 2 }
        },
        {
          type: "chord_progression",
          confidence: 0.91,
          data: {
            chords: req.genre === "private_school_amapiano" 
              ? ["Cmaj9", "Am7", "Fmaj7", "G7sus4"]
              : ["C", "Am", "F", "G"],
            voicing: req.genre === "private_school_amapiano" ? "jazz" : "simple",
            style: req.genre === "private_school_amapiano" ? "sophisticated" : "soulful"
          },
          timeRange: { start: 0, end: 8 }
        }
      ];

      const suggestions = {
        logDrumPattern: {
          pattern: "C1-C1-rest-C1",
          swing: req.genre === "private_school_amapiano" ? 0.05 : 0.1,
          velocity: [100, 85, 0, 90]
        },
        pianoChords: {
          progression: req.genre === "private_school_amapiano" 
            ? ["Cmaj9", "Am7", "Fmaj7", "G7sus4"]
            : ["C", "Am", "F", "G"],
          style: req.genre === "private_school_amapiano" ? "jazzy" : "soulful"
        },
        bassline: {
          notes: ["C2", "A1", "F2", "G2"],
          rhythm: req.genre === "private_school_amapiano" ? "syncopated" : "straight",
          style: "deep"
        },
        percussion: {
          hiHats: req.genre === "private_school_amapiano" ? "subtle-shuffle" : "steady-eighth",
          shaker: "continuous",
          claps: "on-2-and-4"
        }
      };

      return {
        patterns,
        suggestions
      };
    } catch (error) {
      console.error("Pattern extraction error:", error);
      throw APIError.internal("Failed to extract patterns");
    }
  }
);

export interface GetAnalysisHistoryRequest {
  limit?: number;
  sourceType?: "youtube" | "upload" | "url" | "tiktok";
}

export interface GetAnalysisHistoryResponse {
  analyses: Array<{
    id: number;
    sourceUrl: string;
    sourceType: string;
    metadata: {
      bpm: number;
      keySignature: string;
      genre: string;
      duration: number;
    };
    createdAt: Date;
  }>;
}

// Gets the user's analysis history
export const getAnalysisHistory = api<GetAnalysisHistoryRequest, GetAnalysisHistoryResponse>(
  { expose: true, method: "GET", path: "/analyze/history" },
  async (req) => {
    let query = `SELECT id, source_url, source_type, analysis_data, created_at FROM audio_analysis WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (req.sourceType) {
      query += ` AND source_type = $${paramIndex}`;
      params.push(req.sourceType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    if (req.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(req.limit);
    } else {
      query += ` LIMIT 50`;
    }

    const analyses = await musicDB.rawQueryAll<{
      id: number;
      source_url: string;
      source_type: string;
      analysis_data: any;
      created_at: Date;
    }>(query, ...params);

    return {
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        sourceUrl: analysis.source_url,
        sourceType: analysis.source_type,
        metadata: {
          bpm: analysis.analysis_data.bpm,
          keySignature: analysis.analysis_data.keySignature,
          genre: analysis.analysis_data.genre,
          duration: analysis.analysis_data.duration
        },
        createdAt: analysis.created_at
      }))
    };
  }
);
