/**
 * AI Audio Service - Bridges GPT-4 MIDI generation with Tone.js playback
 * 
 * This service connects the AI-generated MIDI patterns from the backend
 * with the Web Audio API for real audio synthesis.
 */

import * as Tone from 'tone';
import backend from '~backend/client';
import type { MidiNote } from '~backend/music/types';
import { 
  createInstrument, 
  createAmApianoEffectChain, 
  applyAmApianoSwing,
  getAuthenticBPM 
} from '@/utils/audioUtils';

export interface AIGenerationOptions {
  prompt: string;
  genre: 'amapiano' | 'private_school_amapiano';
  instrument?: string;
  playImmediately?: boolean;
}

export interface GeneratedAudio {
  notes: MidiNote[];
  duration: number;
  instrument: Tone.Sampler | Tone.PolySynth;
  audioUrl?: string;
}

export class AIAudioService {
  private masterChannel: Tone.Channel;
  private effectChain: Tone.ToneAudioNode[];
  private activeInstruments: Map<string, Tone.Sampler | Tone.PolySynth>;

  constructor() {
    this.masterChannel = new Tone.Channel().toDestination();
    this.effectChain = createAmApianoEffectChain('master');
    this.activeInstruments = new Map();

    // Connect effect chain
    let previousNode: Tone.ToneAudioNode = this.masterChannel;
    this.effectChain.reverse().forEach(effect => {
      previousNode.disconnect();
      previousNode.connect(effect);
      effect.connect(this.masterChannel);
      previousNode = effect;
    });
  }

  /**
   * Generate MIDI pattern using AI and optionally play it immediately
   */
  async generateAndPlay(options: AIGenerationOptions): Promise<GeneratedAudio> {
    const { prompt, genre, instrument = 'Amapiano Piano', playImmediately = false } = options;

    try {
      // Initialize audio context if needed
      await Tone.start();
      
      // Set culturally authentic BPM
      const authenticBPM = getAuthenticBPM(genre);
      Tone.Transport.bpm.value = authenticBPM;

      // Call backend AI service to generate MIDI pattern
      const result = await backend.music.generateDawElement({
        prompt,
        trackType: 'midi',
        instrument,
      });

      const { notes, duration } = result.newTrack.clips[0];
      
      if (!notes || notes.length === 0) {
        throw new Error('AI generated empty MIDI pattern');
      }

      // Create instrument instance
      const trackChannel = new Tone.Channel().connect(this.masterChannel);
      const toneInstrument = createInstrument(instrument, trackChannel);
      
      this.activeInstruments.set(`ai_gen_${Date.now()}`, toneInstrument);

      // Apply Amapiano swing
      const swing = applyAmApianoSwing(genre === 'private_school_amapiano');
      Tone.Transport.swing = swing;

      if (playImmediately) {
        await this.playMidiNotes(notes, toneInstrument);
      }

      return {
        notes,
        duration,
        instrument: toneInstrument,
      };

    } catch (error) {
      console.error('AI audio generation failed:', error);
      throw error;
    }
  }

  /**
   * Play MIDI notes using a Tone.js instrument
   */
  async playMidiNotes(notes: MidiNote[], instrument: Tone.Sampler | Tone.PolySynth): Promise<void> {
    await Tone.start();

    const now = Tone.now();
    
    notes.forEach((note) => {
      const noteName = Tone.Frequency(note.pitch, "midi").toNote();
      const duration = Tone.Time(note.duration).toSeconds();
      const velocity = note.velocity / 127;
      const time = now + Tone.Time(note.startTime).toSeconds();

      instrument.triggerAttackRelease(noteName, duration, time, velocity);
    });
  }

  /**
   * Create a culturally authentic amapiano demo loop
   */
  async createDemoLoop(
    category: 'log_drum' | 'piano' | 'percussion' | 'bass',
    genre: 'amapiano' | 'private_school_amapiano'
  ): Promise<GeneratedAudio> {
    // Generate culturally appropriate prompt
    let prompt = '';
    
    switch (category) {
      case 'log_drum':
        prompt = `${genre} log drum pattern with authentic South African groove and syncopated rhythm`;
        break;
      case 'piano':
        prompt = genre === 'private_school_amapiano' 
          ? 'Jazz-influenced piano chords with sophisticated voicings (Cmaj9, Am7, Fmaj7, G7sus4)'
          : 'Soulful gospel piano progression with traditional amapiano feel';
        break;
      case 'percussion':
        prompt = `${genre} shaker and percussion pattern with cultural authenticity`;
        break;
      case 'bass':
        prompt = `Deep ${genre} bassline with sub-bass emphasis`;
        break;
    }

    return this.generateAndPlay({
      prompt,
      genre,
      instrument: this.getInstrumentForCategory(category),
      playImmediately: false,
    });
  }

  private getInstrumentForCategory(category: string): string {
    const instrumentMap: Record<string, string> = {
      'log_drum': 'Signature Log Drum',
      'piano': 'Amapiano Piano',
      'percussion': 'Shaker Groove Engine',
      'bass': 'Deep Bass',
    };
    
    return instrumentMap[category] || 'Amapiano Piano';
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.activeInstruments.forEach(inst => inst.dispose());
    this.activeInstruments.clear();
    this.effectChain.forEach(effect => effect.dispose());
    this.masterChannel.dispose();
  }
}

// Create singleton instance
export const aiAudioService = new AIAudioService();
