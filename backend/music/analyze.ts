import { api } from "encore.dev/api";
import { musicDB } from "./db";
import { extractedStems } from "./storage";
import type { StemSeparation, DetectedPattern } from "./types";

export interface AnalyzeAudioRequest {
  sourceUrl: string;
  sourceType: "youtube" | "upload" | "url";
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

// Analyzes audio from YouTube URLs or uploaded files to extract stems and patterns
export const analyzeAudio = api<AnalyzeAudioRequest, AnalyzeAudioResponse>(
  { expose: true, method: "POST", path: "/analyze/audio" },
  async (req) => {
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
    const mockStemBuffer = Buffer.from("mock stem data");
    for (const [stem, fileName] of Object.entries(stemFiles)) {
      await extractedStems.upload(fileName, mockStemBuffer);
    }

    // Mock pattern detection
    const detectedPatterns: DetectedPattern[] = [
      {
        type: "drum_pattern",
        confidence: 0.95,
        data: { pattern: "kick-snare-kick-snare", velocity: [100, 80, 100, 80] },
        timeRange: { start: 0, end: 4 }
      },
      {
        type: "bass_pattern",
        confidence: 0.88,
        data: { notes: ["C2", "F2", "G2", "C2"], rhythm: "quarter" },
        timeRange: { start: 0, end: 4 }
      },
      {
        type: "chord_progression",
        confidence: 0.92,
        data: { chords: ["Cmaj7", "Fmaj7", "G7", "Am7"], progression: "I-IV-V-vi" },
        timeRange: { start: 0, end: 8 }
      }
    ];

    const analysisData = {
      bpm: 120,
      keySignature: "C",
      genre: "amapiano",
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
        bpm: 120,
        keySignature: "C",
        genre: "amapiano",
        duration: 180
      }
    };
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
          chords: ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
          voicing: "jazz",
          style: req.genre === "private_school_amapiano" ? "sophisticated" : "standard"
        },
        timeRange: { start: 0, end: 8 }
      }
    ];

    const suggestions = {
      logDrumPattern: {
        pattern: "C1-C1-rest-C1",
        swing: 0.1,
        velocity: [100, 85, 0, 90]
      },
      pianoChords: {
        progression: ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
        style: req.genre === "private_school_amapiano" ? "jazzy" : "soulful"
      },
      bassline: {
        notes: ["C2", "A1", "F2", "G2"],
        rhythm: "syncopated",
        style: "deep"
      },
      percussion: {
        hiHats: "subtle-shuffle",
        shaker: "continuous",
        claps: "on-2-and-4"
      }
    };

    return {
      patterns,
      suggestions
    };
  }
);
