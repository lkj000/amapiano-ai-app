export type Genre = "amapiano" | "private_school_amapiano";
export type SampleCategory = "log_drum" | "piano" | "percussion" | "bass" | "vocal" | "vocals" | "saxophone" | "guitar" | "synth";
export type PatternCategory = "drum_pattern" | "bass_pattern" | "chord_progression" | "melody" | "percussion_pattern" | "arpeggio";
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
  fileUrl?: string;
  bpm?: number;
  keySignature?: string;
  durationSeconds?: number;
  tags?: string[];
  description?: string;
  culturalSignificance?: string;
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
  complexity?: string;
  culturalSignificance?: string;
  description?: string;
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
  sourceType: "youtube" | "upload" | "url" | "tiktok" | "microphone";
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

export interface Effect {
  id: string;
  name: 'EQ' | 'Compressor' | 'Reverb' | 'Delay' | 'Limiter' | 'Log Drum Saturator' | 'Shaker Groove Engine' | '3D Imager' | 'Gospel Harmonizer';
  params: Record<string, any>;
  enabled: boolean;
}

export interface DawMixerChannel {
  volume: number; // 0-1
  pan: number; // -1 to 1
  isMuted: boolean;
  isSolo: boolean;
  effects: Effect[];
}

export interface AutomationPoint {
  time: number; // in beats
  value: number; // 0-1 for most params
}

export interface AutomationData {
  id: string;
  parameter: 'volume' | 'pan' | string; // string for effect params
  points: AutomationPoint[];
  enabled: boolean;
}

export interface DawClip {
  id: string;
  name: string;
  startTime: number; // in beats
  duration: number; // in beats
  // For audio clips
  sampleId?: number;
  audioUrl?: string;
  waveform?: number[]; // Array of numbers (-1 to 1) for visualization
  isReversed?: boolean;
  // For MIDI clips
  notes?: MidiNote[];
}

export interface DawTrack {
  id: string; // Use a unique ID for each track
  type: 'midi' | 'audio';
  name: string;
  instrument?: string; // for midi tracks
  clips: DawClip[];
  mixer: DawMixerChannel;
  isArmed: boolean;
  color: string;
  automation: AutomationData[];
}

export interface DawProjectData {
  bpm: number;
  keySignature: string;
  tracks: DawTrack[];
  masterVolume: number;
}

export interface DawProject {
  id: number;
  name: string;
  projectData: DawProjectData;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DawChangeAction =
  | { type: 'CLIP_ADD'; payload: { trackId: string; clip: DawClip } }
  | { type: 'CLIP_UPDATE'; payload: { trackId: string; clipId: string; updates: Partial<DawClip> } }
  | { type: 'CLIP_DELETE'; payload: { trackId: string; clipId: string } }
  | { type: 'TRACK_ADD'; payload: { track: DawTrack } }
  | { type: 'TRACK_UPDATE'; payload: { trackId: string; updates: Partial<Omit<DawTrack, 'clips' | 'mixer' | 'automation'>> } }
  | { type: 'TRACK_DELETE'; payload: { trackId: string } }
  | { type: 'MIXER_UPDATE'; payload: { trackId: string; updates: Partial<DawMixerChannel> } }
  | { type: 'AUTOMATION_UPDATE'; payload: { trackId:string; automationId: string; points: AutomationPoint[] } }
  | { type: 'PROJECT_SETTINGS_UPDATE'; payload: { updates: Partial<Pick<DawProjectData, 'bpm' | 'keySignature'>> } };

export interface DawChange {
  action: DawChangeAction;
  senderId: string; // Unique ID for the client instance that sent the change
  type?: string;
  trackId?: number;
  data?: any;
}

export interface ProjectState {
  tracks?: any[];
  patterns?: any[];
  automation?: any[];
  tempo?: number;
  timeSignature?: any;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  joinedAt: Date;
  isActive: boolean;
  cursor: {
    x: number;
    y: number;
    tool: string;
  };
  role: 'owner' | 'collaborator' | 'viewer';
}
