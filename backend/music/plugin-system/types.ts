/**
 * AMAPIANO AI DAW - PLUGIN SYSTEM
 * 
 * Modular plugin ecosystem supporting:
 * - VST-like instruments (synthesizers, samplers)
 * - Audio effects (EQ, compression, reverb, etc.)
 * - JavaScript and WebAssembly plugins
 * - Custom UI components
 * - MIDI processing
 * - Preset management
 */

// ============================================================================
// CORE PLUGIN INTERFACES
// ============================================================================

export enum PluginType {
  INSTRUMENT = 'instrument',
  EFFECT = 'effect',
  MIDI_EFFECT = 'midi_effect',
  ANALYZER = 'analyzer'
}

export enum PluginFormat {
  JAVASCRIPT = 'javascript',
  WASM = 'wasm',
  NATIVE = 'native'
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  type: PluginType;
  format: PluginFormat;
  category: string;
  tags: string[];
  
  // Cultural significance for Amapiano plugins
  culturalContext?: {
    genre: 'amapiano' | 'private_school_amapiano' | 'universal';
    culturalSignificance?: string;
    traditionalInstrument?: string;
  };
  
  // Technical specs
  maxPolyphony?: number; // For instruments
  latency?: number; // In samples
  supportsAutomation: boolean;
  supportsMIDI: boolean;
  
  // UI
  hasCustomUI: boolean;
  uiWidth?: number;
  uiHeight?: number;
  
  // License and distribution
  license: 'free' | 'commercial' | 'open_source';
  price?: number;
  downloadUrl?: string;
  
  // Developer info
  website?: string;
  documentation?: string;
  sourceCode?: string;
}

export interface PluginParameter {
  id: string;
  name: string;
  label: string;
  type: 'float' | 'int' | 'bool' | 'enum' | 'string';
  defaultValue: number | string | boolean;
  minValue?: number;
  maxValue?: number;
  step?: number;
  unit?: string; // 'Hz', 'dB', 'ms', '%', etc.
  enumValues?: Array<{ value: number | string; label: string }>;
  isAutomatable: boolean;
  group?: string; // Group parameters (e.g., 'Oscillator', 'Filter', 'Envelope')
}

export interface PluginPreset {
  id: string;
  name: string;
  author?: string;
  description?: string;
  parameters: Record<string, number | string | boolean>;
  culturalContext?: string;
  tags?: string[];
  createdAt: Date;
}

export interface MIDINote {
  note: number; // 0-127
  velocity: number; // 0-127
  channel: number; // 0-15
  startTime: number; // In samples
  duration?: number; // In samples
}

export interface MIDIEvent {
  type: 'note_on' | 'note_off' | 'cc' | 'pitch_bend' | 'program_change';
  note?: number;
  velocity?: number;
  channel?: number;
  controller?: number;
  value?: number;
  timestamp: number; // In samples
}

export interface AudioProcessingContext {
  sampleRate: number;
  bufferSize: number;
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  currentTime: number; // In samples
  isPlaying: boolean;
}

export interface PluginProcessingResult {
  audioOutputs: Float32Array[]; // Multiple channels
  midiOutputs?: MIDIEvent[]; // For MIDI effects
  stateChanged?: boolean;
}

// ============================================================================
// BASE PLUGIN INTERFACE
// ============================================================================

export interface IPlugin {
  // Metadata
  readonly metadata: PluginMetadata;
  readonly parameters: PluginParameter[];
  
  // Lifecycle
  initialize(sampleRate: number, maxBufferSize: number): Promise<void>;
  dispose(): void;
  
  // Parameter management
  getParameter(id: string): number | string | boolean;
  setParameter(id: string, value: number | string | boolean): void;
  getParameterInfo(id: string): PluginParameter | null;
  
  // Preset management
  loadPreset(preset: PluginPreset): void;
  savePreset(name: string, description?: string): PluginPreset;
  getPresets(): PluginPreset[];
  
  // State management
  getState(): any; // Serializable state
  setState(state: any): void;
  
  // Processing
  process(
    inputs: Float32Array[],
    outputs: Float32Array[],
    context: AudioProcessingContext,
    midiEvents?: MIDIEvent[]
  ): void;
  
  // Optional UI
  createUI?(): HTMLElement;
  destroyUI?(): void;
}

// ============================================================================
// INSTRUMENT PLUGIN INTERFACE
// ============================================================================

export interface IInstrumentPlugin extends IPlugin {
  // MIDI handling
  noteOn(note: number, velocity: number, channel?: number): void;
  noteOff(note: number, channel?: number): void;
  allNotesOff(): void;
  
  // Polyphony
  getMaxPolyphony(): number;
  getActiveVoices(): number;
  
  // Pitch bend and modulation
  setPitchBend(value: number, channel?: number): void; // -1 to 1
  setModWheel(value: number, channel?: number): void; // 0 to 1
  
  // Program/patch selection
  setProgram(program: number): void;
  getProgram(): number;
}

// ============================================================================
// EFFECT PLUGIN INTERFACE
// ============================================================================

export interface IEffectPlugin extends IPlugin {
  // Bypass
  setBypassed(bypassed: boolean): void;
  isBypassed(): boolean;
  
  // Wet/Dry mix
  setMix?(value: number): void; // 0 to 1
  getMix?(): number;
  
  // Tail handling (for reverb, delay, etc.)
  getTailLength?(): number; // In samples
}

// ============================================================================
// PLUGIN HOST INTERFACE
// ============================================================================

export interface IPluginHost {
  // Plugin lifecycle
  loadPlugin(url: string, type: PluginFormat): Promise<IPlugin>;
  unloadPlugin(pluginId: string): void;
  getPlugin(pluginId: string): IPlugin | null;
  getAllPlugins(): IPlugin[];
  
  // Audio routing
  connectPlugin(pluginId: string, inputNode: AudioNode, outputNode: AudioNode): void;
  disconnectPlugin(pluginId: string): void;
  
  // Automation
  automateParameter(pluginId: string, parameterId: string, value: number, time?: number): void;
  
  // Preset management
  savePluginPreset(pluginId: string, name: string): PluginPreset;
  loadPluginPreset(pluginId: string, preset: PluginPreset): void;
  
  // Plugin scanning and discovery
  scanPlugins(directory?: string): Promise<PluginMetadata[]>;
  registerPlugin(metadata: PluginMetadata): void;
  
  // UI management
  showPluginUI(pluginId: string, container: HTMLElement): void;
  hidePluginUI(pluginId: string): void;
}

// ============================================================================
// PLUGIN REGISTRY
// ============================================================================

export interface PluginRegistryEntry {
  metadata: PluginMetadata;
  downloadUrl: string;
  version: string;
  downloads: number;
  rating: number;
  reviews: number;
  verified: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginSearchFilters {
  type?: PluginType;
  category?: string;
  format?: PluginFormat;
  genre?: 'amapiano' | 'private_school_amapiano' | 'universal';
  license?: 'free' | 'commercial' | 'open_source';
  tags?: string[];
  minRating?: number;
  verified?: boolean;
  featured?: boolean;
}

// ============================================================================
// PLUGIN SDK INTERFACES
// ============================================================================

export interface PluginSDK {
  // Helper functions for plugin developers
  createParameter(config: Partial<PluginParameter>): PluginParameter;
  createPreset(name: string, parameters: Record<string, any>): PluginPreset;
  
  // DSP utilities
  dsp: {
    createOscillator(type: 'sine' | 'square' | 'sawtooth' | 'triangle'): any;
    createFilter(type: 'lowpass' | 'highpass' | 'bandpass' | 'notch'): any;
    createEnvelope(attack: number, decay: number, sustain: number, release: number): any;
    createLFO(frequency: number, shape: 'sine' | 'square' | 'triangle'): any;
  };
  
  // MIDI utilities
  midi: {
    noteToFrequency(note: number): number;
    frequencyToNote(frequency: number): number;
    velocityToGain(velocity: number): number;
  };
  
  // UI utilities
  ui: {
    createKnob(parameter: PluginParameter): HTMLElement;
    createSlider(parameter: PluginParameter): HTMLElement;
    createSwitch(parameter: PluginParameter): HTMLElement;
    createDropdown(parameter: PluginParameter): HTMLElement;
  };
  
  // Cultural context helpers
  cultural: {
    getAmapianoScales(): Record<string, number[]>;
    getTraditionalRhythms(): Record<string, number[]>;
    getGospelChords(): Record<string, number[][]>;
  };
}

// ============================================================================
// WEBASSEMBLY PLUGIN INTERFACE
// ============================================================================

export interface WASMPluginInterface {
  // Memory management
  allocateBuffer(size: number): number; // Returns pointer
  freeBuffer(pointer: number): void;
  
  // Processing
  processBlock(
    inputPtr: number,
    outputPtr: number,
    numChannels: number,
    numSamples: number
  ): void;
  
  // Parameter control
  setParameterValue(index: number, value: number): void;
  getParameterValue(index: number): number;
  
  // MIDI
  sendMIDI(status: number, data1: number, data2: number): void;
  
  // Lifecycle
  initialize(sampleRate: number): void;
  cleanup(): void;
}

// ============================================================================
// PLUGIN VALIDATION
// ============================================================================

export interface PluginValidationResult {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  performance: {
    averageProcessingTime: number; // In microseconds
    maxProcessingTime: number;
    cpuUsage: number; // 0-1
  };
  security: {
    sandboxed: boolean;
    permissions: string[];
    warnings: string[];
  };
}

export interface IPluginValidator {
  validate(plugin: IPlugin): Promise<PluginValidationResult>;
  validateMetadata(metadata: PluginMetadata): boolean;
  benchmarkPerformance(plugin: IPlugin, duration: number): Promise<any>;
  checkSecurity(plugin: IPlugin): Promise<any>;
}

// ============================================================================
// PLUGIN CATEGORIES
// ============================================================================

export const PluginCategories = {
  // Instruments
  SYNTHESIZER: 'synthesizer',
  SAMPLER: 'sampler',
  DRUM_MACHINE: 'drum_machine',
  
  // Effects
  DYNAMICS: 'dynamics', // Compressor, limiter, gate
  EQ: 'eq',
  FILTER: 'filter',
  MODULATION: 'modulation', // Chorus, flanger, phaser
  DELAY: 'delay',
  REVERB: 'reverb',
  DISTORTION: 'distortion',
  SPATIAL: 'spatial', // Stereo imaging, panning
  UTILITY: 'utility', // Gain, phase, etc.
  
  // Amapiano-specific
  LOG_DRUM: 'log_drum',
  GOSPEL_PIANO: 'gospel_piano',
  AMAPIANO_BASS: 'amapiano_bass',
  CULTURAL_FX: 'cultural_fx',
  
  // MIDI
  MIDI_ARPEGGIATOR: 'midi_arpeggiator',
  MIDI_CHORD: 'midi_chord',
  MIDI_SEQUENCER: 'midi_sequencer',
  
  // Analysis
  SPECTRUM: 'spectrum',
  METER: 'meter',
  TUNER: 'tuner'
} as const;

// ============================================================================
// CULTURAL PLUGIN METADATA
// ============================================================================

export interface CulturalPluginMetadata {
  culturalOrigin: 'south_africa' | 'township' | 'gospel' | 'jazz' | 'universal';
  traditionalInstrument?: string;
  culturalSignificance: string;
  historicalContext?: string;
  authenticity: 'traditional' | 'modern' | 'fusion';
  culturalConsultants?: Array<{
    name: string;
    role: string;
    credentials: string;
  }>;
  culturalReferences?: string[];
  respectfulUsage?: string; // Guidelines for respectful use
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  IPlugin,
  IInstrumentPlugin,
  IEffectPlugin,
  IPluginHost,
  IPluginValidator,
  PluginProcessingResult,
  PluginRegistryEntry,
  PluginSearchFilters,
  PluginSDK,
  WASMPluginInterface,
  PluginValidationResult,
  AudioProcessingContext,
  CulturalPluginMetadata
};
