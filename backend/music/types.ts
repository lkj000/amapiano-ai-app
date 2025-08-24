export type Genre = "amapiano" | "private_school_amapiano";
export type SampleCategory = "log_drum" | "piano" | "percussion" | "bass" | "vocal" | "saxophone" | "guitar" | "synth";
export type PatternCategory = "drum_pattern" | "bass_pattern" | "chord_progression" | "melody";
export type Mood = "chill" | "energetic" | "soulful" | "groovy" | "mellow" | "uplifting" | "deep" | "jazzy";

export interface Track {
  id: number;
  title: string;
  artist?: string;
  genre: Genre;
  bpm?: number;
  keySignature?: string;
  durationSeconds?: number;
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sample {
  id: number;
  name: string;
  category: SampleCategory;
  genre: Genre;
  fileUrl: string;
  bpm?: number;
  keySignature?: string;
  durationSeconds?: number;
  tags?: string[];
  createdAt: Date;
}

export interface Pattern {
  id: number;
  name: string;
  category: PatternCategory;
  genre: Genre;
  patternData: any;
  bpm?: number;
  keySignature?: string;
  bars?: number;
  createdAt: Date;
}

export interface GeneratedTrack {
  id: number;
  prompt: string;
  genre: Genre;
  mood?: string;
  bpm?: number;
  keySignature?: string;
  fileUrl?: string;
  stemsData?: any;
  sourceAnalysisId?: number;
  createdAt: Date;
}

export interface AudioAnalysis {
  id: number;
  sourceUrl: string;
  sourceType: "youtube" | "upload" | "url" | "tiktok";
  analysisData: any;
  extractedStems?: any;
  detectedPatterns?: any;
  createdAt: Date;
}

export interface StemSeparation {
  drums: string;
  bass: string;
  piano: string;
  vocals?: string;
  other: string;
}

export interface DetectedPattern {
  type: PatternCategory;
  confidence: number;
  data: any;
  timeRange: {
    start: number;
    end: number;
  };
}

export interface MidiNote {
  pitch: number; // MIDI note number (0-127)
  velocity: number; // 0-127
  startTime: number; // in beats or seconds, relative to clip start
  duration: number; // in beats or seconds
}

export interface DawTrack {
  type: 'midi' | 'audio';
  name: string;
  instrument?: string; // for midi
  sampleId?: number; // for audio
  startTime: number;
  duration: number;
  notes?: MidiNote[]; // MIDI notes
  audioUrl?: string;
}

export interface DawMixerChannel {
  volume: number; // 0-1
  pan: number; // -1 to 1
  isMuted: boolean;
  isSolo: boolean;
}

export interface DawProjectData {
  bpm: number;
  keySignature: string;
  tracks: DawTrack[];
  mixer: {
    masterVolume: number;
    channels: DawMixerChannel[];
  };
}

export interface DawProject extends DawProjectData {
  id: number;
  name: string;
  userId?: string;
  version: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
