import log from "encore.dev/log";
import type { ComprehensiveAudioFeatures, TimbralFeatures, TonalFeatures, RhythmicFeatures } from "./types";

/**
 * Kwaito Influence Detection System
 * 
 * Kwaito is the predecessor genre to Amapiano, originating in South African townships
 * in the 1990s. It features slower tempos (88-115 BPM), heavy basslines, and looped
 * samples from various sources.
 */

export interface KwaitoFeatures {
  kwaitoInfluence: number;              // 0-1 score for overall Kwaito influence
  tempoCharacteristics: {
    slowGroove: number;                 // Kwaito's characteristic slower tempo
    bpmRange: boolean;                  // Within 88-115 BPM range
    tempoStability: number;             // Consistent, looped feel
  };
  basslineCharacteristics: {
    deepBass: number;                   // Prominent low-frequency content
    repetitivePattern: number;          // Looped bassline detection
    synthBassPresence: number;          // Synthesized bass vs. acoustic
  };
  vocalCharacteristics: {
    spokenWord: number;                 // Kwaito's spoken/rapped vocals
    chorusLooping: number;              // Repetitive vocal hooks
    localLanguage: number;              // Zulu/Xhosa/Sotho language patterns
  };
  productionStyle: {
    loopBased: number;                  // Heavy use of loops
    minimalistArrangement: number;      // Sparse production
    vintageQuality: number;             // Lower-fi 90s/early 2000s sound
    samplingPresence: number;           // Use of samples from various sources
  };
  culturalMarkers: {
    townshipOrigin: number;             // Sonic markers of township culture
    pantsulaRhythm: number;             // Pantsula dance rhythm influence
    politicalThemes: number;            // Post-apartheid youth expression
  };
}

export class KwaitoDetector {
  /**
   * Analyze audio for Kwaito influence
   */
  async detectKwaitoInfluence(features: ComprehensiveAudioFeatures): Promise<KwaitoFeatures> {
    log.info("Analyzing Kwaito influence");

    const tempoCharacteristics = this.analyzeTempoCharacteristics(features.rhythm);
    const basslineCharacteristics = this.analyzeBasslineCharacteristics(features.timbral, features.tonal);
    const vocalCharacteristics = this.analyzeVocalCharacteristics(features.timbral);
    const productionStyle = this.analyzeProductionStyle(features);
    const culturalMarkers = this.analyzeCulturalMarkers(features);

    // Calculate overall Kwaito influence
    const kwaitoInfluence = this.calculateOverallInfluence({
      tempoCharacteristics,
      basslineCharacteristics,
      vocalCharacteristics,
      productionStyle,
      culturalMarkers
    });

    return {
      kwaitoInfluence,
      tempoCharacteristics,
      basslineCharacteristics,
      vocalCharacteristics,
      productionStyle,
      culturalMarkers
    };
  }

  private analyzeTempoCharacteristics(rhythm: RhythmicFeatures) {
    // Kwaito: 88-115 BPM (slower than amapiano's 108-118)
    const bpmInRange = rhythm.bpm >= 88 && rhythm.bpm <= 115;
    const slowGroove = rhythm.bpm < 110 ? 1.0 : Math.max(0, 1 - ((rhythm.bpm - 110) / 20));
    
    // Kwaito has very stable tempo due to loop-based production
    const tempoStability = rhythm.bpmConfidence;

    return {
      slowGroove,
      bpmRange: bpmInRange,
      tempoStability
    };
  }

  private analyzeBasslineCharacteristics(timbral: TimbralFeatures, tonal: TonalFeatures) {
    // Kwaito features very deep, prominent bass
    const deepBass = timbral.spectralCentroid < 300 ? 1.0 :
                     timbral.spectralCentroid < 500 ? 0.7 : 0.3;

    // Repetitive, looped basslines
    const repetitivePattern = 1 - tonal.harmonicComplexity; // Lower complexity = more repetitive

    // Synth bass (vs. acoustic) is common in Kwaito
    const synthBassPresence = this.detectSynthBass(timbral);

    return {
      deepBass,
      repetitivePattern,
      synthBassPresence
    };
  }

  private detectSynthBass(timbral: TimbralFeatures): number {
    // Synth bass has characteristic MFCC pattern
    // Lower first few coefficients, sharp harmonic structure
    if (timbral.mfcc.length < 5) return 0.5;

    const lowMFCCEnergy = timbral.mfcc.slice(0, 3).reduce((sum, val) => sum + Math.abs(val), 0) / 3;
    const synthScore = lowMFCCEnergy > 10 ? 0.8 : 0.4;

    return synthScore;
  }

  private analyzeVocalCharacteristics(timbral: TimbralFeatures) {
    // Kwaito often features spoken/rapped vocals rather than singing
    // Higher ZCR and specific spectral patterns
    const spokenWord = timbral.zeroCrossingRate > 0.12 ? 0.7 : 0.4;

    // Repetitive vocal hooks/chorus
    const chorusLooping = timbral.spectralFlux < 0.2 ? 0.8 : 0.5;

    // Local language detection (placeholder - would need NLP)
    const localLanguage = 0.5;

    return {
      spokenWord,
      chorusLooping,
      localLanguage
    };
  }

  private analyzeProductionStyle(features: ComprehensiveAudioFeatures) {
    // Loop-based production: low spectral flux, high repetition
    const loopBased = features.timbral.spectralFlux < 0.15 ? 0.9 : 0.5;

    // Minimalist arrangement: lower spectral complexity
    const minimalistArrangement = features.timbral.spectralComplexity < 0.6 ? 0.8 : 0.4;

    // Vintage quality: characteristic of 90s/early 2000s production
    // Lower spectral rolloff, specific dynamic range
    const vintageQuality = features.timbral.spectralRolloff < 6000 ? 0.7 : 0.3;

    // Sampling presence: detect sample markers
    const samplingPresence = this.detectSampling(features);

    return {
      loopBased,
      minimalistArrangement,
      vintageQuality,
      samplingPresence
    };
  }

  private detectSampling(features: ComprehensiveAudioFeatures): number {
    // Samples often have characteristic frequency response and noise floor
    // This is a simplified heuristic
    const spectralIrregularity = Math.abs(features.timbral.spectralCentroid - 2500) / 2500;
    const samplingScore = spectralIrregularity > 0.5 ? 0.7 : 0.4;

    return samplingScore;
  }

  private analyzeCulturalMarkers(features: ComprehensiveAudioFeatures) {
    // Township origin: specific sonic characteristics
    const townshipOrigin = this.detectTownshipSonics(features);

    // Pantsula rhythm: energetic dance rhythm
    const pantsulaRhythm = features.rhythm.danceability > 0.7 ? 0.8 : 0.5;

    // Political themes (would need lyric analysis)
    const politicalThemes = 0.5;

    return {
      townshipOrigin,
      pantsulaRhythm,
      politicalThemes
    };
  }

  private detectTownshipSonics(features: ComprehensiveAudioFeatures): number {
    // Township music has characteristic production:
    // - Raw, unpolished sound
    // - Street recording ambience
    // - Community participation sounds
    
    const rawProduction = features.timbral.spectralComplexity < 0.65 ? 0.7 : 0.4;
    return rawProduction;
  }

  private calculateOverallInfluence(kwaitoFeatures: Omit<KwaitoFeatures, 'kwaitoInfluence'>): number {
    // Weighted scoring of Kwaito influence
    const weights = {
      tempo: 0.20,        // Slower tempo is key Kwaito marker
      bassline: 0.25,     // Heavy bass is fundamental
      vocals: 0.15,       // Vocal style important
      production: 0.25,   // Loop-based production defining
      cultural: 0.15      // Cultural context
    };

    const tempoScore = (
      kwaitoFeatures.tempoCharacteristics.slowGroove * 0.6 +
      (kwaitoFeatures.tempoCharacteristics.bpmRange ? 1 : 0) * 0.4
    );

    const basslineScore = (
      kwaitoFeatures.basslineCharacteristics.deepBass * 0.4 +
      kwaitoFeatures.basslineCharacteristics.repetitivePattern * 0.3 +
      kwaitoFeatures.basslineCharacteristics.synthBassPresence * 0.3
    );

    const vocalScore = (
      kwaitoFeatures.vocalCharacteristics.spokenWord * 0.4 +
      kwaitoFeatures.vocalCharacteristics.chorusLooping * 0.4 +
      kwaitoFeatures.vocalCharacteristics.localLanguage * 0.2
    );

    const productionScore = (
      kwaitoFeatures.productionStyle.loopBased * 0.3 +
      kwaitoFeatures.productionStyle.minimalistArrangement * 0.25 +
      kwaitoFeatures.productionStyle.vintageQuality * 0.25 +
      kwaitoFeatures.productionStyle.samplingPresence * 0.20
    );

    const culturalScore = (
      kwaitoFeatures.culturalMarkers.townshipOrigin * 0.5 +
      kwaitoFeatures.culturalMarkers.pantsulaRhythm * 0.3 +
      kwaitoFeatures.culturalMarkers.politicalThemes * 0.2
    );

    const overallInfluence = 
      tempoScore * weights.tempo +
      basslineScore * weights.bassline +
      vocalScore * weights.vocals +
      productionScore * weights.production +
      culturalScore * weights.cultural;

    return Math.min(1.0, Math.max(0.0, overallInfluence));
  }

  /**
   * Classify Kwaito era/style
   */
  classifyKwaitoEra(kwaitoFeatures: KwaitoFeatures): {
    era: 'classic_90s' | 'early_2000s' | 'modern_revival' | 'kwaito_house' | 'not_kwaito';
    confidence: number;
    characteristics: string[];
  } {
    if (kwaitoFeatures.kwaitoInfluence < 0.4) {
      return {
        era: 'not_kwaito',
        confidence: 1 - kwaitoFeatures.kwaitoInfluence,
        characteristics: ['Insufficient Kwaito markers']
      };
    }

    const characteristics: string[] = [];

    // Classic 90s Kwaito: vintage quality, minimalist, slower
    if (kwaitoFeatures.productionStyle.vintageQuality > 0.6 &&
        kwaitoFeatures.productionStyle.minimalistArrangement > 0.7 &&
        kwaitoFeatures.tempoCharacteristics.slowGroove > 0.8) {
      characteristics.push('Vintage production quality');
      characteristics.push('Minimalist arrangement');
      characteristics.push('Classic slow groove');
      return {
        era: 'classic_90s',
        confidence: kwaitoFeatures.kwaitoInfluence,
        characteristics
      };
    }

    // Early 2000s: more polished, faster tempo
    if (kwaitoFeatures.productionStyle.vintageQuality > 0.4 &&
        !kwaitoFeatures.tempoCharacteristics.bpmRange) {
      characteristics.push('Polished production');
      characteristics.push('Transitional tempo');
      return {
        era: 'early_2000s',
        confidence: kwaitoFeatures.kwaitoInfluence * 0.9,
        characteristics
      };
    }

    // Kwaito House: fusion with house music
    if (kwaitoFeatures.basslineCharacteristics.deepBass > 0.7 &&
        kwaitoFeatures.productionStyle.loopBased > 0.7) {
      characteristics.push('House music fusion');
      characteristics.push('4/4 beat structure');
      return {
        era: 'kwaito_house',
        confidence: kwaitoFeatures.kwaitoInfluence * 0.85,
        characteristics
      };
    }

    // Modern revival: contemporary production with Kwaito elements
    characteristics.push('Modern production techniques');
    characteristics.push('Kwaito-inspired elements');
    return {
      era: 'modern_revival',
      confidence: kwaitoFeatures.kwaitoInfluence * 0.8,
      characteristics
    };
  }
}

export const kwaitoDetector = new KwaitoDetector();
