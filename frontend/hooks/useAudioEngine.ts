import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// Audio buffer management for samples and tracks
interface AudioBufferInfo {
  id: string;
  buffer: AudioBuffer;
  url: string;
  name: string;
  duration: number;
  sampleRate: number;
  channels: number;
}

// Track information for DAW functionality
interface Track {
  id: number;
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  effects: AudioEffect[];
  clips: AudioClip[];
  gainNode?: GainNode;
  panNode?: StereoPannerNode;
  effectChain?: AudioNode[];
}

interface AudioClip {
  id: string;
  trackId: number;
  bufferId: string;
  startTime: number;
  duration: number;
  offset: number;
  loop: boolean;
  volume: number;
}

interface AudioEffect {
  id: string;
  type: 'reverb' | 'delay' | 'filter' | 'compressor' | 'distortion' | 'chorus';
  enabled: boolean;
  parameters: Record<string, number>;
  node?: AudioNode;
}

// Playback state
interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  tempo: number;
  timeSignature: [number, number];
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  metronomeEnabled: boolean;
}

export const useAudioEngine = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioBuffers, setAudioBuffers] = useState<Map<string, AudioBufferInfo>>(new Map());
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    tempo: 120,
    timeSignature: [4, 4],
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    metronomeEnabled: false
  });
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [analyserData, setAnalyserData] = useState<Float32Array | null>(null);

  // Audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  
  // Playback management
  const scheduledSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const metronomeRef = useRef<{
    buffer: AudioBuffer | null;
    nextBeatTime: number;
    beatNumber: number;
  }>({ buffer: null, nextBeatTime: 0, beatNumber: 0 });

  // Initialize audio context and master chain
  const initializeAudioEngine = useCallback(async () => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create master gain node
      const masterGain = audioContext.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;

      // Create master compressor
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      compressor.connect(masterGain);
      compressorRef.current = compressor;

      // Create analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      compressor.connect(analyser);
      analyserRef.current = analyser;

      // Create convolver for master reverb
      const convolver = audioContext.createConvolver();
      convolverRef.current = convolver;

      // Generate impulse response for reverb
      await generateReverbImpulse(audioContext, convolver);

      // Initialize metronome
      await initializeMetronome(audioContext);

      setIsInitialized(true);
      toast.success("Audio engine initialized");

      // Start analyzer data updates
      updateAnalyserData();

    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
      toast.error("Failed to initialize audio engine");
    }
  }, [masterVolume]);

  const generateReverbImpulse = useCallback(async (audioContext: AudioContext, convolver: ConvolverNode) => {
    const length = audioContext.sampleRate * 2; // 2 seconds
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2);
      leftChannel[i] = (Math.random() * 2 - 1) * decay;
      rightChannel[i] = (Math.random() * 2 - 1) * decay;
    }
    
    convolver.buffer = impulse;
  }, []);

  const initializeMetronome = useCallback(async (audioContext: AudioContext) => {
    // Generate metronome click sound
    const length = audioContext.sampleRate * 0.1; // 100ms
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / audioContext.sampleRate;
      const frequency = i < length * 0.1 ? 1000 : 800; // Accent on first beat
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 10);
    }
    
    metronomeRef.current.buffer = buffer;
  }, []);

  const updateAnalyserData = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getFloatFrequencyData(dataArray);
    setAnalyserData(dataArray);

    animationFrameRef.current = requestAnimationFrame(updateAnalyserData);
  }, []);

  // Load audio buffer from URL or file
  const loadAudioBuffer = useCallback(async (url: string, name: string): Promise<string> => {
    if (!audioContextRef.current) {
      throw new Error("Audio engine not initialized");
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const bufferId = `buffer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const bufferInfo: AudioBufferInfo = {
        id: bufferId,
        buffer: audioBuffer,
        url,
        name,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      };

      setAudioBuffers(prev => new Map(prev.set(bufferId, bufferInfo)));
      toast.success(`Loaded audio: ${name}`);
      
      return bufferId;

    } catch (error) {
      console.error("Failed to load audio buffer:", error);
      toast.error(`Failed to load audio: ${name}`);
      throw error;
    }
  }, []);

  // Create and configure track
  const createTrack = useCallback((name: string): Track => {
    if (!audioContextRef.current || !compressorRef.current) {
      throw new Error("Audio engine not initialized");
    }

    const trackId = Date.now();
    
    // Create gain node for volume control
    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = 1.0;
    
    // Create stereo panner for pan control
    const panNode = audioContextRef.current.createStereoPanner();
    panNode.pan.value = 0;
    
    // Connect nodes: gainNode -> panNode -> compressor
    gainNode.connect(panNode);
    panNode.connect(compressorRef.current);

    const track: Track = {
      id: trackId,
      name,
      volume: 1.0,
      pan: 0,
      mute: false,
      solo: false,
      effects: [],
      clips: [],
      gainNode,
      panNode,
      effectChain: [gainNode, panNode]
    };

    setTracks(prev => [...prev, track]);
    toast.success(`Created track: ${name}`);
    
    return track;
  }, []);

  // Add audio clip to track
  const addClipToTrack = useCallback((
    trackId: number,
    bufferId: string,
    startTime: number,
    duration?: number,
    offset: number = 0
  ): string => {
    const bufferInfo = audioBuffers.get(bufferId);
    if (!bufferInfo) {
      throw new Error("Audio buffer not found");
    }

    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clipDuration = duration || bufferInfo.duration - offset;

    const clip: AudioClip = {
      id: clipId,
      trackId,
      bufferId,
      startTime,
      duration: clipDuration,
      offset,
      loop: false,
      volume: 1.0
    };

    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, clips: [...track.clips, clip] }
        : track
    ));

    return clipId;
  }, [audioBuffers]);

  // Play a single audio buffer immediately
  const playBuffer = useCallback(async (bufferId: string, when: number = 0, offset: number = 0, duration?: number) => {
    if (!audioContextRef.current) return null;

    const bufferInfo = audioBuffers.get(bufferId);
    if (!bufferInfo) return null;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = bufferInfo.buffer;
    source.connect(masterGainRef.current!);

    const startTime = when || audioContextRef.current.currentTime;
    const playDuration = duration || (bufferInfo.duration - offset);

    source.start(startTime, offset, playDuration);
    
    // Store reference for stopping
    const sourceId = `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    scheduledSourcesRef.current.set(sourceId, source);

    // Clean up when finished
    source.onended = () => {
      scheduledSourcesRef.current.delete(sourceId);
    };

    return sourceId;
  }, [audioBuffers]);

  // Start playback of all tracks
  const play = useCallback(async () => {
    if (!audioContextRef.current || !isInitialized) return;

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const currentTime = audioContextRef.current.currentTime;
      let playbackStartTime = playbackState.currentTime;

      if (playbackState.isPaused) {
        playbackStartTime = pauseTimeRef.current;
      }

      startTimeRef.current = currentTime - playbackStartTime;

      // Schedule all clips
      tracks.forEach(track => {
        if (track.mute) return;
        
        track.clips.forEach(clip => {
          const bufferInfo = audioBuffers.get(clip.bufferId);
          if (!bufferInfo) return;

          const clipStartTime = currentTime + (clip.startTime - playbackStartTime);
          
          if (clipStartTime >= currentTime) {
            const source = audioContextRef.current!.createBufferSource();
            source.buffer = bufferInfo.buffer;
            
            // Apply clip volume
            const gainNode = audioContextRef.current!.createGain();
            gainNode.gain.value = clip.volume;
            
            // Connect through track's effect chain
            source.connect(gainNode);
            if (track.effectChain && track.effectChain.length > 0) {
              gainNode.connect(track.effectChain[0]);
            } else {
              gainNode.connect(masterGainRef.current!);
            }

            source.start(clipStartTime, clip.offset, clip.duration);
            scheduledSourcesRef.current.set(clip.id, source);
          }
        });
      });

      // Start metronome if enabled
      if (playbackState.metronomeEnabled) {
        scheduleMetronome();
      }

      setPlaybackState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false
      }));

      // Start time updates
      updatePlaybackTime();
      
      toast.success("Playback started");

    } catch (error) {
      console.error("Failed to start playback:", error);
      toast.error("Failed to start playback");
    }
  }, [tracks, audioBuffers, playbackState, isInitialized]);

  const stop = useCallback(() => {
    // Stop all scheduled sources
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    scheduledSourcesRef.current.clear();

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0
    }));

    startTimeRef.current = 0;
    pauseTimeRef.current = 0;

    toast.info("Playback stopped");
  }, []);

  const pause = useCallback(() => {
    if (!audioContextRef.current) return;

    pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
    
    // Stop all sources
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    scheduledSourcesRef.current.clear();

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true
    }));

    toast.info("Playback paused");
  }, []);

  const scheduleMetronome = useCallback(() => {
    if (!audioContextRef.current || !metronomeRef.current.buffer) return;

    const secondsPerBeat = 60 / playbackState.tempo;
    const currentTime = audioContextRef.current.currentTime;
    
    // Schedule next few beats
    for (let i = 0; i < 4; i++) {
      const beatTime = currentTime + (i * secondsPerBeat);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = metronomeRef.current.buffer;
      
      const gain = audioContextRef.current.createGain();
      gain.gain.value = (metronomeRef.current.beatNumber % playbackState.timeSignature[0] === 0) ? 0.8 : 0.5;
      
      source.connect(gain);
      gain.connect(masterGainRef.current!);
      
      source.start(beatTime);
      metronomeRef.current.beatNumber++;
    }

    // Schedule next batch
    setTimeout(scheduleMetronome, secondsPerBeat * 2 * 1000);
  }, [playbackState.tempo, playbackState.timeSignature]);

  const updatePlaybackTime = useCallback(() => {
    if (!playbackState.isPlaying || !audioContextRef.current) return;

    const currentTime = audioContextRef.current.currentTime - startTimeRef.current;
    
    setPlaybackState(prev => ({
      ...prev,
      currentTime
    }));

    // Check loop boundaries
    if (playbackState.loop && currentTime >= playbackState.loopEnd) {
      seekTo(playbackState.loopStart);
    }

    setTimeout(updatePlaybackTime, 16); // ~60fps updates
  }, [playbackState.isPlaying, playbackState.loop, playbackState.loopStart, playbackState.loopEnd]);

  const seekTo = useCallback((time: number) => {
    const wasPlaying = playbackState.isPlaying;
    
    if (wasPlaying) {
      pause();
    }

    setPlaybackState(prev => ({
      ...prev,
      currentTime: time
    }));

    pauseTimeRef.current = time;

    if (wasPlaying) {
      setTimeout(() => play(), 50); // Small delay to ensure state update
    }
  }, [playbackState.isPlaying, pause, play]);

  // Update track parameters
  const updateTrackVolume = useCallback((trackId: number, volume: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId && track.gainNode) {
        track.gainNode.gain.value = volume;
        return { ...track, volume };
      }
      return track;
    }));
  }, []);

  const updateTrackPan = useCallback((trackId: number, pan: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId && track.panNode) {
        track.panNode.pan.value = pan;
        return { ...track, pan };
      }
      return track;
    }));
  }, []);

  const toggleTrackMute = useCallback((trackId: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId && track.gainNode) {
        const newMute = !track.mute;
        track.gainNode.gain.value = newMute ? 0 : track.volume;
        return { ...track, mute: newMute };
      }
      return track;
    }));
  }, []);

  // Master controls
  const updateMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
      setMasterVolume(volume);
    }
  }, []);

  const updateTempo = useCallback((tempo: number) => {
    setPlaybackState(prev => ({ ...prev, tempo }));
  }, []);

  // Effect management
  const addEffectToTrack = useCallback((trackId: number, effectType: AudioEffect['type'], parameters: Record<string, number>) => {
    if (!audioContextRef.current) return;

    const effectId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const effect: AudioEffect = {
      id: effectId,
      type: effectType,
      enabled: true,
      parameters
    };

    // Create the actual audio node based on effect type
    let effectNode: AudioNode;

    switch (effectType) {
      case 'filter':
        const filter = audioContextRef.current.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = parameters.frequency || 1000;
        filter.Q.value = parameters.q || 1;
        effectNode = filter;
        break;

      case 'delay':
        const delay = audioContextRef.current.createDelay(1.0);
        delay.delayTime.value = parameters.time || 0.3;
        const delayGain = audioContextRef.current.createGain();
        delayGain.gain.value = parameters.feedback || 0.3;
        delay.connect(delayGain);
        delayGain.connect(delay);
        effectNode = delay;
        break;

      case 'compressor':
        const comp = audioContextRef.current.createDynamicsCompressor();
        comp.threshold.value = parameters.threshold || -24;
        comp.ratio.value = parameters.ratio || 12;
        comp.attack.value = parameters.attack || 0.003;
        comp.release.value = parameters.release || 0.25;
        effectNode = comp;
        break;

      default:
        // For unsupported effects, create a gain node as placeholder
        effectNode = audioContextRef.current.createGain();
        break;
    }

    effect.node = effectNode;

    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        return { ...track, effects: [...track.effects, effect] };
      }
      return track;
    }));

    // Rebuild effect chain
    rebuildTrackEffectChain(trackId);
  }, []);

  const rebuildTrackEffectChain = useCallback((trackId: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId || !track.gainNode || !track.panNode) return track;

      // Disconnect existing chain
      if (track.effectChain) {
        track.effectChain.forEach(node => {
          node.disconnect();
        });
      }

      // Rebuild chain: gainNode -> effects -> panNode -> compressor
      const chain: AudioNode[] = [track.gainNode];
      
      track.effects.forEach(effect => {
        if (effect.enabled && effect.node) {
          chain.push(effect.node);
        }
      });
      
      chain.push(track.panNode);

      // Connect the chain
      for (let i = 0; i < chain.length - 1; i++) {
        chain[i].connect(chain[i + 1]);
      }

      // Connect final node to master compressor
      if (compressorRef.current) {
        chain[chain.length - 1].connect(compressorRef.current);
      }

      return { ...track, effectChain: chain };
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      scheduledSourcesRef.current.clear();
    };
  }, []);

  return {
    // State
    isInitialized,
    audioBuffers,
    tracks,
    playbackState,
    masterVolume,
    analyserData,

    // Core functions
    initializeAudioEngine,
    loadAudioBuffer,
    createTrack,
    addClipToTrack,

    // Playback controls
    play,
    stop,
    pause,
    seekTo,
    playBuffer,

    // Track controls
    updateTrackVolume,
    updateTrackPan,
    toggleTrackMute,

    // Master controls
    updateMasterVolume,
    updateTempo,

    // Effects
    addEffectToTrack,

    // Utility
    audioContext: audioContextRef.current
  };
};