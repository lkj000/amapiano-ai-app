import { useState, useEffect, useRef, useCallback } from 'react';
import type { DawProjectData, DawTrack, DawClip, MidiNote, Effect } from '~backend/music/types';

// A simple scheduler that uses requestAnimationFrame
const useScheduler = (callback: () => void, isRunning: boolean) => {
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!isRunning) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    const animate = () => {
      callback();
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRunning, callback]);
};

export const useAudioEngine = (projectData: DawProjectData | null) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackNodesRef = useRef<Map<string, { gain: GainNode, analyser: AnalyserNode, effectsChain: AudioNode[] }>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(projectData?.bpm || 120);
  const [isLooping, setIsLooping] = useState(false);

  const [volumeLevels, setVolumeLevels] = useState<Map<string, number>>(new Map());
  const [masterVolumeLevel, setMasterVolumeLevel] = useState(0);

  const lookahead = 25.0; // ms
  const scheduleAheadTime = 0.1; // seconds

  const nextNoteTime = useRef(0.0);
  const startTimeRef = useRef(0.0);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        masterGainRef.current = audioContextRef.current.createGain();
        masterAnalyserRef.current = audioContextRef.current.createAnalyser();
        masterGainRef.current.connect(masterAnalyserRef.current);
        masterAnalyserRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error("Web Audio API is not supported in this browser");
      }
    }
    return () => {
      audioContextRef.current?.close().catch(console.error);
      audioContextRef.current = null;
    };
  }, []);

  const updateEffectsChain = useCallback((trackId: string, effects: Effect[]) => {
    if (!audioContextRef.current) return;
    const trackNode = trackNodesRef.current.get(trackId);
    if (!trackNode) return;
  
    // Disconnect old effects chain
    trackNode.gain.disconnect();
    let lastNode: AudioNode = trackNode.gain;
  
    // Create and connect new effects chain
    const newEffectsChain: AudioNode[] = [];
    effects.forEach(effect => {
      if (!effect.enabled) return;
      let effectNode: AudioNode | null = null;
      
      try {
        switch (effect.name) {
          case 'EQ': {
            const eq = audioContextRef.current!.createBiquadFilter();
            eq.type = (effect.params.type as BiquadFilterType) || 'peaking';
            eq.frequency.setValueAtTime(effect.params.frequency || 800, audioContextRef.current!.currentTime);
            eq.gain.setValueAtTime(effect.params.gain || 0, audioContextRef.current!.currentTime);
            eq.Q.setValueAtTime(effect.params.q || 1, audioContextRef.current!.currentTime);
            effectNode = eq;
            break;
          }
          case 'Compressor': {
            const compressor = audioContextRef.current!.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(effect.params.threshold || -24, audioContextRef.current!.currentTime);
            compressor.knee.setValueAtTime(effect.params.knee || 30, audioContextRef.current!.currentTime);
            compressor.ratio.setValueAtTime(effect.params.ratio || 12, audioContextRef.current!.currentTime);
            compressor.attack.setValueAtTime(effect.params.attack || 0.003, audioContextRef.current!.currentTime);
            compressor.release.setValueAtTime(effect.params.release || 0.25, audioContextRef.current!.currentTime);
            effectNode = compressor;
            break;
          }
          // Add other effects here...
        }
      } catch (e) {
        console.error(`Error creating effect node for ${effect.name}:`, e);
      }
  
      if (effectNode) {
        lastNode.connect(effectNode);
        lastNode = effectNode;
        newEffectsChain.push(effectNode);
      }
    });
  
    // Connect the end of the effects chain to the analyser
    lastNode.connect(trackNode.analyser);
    trackNode.effectsChain = newEffectsChain;
  }, []);

  // Update track nodes when project data changes
  useEffect(() => {
    if (!audioContextRef.current || !masterGainRef.current || !projectData) return;

    const newTrackNodes = new Map<string, { gain: GainNode, analyser: AnalyserNode, effectsChain: AudioNode[] }>();
    projectData.tracks.forEach(track => {
      const existingNode = trackNodesRef.current.get(track.id);
      if (existingNode) {
        existingNode.gain.gain.setValueAtTime(track.mixer.volume, audioContextRef.current!.currentTime);
        updateEffectsChain(track.id, track.mixer.effects);
        newTrackNodes.set(track.id, existingNode);
      } else {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = track.mixer.volume;
        const analyserNode = audioContextRef.current!.createAnalyser();
        gainNode.connect(analyserNode);
        analyserNode.connect(masterGainRef.current!);
        const newNode = { gain: gainNode, analyser: analyserNode, effectsChain: [] };
        trackNodesRef.current.set(track.id, newNode);
        updateEffectsChain(track.id, track.mixer.effects);
        newTrackNodes.set(track.id, newNode);
      }
    });
    trackNodesRef.current = newTrackNodes;
  }, [projectData, updateEffectsChain]);

  // Update BPM when projectData changes
  useEffect(() => {
    if (projectData) {
      setBpm(projectData.bpm);
    }
  }, [projectData?.bpm]);

  const scheduleNote = useCallback((note: MidiNote, clipStartTime: number, track: DawTrack) => {
    if (!audioContextRef.current || track.mixer.isMuted) return;

    const secondsPerBeat = 60.0 / bpm;
    const noteStartTime = startTimeRef.current + (clipStartTime + note.startTime) * secondsPerBeat;
    
    if (noteStartTime < audioContextRef.current.currentTime) return;

    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    osc.connect(gainNode);
    
    const trackGainNode = trackNodesRef.current.get(track.id)?.gain;
    if (trackGainNode) {
      gainNode.connect(trackGainNode);
    } else {
      gainNode.connect(masterGainRef.current!);
    }

    osc.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12);
    gainNode.gain.setValueAtTime(note.velocity / 127 * 0.5, noteStartTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteStartTime + note.duration * secondsPerBeat);

    osc.start(noteStartTime);
    osc.stop(noteStartTime + note.duration * secondsPerBeat);
  }, [bpm]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current || !projectData) return;

    const totalDurationInSeconds = (32 * 4 / bpm) * 60;
    const currentEngineTime = audioContextRef.current.currentTime - startTimeRef.current;

    if (currentEngineTime >= totalDurationInSeconds) {
        if (isLooping) {
            startTimeRef.current = audioContextRef.current.currentTime;
            nextNoteTime.current = audioContextRef.current.currentTime;
            setCurrentTime(0);
        } else {
            stop();
            return;
        }
    } else {
        setCurrentTime(currentEngineTime);
    }

    while (nextNoteTime.current < audioContextRef.current.currentTime + scheduleAheadTime) {
      const secondsPerBeat = 60.0 / bpm;
      const currentBeat = (nextNoteTime.current - startTimeRef.current) / secondsPerBeat;

      projectData.tracks.forEach(track => {
        if (projectData.tracks.some(t => t.mixer.isSolo) && !track.mixer.isSolo) {
          return;
        }

        track.clips.forEach(clip => {
          if (track.type === 'midi' && clip.notes) {
            clip.notes.forEach(note => {
              const noteBeat = clip.startTime + note.startTime;
              if (noteBeat >= currentBeat && noteBeat < currentBeat + (scheduleAheadTime / secondsPerBeat)) {
                scheduleNote(note, clip.startTime, track);
              }
            });
          }
        });
      });

      nextNoteTime.current += scheduleAheadTime / 2;
    }
  }, [bpm, projectData, isPlaying, isLooping, stop, scheduleNote]);

  const meterUpdater = useCallback(() => {
    if (!isPlaying) {
      setVolumeLevels(new Map());
      setMasterVolumeLevel(0);
      return;
    }
    const newLevels = new Map<string, number>();
    trackNodesRef.current.forEach((nodes, trackId) => {
      const dataArray = new Uint8Array(nodes.analyser.frequencyBinCount);
      nodes.analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (const amplitude of dataArray) {
        sum += Math.pow((amplitude / 128.0) - 1, 2);
      }
      const rms = Math.sqrt(sum / dataArray.length);
      newLevels.set(trackId, rms);
    });
    setVolumeLevels(newLevels);

    if (masterAnalyserRef.current) {
      const dataArray = new Uint8Array(masterAnalyserRef.current.frequencyBinCount);
      masterAnalyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (const amplitude of dataArray) {
        sum += Math.pow((amplitude / 128.0) - 1, 2);
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setMasterVolumeLevel(rms);
    }
  }, [isPlaying]);

  useScheduler(scheduler, isPlaying);
  useScheduler(meterUpdater, isPlaying);

  const play = useCallback(() => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsPlaying(true);
    startTimeRef.current = audioContextRef.current.currentTime - currentTime;
    nextNoteTime.current = audioContextRef.current.currentTime;
  }, [currentTime]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const seek = useCallback((timeOrFn: number | ((prevTime: number) => number)) => {
    setCurrentTime(prevTime => {
      const newTime = typeof timeOrFn === 'function' ? timeOrFn(prevTime) : timeOrFn;
      const totalDurationInSeconds = projectData ? (32 * 4 / projectData.bpm) * 60 : 0;
      const clampedTime = Math.max(0, Math.min(newTime, totalDurationInSeconds));
      
      if (isPlaying && audioContextRef.current) {
        startTimeRef.current = audioContextRef.current.currentTime - clampedTime;
        nextNoteTime.current = audioContextRef.current.currentTime;
      }
      
      return clampedTime;
    });
  }, [isPlaying, projectData]);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const node = trackNodesRef.current.get(trackId)?.gain;
    if (node && audioContextRef.current) {
      node.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, []);

  return {
    isPlaying,
    currentTime,
    seek,
    isLooping,
    setIsLooping,
    play,
    pause,
    stop,
    setBpm,
    setTrackVolume,
    setMasterVolume,
    audioContext: audioContextRef.current,
    volumeLevels,
    masterVolumeLevel,
  };
};
