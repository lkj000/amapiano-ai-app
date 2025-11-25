import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { MidiNote, DawClip } from '~backend/music/types';

const LATENCY_HINT = 'playback';
const LOOK_AHEAD = 0.05;
const UPDATE_INTERVAL = 0.025;

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  bpm: number;
  isInitialized: boolean;
  audioLatency?: number;
}

export interface AudioEngine {
  state: AudioEngineState;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  loadClip: (clip: DawClip, trackId: string) => Promise<void>;
  playMidiNotes: (notes: MidiNote[], instrument: string) => Promise<void>;
  loadSample: (url: string, trackId: string) => Promise<void>;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  muteTrack: (trackId: string, mute: boolean) => void;
  soloTrack: (trackId: string, solo: boolean) => void;
  initializeAudio: () => Promise<void>;
}

export const useAudioEngine = (): AudioEngine => {
  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    currentTime: 0,
    bpm: 120,
    isInitialized: false,
  });

  const instrumentsRef = useRef<Map<string, Tone.Sampler | Tone.PolySynth>>(new Map());
  const playersRef = useRef<Map<string, Tone.Player>>(new Map());
  const channelsRef = useRef<Map<string, Tone.Channel>>(new Map());
  const masterChannelRef = useRef<Tone.Channel | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Tone.js audio context
  const initializeAudio = useCallback(async () => {
    try {
      await Tone.start();
      
      Tone.context.latencyHint = LATENCY_HINT;
      Tone.context.lookAhead = LOOK_AHEAD;
      
      // Calculate total latency for visual compensation
      const baseLatency = Tone.context.baseLatency || 0;
      const outputLatency = Tone.context.outputLatency || 0;
      const totalLatency = baseLatency + outputLatency + LOOK_AHEAD;
      
      console.log(`Audio latency: ${(totalLatency * 1000).toFixed(1)}ms (base: ${(baseLatency * 1000).toFixed(1)}ms, output: ${(outputLatency * 1000).toFixed(1)}ms, lookahead: ${(LOOK_AHEAD * 1000).toFixed(1)}ms)`);
      
      // Update UI with latency-compensated time
      Tone.Transport.scheduleRepeat((time) => {
        // Compensate for audio latency in visual display
        const visualTime = Math.max(0, Tone.Transport.seconds - totalLatency);
        
        setState(prev => ({
          ...prev,
          currentTime: visualTime,
          audioLatency: totalLatency
        }));
      }, UPDATE_INTERVAL);
      
      console.log('Tone.js audio context started with latency-compensated playhead');
      
      // Create master channel
      if (!masterChannelRef.current) {
        masterChannelRef.current = new Tone.Channel().toDestination();
      }
      
      // Initialize default instruments for Amapiano
      if (!instrumentsRef.current.has('default_piano')) {
        const piano = new Tone.Sampler({
          urls: {
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
          },
          baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).connect(masterChannelRef.current);
        
        instrumentsRef.current.set('default_piano', piano);
      }
      
      if (!instrumentsRef.current.has('default_synth')) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "sine"
          },
          envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.5,
            release: 1.0
          }
        }).connect(masterChannelRef.current);
        
        instrumentsRef.current.set('default_synth', synth);
      }
      
      setState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, []);

  // Set BPM
  const setBpm = useCallback((bpm: number) => {
    Tone.Transport.bpm.value = bpm;
    setState(prev => ({ ...prev, bpm }));
  }, []);

  // Play transport
  const play = useCallback(async () => {
    if (!state.isInitialized) {
      await initializeAudio();
    }
    
    Tone.Transport.start();
    setState(prev => ({ ...prev, isPlaying: true }));
  }, [state.isInitialized, initializeAudio]);

  // Pause transport
  const pause = useCallback(() => {
    Tone.Transport.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  // Stop transport
  const stop = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  // Load and schedule a MIDI clip
  const loadClip = useCallback(async (clip: DawClip, trackId: string) => {
    if (!clip.notes || clip.notes.length === 0) return;
    
    // Get or create instrument for this track
    let instrument = instrumentsRef.current.get(trackId);
    if (!instrument) {
      // Create default synth for this track
      const channel = getOrCreateChannel(trackId);
      instrument = new Tone.PolySynth(Tone.Synth).connect(channel);
      instrumentsRef.current.set(trackId, instrument);
    }
    
    // Schedule MIDI notes
    const part = new Tone.Part((time, note) => {
      const midiNote = note as MidiNote;
      if (instrument instanceof Tone.PolySynth || instrument instanceof Tone.Sampler) {
        const noteName = Tone.Frequency(midiNote.pitch, "midi").toNote();
        const duration = Tone.Time(midiNote.duration).toSeconds();
        const velocity = midiNote.velocity / 127;
        
        instrument.triggerAttackRelease(noteName, duration, time, velocity);
      }
    }, clip.notes.map(note => [note.startTime + clip.startTime, note]));
    
    part.start(0);
    part.loop = false;
  }, []);

  // Play MIDI notes immediately (for live preview)
  const playMidiNotes = useCallback(async (notes: MidiNote[], instrumentName: string) => {
    if (!state.isInitialized) {
      await initializeAudio();
    }
    
    let instrument = instrumentsRef.current.get(instrumentName) || instrumentsRef.current.get('default_synth');
    
    if (!instrument) return;
    
    const now = Tone.now();
    notes.forEach((note) => {
      if (instrument instanceof Tone.PolySynth || instrument instanceof Tone.Sampler) {
        const noteName = Tone.Frequency(note.pitch, "midi").toNote();
        const duration = Tone.Time(note.duration).toSeconds();
        const velocity = note.velocity / 127;
        
        instrument.triggerAttackRelease(noteName, duration, now + note.startTime, velocity);
      }
    });
  }, [state.isInitialized, initializeAudio]);

  // Load audio sample
  const loadSample = useCallback(async (url: string, trackId: string) => {
    const channel = getOrCreateChannel(trackId);
    const player = new Tone.Player(url).connect(channel);
    
    await Tone.loaded();
    playersRef.current.set(trackId, player);
    
    player.sync().start(0);
  }, []);

  // Get or create channel for a track
  const getOrCreateChannel = useCallback((trackId: string): Tone.Channel => {
    let channel = channelsRef.current.get(trackId);
    if (!channel && masterChannelRef.current) {
      channel = new Tone.Channel().connect(masterChannelRef.current);
      channelsRef.current.set(trackId, channel);
    }
    return channel!;
  }, []);

  // Set track volume
  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const channel = channelsRef.current.get(trackId);
    if (channel) {
      channel.volume.value = Tone.gainToDb(volume);
    }
  }, []);

  // Set track pan
  const setTrackPan = useCallback((trackId: string, pan: number) => {
    const channel = channelsRef.current.get(trackId);
    if (channel) {
      channel.pan.value = pan;
    }
  }, []);

  // Mute track
  const muteTrack = useCallback((trackId: string, mute: boolean) => {
    const channel = channelsRef.current.get(trackId);
    if (channel) {
      channel.mute = mute;
    }
  }, []);

  // Solo track
  const soloTrack = useCallback((trackId: string, solo: boolean) => {
    const channel = channelsRef.current.get(trackId);
    if (channel) {
      channel.solo = solo;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Tone.Transport.cancel();
      
      instrumentsRef.current.forEach(inst => inst.dispose());
      playersRef.current.forEach(player => player.dispose());
      channelsRef.current.forEach(channel => channel.dispose());
      
      if (masterChannelRef.current) {
        masterChannelRef.current.dispose();
      }
    };
  }, []);

  return {
    state,
    play,
    pause,
    stop,
    setBpm,
    loadClip,
    playMidiNotes,
    loadSample,
    setTrackVolume,
    setTrackPan,
    muteTrack,
    soloTrack,
    initializeAudio,
  };
};
