/**
 * BASE PLUGIN CLASS
 * 
 * Abstract base class that all plugins extend.
 * Provides common functionality and enforces the plugin interface.
 */

import type {
  IPlugin,
  PluginMetadata,
  PluginParameter,
  PluginPreset,
  AudioProcessingContext,
  MIDIEvent
} from './types';

export abstract class BasePlugin implements IPlugin {
  protected _metadata: PluginMetadata;
  protected _parameters: Map<string, PluginParameter>;
  protected _parameterValues: Map<string, number | string | boolean>;
  protected _presets: PluginPreset[] = [];
  protected _sampleRate: number = 44100;
  protected _maxBufferSize: number = 512;
  protected _initialized: boolean = false;

  constructor(metadata: PluginMetadata, parameters: PluginParameter[]) {
    this._metadata = metadata;
    this._parameters = new Map();
    this._parameterValues = new Map();

    // Initialize parameters
    parameters.forEach(param => {
      this._parameters.set(param.id, param);
      this._parameterValues.set(param.id, param.defaultValue);
    });
  }

  // Metadata access
  get metadata(): PluginMetadata {
    return this._metadata;
  }

  get parameters(): PluginParameter[] {
    return Array.from(this._parameters.values());
  }

  // Lifecycle
  async initialize(sampleRate: number, maxBufferSize: number): Promise<void> {
    this._sampleRate = sampleRate;
    this._maxBufferSize = maxBufferSize;
    await this.onInitialize();
    this._initialized = true;
  }

  dispose(): void {
    this.onDispose();
    this._initialized = false;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onDispose(): void;

  // Parameter management
  getParameter(id: string): number | string | boolean {
    const value = this._parameterValues.get(id);
    if (value === undefined) {
      throw new Error(`Parameter ${id} not found`);
    }
    return value;
  }

  setParameter(id: string, value: number | string | boolean): void {
    const param = this._parameters.get(id);
    if (!param) {
      throw new Error(`Parameter ${id} not found`);
    }

    // Validate and clamp value
    let validatedValue = value;
    if (param.type === 'float' || param.type === 'int') {
      const numValue = Number(value);
      if (param.minValue !== undefined) {
        validatedValue = Math.max(param.minValue, numValue);
      }
      if (param.maxValue !== undefined) {
        validatedValue = Math.min(param.maxValue as number, validatedValue as number);
      }
      if (param.type === 'int') {
        validatedValue = Math.round(validatedValue as number);
      }
    }

    this._parameterValues.set(id, validatedValue);
    this.onParameterChange(id, validatedValue);
  }

  protected onParameterChange(id: string, value: number | string | boolean): void {
    // Override in subclasses to handle parameter changes
  }

  getParameterInfo(id: string): PluginParameter | null {
    return this._parameters.get(id) || null;
  }

  // Preset management
  loadPreset(preset: PluginPreset): void {
    Object.entries(preset.parameters).forEach(([id, value]) => {
      if (this._parameters.has(id)) {
        this.setParameter(id, value);
      }
    });
    this.onPresetLoad(preset);
  }

  protected onPresetLoad(preset: PluginPreset): void {
    // Override in subclasses
  }

  savePreset(name: string, description?: string): PluginPreset {
    const parameters: Record<string, number | string | boolean> = {};
    this._parameterValues.forEach((value, id) => {
      parameters[id] = value;
    });

    const preset: PluginPreset = {
      id: `${this._metadata.id}_${Date.now()}`,
      name,
      description,
      parameters,
      author: this._metadata.author,
      createdAt: new Date()
    };

    this._presets.push(preset);
    return preset;
  }

  getPresets(): PluginPreset[] {
    return [...this._presets];
  }

  addPreset(preset: PluginPreset): void {
    this._presets.push(preset);
  }

  // State management
  getState(): any {
    return {
      metadata: this._metadata,
      parameters: Object.fromEntries(this._parameterValues),
      customState: this.getCustomState()
    };
  }

  setState(state: any): void {
    if (state.parameters) {
      Object.entries(state.parameters).forEach(([id, value]) => {
        if (this._parameters.has(id)) {
          this.setParameter(id, value as number | string | boolean);
        }
      });
    }
    if (state.customState) {
      this.setCustomState(state.customState);
    }
  }

  protected getCustomState(): any {
    return {};
  }

  protected setCustomState(state: any): void {
    // Override in subclasses
  }

  // Processing - must be implemented by subclasses
  abstract process(
    inputs: Float32Array[],
    outputs: Float32Array[],
    context: AudioProcessingContext,
    midiEvents?: MIDIEvent[]
  ): void;

  // Helper methods
  protected linearToDecibels(linear: number): number {
    return 20 * Math.log10(linear);
  }

  protected decibelsToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  protected noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  protected frequencyToNote(frequency: number): number {
    return 69 + 12 * Math.log2(frequency / 440);
  }

  protected midiVelocityToGain(velocity: number): number {
    // Non-linear velocity curve for more natural feel
    return Math.pow(velocity / 127, 1.5);
  }

  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  protected lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
