import log from "encore.dev/log";
import { EventEmitter } from "events";
import type { ComprehensiveAudioFeatures } from "./types";
import { essentiaAnalyzer } from "./audio-analyzer";

/**
 * Real-Time Streaming Audio Analysis
 * 
 * Enables real-time audio analysis for DAW integration, live performance monitoring,
 * and interactive music creation tools.
 */

export interface StreamingConfig {
  bufferSize: number;           // Audio buffer size in samples (e.g., 2048)
  hopSize: number;              // Hop size for overlapping windows (e.g., 512)
  sampleRate: number;           // Sample rate in Hz (e.g., 44100)
  channels: number;             // Number of audio channels (1 = mono, 2 = stereo)
  analysisInterval: number;     // Analysis update interval in ms (e.g., 100)
}

export interface StreamingFeatures {
  timestamp: number;            // Analysis timestamp in ms
  instantaneous: {
    rms: number;                // Root mean square (loudness)
    peak: number;               // Peak amplitude
    zcr: number;                // Zero crossing rate
    spectralCentroid: number;   // Brightness
  };
  shortTerm: {                  // Last 1 second
    bpm: number | null;         // Detected BPM (if stable)
    bpmConfidence: number;
    beats: number[];            // Beat timestamps
  };
  cultural: {
    logDrumActivity: number;    // 0-1 log drum presence
    percussiveEnergy: number;   // 0-1 percussive content
  };
}

export type StreamingEvent = 
  | { type: 'features'; data: StreamingFeatures }
  | { type: 'beat'; timestamp: number; confidence: number }
  | { type: 'onset'; timestamp: number; strength: number }
  | { type: 'bpm_detected'; bpm: number; confidence: number }
  | { type: 'error'; error: string };

export class StreamingAnalyzer extends EventEmitter {
  private config: StreamingConfig;
  private audioBuffer: Float32Array[] = [];
  private isRunning: boolean = false;
  private analysisTimer: NodeJS.Timeout | null = null;
  private lastBeatTime: number = 0;
  private beatHistory: number[] = [];
  private onsetHistory: number[] = [];

  constructor(config?: Partial<StreamingConfig>) {
    super();
    
    this.config = {
      bufferSize: config?.bufferSize || 2048,
      hopSize: config?.hopSize || 512,
      sampleRate: config?.sampleRate || 44100,
      channels: config?.channels || 2,
      analysisInterval: config?.analysisInterval || 100
    };

    log.info("Streaming analyzer initialized", { config: this.config });
  }

  /**
   * Start real-time analysis
   */
  start(): void {
    if (this.isRunning) {
      log.warn("Streaming analyzer already running");
      return;
    }

    this.isRunning = true;
    this.audioBuffer = [];
    this.beatHistory = [];
    this.onsetHistory = [];

    // Start periodic analysis
    this.analysisTimer = setInterval(() => {
      this.performAnalysis();
    }, this.config.analysisInterval);

    log.info("Streaming analyzer started");
    this.emit('started');
  }

  /**
   * Stop real-time analysis
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }

    log.info("Streaming analyzer stopped");
    this.emit('stopped');
  }

  /**
   * Process incoming audio chunk
   */
  processAudioChunk(audioData: Float32Array): void {
    if (!this.isRunning) {
      log.warn("Cannot process audio chunk: analyzer not running");
      return;
    }

    // Add to circular buffer
    this.audioBuffer.push(audioData);

    // Keep only last 5 seconds of audio for analysis
    const maxChunks = Math.ceil((this.config.sampleRate * 5) / this.config.bufferSize);
    if (this.audioBuffer.length > maxChunks) {
      this.audioBuffer.shift();
    }
  }

  /**
   * Process incoming audio chunk from Buffer
   */
  processAudioBuffer(buffer: Buffer): void {
    // Convert Buffer to Float32Array
    const float32 = new Float32Array(buffer.length / 2);
    
    for (let i = 0; i < float32.length; i++) {
      const sample = buffer.readInt16LE(i * 2);
      float32[i] = sample / 32768.0;
    }

    this.processAudioChunk(float32);
  }

  /**
   * Perform real-time analysis
   */
  private async performAnalysis(): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    try {
      const now = Date.now();

      // Get latest audio chunk
      const latestChunk = this.audioBuffer[this.audioBuffer.length - 1];

      // Instantaneous features
      const instantaneous = this.analyzeInstantaneous(latestChunk);

      // Detect onsets in latest chunk
      const onset = this.detectOnset(latestChunk);
      if (onset.detected) {
        this.onsetHistory.push(now);
        this.emit('onset', { timestamp: now, strength: onset.strength } as StreamingEvent);
      }

      // Short-term features (last 1 second)
      const shortTerm = await this.analyzeShortTerm();

      // Detect beats
      if (shortTerm.bpm && shortTerm.bpm > 0) {
        const beatDetected = this.detectBeat(now, shortTerm.bpm);
        if (beatDetected) {
          this.beatHistory.push(now);
          this.emit('beat', { 
            timestamp: now, 
            confidence: shortTerm.bpmConfidence 
          } as StreamingEvent);
        }
      }

      // Cultural features
      const cultural = this.analyzeCultural(latestChunk);

      // Emit features
      const features: StreamingFeatures = {
        timestamp: now,
        instantaneous,
        shortTerm,
        cultural
      };

      this.emit('features', { type: 'features', data: features } as StreamingEvent);

    } catch (error) {
      log.error("Streaming analysis error", { error: (error as Error).message });
      this.emit('error', { type: 'error', error: (error as Error).message } as StreamingEvent);
    }
  }

  /**
   * Analyze instantaneous features
   */
  private analyzeInstantaneous(audioChunk: Float32Array) {
    let sumSquares = 0;
    let peak = 0;
    let zeroCrossings = 0;
    let spectralEnergy = 0;

    for (let i = 0; i < audioChunk.length; i++) {
      const sample = audioChunk[i];
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));

      // Zero crossing rate
      if (i > 0) {
        const prevSample = audioChunk[i - 1];
        if ((sample >= 0 && prevSample < 0) || (sample < 0 && prevSample >= 0)) {
          zeroCrossings++;
        }
      }

      // Simple spectral centroid approximation
      spectralEnergy += Math.abs(sample) * i;
    }

    const rms = Math.sqrt(sumSquares / audioChunk.length);
    const zcr = zeroCrossings / audioChunk.length;
    const spectralCentroid = spectralEnergy / (sumSquares * audioChunk.length);

    return {
      rms,
      peak,
      zcr,
      spectralCentroid: spectralCentroid * 10000 // Scale to Hz estimate
    };
  }

  /**
   * Analyze short-term features (last 1 second)
   */
  private async analyzeShortTerm() {
    if (this.audioBuffer.length === 0) {
      return {
        bpm: null,
        bpmConfidence: 0,
        beats: []
      };
    }

    // Get last 1 second of audio
    const samplesPerSecond = this.config.sampleRate;
    const chunksPerSecond = Math.ceil(samplesPerSecond / this.config.bufferSize);
    const recentChunks = this.audioBuffer.slice(-chunksPerSecond);

    // Concatenate chunks
    const totalLength = recentChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const concatenated = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of recentChunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to Buffer for analyzer
    const buffer = Buffer.alloc(concatenated.length * 2);
    for (let i = 0; i < concatenated.length; i++) {
      const sample = Math.max(-1, Math.min(1, concatenated[i]));
      buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }

    // Perform BPM detection on short window
    try {
      const features = await essentiaAnalyzer.analyzeAudio(buffer);
      
      return {
        bpm: features.rhythm.bpm,
        bpmConfidence: features.rhythm.bpmConfidence,
        beats: features.rhythm.beats
      };
    } catch (error) {
      return {
        bpm: null,
        bpmConfidence: 0,
        beats: []
      };
    }
  }

  /**
   * Detect onset (percussive attack)
   */
  private detectOnset(audioChunk: Float32Array): { detected: boolean; strength: number } {
    // Calculate energy
    let energy = 0;
    for (let i = 0; i < audioChunk.length; i++) {
      energy += audioChunk[i] * audioChunk[i];
    }
    
    energy = Math.sqrt(energy / audioChunk.length);

    // Simple onset detection: energy spike
    const threshold = 0.3; // Adjust based on typical signal level
    const detected = energy > threshold;

    return {
      detected,
      strength: energy
    };
  }

  /**
   * Detect beat based on BPM
   */
  private detectBeat(now: number, bpm: number): boolean {
    const beatInterval = (60 / bpm) * 1000; // ms between beats
    const timeSinceLastBeat = now - this.lastBeatTime;

    // Check if we're near a beat time
    const tolerance = beatInterval * 0.1; // 10% tolerance
    if (timeSinceLastBeat >= beatInterval - tolerance) {
      this.lastBeatTime = now;
      return true;
    }

    return false;
  }

  /**
   * Analyze cultural features
   */
  private analyzeCultural(audioChunk: Float32Array) {
    // Log drum detection: low frequency energy + sharp attack
    let lowFreqEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < audioChunk.length; i++) {
      const sample = audioChunk[i];
      totalEnergy += sample * sample;
      
      // Approximate low frequency (first quarter of spectrum)
      if (i < audioChunk.length / 4) {
        lowFreqEnergy += sample * sample;
      }
    }

    const logDrumActivity = totalEnergy > 0 ? lowFreqEnergy / totalEnergy : 0;

    // Percussive energy: zero crossing rate as proxy
    let zcr = 0;
    for (let i = 1; i < audioChunk.length; i++) {
      if ((audioChunk[i] >= 0 && audioChunk[i - 1] < 0) || 
          (audioChunk[i] < 0 && audioChunk[i - 1] >= 0)) {
        zcr++;
      }
    }
    const percussiveEnergy = zcr / audioChunk.length;

    return {
      logDrumActivity: Math.min(1, logDrumActivity * 2), // Scale
      percussiveEnergy: Math.min(1, percussiveEnergy * 10) // Scale
    };
  }

  /**
   * Get current state
   */
  getState(): {
    isRunning: boolean;
    bufferLength: number;
    beatCount: number;
    onsetCount: number;
  } {
    return {
      isRunning: this.isRunning,
      bufferLength: this.audioBuffer.length,
      beatCount: this.beatHistory.length,
      onsetCount: this.onsetHistory.length
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.audioBuffer = [];
    this.beatHistory = [];
    this.onsetHistory = [];
    log.info("Streaming analyzer history cleared");
  }
}

/**
 * Create a new streaming analyzer
 */
export function createStreamingAnalyzer(config?: Partial<StreamingConfig>): StreamingAnalyzer {
  return new StreamingAnalyzer(config);
}
