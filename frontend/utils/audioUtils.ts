import * as Tone from 'tone';

/**
 * Amapiano-specific instrument presets and audio utilities
 */

export interface AmApianoInstrumentConfig {
  name: string;
  type: 'sampler' | 'synth' | 'drum';
  culturalContext: string;
  settings: any;
}

/**
 * Log Drum Synthesizer - The signature Amapiano sound
 */
export const createLogDrumSynth = (): Tone.MembraneSynth => {
  return new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: 0.001,
      decay: 0.4,
      sustain: 0.01,
      release: 1.4,
      attackCurve: "exponential"
    }
  });
};

/**
 * Amapiano Piano - Soulful gospel-influenced piano
 */
export const createAmapianoPiano = (): Tone.Sampler => {
  return new Tone.Sampler({
    urls: {
      A0: "A0.mp3",
      C1: "C1.mp3",
      "D#1": "Ds1.mp3",
      "F#1": "Fs1.mp3",
      A1: "A1.mp3",
      C2: "C2.mp3",
      "D#2": "Ds2.mp3",
      "F#2": "Fs2.mp3",
      A2: "A2.mp3",
      C3: "C3.mp3",
      "D#3": "Ds3.mp3",
      "F#3": "Fs3.mp3",
      A3: "A3.mp3",
      C4: "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      C5: "C5.mp3",
      "D#5": "Ds5.mp3",
      "F#5": "Fs5.mp3",
      A5: "A5.mp3",
      C6: "C6.mp3",
      "D#6": "Ds6.mp3",
      "F#6": "Fs6.mp3",
      A6: "A6.mp3",
      C7: "C7.mp3",
      "D#7": "Ds7.mp3",
      "F#7": "Fs7.mp3",
      A7: "A7.mp3",
      C8: "C8.mp3"
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/"
  });
};

/**
 * Shaker/Percussion - High-frequency rhythmic elements
 */
export const createShakerSynth = (): Tone.NoiseSynth => {
  return new Tone.NoiseSynth({
    noise: {
      type: "white"
    },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0
    }
  });
};

/**
 * Deep Bass Synth - Sub-bass foundation
 */
export const createBassSynth = (): Tone.MonoSynth => {
  return new Tone.MonoSynth({
    oscillator: {
      type: "sawtooth"
    },
    filter: {
      Q: 2,
      type: "lowpass",
      rolloff: -24
    },
    envelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.4,
      release: 1.2
    },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.5,
      release: 1.5,
      baseFrequency: 50,
      octaves: 3.5
    }
  });
};

/**
 * Map instrument names to Tone.js constructors
 */
export const createInstrument = (instrumentName: string, channel: Tone.Channel): Tone.Instrument => {
  switch (instrumentName.toLowerCase()) {
    case 'signature log drum':
    case 'log drum':
      return createLogDrumSynth().connect(channel);
    
    case 'amapiano piano':
    case 'piano':
      return createAmapianoPiano().connect(channel);
    
    case 'shaker groove engine':
    case 'shaker':
    case 'percussion':
      return createShakerSynth().connect(channel);
    
    case 'deep bass':
    case 'bass':
      return createBassSynth().connect(channel);
    
    default:
      // Default to polyphonic synth
      return new Tone.PolySynth(Tone.Synth).connect(channel);
  }
};

/**
 * Create effect chain for Amapiano mixing
 */
export const createAmApianoEffectChain = (type: 'master' | 'track'): Tone.ToneAudioNode[] => {
  if (type === 'master') {
    return [
      new Tone.EQ3({
        low: 0,
        mid: 0,
        high: 0
      }),
      new Tone.Compressor({
        threshold: -24,
        ratio: 4,
        attack: 0.003,
        release: 0.25
      }),
      new Tone.Limiter(-3)
    ];
  }
  
  return [
    new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0
    }),
    new Tone.Compressor({
      threshold: -30,
      ratio: 2,
      attack: 0.01,
      release: 0.1
    })
  ];
};

/**
 * Apply Amapiano swing timing (characteristic groove)
 */
export const applyAmApianoSwing = (isPrivateSchool: boolean = false): number => {
  // Classic amapiano has more pronounced swing
  // Private school amapiano has subtle jazz-influenced swing
  return isPrivateSchool ? 0.05 : 0.1;
};

/**
 * Generate culturally authentic BPM based on genre
 */
export const getAuthenticBPM = (genre: 'amapiano' | 'private_school_amapiano'): number => {
  if (genre === 'private_school_amapiano') {
    // Private school tends to be slower, more relaxed
    return 110 + Math.floor(Math.random() * 12); // 110-122 BPM
  }
  
  // Classic amapiano is slightly faster
  return 115 + Math.floor(Math.random() * 10); // 115-125 BPM
};

/**
 * Audio recording utilities for microphone input
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

/**
 * Waveform visualization using Web Audio API
 */
export class WaveformVisualizer {
  private analyser: Tone.Analyser;
  private animationFrame: number | null = null;

  constructor() {
    this.analyser = new Tone.Analyser('waveform', 2048);
  }

  connect(source: Tone.ToneAudioNode): void {
    source.connect(this.analyser);
  }

  startVisualization(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const waveform = this.analyser.getValue();
      
      ctx.fillStyle = 'rgb(20, 20, 30)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(139, 92, 246)'; // Amapiano purple accent
      ctx.beginPath();
      
      const sliceWidth = canvas.width / waveform.length;
      let x = 0;
      
      for (let i = 0; i < waveform.length; i++) {
        const v = (waveform[i] as number) * 0.5 + 0.5;
        const y = v * canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      this.animationFrame = requestAnimationFrame(draw);
    };
    
    draw();
  }

  stopVisualization(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  dispose(): void {
    this.stopVisualization();
    this.analyser.dispose();
  }
}
