export interface RhythmicFeatures {
  bpm: number;
  bpmConfidence: number;
  beats: number[];
  onsets: number[];
  danceability: number;
  onsetRate: number;
}

export interface TimbralFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
  spectralComplexity: number;
  zeroCrossingRate: number;
  mfcc: number[];
  spectralContrast: number[];
  loudness: number;
}

export interface TonalFeatures {
  key: string;
  scale: string;
  keyStrength: number;
  chordProgression: string[];
  harmonicComplexity: number;
  hpcp: number[];
  tuningFrequency: number;
}

export interface CulturalFeatures {
  logDrumPresence: number;
  bpmAuthenticity: number;
  gospelInfluence: number;
  jazzSophistication: number;
  swingFactor: number;
  percussiveRatio: number;
  basslineCharacteristics: number;
  traditionalElementsScore: number;
  modernProductionScore: number;
}

export interface ComprehensiveAudioFeatures {
  rhythm: RhythmicFeatures;
  timbral: TimbralFeatures;
  tonal: TonalFeatures;
  cultural: CulturalFeatures;
}

export interface AudioQualityMetrics {
  spectralQuality: number;
  dynamicRange: number;
  frequencyBalance: number;
  distortionLevel: number;
  overallTechnicalQuality: number;
}

export interface MusicalCoherenceMetrics {
  harmonicConsistency: number;
  rhythmicStability: number;
  structuralCoherence: number;
  genreFit: number;
  overallMusicalCoherence: number;
}
