/**
 * LOG DRUM SYNTHESIZER
 * 
 * Authentic Amapiano log drum instrument plugin.
 * Emulates the signature deep, resonant sound of traditional log drums.
 */

import { BasePlugin } from '../BasePlugin';
import type {
  IInstrumentPlugin,
  PluginMetadata,
  PluginParameter,
  AudioProcessingContext,
  MIDIEvent,
  PluginType,
  PluginFormat
} from '../types';

interface Voice {
  note: number;
  velocity: number;
  startTime: number;
  isActive: boolean;
  phase: number;
  envPhase: number;
}

export class LogDrumSynth extends BasePlugin implements IInstrumentPlugin {
  private voices: Voice[] = [];
  private maxPolyphony = 8;
  private pitchBendValue = 0;
  private modWheelValue = 0;
  private currentProgram = 0;

  constructor() {
    const metadata: PluginMetadata = {
      id: 'amapiano-log-drum-v1',
      name: 'Amapiano Log Drum',
      version: '1.0.0',
      author: 'Amapiano AI Team',
      description: 'Authentic log drum synthesizer capturing the deep, resonant sound that defines amapiano music',
      type: 'instrument' as PluginType,
      format: 'javascript' as PluginFormat,
      category: 'log_drum',
      tags: ['amapiano', 'percussion', 'traditional', 'log drum', 'authentic'],
      culturalContext: {
        genre: 'amapiano',
        culturalSignificance: 'The log drum is the foundational sound of amapiano, rooted in traditional South African percussion',
        traditionalInstrument: 'Log Drum (electronic interpretation)',
      },
      maxPolyphony: 8,
      latency: 0,
      supportsAutomation: true,
      supportsMIDI: true,
      hasCustomUI: true,
      uiWidth: 400,
      uiHeight: 300,
      license: 'free',
      website: 'https://amapiano-ai.app',
      documentation: 'https://docs.amapiano-ai.app/plugins/log-drum'
    };

    const parameters: PluginParameter[] = [
      {
        id: 'attack',
        name: 'Attack',
        label: 'Attack Time',
        type: 'float',
        defaultValue: 0.01,
        minValue: 0.001,
        maxValue: 1.0,
        unit: 's',
        isAutomatable: true,
        group: 'Envelope'
      },
      {
        id: 'decay',
        name: 'Decay',
        label: 'Decay Time',
        type: 'float',
        defaultValue: 0.3,
        minValue: 0.01,
        maxValue: 2.0,
        unit: 's',
        isAutomatable: true,
        group: 'Envelope'
      },
      {
        id: 'sustain',
        name: 'Sustain',
        label: 'Sustain Level',
        type: 'float',
        defaultValue: 0.4,
        minValue: 0.0,
        maxValue: 1.0,
        isAutomatable: true,
        group: 'Envelope'
      },
      {
        id: 'release',
        name: 'Release',
        label: 'Release Time',
        type: 'float',
        defaultValue: 0.5,
        minValue: 0.01,
        maxValue: 3.0,
        unit: 's',
        isAutomatable: true,
        group: 'Envelope'
      },
      {
        id: 'pitch',
        name: 'Pitch',
        label: 'Base Pitch',
        type: 'float',
        defaultValue: 0,
        minValue: -24,
        maxValue: 24,
        step: 1,
        unit: 'st',
        isAutomatable: true,
        group: 'Oscillator'
      },
      {
        id: 'resonance',
        name: 'Resonance',
        label: 'Drum Resonance',
        type: 'float',
        defaultValue: 0.7,
        minValue: 0.0,
        maxValue: 1.0,
        isAutomatable: true,
        group: 'Tone'
      },
      {
        id: 'depth',
        name: 'Depth',
        label: 'Low-End Depth',
        type: 'float',
        defaultValue: 0.8,
        minValue: 0.0,
        maxValue: 1.0,
        isAutomatable: true,
        group: 'Tone'
      },
      {
        id: 'tone',
        name: 'Tone',
        label: 'Tonal Color',
        type: 'float',
        defaultValue: 0.5,
        minValue: 0.0,
        maxValue: 1.0,
        isAutomatable: true,
        group: 'Tone'
      },
      {
        id: 'click',
        name: 'Click',
        label: 'Attack Click',
        type: 'float',
        defaultValue: 0.3,
        minValue: 0.0,
        maxValue: 1.0,
        isAutomatable: true,
        group: 'Tone'
      },
      {
        id: 'volume',
        name: 'Volume',
        label: 'Output Volume',
        type: 'float',
        defaultValue: 0.8,
        minValue: 0.0,
        maxValue: 1.0,
        isAutomatable: true,
        group: 'Output'
      }
    ];

    super(metadata, parameters);

    // Initialize voices
    for (let i = 0; i < this.maxPolyphony; i++) {
      this.voices.push({
        note: 0,
        velocity: 0,
        startTime: 0,
        isActive: false,
        phase: 0,
        envPhase: 0
      });
    }
  }

  protected async onInitialize(): Promise<void> {
    console.log('Log Drum Synth initialized at', this._sampleRate, 'Hz');
  }

  protected onDispose(): void {
    this.allNotesOff();
  }

  // MIDI handling
  noteOn(note: number, velocity: number, channel: number = 0): void {
    // Find an inactive voice or steal the oldest
    let voice = this.voices.find(v => !v.isActive);
    if (!voice) {
      voice = this.voices.reduce((oldest, v) => 
        v.startTime < oldest.startTime ? v : oldest
      );
    }

    voice.note = note;
    voice.velocity = velocity;
    voice.startTime = performance.now();
    voice.isActive = true;
    voice.phase = 0;
    voice.envPhase = 0;
  }

  noteOff(note: number, channel: number = 0): void {
    const voice = this.voices.find(v => v.isActive && v.note === note);
    if (voice) {
      voice.isActive = false;
    }
  }

  allNotesOff(): void {
    this.voices.forEach(voice => {
      voice.isActive = false;
    });
  }

  getMaxPolyphony(): number {
    return this.maxPolyphony;
  }

  getActiveVoices(): number {
    return this.voices.filter(v => v.isActive).length;
  }

  setPitchBend(value: number, channel: number = 0): void {
    this.pitchBendValue = value;
  }

  setModWheel(value: number, channel: number = 0): void {
    this.modWheelValue = value;
  }

  setProgram(program: number): void {
    this.currentProgram = program;
    // Load different log drum variations based on program
  }

  getProgram(): number {
    return this.currentProgram;
  }

  // Audio processing
  process(
    inputs: Float32Array[],
    outputs: Float32Array[],
    context: AudioProcessingContext,
    midiEvents?: MIDIEvent[]
  ): void {
    // Process MIDI events
    if (midiEvents) {
      midiEvents.forEach(event => {
        switch (event.type) {
          case 'note_on':
            if (event.note !== undefined && event.velocity !== undefined) {
              this.noteOn(event.note, event.velocity, event.channel);
            }
            break;
          case 'note_off':
            if (event.note !== undefined) {
              this.noteOff(event.note, event.channel);
            }
            break;
          case 'pitch_bend':
            if (event.value !== undefined) {
              this.setPitchBend((event.value - 8192) / 8192);
            }
            break;
          case 'cc':
            if (event.controller === 1 && event.value !== undefined) {
              this.setModWheel(event.value / 127);
            }
            break;
        }
      });
    }

    // Get parameters
    const attack = this.getParameter('attack') as number;
    const decay = this.getParameter('decay') as number;
    const sustain = this.getParameter('sustain') as number;
    const release = this.getParameter('release') as number;
    const pitch = this.getParameter('pitch') as number;
    const resonance = this.getParameter('resonance') as number;
    const depth = this.getParameter('depth') as number;
    const tone = this.getParameter('tone') as number;
    const click = this.getParameter('click') as number;
    const volume = this.getParameter('volume') as number;

    const bufferSize = outputs[0].length;
    const output = outputs[0];

    // Clear output
    output.fill(0);

    // Process each active voice
    this.voices.forEach(voice => {
      if (!voice.isActive && voice.envPhase >= 1.0) {
        return;
      }

      for (let i = 0; i < bufferSize; i++) {
        // Calculate frequency with pitch bend
        const noteFreq = this.noteToFrequency(voice.note + pitch + this.pitchBendValue * 2);
        
        // Generate log drum sound
        const sample = this.generateLogDrumSample(
          voice,
          noteFreq,
          attack,
          decay,
          sustain,
          release,
          resonance,
          depth,
          tone,
          click,
          context.sampleRate
        );

        // Apply velocity
        const velocityGain = this.midiVelocityToGain(voice.velocity);
        
        // Mix into output
        output[i] += sample * velocityGain * volume;

        // Advance phase
        voice.phase += noteFreq / context.sampleRate;
        voice.envPhase += 1 / (context.sampleRate * (voice.isActive ? attack + decay : release));
      }

      // Deactivate voice if envelope is complete
      if (!voice.isActive && voice.envPhase >= 1.0) {
        voice.envPhase = 0;
      }
    });

    // Soft clipping to prevent distortion
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.tanh(output[i]);
    }
  }

  private generateLogDrumSample(
    voice: Voice,
    freq: number,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    resonance: number,
    depth: number,
    tone: number,
    click: number,
    sampleRate: number
  ): number {
    const time = voice.envPhase;
    
    // Envelope
    let env = 0;
    const attackSamples = attack * sampleRate;
    const decaySamples = decay * sampleRate;
    const releaseSamples = release * sampleRate;
    
    if (voice.isActive) {
      if (time < attackSamples) {
        env = time / attackSamples;
      } else if (time < attackSamples + decaySamples) {
        const decayTime = (time - attackSamples) / decaySamples;
        env = 1 - (1 - sustain) * decayTime;
      } else {
        env = sustain;
      }
    } else {
      env = sustain * (1 - time / releaseSamples);
    }

    // Pitch envelope for realistic log drum "thud"
    const pitchEnv = Math.exp(-time * 50 * (1 - resonance));
    const currentFreq = freq * (1 + pitchEnv * depth * 2);

    // Generate oscillator (sine with harmonics for wood/drum character)
    const fundamental = Math.sin(2 * Math.PI * voice.phase);
    const harmonic2 = Math.sin(2 * Math.PI * voice.phase * 2) * tone * 0.3;
    const harmonic3 = Math.sin(2 * Math.PI * voice.phase * 3) * tone * 0.15;
    
    // Add noise for attack click
    const noise = (Math.random() * 2 - 1) * click * Math.exp(-time * 100);
    
    // Mix oscillators
    const osc = fundamental + harmonic2 + harmonic3 + noise;

    // Apply envelope and resonance
    return osc * env * (1 + resonance * 0.5);
  }

  // Custom UI
  createUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'log-drum-synth-ui';
    container.style.cssText = `
      width: 400px;
      height: 300px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      padding: 20px;
      color: #fff;
      font-family: 'Inter', sans-serif;
    `;

    container.innerHTML = `
      <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        🪘 Amapiano Log Drum
      </h2>
      <p style="opacity: 0.7; margin: 0 0 20px 0; font-size: 12px;">
        Authentic log drum synthesis - The heartbeat of amapiano
      </p>
      
      <div id="controls" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        ${this.createParameterControl('attack', 'Attack')}
        ${this.createParameterControl('decay', 'Decay')}
        ${this.createParameterControl('sustain', 'Sustain')}
        ${this.createParameterControl('release', 'Release')}
        ${this.createParameterControl('resonance', 'Resonance')}
        ${this.createParameterControl('depth', 'Depth')}
        ${this.createParameterControl('tone', 'Tone')}
        ${this.createParameterControl('click', 'Click')}
      </div>
    `;

    // Add event listeners
    this.parameters.forEach(param => {
      const slider = container.querySelector(`#${param.id}`) as HTMLInputElement;
      if (slider) {
        slider.addEventListener('input', (e) => {
          const value = parseFloat((e.target as HTMLInputElement).value);
          this.setParameter(param.id, value);
        });
      }
    });

    return container;
  }

  private createParameterControl(id: string, label: string): string {
    const param = this.getParameterInfo(id);
    if (!param) return '';

    const value = this.getParameter(id);
    
    return `
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-size: 11px; opacity: 0.8;">
          ${label}
        </label>
        <input
          type="range"
          id="${id}"
          min="${param.minValue || 0}"
          max="${param.maxValue || 1}"
          step="${param.step || 0.01}"
          value="${value}"
          style="width: 100%; accent-color: #f39c12;"
        />
        <div style="font-size: 10px; opacity: 0.6; margin-top: 2px;">
          ${value}${param.unit || ''}
        </div>
      </div>
    `;
  }

  destroyUI(): void {
    // Cleanup if needed
  }
}

// Export the plugin
export default LogDrumSynth;
