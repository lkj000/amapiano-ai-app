/**
 * AMAPIANO AI PLUGIN SDK
 * 
 * Comprehensive SDK for developing plugins for the Amapiano AI DAW.
 * Provides utilities, helpers, and cultural context for authentic plugin development.
 */

import type {
  PluginParameter,
  PluginPreset,
  PluginMetadata,
  PluginSDK,
  MIDIEvent
} from './types';

export class AmapianoPluginSDK implements PluginSDK {
  // Create parameter with smart defaults
  createParameter(config: Partial<PluginParameter>): PluginParameter {
    return {
      id: config.id || 'param',
      name: config.name || 'Parameter',
      label: config.label || config.name || 'Parameter',
      type: config.type || 'float',
      defaultValue: config.defaultValue ?? 0.5,
      minValue: config.minValue,
      maxValue: config.maxValue,
      step: config.step,
      unit: config.unit,
      enumValues: config.enumValues,
      isAutomatable: config.isAutomatable ?? true,
      group: config.group
    };
  }

  // Create preset
  createPreset(name: string, parameters: Record<string, any>): PluginPreset {
    return {
      id: `preset_${Date.now()}`,
      name,
      parameters,
      createdAt: new Date()
    };
  }

  // DSP Utilities
  dsp = {
    createOscillator: (type: 'sine' | 'square' | 'sawtooth' | 'triangle') => {
      return new OscillatorHelper(type);
    },

    createFilter: (type: 'lowpass' | 'highpass' | 'bandpass' | 'notch') => {
      return new FilterHelper(type);
    },

    createEnvelope: (attack: number, decay: number, sustain: number, release: number) => {
      return new EnvelopeHelper(attack, decay, sustain, release);
    },

    createLFO: (frequency: number, shape: 'sine' | 'square' | 'triangle') => {
      return new LFOHelper(frequency, shape);
    }
  };

  // MIDI Utilities
  midi = {
    noteToFrequency: (note: number): number => {
      return 440 * Math.pow(2, (note - 69) / 12);
    },

    frequencyToNote: (frequency: number): number => {
      return 69 + 12 * Math.log2(frequency / 440);
    },

    velocityToGain: (velocity: number): number => {
      // Non-linear velocity curve for more natural feel
      return Math.pow(velocity / 127, 1.5);
    },

    createMIDIEvent: (
      type: MIDIEvent['type'],
      note?: number,
      velocity?: number,
      channel: number = 0
    ): MIDIEvent => {
      return {
        type,
        note,
        velocity,
        channel,
        timestamp: 0
      };
    }
  };

  // UI Utilities
  ui = {
    createKnob: (parameter: PluginParameter): HTMLElement => {
      const container = document.createElement('div');
      container.className = 'plugin-knob';
      container.innerHTML = `
        <div class="knob-label">${parameter.label}</div>
        <input 
          type="range" 
          min="${parameter.minValue || 0}" 
          max="${parameter.maxValue || 1}"
          step="${parameter.step || 0.01}"
          value="${parameter.defaultValue}"
          data-param-id="${parameter.id}"
        />
        <div class="knob-value">${parameter.defaultValue}${parameter.unit || ''}</div>
      `;
      return container;
    },

    createSlider: (parameter: PluginParameter): HTMLElement => {
      const container = document.createElement('div');
      container.className = 'plugin-slider';
      container.innerHTML = `
        <label>${parameter.label}</label>
        <input 
          type="range" 
          min="${parameter.minValue || 0}" 
          max="${parameter.maxValue || 1}"
          step="${parameter.step || 0.01}"
          value="${parameter.defaultValue}"
          data-param-id="${parameter.id}"
        />
        <span class="value">${parameter.defaultValue}${parameter.unit || ''}</span>
      `;
      return container;
    },

    createSwitch: (parameter: PluginParameter): HTMLElement => {
      const container = document.createElement('div');
      container.className = 'plugin-switch';
      container.innerHTML = `
        <label>${parameter.label}</label>
        <input 
          type="checkbox" 
          ${parameter.defaultValue ? 'checked' : ''}
          data-param-id="${parameter.id}"
        />
      `;
      return container;
    },

    createDropdown: (parameter: PluginParameter): HTMLElement => {
      const container = document.createElement('div');
      container.className = 'plugin-dropdown';
      const options = parameter.enumValues?.map(ev => 
        `<option value="${ev.value}">${ev.label}</option>`
      ).join('') || '';
      
      container.innerHTML = `
        <label>${parameter.label}</label>
        <select data-param-id="${parameter.id}">
          ${options}
        </select>
      `;
      return container;
    }
  };

  // Cultural Context Helpers
  cultural = {
    // Traditional Amapiano scales
    getAmapianoScales: (): Record<string, number[]> => {
      return {
        'minor_pentatonic': [0, 3, 5, 7, 10], // Common in African music
        'blues_scale': [0, 3, 5, 6, 7, 10],
        'dorian': [0, 2, 3, 5, 7, 9, 10], // Popular in jazz-influenced amapiano
        'mixolydian': [0, 2, 4, 5, 7, 9, 10], // Gospel influence
        'natural_minor': [0, 2, 3, 5, 7, 8, 10]
      };
    },

    // Traditional rhythmic patterns
    getTraditionalRhythms: (): Record<string, number[]> => {
      return {
        'log_drum_basic': [0, 0.25, 0.75, 1, 1.5, 2, 2.5, 3],
        'log_drum_syncopated': [0, 0.375, 0.75, 1, 1.375, 2, 2.375, 3],
        'shaker_16th': [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75],
        'three_over_four': [0, 0.667, 1.333, 2, 2.667, 3.333] // Polyrhythm
      };
    },

    // Gospel-influenced chord progressions
    getGospelChords: (): Record<string, number[][]> => {
      return {
        'I-vi-IV-V': [[0, 4, 7], [9, 0, 4], [5, 9, 0], [7, 11, 2]],
        'ii-V-I': [[2, 5, 9], [7, 11, 2], [0, 4, 7]],
        'I-IV-v-IV': [[0, 4, 7], [5, 9, 0], [7, 11, 2], [5, 9, 0]],
        'gospel_turnaround': [[0, 4, 7], [9, 0, 4], [5, 9, 0], [7, 11, 2]]
      };
    },

    // Cultural metadata helper
    createCulturalMetadata: (
      genre: 'amapiano' | 'private_school_amapiano',
      significance: string,
      traditionalInstrument?: string
    ) => {
      return {
        culturalContext: {
          genre,
          culturalSignificance: significance,
          traditionalInstrument
        }
      };
    }
  };

  // Validation helpers
  validation = {
    validateMetadata: (metadata: Partial<PluginMetadata>): boolean => {
      return !!(
        metadata.id &&
        metadata.name &&
        metadata.version &&
        metadata.author &&
        metadata.type &&
        metadata.format
      );
    },

    validateParameter: (param: Partial<PluginParameter>): boolean => {
      return !!(
        param.id &&
        param.name &&
        param.type &&
        param.defaultValue !== undefined
      );
    }
  };

  // Audio utilities
  audio = {
    linearToDecibels: (linear: number): number => {
      return 20 * Math.log10(linear);
    },

    decibelsToLinear: (db: number): number => {
      return Math.pow(10, db / 20);
    },

    clamp: (value: number, min: number, max: number): number => {
      return Math.max(min, Math.min(max, value));
    },

    lerp: (a: number, b: number, t: number): number => {
      return a + (b - a) * t;
    },

    smoothstep: (edge0: number, edge1: number, x: number): number => {
      const t = this.audio.clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }
  };
}

// DSP Helper Classes

class OscillatorHelper {
  private phase = 0;
  private type: 'sine' | 'square' | 'sawtooth' | 'triangle';

  constructor(type: 'sine' | 'square' | 'sawtooth' | 'triangle') {
    this.type = type;
  }

  process(frequency: number, sampleRate: number): number {
    const value = this.getValue();
    this.phase += frequency / sampleRate;
    if (this.phase >= 1) this.phase -= 1;
    return value;
  }

  private getValue(): number {
    switch (this.type) {
      case 'sine':
        return Math.sin(2 * Math.PI * this.phase);
      case 'square':
        return this.phase < 0.5 ? 1 : -1;
      case 'sawtooth':
        return 2 * this.phase - 1;
      case 'triangle':
        return this.phase < 0.5 
          ? 4 * this.phase - 1 
          : -4 * this.phase + 3;
    }
  }

  reset(): void {
    this.phase = 0;
  }
}

class FilterHelper {
  private type: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;

  constructor(type: 'lowpass' | 'highpass' | 'bandpass' | 'notch') {
    this.type = type;
  }

  setCoefficients(frequency: number, resonance: number, sampleRate: number): void {
    const omega = 2 * Math.PI * frequency / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * resonance);

    if (this.type === 'lowpass') {
      this.b0 = (1 - cs) / 2;
      this.b1 = 1 - cs;
      this.b2 = (1 - cs) / 2;
      const a0 = 1 + alpha;
      this.a1 = (-2 * cs) / a0;
      this.a2 = (1 - alpha) / a0;
      this.b0 /= a0;
      this.b1 /= a0;
      this.b2 /= a0;
    }
    // Add other filter types as needed
  }

  process(input: number): number {
    const output = 
      this.b0 * input +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;

    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;

    return output;
  }
}

class EnvelopeHelper {
  private attack: number;
  private decay: number;
  private sustain: number;
  private release: number;
  private phase = 0;
  private isActive = false;

  constructor(attack: number, decay: number, sustain: number, release: number) {
    this.attack = attack;
    this.decay = decay;
    this.sustain = sustain;
    this.release = release;
  }

  trigger(): void {
    this.isActive = true;
    this.phase = 0;
  }

  release(): void {
    this.isActive = false;
  }

  process(sampleRate: number): number {
    if (this.isActive) {
      const attackSamples = this.attack * sampleRate;
      const decaySamples = this.decay * sampleRate;

      if (this.phase < attackSamples) {
        const value = this.phase / attackSamples;
        this.phase++;
        return value;
      } else if (this.phase < attackSamples + decaySamples) {
        const decayPhase = (this.phase - attackSamples) / decaySamples;
        const value = 1 - (1 - this.sustain) * decayPhase;
        this.phase++;
        return value;
      } else {
        return this.sustain;
      }
    } else {
      const releaseSamples = this.release * sampleRate;
      if (this.phase < releaseSamples) {
        const value = this.sustain * (1 - this.phase / releaseSamples);
        this.phase++;
        return value;
      }
      return 0;
    }
  }
}

class LFOHelper {
  private oscillator: OscillatorHelper;
  private frequency: number;

  constructor(frequency: number, shape: 'sine' | 'square' | 'triangle') {
    this.frequency = frequency;
    this.oscillator = new OscillatorHelper(shape);
  }

  process(sampleRate: number): number {
    return this.oscillator.process(this.frequency, sampleRate);
  }

  setFrequency(frequency: number): void {
    this.frequency = frequency;
  }
}

// Export SDK instance
export const sdk = new AmapianoPluginSDK();
export default sdk;
