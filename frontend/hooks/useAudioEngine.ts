import { useState, useEffect, useRef, useCallback } from 'react';
import type { DawProjectData, DawTrack, DawClip, MidiNote } from '~backend/music/types';

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
  const trackNodesRef = useRef<Map<string, GainNode>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(projectData?.bpm || 120);
  const [isLooping, setIsLooping] = useState(false);

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
        masterGainRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error("Web Audio API is not supported in this browser");
      }
    }
    return () => {
      audioContextRef.current?.close().catch(console.error);
      audioContextRef.current = null;
    };
  }, []);

  // Update track nodes when project data changes
  useEffect(() => {
    if (!audioContextRef.current || !masterGainRef.current || !projectData) return;

    const newTrackNodes = new Map<string, GainNode>();
    projectData.tracks.forEach(track => {
      const existingNode = trackNodesRef.current.get(track.id);
      if (existingNode) {
        existingNode.gain.setValueAtTime(track.mixer.volume, audioContextRef.current!.currentTime);
        newTrackNodes.set(track.id, existingNode);
      } else {
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = track.mixer.volume;
        gainNode.connect(masterGainRef.current!);
        newTrackNodes.set(track.id, gainNode);
      }
    });
    trackNodesRef.current = newTrackNodes;
  }, [projectData]);

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
    
    const trackGainNode = trackNodesRef.current.get(track.id);
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

  useScheduler(scheduler, isPlaying);

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

  const seek = useCallback((time: number) => {
    if (!audioContextRef.current) return;
    const totalDurationInSeconds = projectData ? (32 * 4 / projectData.bpm) * 60 : 0;
    const newTime = Math.max(0, Math.min(time, totalDurationInSeconds));
    setCurrentTime(newTime);
    if (isPlaying) {
      startTimeRef.current = audioContextRef.current.currentTime - newTime;
      nextNoteTime.current = audioContextRef.current.currentTime;
    }
  }, [isPlaying, projectData]);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const node = trackNodesRef.current.get(trackId);
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
  };
};
