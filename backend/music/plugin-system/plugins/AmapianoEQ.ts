/**
 * AMAPIANO EQ
 * 
 * Culturally-aware equalizer optimized for amapiano music production.
 * Features presets for log drums, piano, and traditional amapiano mixing.
 */

import { BasePlugin } from '../BasePlugin';
import type {
  IEffectPlugin,
  PluginMetadata,
  PluginParameter,
  AudioProcessingContext,
  MIDIEvent,
  PluginType,
  PluginFormat
} from '../types';

interface BiquadFilter {
  type: 'lowshelf' | 'highshelf' | 'peaking';
  frequency: number;
  gain: number;
  q: number;
  // Filter coefficients
  a0: number;
  a1: number;
  a2: number;
  b0: number;
  b1: number;
  b2: number;
  // State variables
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export class AmapianoEQ extends BasePlugin implements IEffectPlugin {
  private bypassed = false;
  private filters: BiquadFilter[] = [];

  constructor() {
    const metadata: PluginMetadata = {
      id: 'amapiano-eq-v1',
      name: 'Amapiano EQ',
      version: '1.0.0',
      author: 'Amapiano AI Team',
      description: 'Culturally-aware equalizer with presets optimized for authentic amapiano sound',
      type: 'effect' as PluginType,
      format: 'javascript' as PluginFormat,
      category: 'eq',
      tags: ['eq', 'equalizer', 'amapiano', 'mixing', 'cultural'],
      culturalContext: {
        genre: 'universal',
        culturalSignificance: 'Designed with frequency curves that enhance traditional amapiano elements',
      },
      latency: 0,
      supportsAutomation: true,
      supportsMIDI: false,
      hasCustomUI: true,
      uiWidth: 600,
      uiHeight: 400,
      license: 'free',
      website: 'https://amapiano-ai.app'
    };

    const parameters: PluginParameter[] = [
      // Low shelf (for log drum depth)
      {
        id: 'low_freq',
        name: 'Low Frequency',
        label: 'Low Shelf Frequency',
        type: 'float',
        defaultValue: 80,
        minValue: 20,
        maxValue: 250,
        unit: 'Hz',
        isAutomatable: true,
        group: 'Low Shelf'
      },
      {
        id: 'low_gain',
        name: 'Low Gain',
        label: 'Low Shelf Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        step: 0.1,
        unit: 'dB',
        isAutomatable: true,
        group: 'Low Shelf'
      },
      
      // Low-mid (for warmth and body)
      {
        id: 'low_mid_freq',
        name: 'Low-Mid Frequency',
        label: 'Low-Mid Frequency',
        type: 'float',
        defaultValue: 250,
        minValue: 100,
        maxValue: 800,
        unit: 'Hz',
        isAutomatable: true,
        group: 'Low-Mid'
      },
      {
        id: 'low_mid_gain',
        name: 'Low-Mid Gain',
        label: 'Low-Mid Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        step: 0.1,
        unit: 'dB',
        isAutomatable: true,
        group: 'Low-Mid'
      },
      {
        id: 'low_mid_q',
        name: 'Low-Mid Q',
        label: 'Low-Mid Q',
        type: 'float',
        defaultValue: 1.0,
        minValue: 0.1,
        maxValue: 10,
        step: 0.1,
        isAutomatable: true,
        group: 'Low-Mid'
      },

      // Mid (for piano presence)
      {
        id: 'mid_freq',
        name: 'Mid Frequency',
        label: 'Mid Frequency',
        type: 'float',
        defaultValue: 1000,
        minValue: 500,
        maxValue: 4000,
        unit: 'Hz',
        isAutomatable: true,
        group: 'Mid'
      },
      {
        id: 'mid_gain',
        name: 'Mid Gain',
        label: 'Mid Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        step: 0.1,
        unit: 'dB',
        isAutomatable: true,
        group: 'Mid'
      },
      {
        id: 'mid_q',
        name: 'Mid Q',
        label: 'Mid Q',
        type: 'float',
        defaultValue: 1.0,
        minValue: 0.1,
        maxValue: 10,
        step: 0.1,
        isAutomatable: true,
        group: 'Mid'
      },

      // High-mid (for clarity)
      {
        id: 'high_mid_freq',
        name: 'High-Mid Frequency',
        label: 'High-Mid Frequency',
        type: 'float',
        defaultValue: 4000,
        minValue: 2000,
        maxValue: 8000,
        unit: 'Hz',
        isAutomatable: true,
        group: 'High-Mid'
      },
      {
        id: 'high_mid_gain',
        name: 'High-Mid Gain',
        label: 'High-Mid Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        step: 0.1,
        unit: 'dB',
        isAutomatable: true,
        group: 'High-Mid'
      },
      {
        id: 'high_mid_q',
        name: 'High-Mid Q',
        label: 'High-Mid Q',
        type: 'float',
        defaultValue: 1.0,
        minValue: 0.1,
        maxValue: 10,
        step: 0.1,
        isAutomatable: true,
        group: 'High-Mid'
      },

      // High shelf (for air and brilliance)
      {
        id: 'high_freq',
        name: 'High Frequency',
        label: 'High Shelf Frequency',
        type: 'float',
        defaultValue: 10000,
        minValue: 5000,
        maxValue: 20000,
        unit: 'Hz',
        isAutomatable: true,
        group: 'High Shelf'
      },
      {
        id: 'high_gain',
        name: 'High Gain',
        label: 'High Shelf Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        step: 0.1,
        unit: 'dB',
        isAutomatable: true,
        group: 'High Shelf'
      },

      // Output
      {
        id: 'output_gain',
        name: 'Output Gain',
        label: 'Output Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        step: 0.1,
        unit: 'dB',
        isAutomatable: true,
        group: 'Output'
      }
    ];

    super(metadata, parameters);

    // Initialize filters
    this.initializeFilters();
  }

  protected async onInitialize(): Promise<void> {
    this.updateFilters();
    console.log('Amapiano EQ initialized');
  }

  protected onDispose(): void {
    this.filters = [];
  }

  protected onParameterChange(id: string, value: number | string | boolean): void {
    this.updateFilters();
  }

  private initializeFilters(): void {
    this.filters = [
      this.createFilter('lowshelf'),
      this.createFilter('peaking'),
      this.createFilter('peaking'),
      this.createFilter('peaking'),
      this.createFilter('highshelf')
    ];
  }

  private createFilter(type: 'lowshelf' | 'highshelf' | 'peaking'): BiquadFilter {
    return {
      type,
      frequency: 1000,
      gain: 0,
      q: 1.0,
      a0: 1, a1: 0, a2: 0,
      b0: 1, b1: 0, b2: 0,
      x1: 0, x2: 0,
      y1: 0, y2: 0
    };
  }

  private updateFilters(): void {
    // Low shelf
    this.updateFilterCoefficients(this.filters[0], {
      type: 'lowshelf',
      frequency: this.getParameter('low_freq') as number,
      gain: this.getParameter('low_gain') as number,
      q: 0.707
    });

    // Low-mid peaking
    this.updateFilterCoefficients(this.filters[1], {
      type: 'peaking',
      frequency: this.getParameter('low_mid_freq') as number,
      gain: this.getParameter('low_mid_gain') as number,
      q: this.getParameter('low_mid_q') as number
    });

    // Mid peaking
    this.updateFilterCoefficients(this.filters[2], {
      type: 'peaking',
      frequency: this.getParameter('mid_freq') as number,
      gain: this.getParameter('mid_gain') as number,
      q: this.getParameter('mid_q') as number
    });

    // High-mid peaking
    this.updateFilterCoefficients(this.filters[3], {
      type: 'peaking',
      frequency: this.getParameter('high_mid_freq') as number,
      gain: this.getParameter('high_mid_gain') as number,
      q: this.getParameter('high_mid_q') as number
    });

    // High shelf
    this.updateFilterCoefficients(this.filters[4], {
      type: 'highshelf',
      frequency: this.getParameter('high_freq') as number,
      gain: this.getParameter('high_gain') as number,
      q: 0.707
    });
  }

  private updateFilterCoefficients(
    filter: BiquadFilter,
    params: { type: string; frequency: number; gain: number; q: number }
  ): void {
    const { frequency, gain, q } = params;
    const A = Math.pow(10, gain / 40);
    const omega = 2 * Math.PI * frequency / this._sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * q);

    filter.frequency = frequency;
    filter.gain = gain;
    filter.q = q;

    if (params.type === 'lowshelf') {
      const beta = Math.sqrt(A) / q;
      filter.b0 = A * ((A + 1) - (A - 1) * cs + beta * sn);
      filter.b1 = 2 * A * ((A - 1) - (A + 1) * cs);
      filter.b2 = A * ((A + 1) - (A - 1) * cs - beta * sn);
      filter.a0 = (A + 1) + (A - 1) * cs + beta * sn;
      filter.a1 = -2 * ((A - 1) + (A + 1) * cs);
      filter.a2 = (A + 1) + (A - 1) * cs - beta * sn;
    } else if (params.type === 'highshelf') {
      const beta = Math.sqrt(A) / q;
      filter.b0 = A * ((A + 1) + (A - 1) * cs + beta * sn);
      filter.b1 = -2 * A * ((A - 1) + (A + 1) * cs);
      filter.b2 = A * ((A + 1) + (A - 1) * cs - beta * sn);
      filter.a0 = (A + 1) - (A - 1) * cs + beta * sn;
      filter.a1 = 2 * ((A - 1) - (A + 1) * cs);
      filter.a2 = (A + 1) - (A - 1) * cs - beta * sn;
    } else if (params.type === 'peaking') {
      filter.b0 = 1 + alpha * A;
      filter.b1 = -2 * cs;
      filter.b2 = 1 - alpha * A;
      filter.a0 = 1 + alpha / A;
      filter.a1 = -2 * cs;
      filter.a2 = 1 - alpha / A;
    }

    // Normalize
    filter.b0 /= filter.a0;
    filter.b1 /= filter.a0;
    filter.b2 /= filter.a0;
    filter.a1 /= filter.a0;
    filter.a2 /= filter.a0;
    filter.a0 = 1;
  }

  // Effect plugin interface
  setBypassed(bypassed: boolean): void {
    this.bypassed = bypassed;
  }

  isBypassed(): boolean {
    return this.bypassed;
  }

  // Audio processing
  process(
    inputs: Float32Array[],
    outputs: Float32Array[],
    context: AudioProcessingContext,
    midiEvents?: MIDIEvent[]
  ): void {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output) return;

    if (this.bypassed) {
      // Bypass - copy input to output
      output.set(input);
      return;
    }

    const outputGain = this.decibelsToLinear(this.getParameter('output_gain') as number);

    // Process through filter chain
    for (let i = 0; i < output.length; i++) {
      let sample = input[i];

      // Apply each filter in series
      for (const filter of this.filters) {
        sample = this.processSample(filter, sample);
      }

      output[i] = sample * outputGain;
    }
  }

  private processSample(filter: BiquadFilter, input: number): number {
    const output = 
      filter.b0 * input +
      filter.b1 * filter.x1 +
      filter.b2 * filter.x2 -
      filter.a1 * filter.y1 -
      filter.a2 * filter.y2;

    // Update state
    filter.x2 = filter.x1;
    filter.x1 = input;
    filter.y2 = filter.y1;
    filter.y1 = output;

    return output;
  }

  // Culturally-informed presets
  protected onInitialize(): Promise<void> {
    // Add Amapiano-specific presets
    this.addPreset({
      id: 'log-drum-boost',
      name: 'Log Drum Boost',
      description: 'Enhances deep log drum frequencies',
      parameters: {
        low_freq: 60,
        low_gain: 4,
        low_mid_freq: 120,
        low_mid_gain: 2,
        low_mid_q: 1.5,
        mid_freq: 800,
        mid_gain: -1,
        mid_q: 0.8,
        high_mid_freq: 5000,
        high_mid_gain: 0,
        high_mid_q: 1.0,
        high_freq: 12000,
        high_gain: -2,
        output_gain: -1
      },
      culturalContext: 'Optimized for traditional amapiano log drum sound',
      createdAt: new Date()
    });

    this.addPreset({
      id: 'gospel-piano',
      name: 'Gospel Piano',
      description: 'Brings out soulful piano presence',
      parameters: {
        low_freq: 80,
        low_gain: -1,
        low_mid_freq: 250,
        low_mid_gain: 1,
        low_mid_q: 1.2,
        mid_freq: 1200,
        mid_gain: 3,
        mid_q: 0.9,
        high_mid_freq: 4000,
        high_mid_gain: 2,
        high_mid_q: 1.0,
        high_freq: 10000,
        high_gain: 1,
        output_gain: -0.5
      },
      culturalContext: 'Emphasizes gospel piano character',
      createdAt: new Date()
    });

    this.addPreset({
      id: 'amapiano-master',
      name: 'Amapiano Master',
      description: 'Balanced EQ for full amapiano mix',
      parameters: {
        low_freq: 70,
        low_gain: 2,
        low_mid_freq: 200,
        low_mid_gain: -1,
        low_mid_q: 1.0,
        mid_freq: 1500,
        mid_gain: 1,
        mid_q: 0.8,
        high_mid_freq: 5000,
        high_mid_gain: 1.5,
        high_mid_q: 1.2,
        high_freq: 12000,
        high_gain: 2,
        output_gain: 0
      },
      culturalContext: 'Balanced mastering EQ for authentic amapiano sound',
      createdAt: new Date()
    });

    return Promise.resolve();
  }

  // Custom UI
  createUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'amapiano-eq-ui';
    container.style.cssText = `
      width: 600px;
      height: 400px;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      border-radius: 12px;
      padding: 20px;
      color: #fff;
      font-family: 'Inter', sans-serif;
    `;

    container.innerHTML = `
      <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
        🎛️ Amapiano EQ
      </h2>
      <p style="opacity: 0.7; margin: 0 0 20px 0; font-size: 12px;">
        Culturally-aware equalizer for authentic amapiano sound
      </p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <button id="preset-log-drum" style="padding: 8px 16px; border-radius: 6px; background: #f39c12; border: none; color: white; cursor: pointer;">
          Log Drum
        </button>
        <button id="preset-piano" style="padding: 8px 16px; border-radius: 6px; background: #e74c3c; border: none; color: white; cursor: pointer;">
          Gospel Piano
        </button>
        <button id="preset-master" style="padding: 8px 16px; border-radius: 6px; background: #9b59b6; border: none; color: white; cursor: pointer;">
          Master
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
        ${this.createBandControl('Low', 'low')}
        ${this.createBandControl('Low-Mid', 'low_mid')}
        ${this.createBandControl('Mid', 'mid')}
        ${this.createBandControl('High-Mid', 'high_mid')}
        ${this.createBandControl('High', 'high')}
      </div>
    `;

    // Add event listeners for presets
    container.querySelector('#preset-log-drum')?.addEventListener('click', () => {
      this.loadPreset(this._presets.find(p => p.id === 'log-drum-boost')!);
    });
    container.querySelector('#preset-piano')?.addEventListener('click', () => {
      this.loadPreset(this._presets.find(p => p.id === 'gospel-piano')!);
    });
    container.querySelector('#preset-master')?.addEventListener('click', () => {
      this.loadPreset(this._presets.find(p => p.id === 'amapiano-master')!);
    });

    return container;
  }

  private createBandControl(label: string, prefix: string): string {
    return `
      <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px; text-align: center;">
          ${label}
        </div>
        <div style="margin-bottom: 8px;">
          <label style="font-size: 10px; opacity: 0.7;">Gain</label>
          <input type="range" id="${prefix}_gain" min="-12" max="12" step="0.1" value="0" 
                 style="width: 100%; accent-color: #3498db;" />
        </div>
        <div style="font-size: 10px; opacity: 0.6; text-align: center;">
          0 dB
        </div>
      </div>
    `;
  }

  destroyUI(): void {
    // Cleanup if needed
  }
}

// Export the plugin
export default AmapianoEQ;
