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
    confidence: number;
    quality: "low" | "medium" | "high";
    sampleRate: number;
    bitDepth: number;
  };
  processingTime: number;
}

// Analyzes audio from various sources to extract stems and patterns
export const analyzeAudio = api<AnalyzeAudioRequest, AnalyzeAudioResponse>(
  { expose: true, method: "POST", path: "/analyze/audio" },
  async (req) => {
    const startTime = Date.now();
    
    // Validate input
    if (!req.sourceUrl || req.sourceUrl.trim().length === 0) {
      throw APIError.invalidArgument("Source URL is required");
    }

    // Enhanced URL validation for external sources
    if (req.sourceType === "youtube") {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
      if (!youtubeRegex.test(req.sourceUrl)) {
        throw APIError.invalidArgument("Invalid YouTube URL format");
      }
    }
    
    if (req.sourceType === "tiktok") {
      const tiktokRegex = /^(https?:\/\/)?(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/;
      if (!tiktokRegex.test(req.sourceUrl)) {
        throw APIError.invalidArgument("Invalid TikTok URL format");
      }
    }
    
    if (req.sourceType === "url" && !req.sourceUrl.startsWith("upload://")) {
      try {
        const url = new URL(req.sourceUrl);
        const supportedDomains = ['soundcloud.com', 'spotify.com', 'apple.com', 'bandcamp.com'];
        const isSupported = supportedDomains.some(domain => url.hostname.includes(domain));
        if (!isSupported && !url.pathname.match(/\.(mp3|wav|flac|m4a|aac|ogg)$/i)) {
          throw APIError.invalidArgument("Unsupported audio URL or domain");
        }
      } catch {
        throw APIError.invalidArgument("Invalid URL format");
      }
    }

    // Enhanced file validation for uploads
    if (req.sourceType === "upload") {
      if (!req.fileName) {
        throw APIError.invalidArgument("File name is required for uploads");
      }
      
      const supportedFormats = [
        // Audio formats
        'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'aiff',
        // Video formats
        'mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv', 'mts', 'mxf'
      ];
      
      const fileExtension = req.fileName.split('.').pop()?.toLowerCase();
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        throw APIError.invalidArgument(`Unsupported file format. Supported: ${supportedFormats.join(', ')}`);
      }
      
      if (req.fileSize && req.fileSize > 500 * 1024 * 1024) { // 500MB limit
        throw APIError.invalidArgument("File size must be less than 500MB");
      }
    }

    try {
      const analysisId = Math.floor(Math.random() * 1000000);

      // Enhanced stem separation with better quality simulation
      const stemFiles = {
        drums: `analysis_${analysisId}_drums.wav`,
        bass: `analysis_${analysisId}_bass.wav`,
        piano: `analysis_${analysisId}_piano.wav`,
        vocals: `analysis_${analysisId}_vocals.wav`,
        other: `analysis_${analysisId}_other.wav`
      };

      // Upload mock stem files with metadata
      const mockStemBuffer = Buffer.from("mock high-quality stem data for analysis");
      for (const [stem, fileName] of Object.entries(stemFiles)) {
        await extractedStems.upload(fileName, mockStemBuffer);
      }

      // Enhanced pattern detection with higher accuracy and more detail
      const detectedPatterns: DetectedPattern[] = [
        {
          type: "drum_pattern",
          confidence: 0.96,
          data: { 
            pattern: "kick-snare-kick-snare", 
            velocity: [100, 80, 100, 80],
            logDrum: { 
              notes: ["C1", "C1", "rest", "C1"], 
              timing: [0, 0.5, 1, 1.5],
              swing: 0.08,
              accent: [true, false, false, true]
            },
            complexity: "intermediate",
            groove: "deep"
          },
          timeRange: { start: 0, end: 4 }
        },
        {
          type: "bass_pattern",
          confidence: 0.91,
          data: { 
            notes: ["C2", "F2", "G2", "C2"], 
            rhythm: "quarter",
            style: "walking",
            octave: 2,
            articulation: "legato",
            dynamics: "mf"
          },
          timeRange: { start: 0, end: 4 }
        },
        {
          type: "chord_progression",
          confidence: 0.94,
          data: { 
            chords: ["Cmaj7", "Fmaj7", "G7", "Am7"], 
            progression: "I-IV-V-vi",
            voicing: "jazz",
            inversions: ["root", "first", "root", "second"],
            quality: "sophisticated",
            tension: ["maj7", "maj7", "dom7", "min7"]
          },
          timeRange: { start: 0, end: 8 }
        },
        {
          type: "melody",
          confidence: 0.88,
          data: {
            notes: ["C4", "E4", "G4", "A4", "G4", "F4", "E4", "C4"],
            rhythm: "eighth",
            scale: "C major",
            mode: "ionian",
            contour: "arch",
            range: "octave"
          },
          timeRange: { start: 8, end: 12 }
        }
      ];

      // Enhanced genre detection with sub-genre classification
      const isPrivateSchool = detectedPatterns.some(p => 
        p.type === "chord_progression" && 
        p.data.chords?.some((chord: string) => chord.includes("maj7") || chord.includes("9") || chord.includes("11"))
      );

      const hasJazzElements = detectedPatterns.some(p => 
        p.data.voicing === "jazz" || p.data.style === "sophisticated"
      );

      let detectedGenre = "amapiano";
      if (isPrivateSchool || hasJazzElements) {
        detectedGenre = "private_school_amapiano";
      }

      // Enhanced metadata with quality assessment
      const getFileType = (fileName?: string) => {
        if (!fileName) return "unknown";
        const ext = fileName.split('.').pop()?.toLowerCase();
        const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'aiff'];
        const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv', 'mts', 'mxf'];
        
        if (audioFormats.includes(ext || '')) return "audio";
        if (videoFormats.includes(ext || '')) return "video";
        return "unknown";
      };

      const getQualityAssessment = (sourceType: string, fileName?: string) => {
        if (sourceType === "upload" && fileName) {
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (['wav', 'flac', 'aiff'].includes(ext || '')) return "high";
          if (['mp3', 'm4a', 'aac'].includes(ext || '')) return "medium";
          return "low";
        }
        if (sourceType === "youtube") return "medium";
        if (sourceType === "tiktok") return "low";
        return "medium";
      };

      const analysisData = {
        bpm: req.sourceType === "upload" ? Math.floor(Math.random() * 40) + 100 : 
             detectedGenre === "private_school_amapiano" ? 112 : 118,
        keySignature: req.sourceType === "upload" ? 
                     ["C", "Dm", "F", "G", "Am", "Bb", "F#m", "Em"][Math.floor(Math.random() * 8)] : 
                     detectedGenre === "private_school_amapiano" ? "Dm" : "F#m",
        genre: detectedGenre,
        duration: req.sourceType === "upload" ? Math.floor(Math.random() * 240) + 60 : 180,
        stems: stemFiles,
        patterns: detectedPatterns,
        originalFileName: req.fileName,
        fileType: getFileType(req.fileName),
        confidence: 0.92,
        quality: getQualityAssessment(req.sourceType, req.fileName),
        sampleRate: 44100,
        bitDepth: 24
      };

      // Store enhanced analysis in database
      await musicDB.exec`
        INSERT INTO audio_analysis (
          source_url, 
          source_type, 
          analysis_data, 
          extracted_stems, 
          detected_patterns,
          processing_time_ms,
          quality_score
        )
        VALUES (
          ${req.sourceUrl}, 
          ${req.sourceType}, 
          ${JSON.stringify(analysisData)}, 
          ${JSON.stringify(stemFiles)}, 
          ${JSON.stringify(detectedPatterns)},
          ${Date.now() - startTime},
          ${analysisData.confidence}
        )
      `;

      const processingTime = Date.now() - startTime;

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
          fileType: analysisData.fileType,
          confidence: analysisData.confidence,
          quality: analysisData.quality,
          sampleRate: analysisData.sampleRate,
          bitDepth: analysisData.bitDepth
        },
        processingTime
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
  estimatedProcessingTime: number;
}

// Generates a signed upload URL for file uploads with enhanced validation
export const getUploadUrl = api<UploadAudioRequest, UploadAudioResponse>(
  { expose: true, method: "POST", path: "/analyze/upload-url" },
  async (req) => {
    // Enhanced file type validation
    const supportedFormats = [
      // High-quality audio formats
      'wav', 'flac', 'aiff',
      // Compressed audio formats
      'mp3', 'm4a', 'aac', 'ogg', 'wma',
      // Video formats
      'mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv', 'mts', 'mxf'
    ];
    
    const fileExtension = req.fileName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      throw APIError.invalidArgument(
        `Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`
      );
    }

    // Enhanced file size validation with different limits for different formats
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (req.fileSize > maxFileSize) {
      throw APIError.invalidArgument(
        `File size must be less than ${maxFileSize / (1024 * 1024)}MB`
      );
    }

    // Validate file type MIME
    const expectedMimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm'
    };

    const expectedMime = expectedMimeTypes[fileExtension as keyof typeof expectedMimeTypes];
    if (expectedMime && req.fileType !== expectedMime) {
      console.warn(`MIME type mismatch: expected ${expectedMime}, got ${req.fileType}`);
    }

    try {
      const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `uploads/${fileId}_${req.fileName}`;

      // Generate signed upload URL with enhanced security
      const uploadUrl = await audioFiles.signedUploadUrl(fileName, {
        ttl: 3600 // 1 hour expiration
      });

      // Estimate processing time based on file size and format
      const estimatedProcessingTime = Math.max(
        30, // Minimum 30 seconds
        Math.floor(req.fileSize / (1024 * 1024) * 5) // ~5 seconds per MB
      );

      return {
        uploadUrl: uploadUrl.url,
        fileId,
        maxFileSize,
        supportedFormats,
        estimatedProcessingTime
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
  additionalOptions?: {
    preserveMelody?: boolean;
    addInstruments?: string[];
    removeInstruments?: string[];
    tempoAdjustment?: "auto" | "preserve" | number;
  };
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
    transformationDetails: {
      elementsAdded: string[];
      elementsModified: string[];
      elementsPreserved: string[];
    };
  };
  processingTime: number;
}

// Enhanced amapianorize with more sophisticated transformation options
export const amapianorizeTrack = api<AmapianorizeRequest, AmapianorizeResponse>(
  { expose: true, method: "POST", path: "/analyze/amapianorize" },
  async (req) => {
    const startTime = Date.now();
    
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

      // Generate amapianorized track with enhanced processing
      const amapianorizedFileName = `amapianorized_${amapianorizeId}.wav`;
      const stemsData = {
        drums: `amapianorized_${amapianorizeId}_drums.wav`,
        bass: `amapianorized_${amapianorizeId}_bass.wav`,
        piano: `amapianorized_${amapianorizeId}_piano.wav`,
        vocals: req.preserveVocals ? `amapianorized_${amapianorizeId}_vocals.wav` : undefined,
        other: `amapianorized_${amapianorizeId}_other.wav`
      };

      // Upload mock amapianorized files
      const mockAudioBuffer = Buffer.from("mock high-quality amapianorized audio data");
      await generatedTracks.upload(amapianorizedFileName, mockAudioBuffer);

      // Upload mock stem files
      const mockStemBuffer = Buffer.from("mock high-quality amapianorized stem data");
      for (const [stem, fileName] of Object.entries(stemsData)) {
        if (fileName) {
          await generatedTracks.upload(fileName, mockStemBuffer);
        }
      }

      // Enhanced BPM adjustment logic
      let adjustedBpm = originalData.bpm;
      if (req.additionalOptions?.tempoAdjustment === "preserve") {
        adjustedBpm = originalData.bpm;
      } else if (typeof req.additionalOptions?.tempoAdjustment === "number") {
        adjustedBpm = req.additionalOptions.tempoAdjustment;
      } else {
        // Auto adjustment based on target genre
        if (req.targetGenre === "amapiano" && (adjustedBpm < 110 || adjustedBpm > 125)) {
          adjustedBpm = Math.floor(Math.random() * 15) + 110; // 110-125 BPM for classic amapiano
        } else if (req.targetGenre === "private_school_amapiano" && (adjustedBpm < 105 || adjustedBpm > 120)) {
          adjustedBpm = Math.floor(Math.random() * 15) + 105; // 105-120 BPM for private school
        }
      }

      // Enhanced transformation details
      const transformationDetails = {
        elementsAdded: [] as string[],
        elementsModified: [] as string[],
        elementsPreserved: [] as string[]
      };

      // Determine what elements are added/modified based on intensity and target genre
      if (req.targetGenre === "amapiano") {
        transformationDetails.elementsAdded.push("Log drum bassline", "Percussive elements");
        if (req.intensity === "heavy") {
          transformationDetails.elementsAdded.push("Kwaito-style vocals", "Deep house piano");
        }
      } else {
        transformationDetails.elementsAdded.push("Jazz harmonies", "Sophisticated chord progressions");
        if (req.intensity === "heavy") {
          transformationDetails.elementsAdded.push("Live saxophone", "Complex rhythms");
        }
      }

      if (req.preserveVocals) {
        transformationDetails.elementsPreserved.push("Original vocals");
      }

      if (req.additionalOptions?.preserveMelody) {
        transformationDetails.elementsPreserved.push("Main melody");
      }

      transformationDetails.elementsModified.push("Drum patterns", "Bass arrangement", "Harmonic structure");

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
          source_analysis_id,
          processing_time_ms,
          transformation_type
        )
        VALUES (
          ${req.customPrompt || `Amapianorized ${req.targetGenre} track (${req.intensity} intensity)`}, 
          ${req.targetGenre}, 
          ${"amapianorized"}, 
          ${adjustedBpm}, 
          ${originalData.keySignature}, 
          ${amapianorizedFileName}, 
          ${JSON.stringify(stemsData)}, 
          ${req.sourceAnalysisId},
          ${Date.now() - startTime},
          ${"amapianorize"}
        )
      `;

      const processingTime = Date.now() - startTime;

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
          originalFileName: originalData.originalFileName,
          transformationDetails
        },
        processingTime
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
  analysisDepth?: "basic" | "detailed" | "comprehensive";
}

export interface ExtractPatternsResponse {
  patterns: DetectedPattern[];
  suggestions: {
    logDrumPattern?: any;
    pianoChords?: any;
    bassline?: any;
    percussion?: any;
    arrangement?: any;
  };
  analysisQuality: {
    confidence: number;
    completeness: number;
    accuracy: number;
  };
}

// Enhanced pattern extraction with deeper analysis
export const extractPatterns = api<ExtractPatternsRequest, ExtractPatternsResponse>(
  { expose: true, method: "POST", path: "/analyze/patterns" },
  async (req) => {
    // Validate input
    if (!req.audioUrl || req.audioUrl.trim().length === 0) {
      throw APIError.invalidArgument("Audio URL is required");
    }

    try {
      const analysisDepth = req.analysisDepth || "detailed";
      
      // Enhanced pattern extraction with more sophisticated analysis
      const patterns: DetectedPattern[] = [
        {
          type: "drum_pattern",
          confidence: 0.95,
          data: {
            logDrum: { 
              notes: ["C1", "C1", "rest", "C1"], 
              timing: [0, 0.5, 1, 1.5],
              swing: req.genre === "private_school_amapiano" ? 0.05 : 0.1,
              dynamics: [100, 85, 0, 90],
              articulation: "punchy"
            },
            kick: { 
              pattern: "x...x...x...x...", 
              velocity: [100, 0, 0, 0, 90, 0, 0, 0],
              placement: "on-beat",
              character: "deep"
            },
            snare: {
              pattern: "....x.......x...",
              velocity: [0, 0, 0, 0, 95, 0, 0, 0],
              placement: "backbeat",
              character: "crisp"
            },
            complexity: analysisDepth === "comprehensive" ? "advanced" : "intermediate"
          },
          timeRange: { start: 0, end: 2 }
        },
        {
          type: "chord_progression",
          confidence: 0.93,
          data: {
            chords: req.genre === "private_school_amapiano" 
              ? ["Cmaj9", "Am7", "Fmaj7", "G7sus4"]
              : ["C", "Am", "F", "G"],
            voicing: req.genre === "private_school_amapiano" ? "jazz" : "simple",
            style: req.genre === "private_school_amapiano" ? "sophisticated" : "soulful",
            inversions: req.genre === "private_school_amapiano" 
              ? ["root", "first", "second", "root"]
              : ["root", "root", "root", "root"],
            rhythm: "whole-half",
            function: ["tonic", "relative-minor", "subdominant", "dominant"]
          },
          timeRange: { start: 0, end: 8 }
        }
      ];

      // Add more patterns for comprehensive analysis
      if (analysisDepth === "comprehensive") {
        patterns.push(
          {
            type: "bass_pattern",
            confidence: 0.89,
            data: {
              notes: ["C2", "A1", "F2", "G2"],
              rhythm: req.genre === "private_school_amapiano" ? "syncopated" : "straight",
              style: "deep",
              articulation: "legato",
              octave: 2,
              movement: "stepwise"
            },
            timeRange: { start: 0, end: 4 }
          },
          {
            type: "melody",
            confidence: 0.86,
            data: {
              notes: ["C4", "E4", "G4", "A4", "G4", "F4", "E4", "C4"],
              rhythm: "eighth",
              scale: "C major",
              contour: "arch",
              range: "octave",
              character: req.genre === "private_school_amapiano" ? "jazzy" : "soulful"
            },
            timeRange: { start: 8, end: 12 }
          }
        );
      }

      const suggestions = {
        logDrumPattern: {
          pattern: "C1-C1-rest-C1",
          swing: req.genre === "private_school_amapiano" ? 0.05 : 0.1,
          velocity: [100, 85, 0, 90],
          character: req.genre === "private_school_amapiano" ? "subtle" : "prominent",
          placement: "foundational"
        },
        pianoChords: {
          progression: req.genre === "private_school_amapiano" 
            ? ["Cmaj9", "Am7", "Fmaj7", "G7sus4"]
            : ["C", "Am", "F", "G"],
          style: req.genre === "private_school_amapiano" ? "jazzy" : "soulful",
          voicing: req.genre === "private_school_amapiano" ? "extended" : "triadic",
          rhythm: "sustained",
          dynamics: "medium"
        },
        bassline: {
          notes: ["C2", "A1", "F2", "G2"],
          rhythm: req.genre === "private_school_amapiano" ? "syncopated" : "straight",
          style: "deep",
          character: "warm",
          movement: "walking"
        },
        percussion: {
          hiHats: req.genre === "private_school_amapiano" ? "subtle-shuffle" : "steady-eighth",
          shaker: "continuous",
          claps: "on-2-and-4",
          tambourine: req.genre === "private_school_amapiano" ? "sparse" : "regular",
          character: "rhythmic"
        },
        arrangement: {
          intro: "8 bars - minimal elements",
          verse: "16 bars - full arrangement",
          chorus: "16 bars - enhanced energy",
          bridge: "8 bars - breakdown",
          outro: "8 bars - fade elements",
          structure: "intro-verse-chorus-verse-chorus-bridge-chorus-outro"
        }
      };

      const analysisQuality = {
        confidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
        completeness: analysisDepth === "comprehensive" ? 0.95 : 
                     analysisDepth === "detailed" ? 0.85 : 0.75,
        accuracy: 0.92
      };

      return {
        patterns,
        suggestions,
        analysisQuality
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
  genre?: "amapiano" | "private_school_amapiano";
  sortBy?: "date" | "quality" | "duration";
  sortOrder?: "asc" | "desc";
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
      confidence: number;
      quality: "low" | "medium" | "high";
    };
    processingTime?: number;
    createdAt: Date;
  }>;
  totalCount: number;
  averageQuality: number;
}

// Enhanced analysis history with better filtering and sorting
export const getAnalysisHistory = api<GetAnalysisHistoryRequest, GetAnalysisHistoryResponse>(
  { expose: true, method: "GET", path: "/analyze/history" },
  async (req) => {
    let query = `SELECT id, source_url, source_type, analysis_data, processing_time_ms, quality_score, created_at FROM audio_analysis WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (req.sourceType) {
      query += ` AND source_type = $${paramIndex}`;
      params.push(req.sourceType);
      paramIndex++;
    }

    if (req.genre) {
      query += ` AND analysis_data->>'genre' = $${paramIndex}`;
      params.push(req.genre);
      paramIndex++;
    }

    // Add sorting
    const sortBy = req.sortBy || "date";
    const sortOrder = req.sortOrder || "desc";
    
    switch (sortBy) {
      case "quality":
        query += ` ORDER BY quality_score ${sortOrder.toUpperCase()}`;
        break;
      case "duration":
        query += ` ORDER BY (analysis_data->>'duration')::int ${sortOrder.toUpperCase()}`;
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

    const analyses = await musicDB.rawQueryAll<{
      id: number;
      source_url: string;
      source_type: string;
      analysis_data: any;
      processing_time_ms?: number;
      quality_score?: number;
      created_at: Date;
    }>(query, ...params);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audio_analysis WHERE 1=1` +
      (req.sourceType ? ` AND source_type = '${req.sourceType}'` : '') +
      (req.genre ? ` AND analysis_data->>'genre' = '${req.genre}'` : '');
    
    const countResult = await musicDB.queryRow<{total: number}>(countQuery);
    const totalCount = countResult?.total || 0;

    // Calculate average quality
    const avgQualityResult = await musicDB.queryRow<{avg_quality: number}>`
      SELECT AVG(quality_score) as avg_quality FROM audio_analysis WHERE quality_score IS NOT NULL
    `;
    const averageQuality = avgQualityResult?.avg_quality || 0;

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
          fileType: analysis.analysis_data.fileType,
          confidence: analysis.analysis_data.confidence || 0,
          quality: analysis.analysis_data.quality || "medium"
        },
        processingTime: analysis.processing_time_ms,
        createdAt: analysis.created_at
      })),
      totalCount,
      averageQuality: Math.round(averageQuality * 100) / 100
    };
  }
);

export interface BatchAnalyzeRequest {
  sources: Array<{
    sourceUrl: string;
    sourceType: "youtube" | "upload" | "url" | "tiktok";
    fileName?: string;
    fileSize?: number;
  }>;
  priority?: "low" | "normal" | "high";
}

export interface BatchAnalyzeResponse {
  batchId: string;
  estimatedCompletionTime: number;
  queuePosition: number;
  sources: Array<{
    sourceUrl: string;
    status: "queued" | "processing" | "completed" | "failed";
    analysisId?: number;
  }>;
}

// Batch analysis for processing multiple files
export const batchAnalyze = api<BatchAnalyzeRequest, BatchAnalyzeResponse>(
  { expose: true, method: "POST", path: "/analyze/batch" },
  async (req) => {
    if (!req.sources || req.sources.length === 0) {
      throw APIError.invalidArgument("At least one source is required");
    }

    if (req.sources.length > 10) {
      throw APIError.invalidArgument("Maximum 10 sources allowed per batch");
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const priority = req.priority || "normal";
    
    // Estimate completion time based on number of sources and priority
    const baseTimePerSource = 60; // 60 seconds per source
    const priorityMultiplier = priority === "high" ? 0.5 : priority === "low" ? 2 : 1;
    const estimatedCompletionTime = req.sources.length * baseTimePerSource * priorityMultiplier;

    // Queue position simulation
    const queuePosition = priority === "high" ? 1 : Math.floor(Math.random() * 5) + 1;

    // Store batch in database
    await musicDB.exec`
      INSERT INTO batch_analysis (
        batch_id,
        sources,
        priority,
        status,
        estimated_completion_time
      )
      VALUES (
        ${batchId},
        ${JSON.stringify(req.sources)},
        ${priority},
        ${"queued"},
        ${estimatedCompletionTime}
      )
    `;

    return {
      batchId,
      estimatedCompletionTime,
      queuePosition,
      sources: req.sources.map(source => ({
        sourceUrl: source.sourceUrl,
        status: "queued" as const
      }))
    };
  }
);

export interface GetBatchStatusRequest {
  batchId: string;
}

export interface GetBatchStatusResponse {
  batchId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  completedSources: number;
  totalSources: number;
  results: Array<{
    sourceUrl: string;
    status: "queued" | "processing" | "completed" | "failed";
    analysisId?: number;
    error?: string;
  }>;
  estimatedTimeRemaining?: number;
}

// Get batch analysis status
export const getBatchStatus = api<GetBatchStatusRequest, GetBatchStatusResponse>(
  { expose: true, method: "GET", path: "/analyze/batch/:batchId" },
  async (req) => {
    const batch = await musicDB.queryRow<{
      batch_id: string;
      sources: any;
      status: string;
      created_at: Date;
    }>`
      SELECT batch_id, sources, status, created_at 
      FROM batch_analysis 
      WHERE batch_id = ${req.batchId}
    `;

    if (!batch) {
      throw APIError.notFound("Batch not found");
    }

    // Simulate progress for demo
    const sources = batch.sources;
    const totalSources = sources.length;
    const completedSources = Math.min(totalSources, Math.floor(Math.random() * totalSources) + 1);
    const progress = Math.round((completedSources / totalSources) * 100);

    return {
      batchId: batch.batch_id,
      status: progress === 100 ? "completed" : "processing",
      progress,
      completedSources,
      totalSources,
      results: sources.map((source: any, index: number) => ({
        sourceUrl: source.sourceUrl,
        status: index < completedSources ? "completed" : "queued",
        analysisId: index < completedSources ? Math.floor(Math.random() * 1000000) : undefined
      })),
      estimatedTimeRemaining: progress === 100 ? 0 : (totalSources - completedSources) * 60
    };
  }
);
