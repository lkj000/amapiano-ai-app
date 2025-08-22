import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { extractedStems, audioFiles, generatedTracks } from "./storage";
import type { StemSeparation, DetectedPattern } from "./types";

export interface AnalyzeAudioRequest {
  sourceUrl: string;
  sourceType: "youtube" | "upload" | "url" | "tiktok";
  fileName?: string;
  fileSize?: number;
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
    originalFileName?: string;
    fileType?: string;
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

    // Basic URL validation for external sources
    if (req.sourceType === "youtube" && !req.sourceUrl.includes("youtube.com") && !req.sourceUrl.includes("youtu.be")) {
      throw APIError.invalidArgument("Invalid YouTube URL");
    }
    if (req.sourceType === "tiktok" && !req.sourceUrl.includes("tiktok.com")) {
      throw APIError.invalidArgument("Invalid TikTok URL");
    }
    if (req.sourceType === "url" && !req.sourceUrl.startsWith("upload://")) {
      try {
        new URL(req.sourceUrl);
      } catch {
        throw APIError.invalidArgument("Invalid URL format");
      }
    }

    // Validate file uploads
    if (req.sourceType === "upload") {
      if (!req.fileName) {
        throw APIError.invalidArgument("File name is required for uploads");
      }
      if (req.fileSize && req.fileSize > 100 * 1024 * 1024) { // 100MB limit
        throw APIError.invalidArgument("File size must be less than 100MB");
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

      // Enhanced pattern detection with more realistic data based on file type
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

      // Determine genre based on patterns and source type
      const isPrivateSchool = detectedPatterns.some(p => 
        p.type === "chord_progression" && 
        p.data.chords?.some((chord: string) => chord.includes("maj7") || chord.includes("9"))
      );

      // Enhanced metadata based on file type
      const getFileType = (fileName?: string) => {
        if (!fileName) return "unknown";
        const ext = fileName.split('.').pop()?.toLowerCase();
        const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];
        const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', '3gp'];
        
        if (audioFormats.includes(ext || '')) return "audio";
        if (videoFormats.includes(ext || '')) return "video";
        return "unknown";
      };

      const analysisData = {
        bpm: req.sourceType === "upload" ? Math.floor(Math.random() * 40) + 100 : 118, // Random BPM for uploads
        keySignature: req.sourceType === "upload" ? ["C", "Dm", "F", "G", "Am", "Bb"][Math.floor(Math.random() * 6)] : "F#m",
        genre: isPrivateSchool ? "private_school_amapiano" : "amapiano",
        duration: req.sourceType === "upload" ? Math.floor(Math.random() * 240) + 60 : 180, // Random duration for uploads
        stems: stemFiles,
        patterns: detectedPatterns,
        originalFileName: req.fileName,
        fileType: getFileType(req.fileName)
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
          duration: analysisData.duration,
          originalFileName: analysisData.originalFileName,
          fileType: analysisData.fileType
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

export interface UploadAudioRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface UploadAudioResponse {
  uploadUrl: string;
  fileId: string;
  maxFileSize: number;
  supportedFormats: string[];
}

// Generates a signed upload URL for file uploads
export const getUploadUrl = api<UploadAudioRequest, UploadAudioResponse>(
  { expose: true, method: "POST", path: "/analyze/upload-url" },
  async (req) => {
    // Validate file type
    const supportedFormats = [
      // Audio formats
      'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma',
      // Video formats
      'mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv'
    ];
    
    const fileExtension = req.fileName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      throw APIError.invalidArgument(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
    }

    // Validate file size (100MB limit)
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (req.fileSize > maxFileSize) {
      throw APIError.invalidArgument(`File size must be less than ${maxFileSize / (1024 * 1024)}MB`);
    }

    try {
      const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `uploads/${fileId}_${req.fileName}`;

      // Generate signed upload URL (in real implementation, this would be a proper signed URL)
      const uploadUrl = await audioFiles.signedUploadUrl(fileName, {
        ttl: 3600 // 1 hour expiration
      });

      return {
        uploadUrl: uploadUrl.url,
        fileId,
        maxFileSize,
        supportedFormats
      };
    } catch (error) {
      console.error("Upload URL generation error:", error);
      throw APIError.internal("Failed to generate upload URL");
    }
  }
);

export interface AmapianorizeRequest {
  sourceAnalysisId: number;
  targetGenre: "amapiano" | "private_school_amapiano";
  intensity: "subtle" | "moderate" | "heavy";
  preserveVocals: boolean;
  customPrompt?: string;
}

export interface AmapianorizeResponse {
  id: number;
  originalTrackId: number;
  amapianorizedTrackUrl: string;
  stems: {
    drums: string;
    bass: string;
    piano: string;
    vocals?: string;
    other: string;
  };
  metadata: {
    bpm: number;
    keySignature: string;
    genre: string;
    duration: number;
    intensity: string;
    originalFileName?: string;
  };
}

// Transforms any audio into amapiano style (amapianorize)
export const amapianorizeTrack = api<AmapianorizeRequest, AmapianorizeResponse>(
  { expose: true, method: "POST", path: "/analyze/amapianorize" },
  async (req) => {
    // Validate input
    if (!req.sourceAnalysisId) {
      throw APIError.invalidArgument("Source analysis ID is required");
    }

    // Check if analysis exists
    const analysis = await musicDB.queryRow<{
      id: number;
      analysis_data: any;
    }>`
      SELECT id, analysis_data FROM audio_analysis WHERE id = ${req.sourceAnalysisId}
    `;

    if (!analysis) {
      throw APIError.notFound("Source analysis not found");
    }

    try {
      const amapianorizeId = Math.floor(Math.random() * 1000000);
      const originalData = analysis.analysis_data;

      // Generate amapianorized track
      const amapianorizedFileName = `amapianorized_${amapianorizeId}.wav`;
      const stemsData = {
        drums: `amapianorized_${amapianorizeId}_drums.wav`,
        bass: `amapianorized_${amapianorizeId}_bass.wav`,
        piano: `amapianorized_${amapianorizeId}_piano.wav`,
        vocals: req.preserveVocals ? `amapianorized_${amapianorizeId}_vocals.wav` : undefined,
        other: `amapianorized_${amapianorizeId}_other.wav`
      };

      // Upload mock amapianorized files
      const mockAudioBuffer = Buffer.from("mock amapianorized audio data");
      await generatedTracks.upload(amapianorizedFileName, mockAudioBuffer);

      // Upload mock stem files
      const mockStemBuffer = Buffer.from("mock amapianorized stem data");
      for (const [stem, fileName] of Object.entries(stemsData)) {
        if (fileName) {
          await generatedTracks.upload(fileName, mockStemBuffer);
        }
      }

      // Adjust BPM to amapiano range if needed
      let adjustedBpm = originalData.bpm;
      if (req.targetGenre === "amapiano" && (adjustedBpm < 110 || adjustedBpm > 125)) {
        adjustedBpm = Math.floor(Math.random() * 15) + 110; // 110-125 BPM for classic amapiano
      } else if (req.targetGenre === "private_school_amapiano" && (adjustedBpm < 105 || adjustedBpm > 120)) {
        adjustedBpm = Math.floor(Math.random() * 15) + 105; // 105-120 BPM for private school
      }

      // Store amapianorized track in database
      await musicDB.exec`
        INSERT INTO generated_tracks (
          prompt, 
          genre, 
          mood, 
          bpm, 
          key_signature, 
          file_url, 
          stems_data, 
          source_analysis_id
        )
        VALUES (
          ${req.customPrompt || `Amapianorized ${req.targetGenre} track (${req.intensity} intensity)`}, 
          ${req.targetGenre}, 
          ${"amapianorized"}, 
          ${adjustedBpm}, 
          ${originalData.keySignature}, 
          ${amapianorizedFileName}, 
          ${JSON.stringify(stemsData)}, 
          ${req.sourceAnalysisId}
        )
      `;

      return {
        id: amapianorizeId,
        originalTrackId: req.sourceAnalysisId,
        amapianorizedTrackUrl: generatedTracks.publicUrl(amapianorizedFileName),
        stems: {
          drums: generatedTracks.publicUrl(stemsData.drums),
          bass: generatedTracks.publicUrl(stemsData.bass),
          piano: generatedTracks.publicUrl(stemsData.piano),
          vocals: stemsData.vocals ? generatedTracks.publicUrl(stemsData.vocals) : undefined,
          other: generatedTracks.publicUrl(stemsData.other)
        },
        metadata: {
          bpm: adjustedBpm,
          keySignature: originalData.keySignature,
          genre: req.targetGenre,
          duration: originalData.duration,
          intensity: req.intensity,
          originalFileName: originalData.originalFileName
        }
      };
    } catch (error) {
      console.error("Amapianorize error:", error);
      throw APIError.internal("Failed to amapianorize track");
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
      originalFileName?: string;
      fileType?: string;
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
          duration: analysis.analysis_data.duration,
          originalFileName: analysis.analysis_data.originalFileName,
          fileType: analysis.analysis_data.fileType
        },
        createdAt: analysis.created_at
      }))
    };
  }
);
