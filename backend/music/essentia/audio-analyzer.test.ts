import { describe, it, expect, beforeAll } from 'vitest';
import { EssentiaAudioAnalyzer } from './audio-analyzer';

describe('EssentiaAudioAnalyzer', () => {
  let analyzer: EssentiaAudioAnalyzer;

  beforeAll(async () => {
    analyzer = new EssentiaAudioAnalyzer();
    await analyzer.initialize();
  });

  describe('analyzeAudio', () => {
    it('should return comprehensive audio features', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features).toBeDefined();
      expect(features.rhythm).toBeDefined();
      expect(features.timbral).toBeDefined();
      expect(features.tonal).toBeDefined();
      expect(features.cultural).toBeDefined();
    });

    it('should detect BPM within amapiano range', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.rhythm.bpm).toBeGreaterThan(100);
      expect(features.rhythm.bpm).toBeLessThan(130);
    });

    it('should provide rhythmic features', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.rhythm.bpmConfidence).toBeGreaterThan(0);
      expect(features.rhythm.bpmConfidence).toBeLessThanOrEqual(1);
      expect(features.rhythm.beats).toBeInstanceOf(Array);
      expect(features.rhythm.danceability).toBeGreaterThan(0);
    });

    it('should provide timbral features', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.timbral.spectralCentroid).toBeGreaterThan(0);
      expect(features.timbral.spectralRolloff).toBeGreaterThan(0);
      expect(features.timbral.mfcc).toBeInstanceOf(Array);
      expect(features.timbral.mfcc.length).toBeGreaterThan(0);
    });

    it('should provide tonal features', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.tonal.key).toBeDefined();
      expect(features.tonal.scale).toBeDefined();
      expect(features.tonal.keyStrength).toBeGreaterThan(0);
      expect(features.tonal.chordProgression).toBeInstanceOf(Array);
    });

    it('should provide cultural features', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.cultural.logDrumPresence).toBeGreaterThanOrEqual(0);
      expect(features.cultural.logDrumPresence).toBeLessThanOrEqual(1);
      expect(features.cultural.bpmAuthenticity).toBeGreaterThanOrEqual(0);
      expect(features.cultural.gospelInfluence).toBeGreaterThanOrEqual(0);
      expect(features.cultural.jazzSophistication).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      const invalidBuffer = Buffer.alloc(0);
      
      const features = await analyzer.analyzeAudio(invalidBuffer);
      
      expect(features).toBeDefined();
      expect(features.rhythm.bpm).toBeGreaterThan(0);
    });
  });

  describe('assessAudioQuality', () => {
    it('should return quality metrics', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const quality = await analyzer.assessAudioQuality(mockAudioBuffer);
      
      expect(quality).toBeDefined();
      expect(quality.overallTechnicalQuality).toBeGreaterThan(0);
      expect(quality.overallTechnicalQuality).toBeLessThanOrEqual(1);
      expect(quality.spectralQuality).toBeDefined();
      expect(quality.dynamicRange).toBeDefined();
    });
  });

  describe('assessMusicalCoherence', () => {
    it('should return coherence metrics for amapiano', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const coherence = await analyzer.assessMusicalCoherence(mockAudioBuffer, 'amapiano');
      
      expect(coherence).toBeDefined();
      expect(coherence.overallMusicalCoherence).toBeGreaterThan(0);
      expect(coherence.overallMusicalCoherence).toBeLessThanOrEqual(1);
      expect(coherence.harmonicConsistency).toBeDefined();
      expect(coherence.rhythmicStability).toBeDefined();
      expect(coherence.genreFit).toBeDefined();
    });

    it('should assess genre fit correctly', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const coherence = await analyzer.assessMusicalCoherence(mockAudioBuffer, 'private_school_amapiano');
      
      expect(coherence.genreFit).toBeGreaterThan(0);
    });
  });

  describe('cultural analysis', () => {
    it('should detect log drum patterns', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.cultural.logDrumPresence).toBeDefined();
    });

    it('should validate BPM authenticity', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.cultural.bpmAuthenticity).toBeGreaterThanOrEqual(0);
      expect(features.cultural.bpmAuthenticity).toBeLessThanOrEqual(1);
    });

    it('should detect gospel and jazz influences', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.cultural.gospelInfluence).toBeDefined();
      expect(features.cultural.jazzSophistication).toBeDefined();
    });

    it('should calculate swing factor', async () => {
      const mockAudioBuffer = createMockAudioBuffer(44100 * 3);
      
      const features = await analyzer.analyzeAudio(mockAudioBuffer);
      
      expect(features.cultural.swingFactor).toBeDefined();
      expect(features.cultural.swingFactor).toBeGreaterThanOrEqual(0);
    });
  });
});

function createMockAudioBuffer(samples: number): Buffer {
  const buffer = Buffer.alloc(samples * 2);
  
  for (let i = 0; i < samples; i++) {
    const frequency = 440;
    const sampleRate = 44100;
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 16384;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }
  
  return buffer;
}
