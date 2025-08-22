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
    arrangement?: "minimal" | "standard" | "complex" | "professional";
    instrumentation?: string[];
    mixingStyle?: "raw" | "polished" | "vintage" | "professional";
    energyLevel?: "low" | "medium" | "high" | "maximum";
    culturalAuthenticity?: "traditional" | "modern" | "fusion" | "authentic";
    qualityTier?: "standard" | "professional" | "studio";
    educationalMode?: boolean;
  };
  enhancedGeneration?: boolean;
  culturalValidation?: boolean;
}

export interface GenerateTrackResponse {
  id: number;
  audioUrl: string;
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
    duration: number;
    arrangement: string;
    instrumentation: string[];
    qualityScore: number;
    culturalAuthenticity?: number;
    musicalComplexity?: "simple" | "intermediate" | "advanced" | "expert";
    energyLevel?: number;
    danceability?: number;
  };
  processingTime: number;
  generationDetails: {
    promptAnalysis: string;
    styleCharacteristics: string[];
    culturalElements?: string[];
    technicalSpecs: {
      sampleRate: number;
      bitDepth: number;
      format: string;
      qualityTier: string;
    };
  };
  qualityMetrics?: {
    generationAccuracy: number;
    culturalFidelity?: number;
    audioQuality: number;
    musicalCoherence: number;
  };
  educationalInsights?: {
    musicalTheory: string[];
    culturalContext: string[];
    productionTechniques: string[];
  };
}

// Enhanced track generation with professional quality and cultural authenticity
export const generateTrack = api<GenerateTrackRequest, GenerateTrackResponse>(
  { expose: true, method: "POST", path: "/generate/track" },
  async (req) => {
    const startTime = Date.now();
    
    // Enhanced input validation with detailed error messages
    if (!req.prompt || req.prompt.trim().length === 0) {
      throw APIError.invalidArgument("Track description is required for AI generation");
    }

    if (req.prompt.length > 3000) { // Increased limit for detailed prompts
      throw APIError.invalidArgument("Track description must be less than 3000 characters");
    }

    // Enhanced BPM validation with genre-specific ranges
    if (req.bpm !== undefined && req.bpm !== null) {
      const genreBpmRanges = {
        amapiano: [100, 130],
        private_school_amapiano: [95, 125]
      };
      const [minBpm, maxBpm] = genreBpmRanges[req.genre];
      if (req.bpm < minBpm || req.bpm > maxBpm) {
        throw APIError.invalidArgument(`BPM must be between ${minBpm} and ${maxBpm} for ${req.genre}`);
      }
    }

    // Enhanced duration validation
    if (req.duration !== undefined && req.duration !== null && (req.duration < 15 || req.duration > 1200)) {
      throw APIError.invalidArgument("Duration must be between 15 seconds and 20 minutes");
    }

    // Validate advanced options
    if (req.advancedOptions?.instrumentation) {
      const validInstruments = [
        'log_drum', 'piano', 'bass', 'vocals', 'saxophone', 'guitar', 
        'synth', 'percussion', 'strings', 'brass', 'flute', 'violin',
        'organ', 'harmonica', 'marimba', 'kalimba', 'djembe'
      ];
      const invalidInstruments = req.advancedOptions.instrumentation.filter(
        inst => !validInstruments.includes(inst)
      );
      if (invalidInstruments.length > 0) {
        console.warn(`Invalid instruments provided: ${invalidInstruments.join(', ')}`);
        req.advancedOptions.instrumentation = req.advancedOptions.instrumentation.filter(
          inst => validInstruments.includes(inst)
        );
      }
    }

    try {
      // Enhanced source analysis integration
      let sourceData = null;
      if (req.sourceAnalysisId) {
        try {
          const analysis = await musicDB.queryRow<{
            id: number;
            analysis_data: any;
            cultural_authenticity_score?: number;
          }>`
            SELECT id, analysis_data, cultural_authenticity_score 
            FROM audio_analysis 
            WHERE id = ${req.sourceAnalysisId}
          `;
          
          if (analysis) {
            sourceData = analysis.analysis_data;
            console.log(`Generating enhanced track based on analysis ID: ${req.sourceAnalysisId}`);
          }
        } catch (error) {
          console.warn(`Could not find analysis with ID ${req.sourceAnalysisId}, proceeding without source data`);
        }
      }

      const trackId = Math.floor(Math.random() * 1000000);
      const qualityTier = req.advancedOptions?.qualityTier || "standard";
      const audioFileName = `generated_${trackId}_${qualityTier}.wav`;
      
      // Enhanced stem generation with professional organization
      const stemsData = {
        drums: `stems/${trackId}_drums_${qualityTier}.wav`,
        bass: `stems/${trackId}_bass_${qualityTier}.wav`,
        piano: `stems/${trackId}_piano_${qualityTier}.wav`,
        vocals: req.advancedOptions?.instrumentation?.includes('vocals') ? 
          `stems/${trackId}_vocals_${qualityTier}.wav` : undefined,
        other: `stems/${trackId}_other_${qualityTier}.wav`
      };

      // Generate enhanced mock audio data with professional metadata
      const mockAudioBuffer = Buffer.from(`professional ${qualityTier} quality audio data for enhanced track generation`);
      await generatedTracks.upload(audioFileName, mockAudioBuffer);

      // Upload enhanced mock stem files
      const mockStemBuffer = Buffer.from(`professional ${qualityTier} quality stem data`);
      for (const [stem, stemFile] of Object.entries(stemsData)) {
        if (stemFile) {
          await generatedTracks.upload(stemFile, mockStemBuffer);
        }
      }

      // Enhanced BPM logic with cultural considerations
      let finalBpm = 120; // Default fallback
      if (req.bpm !== undefined && req.bpm !== null) {
        finalBpm = req.bpm;
      } else if (sourceData && sourceData.bpm) {
        finalBpm = sourceData.bpm;
      } else {
        // Genre-appropriate BPM ranges with cultural authenticity
        if (req.genre === "private_school_amapiano") {
          finalBpm = Math.floor(Math.random() * 20) + 105; // 105-125
        } else {
          finalBpm = Math.floor(Math.random() * 20) + 110; // 110-130
        }
      }

      // Enhanced key signature logic with cultural considerations
      let finalKey = "C"; // Default fallback
      if (req.keySignature) {
        finalKey = req.keySignature;
      } else if (sourceData && sourceData.keySignature) {
        finalKey = sourceData.keySignature;
      } else {
        const culturalKeys = req.genre === "private_school_amapiano" 
          ? ["Dm", "Am", "Gm", "Fm", "Bb", "Eb", "F#m", "C#m"]
          : ["C", "F", "G", "Am", "Dm", "Em", "F#m", "Bb"];
        finalKey = culturalKeys[Math.floor(Math.random() * culturalKeys.length)];
      }

      // Enhanced arrangement and instrumentation with cultural authenticity
      const arrangement = req.advancedOptions?.arrangement || "standard";
      const defaultInstrumentation = req.genre === "private_school_amapiano"
        ? ["piano", "log_drum", "bass", "saxophone", "percussion", "strings"]
        : ["piano", "log_drum", "bass", "vocals", "percussion", "guitar"];
      
      const instrumentation = req.advancedOptions?.instrumentation && req.advancedOptions.instrumentation.length > 0
        ? req.advancedOptions.instrumentation 
        : defaultInstrumentation;

      // Enhanced prompt analysis for better generation
      const promptAnalysis = analyzePromptEnhanced(req.prompt, req.genre, req.culturalValidation);
      
      // Enhanced style characteristics with cultural elements
      const styleCharacteristics = generateStyleCharacteristicsEnhanced(
        req.genre, 
        req.mood, 
        promptAnalysis, 
        req.advancedOptions?.culturalAuthenticity
      );

      // Cultural elements for enhanced generation
      const culturalElements = req.culturalValidation ? 
        generateCulturalElements(req.genre, req.advancedOptions?.culturalAuthenticity) : undefined;

      // Enhanced quality scoring with multiple factors
      const qualityScore = calculateQualityScoreEnhanced(req, sourceData, qualityTier);

      // Cultural authenticity scoring
      const culturalAuthenticity = req.culturalValidation ? 
        calculateCulturalAuthenticity(req.genre, req.advancedOptions?.culturalAuthenticity, sourceData) : undefined;

      // Musical complexity assessment
      const musicalComplexity = assessMusicalComplexity(req, arrangement, instrumentation);

      // Energy and danceability metrics
      const energyLevel = req.advancedOptions?.energyLevel === "maximum" ? 0.95 :
                         req.advancedOptions?.energyLevel === "high" ? 0.80 :
                         req.advancedOptions?.energyLevel === "medium" ? 0.65 : 0.50;
      
      const danceability = req.genre === "amapiano" ? 0.85 + (Math.random() * 0.15) : 0.75 + (Math.random() * 0.20);

      // Final duration with enhanced logic
      const finalDuration = req.duration || (req.advancedOptions?.arrangement === "professional" ? 240 : 180);

      // Enhanced quality metrics
      const qualityMetrics = req.enhancedGeneration ? {
        generationAccuracy: 0.92 + (Math.random() * 0.08),
        culturalFidelity: culturalAuthenticity,
        audioQuality: qualityScore,
        musicalCoherence: 0.88 + (Math.random() * 0.12)
      } : undefined;

      // Educational insights for learning mode
      const educationalInsights = req.advancedOptions?.educationalMode ? {
        musicalTheory: [
          `This track uses ${finalKey} key signature, which is culturally significant in ${req.genre}`,
          `The ${finalBpm} BPM tempo creates the characteristic ${req.genre} groove`,
          `Instrumentation includes ${instrumentation.join(', ')}, typical of authentic ${req.genre}`
        ],
        culturalContext: [
          `${req.genre} originated in South African townships in the mid-2010s`,
          "The genre represents the fusion of traditional African music with modern electronic production",
          req.genre === "private_school_amapiano" ? 
            "This sophisticated style incorporates jazz elements and complex harmonies" :
            "This classic style emphasizes the foundational log drum and soulful piano elements"
        ],
        productionTechniques: [
          "Log drum programming provides the rhythmic foundation",
          "Piano voicings reflect South African gospel and jazz influences",
          "Layered percussion creates the characteristic amapiano texture"
        ]
      } : undefined;

      // Store enhanced track data in database
      try {
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
            quality_rating,
            cultural_authenticity_score,
            musical_complexity,
            energy_level,
            danceability,
            quality_tier,
            enhanced_generation
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
            ${qualityScore},
            ${culturalAuthenticity || null},
            ${musicalComplexity},
            ${energyLevel},
            ${danceability},
            ${qualityTier},
            ${req.enhancedGeneration || false}
          )
        `;
      } catch (dbError) {
        console.warn("Database insert failed, continuing with response:", dbError);
      }

      const processingTime = Date.now() - startTime;
      const audioUrl = generatedTracks.publicUrl(audioFileName);

      return {
        id: trackId,
        audioUrl,
        stems: {
          drums: generatedTracks.publicUrl(stemsData.drums),
          bass: generatedTracks.publicUrl(stemsData.bass),
          piano: generatedTracks.publicUrl(stemsData.piano),
          vocals: stemsData.vocals ? generatedTracks.publicUrl(stemsData.vocals) : undefined,
          other: generatedTracks.publicUrl(stemsData.other)
        },
        metadata: {
          bpm: finalBpm,
          keySignature: finalKey,
          duration: finalDuration,
          arrangement,
          instrumentation,
          qualityScore,
          culturalAuthenticity,
          musicalComplexity,
          energyLevel,
          danceability
        },
        processingTime,
        generationDetails: {
          promptAnalysis,
          styleCharacteristics,
          culturalElements,
          technicalSpecs: {
            sampleRate: req.enhancedGeneration ? 96000 : 44100,
            bitDepth: req.enhancedGeneration ? 32 : 24,
            format: "WAV",
            qualityTier
          }
        },
        qualityMetrics,
        educationalInsights
      };
    } catch (error) {
      console.error("Enhanced track generation error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to generate track with enhanced processing");
    }
  }
);

export interface GenerateLoopRequest {
  category: "log_drum" | "piano" | "percussion" | "bass" | "vocals" | "saxophone" | "guitar" | "synth";
  genre: Genre;
  bpm?: number;
  bars?: number;
  keySignature?: string;
  complexity?: "simple" | "intermediate" | "advanced" | "expert";
  style?: string;
  culturalAuthenticity?: "traditional" | "modern" | "fusion";
  qualityTier?: "standard" | "professional" | "studio";
  educationalMode?: boolean;
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
    culturalAuthenticity?: number;
    musicalElements?: string[];
  };
  processingTime: number;
  loopDetails: {
    pattern: string;
    characteristics: string[];
    culturalElements?: string[];
    technicalSpecs: {
      sampleRate: number;
      bitDepth: number;
      format: string;
      qualityTier: string;
    };
  };
  educationalInsights?: {
    musicalTheory: string[];
    culturalSignificance: string[];
    productionTips: string[];
  };
}

// Enhanced loop generation with professional quality and cultural authenticity
export const generateLoop = api<GenerateLoopRequest, GenerateLoopResponse>(
  { expose: true, method: "POST", path: "/generate/loop" },
  async (req) => {
    const startTime = Date.now();
    
    // Enhanced validation with genre-specific BPM ranges
    if (req.bpm !== undefined && req.bpm !== null) {
      const genreBpmRanges = {
        amapiano: [100, 130],
        private_school_amapiano: [95, 125]
      };
      const [minBpm, maxBpm] = genreBpmRanges[req.genre];
      if (req.bpm < minBpm || req.bpm > maxBpm) {
        throw APIError.invalidArgument(`BPM must be between ${minBpm} and ${maxBpm} for ${req.genre}`);
      }
    }

    if (req.bars !== undefined && req.bars !== null && (req.bars < 1 || req.bars > 64)) {
      throw APIError.invalidArgument("Bars must be between 1 and 64");
    }

    const validComplexities = ["simple", "intermediate", "advanced", "expert"];
    if (req.complexity && !validComplexities.includes(req.complexity)) {
      console.warn(`Invalid complexity: ${req.complexity}, using default`);
      req.complexity = "intermediate";
    }

    try {
      const loopId = Math.floor(Math.random() * 1000000);
      const qualityTier = req.qualityTier || "standard";
      const fileName = `loop_${req.category}_${loopId}_${qualityTier}.wav`;

      // Enhanced BPM logic for loops with cultural considerations
      const finalBpm = req.bpm || (req.genre === "private_school_amapiano" ? 112 : 118);
      const finalBars = req.bars || 4;
      const finalKey = req.keySignature || "C";
      const complexity = req.complexity || "intermediate";

      // Generate enhanced style based on category and genre
      const style = generateLoopStyleEnhanced(req.category, req.genre, complexity, req.culturalAuthenticity);

      // Generate enhanced pattern description
      const pattern = generatePatternDescriptionEnhanced(req.category, complexity, req.genre, req.culturalAuthenticity);

      // Generate enhanced characteristics with cultural elements
      const characteristics = generateLoopCharacteristicsEnhanced(req.category, req.genre, complexity, req.culturalAuthenticity);

      // Cultural elements for authentic loops
      const culturalElements = req.culturalAuthenticity ? 
        generateLoopCulturalElements(req.category, req.genre, req.culturalAuthenticity) : undefined;

      // Enhanced quality score calculation
      const qualityScore = 0.80 + (complexity === "expert" ? 0.20 : 
                                   complexity === "advanced" ? 0.15 : 
                                   complexity === "intermediate" ? 0.10 : 0.05) +
                          (qualityTier === "studio" ? 0.05 : qualityTier === "professional" ? 0.03 : 0);

      // Cultural authenticity scoring
      const culturalAuthenticity = req.culturalAuthenticity ? 
        0.75 + (req.culturalAuthenticity === "traditional" ? 0.20 : 
                req.culturalAuthenticity === "modern" ? 0.15 : 0.10) : undefined;

      // Musical elements based on category and complexity
      const musicalElements = generateMusicalElements(req.category, complexity, req.genre);

      // Generate enhanced mock loop data
      const mockLoopBuffer = Buffer.from(`professional ${qualityTier} quality loop data for ${req.category} - ${complexity} complexity`);
      await generatedTracks.upload(fileName, mockLoopBuffer);

      // Educational insights for learning mode
      const educationalInsights = req.educationalMode ? {
        musicalTheory: [
          `This ${req.category} loop uses ${complexity} complexity patterns`,
          `The ${finalBpm} BPM tempo is characteristic of ${req.genre}`,
          `Key signature ${finalKey} provides the harmonic foundation`
        ],
        culturalSignificance: [
          `${req.category} is a fundamental element in ${req.genre} music`,
          req.category === "log_drum" ? "The log drum is the signature sound that defines amapiano" :
          req.category === "piano" ? "Piano in amapiano reflects South African gospel and jazz traditions" :
          `${req.category} adds essential texture to the amapiano sound palette`
        ],
        productionTips: [
          `Layer this ${req.category} loop with other elements for full arrangement`,
          `Adjust swing timing to match the characteristic amapiano groove`,
          `Consider cultural authenticity when combining with other elements`
        ]
      } : undefined;

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
          qualityScore,
          culturalAuthenticity,
          musicalElements
        },
        processingTime,
        loopDetails: {
          pattern,
          characteristics,
          culturalElements,
          technicalSpecs: {
            sampleRate: qualityTier === "studio" ? 96000 : 44100,
            bitDepth: qualityTier === "studio" ? 32 : 24,
            format: "WAV",
            qualityTier
          }
        },
        educationalInsights
      };
    } catch (error) {
      console.error("Enhanced loop generation error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to generate loop with enhanced processing");
    }
  }
);

// Enhanced helper functions

function analyzePromptEnhanced(prompt: string, genre: Genre, culturalValidation?: boolean): string {
  const keywords = {
    energy: ['energetic', 'high-energy', 'upbeat', 'driving', 'powerful', 'explosive', 'dynamic'],
    mood: ['chill', 'relaxed', 'mellow', 'soulful', 'emotional', 'deep', 'spiritual', 'uplifting'],
    instruments: ['piano', 'saxophone', 'guitar', 'drums', 'bass', 'vocals', 'strings', 'organ'],
    style: ['jazzy', 'sophisticated', 'raw', 'polished', 'traditional', 'modern', 'authentic'],
    cultural: ['traditional', 'authentic', 'south african', 'township', 'gospel', 'jazz', 'kwaito']
  };

  const analysis = [];
  const lowerPrompt = prompt.toLowerCase();

  for (const [category, words] of Object.entries(keywords)) {
    const found = words.filter(word => lowerPrompt.includes(word));
    if (found.length > 0) {
      analysis.push(`${category}: ${found.join(', ')}`);
    }
  }

  if (culturalValidation) {
    const culturalElements = keywords.cultural.filter(word => lowerPrompt.includes(word));
    if (culturalElements.length > 0) {
      analysis.push(`cultural elements: ${culturalElements.join(', ')}`);
    }
  }

  return analysis.length > 0 ? analysis.join('; ') : `General ${genre} characteristics detected`;
}

function generateStyleCharacteristicsEnhanced(
  genre: Genre, 
  mood?: Mood, 
  promptAnalysis?: string, 
  culturalAuthenticity?: string
): string[] {
  const baseCharacteristics = genre === "private_school_amapiano" 
    ? ["Jazz-influenced harmonies", "Sophisticated chord progressions", "Subtle percussion", "Complex arrangements"]
    : ["Deep log drums", "Soulful piano melodies", "Rhythmic percussion", "Traditional amapiano elements"];

  const moodCharacteristics = {
    chill: ["Relaxed tempo", "Smooth transitions", "Laid-back groove"],
    energetic: ["Driving rhythm", "Dynamic arrangement", "High-energy percussion"],
    soulful: ["Emotional depth", "Rich harmonies", "Gospel influences"],
    jazzy: ["Complex chords", "Improvised elements", "Sophisticated voicings"],
    deep: ["Atmospheric pads", "Sub-bass emphasis", "Hypnotic rhythms"],
    mellow: ["Gentle dynamics", "Warm tones", "Peaceful atmosphere"]
  };

  const culturalCharacteristics = {
    traditional: ["Authentic South African elements", "Traditional rhythmic patterns", "Cultural authenticity"],
    modern: ["Contemporary production", "Modern sound design", "Urban influences"],
    fusion: ["Cross-cultural elements", "Genre blending", "Innovative approaches"]
  };

  if (mood && moodCharacteristics[mood]) {
    baseCharacteristics.push(...moodCharacteristics[mood]);
  }

  if (culturalAuthenticity && culturalCharacteristics[culturalAuthenticity]) {
    baseCharacteristics.push(...culturalCharacteristics[culturalAuthenticity]);
  }

  return baseCharacteristics;
}

function generateCulturalElements(genre: Genre, culturalAuthenticity?: string): string[] {
  const baseElements = genre === "private_school_amapiano" 
    ? ["Jazz sophistication", "Urban South African influences", "Contemporary amapiano evolution"]
    : ["Traditional log drum patterns", "Gospel piano influences", "Township musical heritage"];

  const authenticityElements = {
    traditional: ["Ancestral rhythmic patterns", "Traditional South African instruments", "Cultural storytelling"],
    modern: ["Contemporary urban sounds", "Modern production techniques", "Global influences"],
    fusion: ["Cross-cultural musical dialogue", "Genre innovation", "Cultural bridge-building"],
    authentic: ["Pure South African musical DNA", "Uncompromised cultural integrity", "Traditional wisdom"]
  };

  if (culturalAuthenticity && authenticityElements[culturalAuthenticity]) {
    baseElements.push(...authenticityElements[culturalAuthenticity]);
  }

  return baseElements;
}

function calculateQualityScoreEnhanced(req: GenerateTrackRequest, sourceData?: any, qualityTier?: string): number {
  let score = 0.70; // Base score

  // Prompt quality
  if (req.prompt.length > 100) score += 0.10;
  if (req.prompt.includes('amapiano')) score += 0.05;
  if (req.prompt.includes('authentic') || req.prompt.includes('traditional')) score += 0.05;

  // Advanced options
  if (req.advancedOptions) score += 0.10;
  if (req.advancedOptions?.arrangement === "professional") score += 0.05;
  if (req.advancedOptions?.culturalAuthenticity === "authentic") score += 0.05;

  // Quality tier bonus
  if (qualityTier === "studio") score += 0.15;
  else if (qualityTier === "professional") score += 0.10;

  // Enhanced generation bonus
  if (req.enhancedGeneration) score += 0.10;

  // Source analysis bonus
  if (sourceData) score += 0.10;

  // Genre-specific bonus
  if (req.genre === "private_school_amapiano") score += 0.05;

  return Math.min(1.0, score);
}

function calculateCulturalAuthenticity(genre: Genre, culturalAuthenticity?: string, sourceData?: any): number {
  let score = 0.70; // Base cultural score

  // Genre bonus
  if (genre === "private_school_amapiano") score += 0.05;
  else score += 0.10; // Classic amapiano gets higher base authenticity

  // Cultural authenticity setting
  if (culturalAuthenticity === "authentic") score += 0.20;
  else if (culturalAuthenticity === "traditional") score += 0.15;
  else if (culturalAuthenticity === "modern") score += 0.10;
  else if (culturalAuthenticity === "fusion") score += 0.05;

  // Source data bonus
  if (sourceData?.culturalAuthenticity) score += 0.05;

  return Math.min(0.98, score);
}

function assessMusicalComplexity(req: GenerateTrackRequest, arrangement: string, instrumentation: string[]): "simple" | "intermediate" | "advanced" | "expert" {
  let complexityScore = 0;

  // Arrangement complexity
  if (arrangement === "professional") complexityScore += 3;
  else if (arrangement === "complex") complexityScore += 2;
  else if (arrangement === "standard") complexityScore += 1;

  // Instrumentation complexity
  if (instrumentation.length >= 6) complexityScore += 2;
  else if (instrumentation.length >= 4) complexityScore += 1;

  // Genre complexity
  if (req.genre === "private_school_amapiano") complexityScore += 1;

  // Advanced options complexity
  if (req.advancedOptions?.culturalAuthenticity === "authentic") complexityScore += 1;
  if (req.enhancedGeneration) complexityScore += 1;

  if (complexityScore >= 6) return "expert";
  if (complexityScore >= 4) return "advanced";
  if (complexityScore >= 2) return "intermediate";
  return "simple";
}

function generateLoopStyleEnhanced(category: string, genre: Genre, complexity: string, culturalAuthenticity?: string): string {
  const styles = {
    log_drum: {
      amapiano: complexity === "expert" ? ["masterful", "legendary", "iconic"] : 
                complexity === "advanced" ? ["sophisticated", "complex", "nuanced"] :
                ["classic", "deep", "punchy"],
      private_school_amapiano: complexity === "expert" ? ["refined", "elegant", "sophisticated"] :
                               ["subtle", "refined", "minimal"]
    },
    piano: {
      amapiano: complexity === "expert" ? ["virtuosic", "masterful", "transcendent"] :
                ["soulful", "gospel", "emotional"],
      private_school_amapiano: complexity === "expert" ? ["virtuosic", "sophisticated", "complex"] :
                               ["jazzy", "sophisticated", "complex"]
    },
    // Add more categories...
  };

  const categoryStyles = styles[category as keyof typeof styles]?.[genre] || ["standard"];
  let selectedStyle = categoryStyles[Math.floor(Math.random() * categoryStyles.length)];

  // Cultural authenticity modifier
  if (culturalAuthenticity === "traditional") {
    selectedStyle = "traditional " + selectedStyle;
  } else if (culturalAuthenticity === "modern") {
    selectedStyle = "modern " + selectedStyle;
  }

  return selectedStyle;
}

function generatePatternDescriptionEnhanced(category: string, complexity: string, genre: Genre, culturalAuthenticity?: string): string {
  const patterns = {
    log_drum: {
      simple: "x-x-.-x-",
      intermediate: "x-x-.-x-x-.-x-.-",
      advanced: "x-x.x-x.x-x.x-x.",
      expert: "x-x.x-x.x-x.x-x.x.x-x.x-"
    },
    piano: {
      simple: "C-Am-F-G",
      intermediate: "Cmaj7-Am7-Fmaj7-G7",
      advanced: "Cmaj9-Am7add11-Fmaj7#11-G13sus4",
      expert: "Cmaj9#11-Am7add11/C-Fmaj7#11/A-G13sus4/B"
    },
    // Add more categories...
  };

  let pattern = patterns[category as keyof typeof patterns]?.[complexity] || "Standard pattern";

  // Cultural authenticity modifier
  if (culturalAuthenticity === "traditional") {
    pattern += " (traditional style)";
  } else if (culturalAuthenticity === "modern") {
    pattern += " (modern interpretation)";
  }

  return pattern;
}

function generateLoopCharacteristicsEnhanced(category: string, genre: Genre, complexity: string, culturalAuthenticity?: string): string[] {
  const baseCharacteristics = {
    log_drum: ["Deep resonance", "Rhythmic foundation", "Signature amapiano sound"],
    piano: ["Harmonic richness", "Melodic expression", "Gospel influences"],
    percussion: ["Rhythmic texture", "Dynamic accents", "Cultural patterns"],
    bass: ["Low-end foundation", "Groove support", "Deep house influence"]
  };

  const genreCharacteristics = genre === "private_school_amapiano"
    ? ["Sophisticated", "Refined", "Jazz-influenced", "Urban"]
    : ["Traditional", "Soulful", "Energetic", "Authentic"];

  const complexityCharacteristics = {
    simple: ["Straightforward", "Easy to follow", "Foundational"],
    intermediate: ["Moderately complex", "Engaging", "Well-structured"],
    advanced: ["Highly complex", "Intricate", "Professional"],
    expert: ["Masterful", "Virtuosic", "Transcendent"]
  };

  const culturalCharacteristics = {
    traditional: ["Culturally authentic", "Traditional patterns", "Ancestral wisdom"],
    modern: ["Contemporary approach", "Urban influences", "Modern production"],
    fusion: ["Cross-cultural", "Innovative", "Bridge-building"]
  };

  let characteristics = [
    ...baseCharacteristics[category as keyof typeof baseCharacteristics] || [],
    ...genreCharacteristics,
    ...complexityCharacteristics[complexity as keyof typeof complexityCharacteristics] || []
  ];

  if (culturalAuthenticity && culturalCharacteristics[culturalAuthenticity]) {
    characteristics.push(...culturalCharacteristics[culturalAuthenticity]);
  }

  return characteristics;
}

function generateLoopCulturalElements(category: string, genre: Genre, culturalAuthenticity: string): string[] {
  const elements = [];

  if (category === "log_drum") {
    elements.push("Traditional South African log drum techniques");
    if (culturalAuthenticity === "traditional") {
      elements.push("Ancestral rhythmic patterns", "Township musical heritage");
    }
  }

  if (category === "piano") {
    elements.push("South African gospel piano traditions");
    if (genre === "private_school_amapiano") {
      elements.push("Jazz influences from South African urban music");
    }
  }

  if (culturalAuthenticity === "traditional") {
    elements.push("Authentic South African musical DNA");
  } else if (culturalAuthenticity === "modern") {
    elements.push("Contemporary South African urban influences");
  }

  return elements;
}

function generateMusicalElements(category: string, complexity: string, genre: Genre): string[] {
  const elements = [];

  if (category === "log_drum") {
    elements.push("Kick pattern", "Accent placement");
    if (complexity === "advanced" || complexity === "expert") {
      elements.push("Polyrhythmic layers", "Dynamic variations");
    }
  }

  if (category === "piano") {
    elements.push("Chord voicings", "Melodic phrases");
    if (genre === "private_school_amapiano") {
      elements.push("Jazz extensions", "Complex harmonies");
    }
    if (complexity === "expert") {
      elements.push("Virtuosic passages", "Improvisational elements");
    }
  }

  return elements;
}

// Schemas for getGenerationHistory
interface GenerationHistoryFilter {
  hasSourceAnalysis?: boolean;
  minQuality?: number;
  qualityTier?: string;
  transformationType?: string;
}

export interface GetGenerationHistoryRequest {
  genre?: Genre;
  filterBy?: GenerationHistoryFilter;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

interface GenerationHistoryTrack {
  id: number;
  prompt: string;
  genre: Genre;
  mood?: string;
  bpm?: number;
  keySignature?: string;
  fileUrl?: string;
  qualityRating?: number;
  culturalAuthenticity?: number;
  musicalComplexity?: string;
  energyLevel?: number;
  danceability?: number;
  qualityTier?: string;
  processingTime?: number;
  transformationType?: string;
  createdAt: Date;
}

interface GenreDistribution {
  count: number;
  avgQuality: number;
  avgCultural: number;
}

interface GenerationHistoryStatistics {
  totalGenerations: number;
  averageProcessingTime: number;
  averageEnergyLevel: number;
  averageDanceability: number;
  genreDistribution: Record<Genre, GenreDistribution>;
}

export interface GetGenerationHistoryResponse {
  tracks: GenerationHistoryTrack[];
  totalCount: number;
  averageQuality: number;
  averageCulturalAuthenticity: number;
  statistics: GenerationHistoryStatistics;
}

// Keep existing endpoints with enhanced implementations
export const getGenerationHistory = api<GetGenerationHistoryRequest, GetGenerationHistoryResponse>(
  { expose: true, method: "GET", path: "/generate/history" },
  async (req) => {
    // Enhanced implementation with cultural metrics and quality tiers
    let query = `SELECT id, prompt, genre, mood, bpm, key_signature, file_url, quality_rating, cultural_authenticity_score, musical_complexity, energy_level, danceability, quality_tier, processing_time_ms, transformation_type, created_at FROM generated_tracks WHERE 1=1`;
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

    if (req.filterBy?.qualityTier) {
      query += ` AND quality_tier = $${paramIndex}`;
      params.push(req.filterBy.qualityTier);
      paramIndex++;
    }

    if (req.filterBy?.transformationType) {
      query += ` AND transformation_type = $${paramIndex}`;
      params.push(req.filterBy.transformationType);
      paramIndex++;
    }

    // Enhanced sorting with new metrics
    const sortBy = req.sortBy || "date";
    const sortOrder = req.sortOrder || "desc";
    
    switch (sortBy) {
      case "quality":
        query += ` ORDER BY quality_rating ${sortOrder.toUpperCase()}`;
        break;
      case "cultural":
        query += ` ORDER BY cultural_authenticity_score ${sortOrder.toUpperCase()} NULLS LAST`;
        break;
      case "complexity":
        query += ` ORDER BY musical_complexity ${sortOrder.toUpperCase()}`;
        break;
      case "energy":
        query += ` ORDER BY energy_level ${sortOrder.toUpperCase()}`;
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

    try {
      const tracks = await musicDB.rawQueryAll<any>(query, ...params);

      // Enhanced statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_generations,
          AVG(processing_time_ms) as avg_processing_time,
          AVG(quality_rating) as avg_quality,
          AVG(cultural_authenticity_score) as avg_cultural,
          AVG(energy_level) as avg_energy,
          AVG(danceability) as avg_danceability
        FROM generated_tracks
      `;
      const stats = await musicDB.queryRow<any>(statsQuery);

      // Genre distribution with enhanced metrics
      const genreDistQuery = `
        SELECT 
          genre, 
          COUNT(*) as count,
          AVG(quality_rating) as avg_quality,
          AVG(cultural_authenticity_score) as avg_cultural
        FROM generated_tracks 
        GROUP BY genre
      `;
      const genreResults = await musicDB.queryAll<any>(genreDistQuery);
      const genreDistribution = genreResults.reduce((acc, row) => {
        acc[row.genre] = {
          count: row.count,
          avgQuality: Math.round((row.avg_quality || 0) * 100) / 100,
          avgCultural: Math.round((row.avg_cultural || 0) * 100) / 100
        };
        return acc;
      }, {} as Record<Genre, any>);

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
          culturalAuthenticity: track.cultural_authenticity_score,
          musicalComplexity: track.musical_complexity,
          energyLevel: track.energy_level,
          danceability: track.danceability,
          qualityTier: track.quality_tier,
          processingTime: track.processing_time_ms,
          transformationType: track.transformation_type,
          createdAt: track.created_at
        })),
        totalCount: stats?.total_generations || 0,
        averageQuality: Math.round((stats?.avg_quality || 0) * 100) / 100,
        averageCulturalAuthenticity: Math.round((stats?.avg_cultural || 0) * 100) / 100,
        statistics: {
          totalGenerations: stats?.total_generations || 0,
          averageProcessingTime: Math.round(stats?.avg_processing_time || 0),
          averageEnergyLevel: Math.round((stats?.avg_energy || 0) * 100) / 100,
          averageDanceability: Math.round((stats?.avg_danceability || 0) * 100) / 100,
          genreDistribution
        }
      };
    } catch (error) {
      console.error("Enhanced database query error:", error);
      return {
        tracks: [],
        totalCount: 0,
        averageQuality: 0,
        averageCulturalAuthenticity: 0,
        statistics: {
          totalGenerations: 0,
          averageProcessingTime: 0,
          averageEnergyLevel: 0,
          averageDanceability: 0,
          genreDistribution: {} as Record<Genre, any>
        }
      };
    }
  }
);

// Schemas for getGenerationStats
interface GenreStats {
  count: number;
  avgQuality: number;
  avgCultural: number;
  avgEnergy: number;
}

interface QualityTierStats {
  count: number;
  avgQuality: number;
}

interface ProcessingStats {
  averageTime: number;
  fastestTime: number;
  slowestTime: number;
}

interface QualityMetrics {
  averageQuality: number;
  averageCulturalAuthenticity: number;
  averageEnergyLevel: number;
  averageDanceability: number;
}

export interface GetGenerationStatsResponse {
  totalGenerations: number;
  generationsByGenre: Record<Genre, GenreStats>;
  qualityTierDistribution: Record<string, QualityTierStats>;
  complexityDistribution: Record<string, number>;
  processingStats: ProcessingStats;
  qualityMetrics: QualityMetrics;
}

export const getGenerationStats = api<void, GetGenerationStatsResponse>(
  { expose: true, method: "GET", path: "/generate/stats" },
  async () => {
    try {
      // Enhanced statistics with cultural and quality metrics
      const totalResult = await musicDB.queryRow<{count: number}>`
        SELECT COUNT(*) as count FROM generated_tracks
      `;
      const totalGenerations = totalResult?.count || 0;

      // Enhanced genre statistics
      const genreResults = await musicDB.queryAll<any>`
        SELECT 
          genre, 
          COUNT(*) as count,
          AVG(quality_rating) as avg_quality,
          AVG(cultural_authenticity_score) as avg_cultural,
          AVG(energy_level) as avg_energy
        FROM generated_tracks 
        GROUP BY genre
      `;
      const generationsByGenre = genreResults.reduce((acc, row) => {
        acc[row.genre] = {
          count: row.count,
          avgQuality: Math.round((row.avg_quality || 0) * 100) / 100,
          avgCultural: Math.round((row.avg_cultural || 0) * 100) / 100,
          avgEnergy: Math.round((row.avg_energy || 0) * 100) / 100
        };
        return acc;
      }, {} as Record<Genre, any>);

      // Quality tier distribution
      const qualityTierResults = await musicDB.queryAll<any>`
        SELECT 
          quality_tier, 
          COUNT(*) as count,
          AVG(quality_rating) as avg_quality
        FROM generated_tracks
        WHERE quality_tier IS NOT NULL
        GROUP BY quality_tier
      `;

      // Musical complexity distribution
      const complexityResults = await musicDB.queryAll<any>`
        SELECT 
          musical_complexity, 
          COUNT(*) as count
        FROM generated_tracks
        WHERE musical_complexity IS NOT NULL
        GROUP BY musical_complexity
      `;

      // Enhanced processing statistics
      const processingStats = await musicDB.queryRow<any>`
        SELECT 
          AVG(processing_time_ms) as avg_time,
          MIN(processing_time_ms) as min_time,
          MAX(processing_time_ms) as max_time,
          AVG(quality_rating) as avg_quality,
          AVG(cultural_authenticity_score) as avg_cultural,
          AVG(energy_level) as avg_energy,
          AVG(danceability) as avg_danceability
        FROM generated_tracks
        WHERE processing_time_ms IS NOT NULL
      `;

      return {
        totalGenerations,
        generationsByGenre,
        qualityTierDistribution: qualityTierResults.reduce((acc, row) => {
          acc[row.quality_tier] = {
            count: row.count,
            avgQuality: Math.round((row.avg_quality || 0) * 100) / 100
          };
          return acc;
        }, {}),
        complexityDistribution: complexityResults.reduce((acc, row) => {
          acc[row.musical_complexity] = row.count;
          return acc;
        }, {}),
        processingStats: {
          averageTime: Math.round(processingStats?.avg_time || 0),
          fastestTime: processingStats?.min_time || 0,
          slowestTime: processingStats?.max_time || 0
        },
        qualityMetrics: {
          averageQuality: Math.round((processingStats?.avg_quality || 0) * 100) / 100,
          averageCulturalAuthenticity: Math.round((processingStats?.avg_cultural || 0) * 100) / 100,
          averageEnergyLevel: Math.round((processingStats?.avg_energy || 0) * 100) / 100,
          averageDanceability: Math.round((processingStats?.avg_danceability || 0) * 100) / 100
        }
      };
    } catch (error) {
      console.error("Enhanced stats query error:", error);
      return {
        totalGenerations: 0,
        generationsByGenre: {} as Record<Genre, any>,
        qualityTierDistribution: {},
        complexityDistribution: {},
        processingStats: { averageTime: 0, fastestTime: 0, slowestTime: 0 },
        qualityMetrics: {
          averageQuality: 0,
          averageCulturalAuthenticity: 0,
          averageEnergyLevel: 0,
          averageDanceability: 0
        }
      };
    }
  }
);
