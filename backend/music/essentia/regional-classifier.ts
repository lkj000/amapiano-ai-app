import log from "encore.dev/log";
import type { ComprehensiveAudioFeatures } from "./types";
import type { KwaitoFeatures } from "./kwaito-detector";

/**
 * Regional Variation Classification System
 * 
 * South African music varies significantly across regions, provinces, and cities.
 * This system detects and classifies regional characteristics in amapiano and related genres.
 */

export type SouthAfricanRegion = 
  | 'gauteng'           // Johannesburg, Pretoria - birthplace of amapiano
  | 'western_cape'      // Cape Town - house music influence
  | 'kzn'               // KwaZulu-Natal - Durban, Zulu cultural influence
  | 'eastern_cape'      // Port Elizabeth, Xhosa cultural influence
  | 'limpopo'           // Northern region, unique traditional influences
  | 'mpumalanga'        // Eastern highveld
  | 'northwest'         // Mafikeng area
  | 'free_state'        // Bloemfontein, central SA
  | 'northern_cape';    // Kimberley, sparse population

export type AmapianoSubGenre =
  | 'classic_amapiano'      // Original Gauteng sound
  | 'private_school'        // Jazz-influenced, sophisticated
  | 'bacardi'               // Experimental, modern
  | 'sgija'                 // Energetic, vocal-driven
  | 'soulful_amapiano'      // Gospel-influenced
  | 'tech_amapiano'         // Techno-influenced
  | 'kwaito_amapiano';      // Kwaito fusion

export interface RegionalCharacteristics {
  region: SouthAfricanRegion;
  confidence: number;
  characteristics: string[];
  culturalMarkers: {
    language: string[];           // Predominant languages
    traditionalInstruments: string[];
    musicalHeritage: string[];
  };
  productionStyle: {
    tempo: 'slow' | 'medium' | 'fast';
    complexity: 'minimal' | 'moderate' | 'complex';
    modernization: number;        // 0-1, traditional to modern
  };
}

export interface SubGenreClassification {
  subGenre: AmapianoSubGenre;
  confidence: number;
  keyFeatures: string[];
  relatedRegions: SouthAfricanRegion[];
}

export class RegionalClassifier {
  /**
   * Classify regional origin of music
   */
  async classifyRegion(
    features: ComprehensiveAudioFeatures,
    kwaitoFeatures?: KwaitoFeatures
  ): Promise<RegionalCharacteristics> {
    log.info("Classifying regional variation");

    // Analyze multiple regional indicators
    const tempoIndicators = this.analyzeTempoRegionalPattern(features.rhythm.bpm);
    const harmonicIndicators = this.analyzeHarmonicRegionalPattern(features.tonal);
    const productionIndicators = this.analyzeProductionRegionalPattern(features);
    const culturalIndicators = this.analyzeCulturalRegionalMarkers(features, kwaitoFeatures);

    // Combine indicators to determine most likely region
    const regionalScores = this.calculateRegionalScores({
      tempoIndicators,
      harmonicIndicators,
      productionIndicators,
      culturalIndicators
    });

    // Get top region
    const topRegion = this.getTopRegion(regionalScores);

    return {
      region: topRegion.region,
      confidence: topRegion.confidence,
      characteristics: this.getRegionalCharacteristics(topRegion.region, features),
      culturalMarkers: this.getCulturalMarkers(topRegion.region),
      productionStyle: this.getProductionStyle(topRegion.region, features)
    };
  }

  /**
   * Classify amapiano sub-genre
   */
  async classifySubGenre(
    features: ComprehensiveAudioFeatures,
    kwaitoFeatures?: KwaitoFeatures
  ): Promise<SubGenreClassification> {
    log.info("Classifying amapiano sub-genre");

    // Analyze sub-genre indicators
    const jazzInfluence = features.cultural.jazzSophistication;
    const gospelInfluence = features.cultural.gospelInfluence;
    const kwaitoInfluence = kwaitoFeatures?.kwaitoInfluence || 0;
    const tempo = features.rhythm.bpm;
    const complexity = features.tonal.harmonicComplexity;
    const percussiveEnergy = features.cultural.percussiveRatio;

    // Private School Amapiano: high jazz influence, complex harmonies
    if (jazzInfluence > 0.65 && complexity > 0.7) {
      return {
        subGenre: 'private_school',
        confidence: Math.min(0.95, jazzInfluence + complexity) / 2,
        keyFeatures: [
          'Sophisticated jazz harmonies',
          'Complex chord progressions',
          'Refined production',
          'Slower tempo (110-115 BPM)'
        ],
        relatedRegions: ['gauteng', 'western_cape']
      };
    }

    // Soulful Amapiano: high gospel influence
    if (gospelInfluence > 0.7) {
      return {
        subGenre: 'soulful_amapiano',
        confidence: gospelInfluence,
        keyFeatures: [
          'Strong gospel influences',
          'Emotional piano melodies',
          'Choir-like vocal arrangements',
          'Spiritual themes'
        ],
        relatedRegions: ['gauteng', 'kzn', 'free_state']
      };
    }

    // Kwaito-Amapiano fusion: high Kwaito influence
    if (kwaitoInfluence > 0.6) {
      return {
        subGenre: 'kwaito_amapiano',
        confidence: kwaitoInfluence,
        keyFeatures: [
          'Kwaito-inspired basslines',
          'Slower tempo (100-112 BPM)',
          'Loop-based production',
          'Township cultural markers'
        ],
        relatedRegions: ['gauteng', 'limpopo']
      };
    }

    // Sgija: energetic, vocal-driven, high percussive energy
    if (percussiveEnergy > 0.75 && tempo > 115) {
      return {
        subGenre: 'sgija',
        confidence: 0.8,
        keyFeatures: [
          'High energy percussion',
          'Vocal-driven',
          'Fast tempo (116-122 BPM)',
          'Dance-oriented'
        ],
        relatedRegions: ['gauteng', 'mpumalanga']
      };
    }

    // Bacardi: experimental, modern production
    if (features.cultural.modernProductionScore > 0.75) {
      return {
        subGenre: 'bacardi',
        confidence: 0.75,
        keyFeatures: [
          'Experimental production',
          'Modern sound design',
          'Unconventional structures',
          'Electronic influences'
        ],
        relatedRegions: ['gauteng', 'western_cape']
      };
    }

    // Tech Amapiano: minimal, techno-influenced
    if (complexity < 0.5 && features.timbral.spectralComplexity < 0.6) {
      return {
        subGenre: 'tech_amapiano',
        confidence: 0.7,
        keyFeatures: [
          'Minimal arrangement',
          'Techno influences',
          'Hypnotic repetition',
          'Underground sound'
        ],
        relatedRegions: ['western_cape', 'gauteng']
      };
    }

    // Default: Classic Amapiano
    return {
      subGenre: 'classic_amapiano',
      confidence: 0.8,
      keyFeatures: [
        'Traditional amapiano elements',
        'Log drum foundation',
        'Piano-based melodies',
        'Standard tempo (112-118 BPM)'
      ],
      relatedRegions: ['gauteng']
    };
  }

  private analyzeTempoRegionalPattern(bpm: number): Partial<Record<SouthAfricanRegion, number>> {
    const scores: Partial<Record<SouthAfricanRegion, number>> = {};

    // Gauteng (Johannesburg/Pretoria): classic amapiano tempo (112-118)
    scores.gauteng = bpm >= 112 && bpm <= 118 ? 1.0 : 0.5;

    // Western Cape (Cape Town): slightly faster, house influence (115-122)
    scores.western_cape = bpm >= 115 && bpm <= 122 ? 0.9 : 0.4;

    // KZN (Durban): moderate tempo (110-116)
    scores.kzn = bpm >= 110 && bpm <= 116 ? 0.8 : 0.4;

    // Limpopo: often slower, Kwaito influence (105-115)
    scores.limpopo = bpm >= 105 && bpm <= 115 ? 0.8 : 0.3;

    return scores;
  }

  private analyzeHarmonicRegionalPattern(tonal: any): Partial<Record<SouthAfricanRegion, number>> {
    const scores: Partial<Record<SouthAfricanRegion, number>> = {};

    // Gauteng: balanced jazz and gospel
    scores.gauteng = 0.8;

    // Western Cape: more house/techno, simpler harmonies
    scores.western_cape = tonal.harmonicComplexity < 0.6 ? 0.7 : 0.4;

    // KZN: strong Zulu musical influence, specific modal characteristics
    scores.kzn = 0.6;

    return scores;
  }

  private analyzeProductionRegionalPattern(features: ComprehensiveAudioFeatures): Partial<Record<SouthAfricanRegion, number>> {
    const scores: Partial<Record<SouthAfricanRegion, number>> = {};

    const modernProduction = features.cultural.modernProductionScore;

    // Gauteng: birthplace, all styles present
    scores.gauteng = 0.9;

    // Western Cape: modern, polished production
    scores.western_cape = modernProduction > 0.7 ? 0.9 : 0.5;

    // Limpopo: more traditional production
    scores.limpopo = modernProduction < 0.6 ? 0.7 : 0.4;

    return scores;
  }

  private analyzeCulturalRegionalMarkers(
    features: ComprehensiveAudioFeatures,
    kwaitoFeatures?: KwaitoFeatures
  ): Partial<Record<SouthAfricanRegion, number>> {
    const scores: Partial<Record<SouthAfricanRegion, number>> = {};

    // Gauteng: urban, township culture, Kwaito heritage
    scores.gauteng = 0.9;
    if (kwaitoFeatures && kwaitoFeatures.kwaitoInfluence > 0.5) {
      scores.gauteng = 1.0;
    }

    // Western Cape: house music culture
    scores.western_cape = 0.7;

    // KZN: Zulu cultural influence
    scores.kzn = 0.7;

    return scores;
  }

  private calculateRegionalScores(indicators: {
    tempoIndicators: Partial<Record<SouthAfricanRegion, number>>;
    harmonicIndicators: Partial<Record<SouthAfricanRegion, number>>;
    productionIndicators: Partial<Record<SouthAfricanRegion, number>>;
    culturalIndicators: Partial<Record<SouthAfricanRegion, number>>;
  }): Record<SouthAfricanRegion, number> {
    const regions: SouthAfricanRegion[] = [
      'gauteng', 'western_cape', 'kzn', 'eastern_cape', 'limpopo',
      'mpumalanga', 'northwest', 'free_state', 'northern_cape'
    ];

    const weights = {
      tempo: 0.25,
      harmonic: 0.25,
      production: 0.25,
      cultural: 0.25
    };

    const scores: Record<SouthAfricanRegion, number> = {} as any;

    for (const region of regions) {
      const tempoScore = indicators.tempoIndicators[region] || 0.3;
      const harmonicScore = indicators.harmonicIndicators[region] || 0.3;
      const productionScore = indicators.productionIndicators[region] || 0.3;
      const culturalScore = indicators.culturalIndicators[region] || 0.3;

      scores[region] = 
        tempoScore * weights.tempo +
        harmonicScore * weights.harmonic +
        productionScore * weights.production +
        culturalScore * weights.cultural;
    }

    return scores;
  }

  private getTopRegion(scores: Record<SouthAfricanRegion, number>): {
    region: SouthAfricanRegion;
    confidence: number;
  } {
    let topRegion: SouthAfricanRegion = 'gauteng';
    let topScore = 0;

    for (const [region, score] of Object.entries(scores)) {
      if (score > topScore) {
        topScore = score;
        topRegion = region as SouthAfricanRegion;
      }
    }

    return {
      region: topRegion,
      confidence: topScore
    };
  }

  private getRegionalCharacteristics(region: SouthAfricanRegion, features: ComprehensiveAudioFeatures): string[] {
    const characteristics: Record<SouthAfricanRegion, string[]> = {
      gauteng: [
        'Urban township sound',
        'Birthplace of amapiano',
        'Mix of traditional and modern',
        'Strong Kwaito heritage'
      ],
      western_cape: [
        'House music influence',
        'Polished production',
        'Electronic elements',
        'Coastal vibe'
      ],
      kzn: [
        'Zulu cultural influence',
        'Maskandi music heritage',
        'Coastal energy',
        'Durban sound'
      ],
      eastern_cape: [
        'Xhosa cultural influence',
        'Traditional rhythms',
        'Rural-urban fusion'
      ],
      limpopo: [
        'Northern sound',
        'Traditional influences',
        'Slower tempos',
        'Rural character'
      ],
      mpumalanga: [
        'Highveld sound',
        'Energetic rhythms',
        'Mix of influences'
      ],
      northwest: [
        'Mafikeng style',
        'Traditional meets modern'
      ],
      free_state: [
        'Central SA sound',
        'Gospel influences',
        'Bloemfontein style'
      ],
      northern_cape: [
        'Sparse, minimal',
        'Unique regional character'
      ]
    };

    return characteristics[region] || ['Regional characteristics detected'];
  }

  private getCulturalMarkers(region: SouthAfricanRegion) {
    const markers: Record<SouthAfricanRegion, {
      language: string[];
      traditionalInstruments: string[];
      musicalHeritage: string[];
    }> = {
      gauteng: {
        language: ['Zulu', 'Sotho', 'Tsonga', 'Tswana'],
        traditionalInstruments: ['Log drum', 'Synthesizers', 'Electronic drums'],
        musicalHeritage: ['Kwaito', 'Township jazz', 'Mbaqanga', 'Gospel']
      },
      western_cape: {
        language: ['Afrikaans', 'Xhosa', 'English'],
        traditionalInstruments: ['Electronic production', 'Synthesizers'],
        musicalHeritage: ['Cape jazz', 'House music', 'Ghoema']
      },
      kzn: {
        language: ['Zulu'],
        traditionalInstruments: ['Isicathamiya vocals', 'Traditional drums'],
        musicalHeritage: ['Maskandi', 'Isicathamiya', 'Mbaqanga']
      },
      eastern_cape: {
        language: ['Xhosa'],
        traditionalInstruments: ['Uhadi', 'Umrhubhe'],
        musicalHeritage: ['Xhosa traditional music', 'Township jazz']
      },
      limpopo: {
        language: ['Sepedi', 'Venda', 'Tsonga'],
        traditionalInstruments: ['Tshikona', 'Traditional drums'],
        musicalHeritage: ['Venda traditional music', 'Kiba dance music']
      },
      mpumalanga: {
        language: ['Swati', 'Ndebele'],
        traditionalInstruments: ['Traditional drums'],
        musicalHeritage: ['Ndebele music', 'Swati traditional']
      },
      northwest: {
        language: ['Tswana'],
        traditionalInstruments: ['Segaba', 'Setinkane'],
        musicalHeritage: ['Tswana traditional music']
      },
      free_state: {
        language: ['Sotho', 'Afrikaans'],
        traditionalInstruments: ['Lesiba', 'Meropa'],
        musicalHeritage: ['Sotho traditional music', 'Gospel']
      },
      northern_cape: {
        language: ['Afrikaans', 'Tswana'],
        traditionalInstruments: ['Guitar', 'Concertina'],
        musicalHeritage: ['Boeremusiek', 'Traditional folk']
      }
    };

    return markers[region] || {
      language: ['Multiple South African languages'],
      traditionalInstruments: ['Various'],
      musicalHeritage: ['South African musical traditions']
    };
  }

  private getProductionStyle(region: SouthAfricanRegion, features: ComprehensiveAudioFeatures) {
    const tempoMap: Record<SouthAfricanRegion, 'slow' | 'medium' | 'fast'> = {
      gauteng: 'medium',
      western_cape: 'fast',
      kzn: 'medium',
      eastern_cape: 'medium',
      limpopo: 'slow',
      mpumalanga: 'fast',
      northwest: 'medium',
      free_state: 'medium',
      northern_cape: 'medium'
    };

    const complexityMap: Record<SouthAfricanRegion, 'minimal' | 'moderate' | 'complex'> = {
      gauteng: 'complex',
      western_cape: 'moderate',
      kzn: 'moderate',
      eastern_cape: 'moderate',
      limpopo: 'minimal',
      mpumalanga: 'moderate',
      northwest: 'moderate',
      free_state: 'moderate',
      northern_cape: 'minimal'
    };

    return {
      tempo: tempoMap[region] || 'medium',
      complexity: complexityMap[region] || 'moderate',
      modernization: features.cultural.modernProductionScore
    };
  }
}

export const regionalClassifier = new RegionalClassifier();
