import { secret } from "encore.dev/config";
import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { OpenAI } from "openai";
import type { MidiNote } from "./types";

// AI Service Configuration
const openAIKey = secret("OpenAIKey");
const huggingFaceKey = secret("HuggingFaceKey");

export interface AIGenerationConfig {
  provider: 'openai' | 'huggingface' | 'custom';
  model: string;
  maxTokens?: number;
  temperature?: number;
  culturalWeight?: number;
}

export interface MusicGenerationRequest {
  prompt: string;
  genre: 'amapiano' | 'private_school_amapiano';
  bpm?: number;
  keySignature?: string;
  duration?: number;
  mood?: string;
  culturalAuthenticity?: 'traditional' | 'modern' | 'fusion';
  qualityTier?: 'standard' | 'professional' | 'studio';
}

export interface AudioAnalysisRequest {
  audioBuffer: Buffer;
  analysisType: 'stems' | 'patterns' | 'cultural' | 'comprehensive';
  culturalValidation?: boolean;
}

export interface CulturalValidationResult {
  authenticityScore: number;
  culturalElements: string[];
  recommendations: string[];
  expertNotes?: string;
}

export class AIService {
  private config: AIGenerationConfig;
  private culturalValidator: CulturalValidator;
  private audioProcessor: AudioProcessor;
  private openai: OpenAI;

  constructor() {
    this.config = {
      provider: 'openai',
      model: 'gpt-oss-120b',
      maxTokens: 4096,
      temperature: 0.7,
      culturalWeight: 0.8
    };
    this.culturalValidator = new CulturalValidator();
    this.audioProcessor = new AudioProcessor();
    this.openai = new OpenAI({ apiKey: openAIKey() });
  }

  async generateMidiPattern(prompt: string): Promise<{ notes: MidiNote[], duration: number }> {
    const systemPrompt = `
      You are an expert Amapiano music producer. Your task is to generate a musical pattern in JSON format based on a user's prompt.
      The JSON response should be an object with two keys: "duration" (number, in beats, typically 4 or 8) and "notes" (an array of note objects).
      Each note object in the "notes" array must have the following keys:
      - "pitch": MIDI note number (integer from 0-127). For drums, use General MIDI mapping (e.g., 36 for kick, 38 for snare). For log drums, use low pitches like 36-48.
      - "velocity": How hard the note is played (integer from 0-127).
      - "startTime": When the note starts, in beats, from the beginning of the clip (float).
      - "duration": How long the note lasts, in beats (float).
      
      Analyze the user's prompt for instrument type (e.g., "log drum", "piano chords", "sax melody"), key, and style.
      - For "log drum", create a rhythmic bass pattern.
      - For "piano chords", create a chord progression with multiple notes playing simultaneously.
      - For "sax melody", create a monophonic sequence of notes.
      
      Respond ONLY with the JSON object. Do not include any other text, explanations, or markdown formatting.
    `;
  
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
  
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("AI returned empty content.");
      }

      const result = JSON.parse(content);
      
      // Basic validation
      if (!result.notes || !Array.isArray(result.notes) || typeof result.duration !== 'number') {
        throw new Error("Invalid JSON format from AI");
      }
  
      return {
        notes: result.notes as MidiNote[],
        duration: result.duration as number,
      };
  
    } catch (error) {
      log.error("Error generating MIDI pattern with OpenAI", { error });
      throw APIError.internal("Failed to generate musical pattern with AI.");
    }
  }

  async generateMusic(request: MusicGenerationRequest): Promise<{
    audioBuffer: Buffer;
    metadata: any;
    culturalValidation?: CulturalValidationResult;
  }> {
    try {
      log.info("Starting AI music generation", {
        genre: request.genre,
        prompt: request.prompt.substring(0, 100),
        culturalAuthenticity: request.culturalAuthenticity
      });

      // Parse prompt and extract musical parameters
      const musicalParams = await this.parsePromptToMusicalParams(request);
      
      // Generate base audio using AI model
      const baseAudio = await this.generateBaseAudio(musicalParams);
      
      // Apply genre-specific styling
      const styledAudio = await this.applyAmapianStyling(baseAudio, request);
      
      // Cultural validation if requested
      let culturalValidation: CulturalValidationResult | undefined;
      if (request.culturalAuthenticity) {
        culturalValidation = await this.culturalValidator.validate(styledAudio, request.genre);
      }

      // Quality enhancement based on tier
      const finalAudio = await this.enhanceAudioQuality(styledAudio, request.qualityTier || 'standard');

      const metadata = {
        bpm: musicalParams.bpm,
        keySignature: musicalParams.keySignature,
        genre: request.genre,
        duration: musicalParams.duration,
        culturalAuthenticity: culturalValidation?.authenticityScore,
        qualityTier: request.qualityTier || 'standard',
        generationTime: Date.now()
      };

      log.info("AI music generation completed", {
        duration: metadata.duration,
        culturalScore: culturalValidation?.authenticityScore,
        qualityTier: metadata.qualityTier
      });

      return {
        audioBuffer: finalAudio,
        metadata,
        culturalValidation
      };

    } catch (error) {
      log.error("AI music generation failed", { error: (error as Error).message, request });
      throw APIError.internal("Failed to generate music with AI");
    }
  }

  async analyzeAudio(request: AudioAnalysisRequest): Promise<{
    stems?: { [key: string]: Buffer };
    patterns?: any[];
    culturalAnalysis?: CulturalValidationResult;
    qualityMetrics: any;
  }> {
    try {
      log.info("Starting AI audio analysis", {
        analysisType: request.analysisType,
        culturalValidation: request.culturalValidation
      });

      const results: any = {};

      // Stem separation
      if (request.analysisType === 'stems' || request.analysisType === 'comprehensive') {
        results.stems = await this.audioProcessor.separateStems(request.audioBuffer);
      }

      // Pattern recognition
      if (request.analysisType === 'patterns' || request.analysisType === 'comprehensive') {
        results.patterns = await this.audioProcessor.detectPatterns(request.audioBuffer);
      }

      // Cultural analysis
      if (request.analysisType === 'cultural' || request.analysisType === 'comprehensive' || request.culturalValidation) {
        results.culturalAnalysis = await this.culturalValidator.analyzeAudio(request.audioBuffer);
      }

      // Quality metrics
      results.qualityMetrics = await this.audioProcessor.assessQuality(request.audioBuffer);

      log.info("AI audio analysis completed", {
        stemsCount: results.stems ? Object.keys(results.stems).length : 0,
        patternsCount: results.patterns?.length || 0,
        culturalScore: results.culturalAnalysis?.authenticityScore
      });

      return results;

    } catch (error) {
      log.error("AI audio analysis failed", { error: (error as Error).message });
      throw APIError.internal("Failed to analyze audio with AI");
    }
  }

  private async parsePromptToMusicalParams(request: MusicGenerationRequest): Promise<any> {
    // Use AI to parse natural language prompt into musical parameters
    const prompt = `
      Parse this music description into structured parameters for ${request.genre} generation:
      "${request.prompt}"
      
      Extract: tempo, key, mood, instruments, arrangement style, cultural elements.
      Consider ${request.genre} characteristics and ${request.culturalAuthenticity || 'traditional'} authenticity.
    `;

    // Simulate AI parsing (in real implementation, call OpenAI API)
    const lowerPrompt = request.prompt.toLowerCase();
    const bpmMatch = lowerPrompt.match(/(\d+)\s*bpm/);
    const keyMatch = lowerPrompt.match(/key of ([a-gA-G][#b]?m?)/);

    return {
      bpm: request.bpm || (bpmMatch ? parseInt(bpmMatch[1]) : (request.genre === 'private_school_amapiano' ? 112 : 118)),
      keySignature: request.keySignature || (keyMatch ? keyMatch[1] : 'F#m'),
      duration: request.duration || 180,
      mood: request.mood || this.extractMood(lowerPrompt) || 'soulful',
      instruments: this.extractInstruments(lowerPrompt, request.genre),
      culturalElements: this.extractCulturalElements(lowerPrompt, request.genre)
    };
  }

  private async generateBaseAudio(params: any): Promise<Buffer> {
    // Simulate AI audio generation
    // In real implementation, this would call music generation AI models
    log.info("Generating base audio with AI", params);
    
    // Return mock audio buffer for now
    return Buffer.from("AI_GENERATED_AUDIO_DATA");
  }

  private async applyAmapianStyling(audio: Buffer, request: MusicGenerationRequest): Promise<Buffer> {
    // Apply genre-specific styling and cultural elements
    log.info("Applying amapiano styling", { genre: request.genre });
    
    // Simulate style transfer
    return audio;
  }

  private async enhanceAudioQuality(audio: Buffer, tier: string): Promise<Buffer> {
    // Apply quality enhancement based on tier
    const enhancements = {
      standard: { sampleRate: 44100, bitDepth: 16 },
      professional: { sampleRate: 48000, bitDepth: 24 },
      studio: { sampleRate: 96000, bitDepth: 32 }
    };

    log.info("Enhancing audio quality", { tier, enhancement: enhancements[tier as keyof typeof enhancements] });
    
    return audio;
  }

  private extractMood(prompt: string): string | undefined {
    const moods = ['chill', 'energetic', 'soulful', 'groovy', 'mellow', 'uplifting', 'deep', 'jazzy'];
    return moods.find(mood => prompt.includes(mood));
  }

  private extractInstruments(prompt: string, genre: string): string[] {
    const instruments = new Set<string>();
    
    if (prompt.includes('log drum') || prompt.includes('bass drum')) instruments.add('log_drum');
    if (prompt.includes('piano') || prompt.includes('keys')) instruments.add('piano');
    if (prompt.includes('saxophone') || prompt.includes('sax')) instruments.add('saxophone');
    if (prompt.includes('guitar')) instruments.add('guitar');
    if (prompt.includes('vocal') || prompt.includes('voice')) instruments.add('vocals');

    // Add default instruments based on genre if none are specified
    if (instruments.size === 0) {
      if (genre === 'private_school_amapiano') {
        instruments.add('piano').add('log_drum').add('saxophone');
      } else {
        instruments.add('log_drum').add('piano').add('vocals');
      }
    }

    return Array.from(instruments);
  }

  private extractCulturalElements(prompt: string, genre: string): string[] {
    const elements = new Set<string>();
    
    if (prompt.includes('traditional') || prompt.includes('authentic')) elements.add('traditional_patterns');
    if (prompt.includes('jazz') || prompt.includes('sophisticated')) elements.add('jazz_influences');
    if (prompt.includes('gospel') || prompt.includes('spiritual')) elements.add('gospel_roots');
    if (prompt.includes('township') || prompt.includes('south african')) elements.add('township_heritage');

    return Array.from(elements);
  }
}

export class CulturalValidator {
  private expertRules: Map<string, any>;
  private authenticityThresholds: Map<string, number>;

  constructor() {
    this.expertRules = new Map();
    this.authenticityThresholds = new Map([
      ['amapiano', 0.75],
      ['private_school_amapiano', 0.70]
    ]);
    this.initializeExpertRules();
  }

  async validate(audioBuffer: Buffer, genre: string): Promise<CulturalValidationResult> {
    try {
      log.info("Starting cultural validation", { genre });

      const analysis = await this.analyzeAudio(audioBuffer);
      const score = this.calculateAuthenticityScore(analysis, genre);
      const elements = this.identifyCulturalElements(analysis, genre);
      const recommendations = this.generateRecommendations(analysis, genre, score);

      return {
        authenticityScore: score,
        culturalElements: elements,
        recommendations,
        expertNotes: this.getExpertNotes(genre, score)
      };

    } catch (error) {
      log.error("Cultural validation failed", { error: (error as Error).message });
      throw APIError.internal("Cultural validation failed");
    }
  }

  async analyzeAudio(audioBuffer: Buffer): Promise<any> {
    // Analyze audio for cultural elements
    return {
      rhythmicPatterns: this.analyzeRhythmicPatterns(audioBuffer),
      harmonicStructure: this.analyzeHarmonicStructure(audioBuffer),
      instrumentalTexture: this.analyzeInstrumentalTexture(audioBuffer),
      culturalMarkers: this.identifyCulturalMarkers(audioBuffer)
    };
  }

  private calculateAuthenticityScore(analysis: any, genre: string): number {
    let score = 0;
    const weights = {
      rhythmicPatterns: 0.3,
      harmonicStructure: 0.25,
      instrumentalTexture: 0.25,
      culturalMarkers: 0.2
    };

    // Calculate weighted score based on analysis
    score += analysis.rhythmicPatterns.authenticity * weights.rhythmicPatterns;
    score += analysis.harmonicStructure.authenticity * weights.harmonicStructure;
    score += analysis.instrumentalTexture.authenticity * weights.instrumentalTexture;
    score += analysis.culturalMarkers.authenticity * weights.culturalMarkers;

    // Apply genre-specific adjustments
    if (genre === 'private_school_amapiano') {
      // Boost score for jazz elements
      if (analysis.harmonicStructure.jazzInfluence > 0.7) {
        score += 0.1;
      }
    } else {
      // Boost score for traditional elements
      if (analysis.culturalMarkers.traditionalElements > 0.8) {
        score += 0.1;
      }
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  private identifyCulturalElements(analysis: any, genre: string): string[] {
    const elements = [];

    if (analysis.rhythmicPatterns.logDrumPresence > 0.8) {
      elements.push('Authentic log drum patterns');
    }
    if (analysis.harmonicStructure.gospelInfluence > 0.6) {
      elements.push('Gospel-influenced harmonies');
    }
    if (analysis.instrumentalTexture.southAfricanCharacter > 0.7) {
      elements.push('South African musical character');
    }
    if (genre === 'private_school_amapiano' && analysis.harmonicStructure.jazzInfluence > 0.6) {
      elements.push('Jazz sophistication');
    }

    return elements;
  }

  private generateRecommendations(analysis: any, genre: string, score: number): string[] {
    const recommendations = [];
    const threshold = this.authenticityThresholds.get(genre) || 0.75;

    if (score < threshold) {
      if (analysis.rhythmicPatterns.logDrumPresence < 0.6) {
        recommendations.push('Enhance log drum presence and authenticity');
      }
      if (analysis.harmonicStructure.gospelInfluence < 0.4) {
        recommendations.push('Incorporate more gospel-influenced chord progressions');
      }
      if (genre === 'private_school_amapiano' && analysis.harmonicStructure.jazzInfluence < 0.5) {
        recommendations.push('Add more sophisticated jazz harmonies');
      }
    }

    return recommendations;
  }

  private getExpertNotes(genre: string, score: number): string {
    if (score >= 0.9) {
      return `Exceptional ${genre} authenticity. This track demonstrates deep understanding of the genre's cultural roots.`;
    } else if (score >= 0.75) {
      return `Good ${genre} authenticity with room for cultural refinement.`;
    } else {
      return `Needs significant improvement to achieve authentic ${genre} character.`;
    }
  }

  private initializeExpertRules(): void {
    // Initialize expert validation rules
    this.expertRules.set('amapiano_log_drum', {
      frequency_range: [40, 120],
      attack_time: [0.01, 0.05],
      decay_pattern: 'exponential',
      cultural_significance: 'foundational'
    });

    this.expertRules.set('private_school_jazz_harmony', {
      chord_extensions: ['maj7', '9', '11', '13'],
      voice_leading: 'smooth',
      cultural_significance: 'sophisticated'
    });
  }

  private analyzeRhythmicPatterns(audioBuffer: Buffer): any {
    // Simulate rhythmic pattern analysis
    return {
      authenticity: 0.85,
      logDrumPresence: 0.9,
      swingFactor: 0.15,
      polyrhythmicComplexity: 0.7
    };
  }

  private analyzeHarmonicStructure(audioBuffer: Buffer): any {
    // Simulate harmonic analysis
    return {
      authenticity: 0.8,
      gospelInfluence: 0.75,
      jazzInfluence: 0.6,
      modalCharacter: 0.7
    };
  }

  private analyzeInstrumentalTexture(audioBuffer: Buffer): any {
    // Simulate instrumental texture analysis
    return {
      authenticity: 0.82,
      southAfricanCharacter: 0.85,
      instrumentalBalance: 0.8,
      productionStyle: 0.75
    };
  }

  private identifyCulturalMarkers(audioBuffer: Buffer): any {
    // Simulate cultural marker identification
    return {
      authenticity: 0.88,
      traditionalElements: 0.85,
      modernAdaptations: 0.7,
      culturalRespect: 0.9
    };
  }
}

export class AudioProcessor {
  async separateStems(audioBuffer: Buffer): Promise<{ [key: string]: Buffer }> {
    try {
      log.info("Starting AI stem separation");

      // Simulate advanced stem separation
      const stems = {
        drums: Buffer.from("SEPARATED_DRUMS_DATA"),
        bass: Buffer.from("SEPARATED_BASS_DATA"),
        piano: Buffer.from("SEPARATED_PIANO_DATA"),
        vocals: Buffer.from("SEPARATED_VOCALS_DATA"),
        other: Buffer.from("SEPARATED_OTHER_DATA")
      };

      log.info("Stem separation completed", { stemsCount: Object.keys(stems).length });
      return stems;

    } catch (error) {
      log.error("Stem separation failed", { error: (error as Error).message });
      throw APIError.internal("Stem separation failed");
    }
  }

  async detectPatterns(audioBuffer: Buffer): Promise<any[]> {
    try {
      log.info("Starting pattern detection");

      // Simulate advanced pattern detection
      const patterns = [
        {
          type: 'chord_progression',
          confidence: 0.95,
          data: {
            chords: ['Cmaj9', 'Am7', 'Fmaj7', 'G7sus4'],
            progression: 'I-vi-IV-V',
            culturalSignificance: 'Jazz-influenced amapiano progression'
          },
          timeRange: { start: 0, end: 8 }
        },
        {
          type: 'drum_pattern',
          confidence: 0.92,
          data: {
            pattern: 'x-x-.-x-x-.-x-.-',
            logDrumCharacter: 'authentic',
            culturalSignificance: 'Traditional amapiano log drum pattern'
          },
          timeRange: { start: 0, end: 4 }
        }
      ];

      log.info("Pattern detection completed", { patternsCount: patterns.length });
      return patterns;

    } catch (error) {
      log.error("Pattern detection failed", { error: (error as Error).message });
      throw APIError.internal("Pattern detection failed");
    }
  }

  async assessQuality(audioBuffer: Buffer): Promise<any> {
    try {
      log.info("Starting quality assessment");

      const metrics = {
        stemSeparationAccuracy: 0.95,
        patternRecognitionConfidence: 0.92,
        audioQualityScore: 0.88,
        culturalAccuracyScore: 0.85,
        technicalQuality: {
          dynamicRange: 85,
          frequencyResponse: 0.92,
          stereoImaging: 0.88,
          noiseFloor: -65
        }
      };

      log.info("Quality assessment completed", metrics);
      return metrics;

    } catch (error) {
      log.error("Quality assessment failed", { error: (error as Error).message });
      throw APIError.internal("Quality assessment failed");
    }
  }
}
