import { useState, useCallback, useRef, useEffect } from 'react';
import type { DawProjectData } from '~backend/music/types';

export const useAudioEngine = (projectData: DawProjectData | null) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [volumeLevels, setVolumeLevels] = useState<Map<string, number>>(new Map());
  const [masterVolumeLevel, setMasterVolumeLevel] = useState(0.8);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const play = useCallback(async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((timeOrFunction: number | ((t: number) => number)) => {
    if (typeof timeOrFunction === 'function') {
      setCurrentTime(prev => Math.max(0, timeOrFunction(prev)));
    } else {
      setCurrentTime(Math.max(0, timeOrFunction));
    }
  }, []);

  const setBpm = useCallback((bpm: number) => {
    // BPM changes would be handled by the parent component
  }, []);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    setVolumeLevels(prev => new Map(prev).set(trackId, volume));
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    setMasterVolumeLevel(volume);
  }, []);

  const startRecording = useCallback(async () => {
    // Mock recording implementation
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
  }, []);

  const stopRecording = useCallback(async () => {
    // Mock stop recording - return a blob
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    return mockBlob;
  }, []);

  const playClip = useCallback((clip: any, track: any) => {
    // Mock clip playback
    console.log('Playing clip:', clip.name, 'on track:', track.name);
  }, []);

  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

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
    startRecording,
    stopRecording,
    playClip
  };
};