import { useState, useCallback, useRef, useEffect } from 'react';
import type { DawProjectData, DawClip, DawTrack } from '~backend/music/types';

interface AudioTrack {
  id: string;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  analyzerNode: AnalyserNode;
  sources: Map<string, AudioBufferSourceNode>;
  buffers: Map<string, AudioBuffer>;
  soloMute: { solo: boolean; mute: boolean };
  effects: AudioNode[];
}

interface RecordingState {
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  stream: MediaStream | null;
}

export const useAudioEngine = (projectData: DawProjectData | null) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(16);
  const [volumeLevels, setVolumeLevels] = useState<Map<string, number>>(new Map());
  const [masterVolumeLevel, setMasterVolumeLevel] = useState(0.8);
  const [bpm, setBpmState] = useState(120);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterAnalyzerRef = useRef<AnalyserNode | null>(null);
  const tracksRef = useRef<Map<string, AudioTrack>>(new Map());
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStateRef = useRef<RecordingState>({
    isRecording: false,
    mediaRecorder: null,
    chunks: [],
    stream: null
  });
  const metronomeRef = useRef<{
    oscillator: OscillatorNode | null;
    gainNode: GainNode | null;
    intervalId: number | null;
  }>({ oscillator: null, gainNode: null, intervalId: null });

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Create master gain node
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = masterVolumeLevel;
      
      // Create master analyzer for visualization
      masterAnalyzerRef.current = audioContextRef.current.createAnalyser();
      masterAnalyzerRef.current.fftSize = 2048;
      
      // Connect: source -> masterGain -> masterAnalyzer -> destination
      masterGainRef.current.connect(masterAnalyzerRef.current);
      masterAnalyzerRef.current.connect(audioContextRef.current.destination);
      
      console.log('Web Audio API initialized', {
        sampleRate: audioContextRef.current.sampleRate,
        state: audioContextRef.current.state
      });
    }

    return () => {
      // Cleanup on unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        stopAllTracks();
        audioContextRef.current.close();
      }
    };
  }, []);

  // Initialize tracks from project data
  useEffect(() => {
    if (!audioContextRef.current || !projectData) return;

    projectData.tracks.forEach(track => {
      if (!tracksRef.current.has(track.id)) {
        createTrack(track.id, track.name);
      }
    });
  }, [projectData]);

  // Create audio track with full effects chain
  const createTrack = useCallback((trackId: string, trackName: string) => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    // Create nodes for this track
    const gainNode = ctx.createGain();
    gainNode.gain.value = volumeLevels.get(trackId) || 0.8;
    
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = 0; // Center
    
    const analyzerNode = ctx.createAnalyser();
    analyzerNode.fftSize = 2048;
    
    // Connect: sources -> gain -> pan -> analyzer -> master
    gainNode.connect(panNode);
    panNode.connect(analyzerNode);
    analyzerNode.connect(masterGainRef.current);
    
    const audioTrack: AudioTrack = {
      id: trackId,
      gainNode,
      panNode,
      analyzerNode,
      sources: new Map(),
      buffers: new Map(),
      soloMute: { solo: false, mute: false },
      effects: []
    };
    
    tracksRef.current.set(trackId, audioTrack);
    
    console.log('Track created:', trackName, trackId);
  }, [volumeLevels]);

  // Load audio clip into buffer
  const loadClipAudio = useCallback(async (clipId: string, trackId: string, audioUrl: string) => {
    if (!audioContextRef.current) return;

    const track = tracksRef.current.get(trackId);
    if (!track) {
      console.error('Track not found:', trackId);
      return;
    }

    try {
      // Fetch audio file
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Store buffer for this clip
      track.buffers.set(clipId, audioBuffer);
      
      console.log('Clip audio loaded:', clipId, {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      });
    } catch (error) {
      console.error('Failed to load clip audio:', error);
    }
  }, []);

  // Play specific clip
  const playClip = useCallback((clip: DawClip, track: DawTrack) => {
    if (!audioContextRef.current || !clip.audioUrl) return;

    const audioTrack = tracksRef.current.get(track.id);
    if (!audioTrack) return;

    // Stop existing source for this clip if playing
    const existingSource = audioTrack.sources.get(clip.id);
    if (existingSource) {
      existingSource.stop();
      audioTrack.sources.delete(clip.id);
    }

    // Get buffer for this clip
    const buffer = audioTrack.buffers.get(clip.id);
    if (!buffer) {
      // Load if not already loaded
      loadClipAudio(clip.id, track.id, clip.audioUrl);
      return;
    }

    // Create new source
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioTrack.gainNode);
    
    // Apply playback rate based on pitch
    if (clip.pitch) {
      source.playbackRate.value = Math.pow(2, clip.pitch / 12);
    }
    
    // Start playback
    const startOffset = clip.startTime || 0;
    const duration = clip.duration || buffer.duration;
    source.start(audioContextRef.current.currentTime, 0, duration);
    
    // Store source reference
    audioTrack.sources.set(clip.id, source);
    
    // Auto-cleanup when done
    source.onended = () => {
      audioTrack.sources.delete(clip.id);
    };
  }, [loadClipAudio]);

  // Play all tracks
  const play = useCallback(async () => {
    if (!audioContextRef.current) return;

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const ctx = audioContextRef.current;
    startTimeRef.current = ctx.currentTime - pauseTimeRef.current;
    setIsPlaying(true);

    // Schedule all clips
    if (projectData) {
      projectData.tracks.forEach(track => {
        const audioTrack = tracksRef.current.get(track.id);
        if (!audioTrack || audioTrack.soloMute.mute) return;

        track.clips.forEach(clip => {
          if (clip.audioUrl) {
            const clipStartTime = startTimeRef.current + (clip.startTime / 1000);
            scheduleClip(clip, track, clipStartTime);
          }
        });
      });
    }

    // Start metronome if enabled
    if (metronomeEnabled) {
      startMetronome();
    }

    // Start time update loop
    updateTimeLoop();
  }, [projectData, metronomeEnabled]);

  // Schedule clip playback
  const scheduleClip = useCallback((clip: DawClip, track: DawTrack, startTime: number) => {
    if (!audioContextRef.current) return;

    const audioTrack = tracksRef.current.get(track.id);
    if (!audioTrack) return;

    const buffer = audioTrack.buffers.get(clip.id);
    if (!buffer) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioTrack.gainNode);
    
    if (clip.pitch) {
      source.playbackRate.value = Math.pow(2, clip.pitch / 12);
    }
    
    const duration = clip.duration ? clip.duration / 1000 : buffer.duration;
    source.start(startTime, 0, duration);
    
    audioTrack.sources.set(clip.id, source);
    
    source.onended = () => {
      audioTrack.sources.delete(clip.id);
    };
  }, []);

  // Pause playback
  const pause = useCallback(() => {
    if (!audioContextRef.current) return;

    pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
    setIsPlaying(false);
    stopAllTracks();
    stopMetronome();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    pause();
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  }, [pause]);

  // Stop all playing sources
  const stopAllTracks = useCallback(() => {
    tracksRef.current.forEach(track => {
      track.sources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Already stopped
        }
      });
      track.sources.clear();
    });
  }, []);

  // Seek to time
  const seek = useCallback((timeOrFunction: number | ((t: number) => number)) => {
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      pause();
    }

    if (typeof timeOrFunction === 'function') {
      setCurrentTime(prev => {
        const newTime = Math.max(0, timeOrFunction(prev));
        pauseTimeRef.current = newTime;
        return newTime;
      });
    } else {
      const newTime = Math.max(0, timeOrFunction);
      setCurrentTime(newTime);
      pauseTimeRef.current = newTime;
    }

    if (wasPlaying) {
      setTimeout(play, 0);
    }
  }, [isPlaying, pause, play]);

  // Time update loop
  const updateTimeLoop = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    
    // Handle looping
    if (isLooping && elapsed >= loopEnd) {
      seek(loopStart);
    } else {
      setCurrentTime(elapsed);
    }

    animationFrameRef.current = requestAnimationFrame(updateTimeLoop);
  }, [isPlaying, isLooping, loopStart, loopEnd, seek]);

  // Set track volume
  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const track = tracksRef.current.get(trackId);
    if (track) {
      track.gainNode.gain.value = volume;
      setVolumeLevels(prev => new Map(prev).set(trackId, volume));
    }
  }, []);

  // Set track pan
  const setTrackPan = useCallback((trackId: string, pan: number) => {
    const track = tracksRef.current.get(trackId);
    if (track) {
      track.panNode.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }, []);

  // Set master volume
  const setMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
      setMasterVolumeLevel(volume);
    }
  }, []);

  // Toggle track mute
  const toggleMute = useCallback((trackId: string) => {
    const track = tracksRef.current.get(trackId);
    if (track) {
      track.soloMute.mute = !track.soloMute.mute;
      track.gainNode.gain.value = track.soloMute.mute ? 0 : (volumeLevels.get(trackId) || 0.8);
    }
  }, [volumeLevels]);

  // Toggle track solo
  const toggleSolo = useCallback((trackId: string) => {
    const track = tracksRef.current.get(trackId);
    if (track) {
      track.soloMute.solo = !track.soloMute.solo;
      
      // Mute all other tracks if this is soloed
      tracksRef.current.forEach((t, id) => {
        if (id !== trackId && track.soloMute.solo) {
          t.gainNode.gain.value = 0;
        } else if (!t.soloMute.mute) {
          t.gainNode.gain.value = volumeLevels.get(id) || 0.8;
        }
      });
    }
  }, [volumeLevels]);

  // Set BPM
  const setBpm = useCallback((newBpm: number) => {
    setBpmState(newBpm);
    // Restart metronome if playing
    if (metronomeEnabled && isPlaying) {
      stopMetronome();
      startMetronome();
    }
  }, [metronomeEnabled, isPlaying]);

  // Metronome
  const startMetronome = useCallback(() => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const beatDuration = 60 / bpm;
    
    metronomeRef.current.intervalId = window.setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGainRef.current!);
      
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
      
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    }, beatDuration * 1000);
  }, [bpm]);

  const stopMetronome = useCallback(() => {
    if (metronomeRef.current.intervalId) {
      clearInterval(metronomeRef.current.intervalId);
      metronomeRef.current.intervalId = null;
    }
  }, []);

  // Recording
  const startRecording = useCallback(async () => {
    if (!audioContextRef.current || !masterAnalyzerRef.current) return;

    try {
      const destination = audioContextRef.current.createMediaStreamDestination();
      masterAnalyzerRef.current.connect(destination);
      
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recordingStateRef.current = {
        isRecording: true,
        mediaRecorder,
        chunks,
        stream: destination.stream
      };
      
      mediaRecorder.start();
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    const state = recordingStateRef.current;
    
    return new Promise((resolve) => {
      if (!state.mediaRecorder) {
        resolve(new Blob([], { type: 'audio/wav' }));
        return;
      }

      state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.chunks, { type: 'audio/wav' });
        recordingStateRef.current = {
          isRecording: false,
          mediaRecorder: null,
          chunks: [],
          stream: null
        };
        console.log('Recording stopped', { size: blob.size });
        resolve(blob);
      };

      state.mediaRecorder.stop();
      state.stream?.getTracks().forEach(track => track.stop());
    });
  }, []);

  // Get analyzer data for visualization
  const getAnalyzerData = useCallback((trackId?: string) => {
    const analyzer = trackId 
      ? tracksRef.current.get(trackId)?.analyzerNode 
      : masterAnalyzerRef.current;
      
    if (!analyzer) return null;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);
    
    return dataArray;
  }, []);

  return {
    // Playback control
    isPlaying,
    currentTime,
    seek,
    play,
    pause,
    stop,
    
    // Looping
    isLooping,
    setIsLooping,
    loopStart,
    setLoopStart,
    loopEnd,
    setLoopEnd,
    
    // Mixing
    setTrackVolume,
    setTrackPan,
    setMasterVolume,
    toggleMute,
    toggleSolo,
    volumeLevels,
    masterVolumeLevel,
    
    // Tempo
    bpm,
    setBpm,
    metronomeEnabled,
    setMetronomeEnabled,
    
    // Recording
    startRecording,
    stopRecording,
    isRecording: recordingStateRef.current.isRecording,
    
    // Clip management
    playClip,
    loadClipAudio,
    
    // Visualization
    getAnalyzerData,
    
    // Audio context
    audioContext: audioContextRef.current,
    
    // Track management
    createTrack
  };
};
