import { secret } from "encore.dev/config";
import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { OpenAI } from "openai";
import type { MidiNote } from "./types";
import { audioProcessor } from './audio-processor';
import { culturalValidator } from './cultural-validator';

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
  genre: 'amapiano' | 'private_school_amapiano' | 'bacardi' | 'sgija';
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
  private culturalValidator: any;
  private audioProcessor: any;
  private openai: OpenAI;

  constructor() {
    this.config = {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.7,
      culturalWeight: 0.8
    };
    this.culturalValidator = culturalValidator;
    this.audioProcessor = audioProcessor;
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

      // Robust JSON parsing
      let jsonString = content;
      if (!content.trim().startsWith('{')) {
        const jsonStartIndex = content.indexOf('{');
        const jsonEndIndex = content.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          jsonString = content.substring(jsonStartIndex, jsonEndIndex + 1);
        }
      }
      
      let result;
      try {
        result = JSON.parse(jsonString);
      } catch (e) {
        log.error("Failed to parse JSON from AI response", { rawContent: content, attemptedJson: jsonString, error: (e as Error).message });
        throw new Error("AI returned a response that could not be parsed as JSON.");
      }
      
      // Basic validation
      if (!result.notes || !Array.isArray(result.notes) || typeof result.duration !== 'number') {
        log.error("Invalid JSON structure from AI", { parsedJson: result });
        throw new Error("AI returned valid JSON but with an incorrect or incomplete structure.");
      }
  
      return {
        notes: result.notes as MidiNote[],
        duration: result.duration as number,
      };
  
    } catch (error: any) {
      // Check for OpenAI quota/rate limit error (status 429)
      if (error && error.status === 429) {
        log.warn("OpenAI quota exceeded. Returning a fallback MIDI pattern.", { prompt });
        
        // Return a predefined fallback pattern
        return {
          duration: 4,
          notes: [
            { pitch: 36, startTime: 0, duration: 0.5, velocity: 100 },
            { pitch: 38, startTime: 1, duration: 0.25, velocity: 80 },
            { pitch: 36, startTime: 1.5, duration: 0.5, velocity: 100 },
            { pitch: 36, startTime: 2.5, duration: 0.5, velocity: 90 },
            { pitch: 38, startTime: 3, duration: 0.25, velocity: 80 },
            { pitch: 36, startTime: 3.5, duration: 0.5, velocity: 100 },
          ],
        };
      }

      log.error("Error generating MIDI pattern with OpenAI", { 
        errorMessage: (error as Error).message, 
        stack: (error as Error).stack 
      });
      
      // Let the generic error handler create a more detailed message
      throw error;
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
        results.culturalAnalysis = await this.culturalValidator.analyzeAudio(request.audioBuffer, 'amapiano');
      }

      // Quality metrics
      results.qualityMetrics = await this.audioProcessor.assessAudioQuality(request.audioBuffer);

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

export { culturalValidator as CulturalValidator } from './cultural-validator';

export { audioProcessor as AudioProcessor } from './audio-processor';
