import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { 
  Play, Pause, Square, SkipBack, SkipForward, Volume2, Mic, Piano, Drum, Music, Settings, Save, FolderOpen, Wand2, Plus, Minus, RotateCcw, Layers, Sliders, Zap, Download, Upload, Loader2, X, Grid, List, Scissors, Repeat, Copy, Users, Puzzle
} from "lucide-react";
import { toast } from 'sonner';
import backend from '~backend/client';
import type { DawProjectData, DawTrack, DawClip, MidiNote, Effect, AutomationData, Sample, DawChangeAction, AutomationPoint } from '~backend/music/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import OpenProjectModal from '../components/daw/OpenProjectModal';
import ProjectSettingsModal from '../components/daw/ProjectSettingsModal';
import MixerPanel from '../components/daw/MixerPanel';
import PianoRollPanel from '../components/daw/PianoRollPanel';
import EffectsPanel from '../components/daw/EffectsPanel';
import SessionView from '../components/daw/SessionView';
import SampleBrowserPanel from '../components/daw/SampleBrowserPanel';
import AutomationLane from '../components/daw/AutomationLane';
import Waveform from '../components/daw/Waveform';
import PluginPanel from '../components/daw/PluginPanel';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useCollaboration } from '../hooks/useCollaboration';

const AIPromptParser = ({ prompt, className }: { prompt: string, className?: string }) => {
  const [parsed, setParsed] = useState<any>(null);

  useEffect(() => {
    if (!prompt) {
      setParsed(null);
      return;
    }
    const timeoutId = setTimeout(() => {
      const p = prompt.toLowerCase();
      const newParsed: any = {};
      if (p.includes("log drum")) newParsed.instrument = "Log Drum";
      if (p.includes("piano")) newParsed.instrument = "Piano";
      if (p.includes("sax")) newParsed.instrument = "Saxophone";
      if (p.includes("f#m") || p.includes("f sharp minor")) newParsed.key = "F#m";
      if (p.includes("c minor") || p.includes("cm")) newParsed.key = "Cm";
      const bpmMatch = p.match(/(\d+)\s*bpm/);
      if (bpmMatch) newParsed.bpm = parseInt(bpmMatch[1]);
      if (p.includes("private school")) newParsed.genre = "Private School";
      if (p.includes("classic")) newParsed.genre = "Classic";
      setParsed(newParsed);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [prompt]);

  if (!parsed) return null;

  return (
    <Card className={`bg-muted/50 p-3 ${className}`}>
      <h4 className="text-xs font-semibold mb-2 text-muted-foreground">AI Interpretation:</h4>
      <div className="flex flex-wrap gap-2">
        {Object.entries(parsed).map(([key, value]) => (
          <Badge key={key} variant="secondary">{key}: {String(value)}</Badge>
        ))}
      </div>
    </Card>
  );
};

const defaultProjectData: DawProjectData = {
  bpm: 118,
  keySignature: 'F#m',
  tracks: [
    {
      id: `track_${Date.now()}_1`,
      type: 'midi',
      name: 'Log Drums',
      instrument: 'Signature Log Drum',
      clips: [],
      mixer: { volume: 0.8, pan: 0, isMuted: false, isSolo: false, effects: [] },
      isArmed: true,
      color: 'bg-red-500',
      automation: [],
    },
    {
      id: `track_${Date.now()}_2`,
      type: 'midi',
      name: 'Piano Chords',
      instrument: 'Amapiano Piano',
      clips: [],
      mixer: { volume: 0.7, pan: 0, isMuted: false, isSolo: false, effects: [] },
      isArmed: false,
      color: 'bg-blue-500',
      automation: [],
    },
  ],
  masterVolume: 0.8,
};

const TrackLane = React.memo(({ track, projectData, zoom, handleClipMouseDown, handleDropOnTrack, handleToggleAutomation, handleUpdateAutomation, timelineContainerRef }: any) => (
  <div key={track.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTrack(e, track.id)}>
    <div className="h-24 border-b border-border/30 relative flex items-center">
      {track.clips.map((clip: DawClip) => (
        <ContextMenu key={clip.id}>
          <ContextMenuTrigger>
            <div 
              className={`absolute top-2 bottom-2 ${track.color} rounded opacity-80 flex items-center justify-center cursor-grab active:cursor-grabbing group`} 
              style={{ left: `${(clip.startTime / 32) * 100}%`, width: `${(clip.duration / 32) * 100}%` }} 
              onMouseDown={(e) => handleClipMouseDown(e, clip, track)}
            >
              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize" />
              <div className="w-full h-full overflow-hidden">
                {clip.waveform && <Waveform data={clip.waveform} width={200} height={80} color="rgba(255,255,255,0.5)" />}
              </div>
              <span className="absolute text-xs text-white font-medium truncate px-2">{clip.name}</span>
              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize" />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Duplicate Clip</ContextMenuItem>
            <ContextMenuItem>Split Clip</ContextMenuItem>
            <ContextMenuItem>Reverse Clip</ContextMenuItem>
            <ContextMenuItem className="text-red-500">Delete Clip</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
      {Array.from({ length: 32 * 4 }, (_, i) => (<div key={i} className={`absolute top-0 bottom-0 border-r ${i % 4 === 0 ? 'border-border/30' : 'border-border/10'}`} style={{ left: `${(i / (32 * 4)) * 100}%` }} />))}
    </div>
    {track.automation.map((auto: AutomationData) => (
      <AutomationLane key={auto.id} automation={auto} onUpdatePoints={(points) => handleUpdateAutomation(track.id, auto.id, points)} width={timelineContainerRef.current?.clientWidth ? timelineContainerRef.current.clientWidth * (zoom[0]/100) : 1000} height={64} />
    ))}
  </div>
));

export default function DawPage() {
  const queryClient = useQueryClient();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showPianoRoll, setShowPianoRoll] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [showSampleBrowser, setShowSampleBrowser] = useState(false);
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [zoom, setZoom] = useState([100]);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'session'>('timeline');
  const [recordingTrackId, setRecordingTrackId] = useState<string | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpenProjectOpen, setIsOpenProjectOpen] = useState(false);

  // Project State
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>();
  const [projectData, setProjectData] = useState<DawProjectData | null>(null);
  const [projectName, setProjectName] = useState("Untitled Project");

  // Audio Engine
  const audioEngine = useAudioEngine();
  const { 
    isInitialized, 
    playbackState, 
    tracks, 
    masterVolume, 
    play, 
    pause, 
    stop, 
    seekTo, 
    updateMasterVolume, 
    updateTrackVolume, 
    updateTempo,
    createTrack,
    addClipToTrack,
    playBuffer,
    audioContext 
  } = audioEngine;

  // Dragging state
  const [draggingClip, setDraggingClip] = useState<{ clipId: string; trackId: string; initialX: number; initialStartTime: number; } | null>(null);
  const [resizingClip, setResizingClip] = useState<{ clipId: string; trackId: string; edge: 'start' | 'end'; initialX: number; initialStartTime: number; initialDuration: number; } | null>(null);

  // --- Collaboration ---
  const applyDawChange = useCallback((change: DawChangeAction) => {
    toast.info(`Change received: ${change.type}`);
    setProjectData(currentData => {
      if (!currentData) return null;
      switch (change.type) {
        case 'CLIP_ADD':
          return { ...currentData, tracks: currentData.tracks.map(t => t.id === change.payload.trackId ? { ...t, clips: [...t.clips, change.payload.clip] } : t) };
        case 'CLIP_UPDATE':
          return { ...currentData, tracks: currentData.tracks.map(t => t.id === change.payload.trackId ? { ...t, clips: t.clips.map(c => c.id === change.payload.clipId ? { ...c, ...change.payload.updates } : c) } : t) };
        case 'CLIP_DELETE':
          return { ...currentData, tracks: currentData.tracks.map(t => t.id === change.payload.trackId ? { ...t, clips: t.clips.filter(c => c.id !== change.payload.clipId) } : t) };
        case 'TRACK_ADD':
          return { ...currentData, tracks: [...currentData.tracks, change.payload.track] };
        case 'TRACK_UPDATE':
          return { ...currentData, tracks: currentData.tracks.map(t => t.id === change.payload.trackId ? { ...t, ...change.payload.updates } : t) };
        case 'TRACK_DELETE':
          return { ...currentData, tracks: currentData.tracks.filter(t => t.id !== change.payload.trackId) };
        case 'MIXER_UPDATE':
          return { ...currentData, tracks: currentData.tracks.map(t => t.id === change.payload.trackId ? { ...t, mixer: { ...t.mixer, ...change.payload.updates } } : t) };
        case 'AUTOMATION_UPDATE':
          return { ...currentData, tracks: currentData.tracks.map(t => t.id === change.payload.trackId ? { ...t, automation: t.automation.map(a => a.id === change.payload.automationId ? { ...a, points: change.payload.points } : a) } : t) };
        case 'PROJECT_SETTINGS_UPDATE':
          return { ...currentData, ...change.payload.updates };
        default:
          return currentData;
      }
    });
  }, []);

  const { isConnected, connect, disconnect, sendChange } = useCollaboration(activeProjectId, applyDawChange);

  // --- Data Fetching and State Management ---

  const { data: projectsList, isLoading: isListLoading, isError: isListError, error: listError } = useQuery({
    queryKey: ['dawProjectsList'],
    queryFn: () => backend.music.listProjects(),
  });

  const createDefaultProjectMutation = useMutation({
    mutationFn: () => backend.music.saveProject({
      name: "My First Amapiano Project",
      projectData: defaultProjectData,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dawProjectsList'] });
      toast.info("Creating your first project...");
    },
  });

  useEffect(() => {
    if (!isListLoading && projectsList) {
      if (projectsList.projects.length === 0) {
        if (!createDefaultProjectMutation.isPending) {
          createDefaultProjectMutation.mutate();
        }
      } else if (!activeProjectId) {
        setActiveProjectId(projectsList.projects[0].id);
      }
    }
  }, [isListLoading, projectsList, activeProjectId, createDefaultProjectMutation]);

  const { data: loadedProject, isLoading: isProjectLoading, isError: isProjectError, error: projectError } = useQuery({
    queryKey: ['dawProject', activeProjectId],
    queryFn: () => backend.music.loadProject({ projectId: activeProjectId! }),
    enabled: !!activeProjectId,
  });

  useEffect(() => {
    if (loadedProject) {
      setProjectData(loadedProject.projectData);
      setProjectName(loadedProject.name);
      if (!selectedTrackId && loadedProject.projectData.tracks.length > 0) {
        setSelectedTrackId(loadedProject.projectData.tracks[0].id);
      }
    }
  }, [loadedProject, selectedTrackId]);

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; projectData: DawProjectData; projectId?: number }) => backend.music.saveProject(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['dawProject', data.projectId], (oldData: any) => ({...oldData, name: data.name, version: data.version, updatedAt: data.lastSaved}));
      queryClient.invalidateQueries({ queryKey: ['dawProjectsList'] });
      toast.success(`Project "${data.name}" (v${data.version}) saved successfully.`);
    },
    onError: (error: any) => toast.error("Save Failed", { description: error.message }),
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (data: { prompt: string; trackType: 'midi' | 'audio' }) => backend.music.generateDawElement(data),
    onSuccess: (data) => {
      setProjectData(prev => prev ? { ...prev, tracks: [...prev.tracks, data.newTrack] } : null);
      sendChange({ type: 'TRACK_ADD', payload: { track: data.newTrack } });
      toast.success(`AI generated a new "${data.newTrack.name}" track!`);
    },
    onError: (error: any) => toast.error("AI Generation Failed", { description: error.message }),
  });

  // --- Handlers ---

  const handleSave = () => {
    if (!projectData || !activeProjectId) {
      toast.error("No project data to save.");
      return;
    }
    saveMutation.mutate({ name: projectName, projectData, projectId: activeProjectId });
  };

  const handleAIGenerate = (prompt: string) => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for the AI assistant.");
      return;
    }
    toast.info(`🤖 AI Assistant: Generating content for "${prompt}"`);
    aiGenerateMutation.mutate({ prompt, trackType: 'midi' });
  };

  const updateTrack = (trackId: string, updates: Partial<DawTrack>) => {
    setProjectData(prev => prev ? { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t) } : null);
    sendChange({ type: 'TRACK_UPDATE', payload: { trackId, updates } });
  };

  const updateMixer = (trackId: string, updates: Partial<DawTrack['mixer']>) => {
    setProjectData(prev => {
      if (!prev) return null;
      const newTracks = prev.tracks.map(t => t.id === trackId ? { ...t, mixer: { ...t.mixer, ...updates } } : t);
      if (updates.volume !== undefined) updateTrackVolume(parseInt(trackId), updates.volume);
      return { ...prev, tracks: newTracks };
    });
    sendChange({ type: 'MIXER_UPDATE', payload: { trackId, updates } });
  };

  const handleAddTrack = (instrument?: { name: string, type: string, color: string }) => {
    if (!projectData) return;
    const defaultInstrument = { name: "New Audio Track", type: "audio", color: "bg-gray-500" };
    const inst = instrument || defaultInstrument;
    const newTrack: DawTrack = {
      id: `track_${Date.now()}`,
      type: ['piano', 'synth', 'bass'].includes(inst.type) ? 'midi' : 'audio',
      name: inst.name,
      instrument: inst.name,
      clips: [],
      mixer: { volume: 0.8, pan: 0, isMuted: false, isSolo: false, effects: [] },
      isArmed: false,
      color: inst.color,
      automation: [],
    };
    setProjectData({ ...projectData, tracks: [...projectData.tracks, newTrack] });
    sendChange({ type: 'TRACK_ADD', payload: { track: newTrack } });
    toast.success(`Track "${inst.name}" added.`);
  };

  const handleRemoveTrack = (trackId: string) => {
    setProjectData(prev => {
      if (!prev) return null;
      const trackToRemove = prev.tracks.find(t => t.id === trackId);
      if (trackToRemove) toast.info(`Track "${trackToRemove.name}" removed.`);
      return { ...prev, tracks: prev.tracks.filter(t => t.id !== trackId) };
    });
    sendChange({ type: 'TRACK_DELETE', payload: { trackId } });
  };

  const handleAddEffectToTrack = (effectName: Effect['name']) => {
    if (!selectedTrackId) {
      toast.error("No track selected", { description: "Please select a track to add an effect." });
      return;
    }
    let finalMixerState: DawTrack['mixer'] | undefined;
    setProjectData(prev => {
      if (!prev) return null;
      const newTracks = prev.tracks.map(t => {
        if (t.id === selectedTrackId && !t.mixer.effects.some(e => e.name === effectName)) {
          const newEffect: Effect = { id: `effect_${Date.now()}`, name: effectName, params: {}, enabled: true };
          toast.success(`Effect "${effectName}" added to track "${t.name}".`);
          finalMixerState = { ...t.mixer, effects: [...t.mixer.effects, newEffect] };
          return { ...t, mixer: finalMixerState };
        }
        if (t.id === selectedTrackId) toast.info(`Effect "${effectName}" is already on this track.`);
        return t;
      });
      return { ...prev, tracks: newTracks };
    });
    if (finalMixerState) {
      sendChange({ type: 'MIXER_UPDATE', payload: { trackId: selectedTrackId, updates: finalMixerState } });
    }
  };

  const handleRemoveEffectFromTrack = (trackId: string, effectId: string) => {
    let finalMixerState: DawTrack['mixer'] | undefined;
    setProjectData(prev => {
      if (!prev) return null;
      const newTracks = prev.tracks.map(t => {
        if (t.id === trackId) {
          const effectToRemove = t.mixer.effects.find(e => e.id === effectId);
          if (effectToRemove) toast.info(`Effect "${effectToRemove.name}" removed from track "${t.name}".`);
          finalMixerState = { ...t.mixer, effects: t.mixer.effects.filter(e => e.id !== effectId) };
          return { ...t, mixer: finalMixerState };
        }
        return t;
      });
      return { ...prev, tracks: newTracks };
    });
    if (finalMixerState) {
      sendChange({ type: 'MIXER_UPDATE', payload: { trackId, updates: finalMixerState } });
    }
  };

  const handleUpdateEffectParam = useCallback((trackId: string, effectId: string, param: string, value: any) => {
    let finalMixerState: DawTrack['mixer'] | undefined;
    setProjectData(prev => {
      if (!prev) return null;
      const newTracks = prev.tracks.map(t => {
        if (t.id === trackId) {
          finalMixerState = { ...t.mixer, effects: t.mixer.effects.map(e => e.id === effectId ? { ...e, params: { ...e.params, [param]: value } } : e) };
          return { ...t, mixer: finalMixerState };
        }
        return t;
      });
      return { ...prev, tracks: newTracks };
    });
    if (finalMixerState) {
      sendChange({ type: 'MIXER_UPDATE', payload: { trackId, updates: finalMixerState } });
    }
  }, [sendChange]);

  const handleExport = () => {
    if (!projectData) {
      toast.error("No project data to export.");
      return;
    }
    const dataStr = JSON.stringify({ name: projectName, ...projectData }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${projectName.replace(/\s/g, '_')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("Project data exported as JSON.");
  };

  const handleUpdateProjectSettings = (updatedData: Partial<DawProjectData>) => {
    if (projectData) {
      setProjectData({ ...projectData, ...updatedData });
      if (updatedData.bpm) updateTempo(updatedData.bpm);
      sendChange({ type: 'PROJECT_SETTINGS_UPDATE', payload: { updates: updatedData } });
      toast.info("Project settings updated. Don't forget to save!");
    }
  };

  const handleUpdateNotes = useCallback((trackId: string, clipId: string, newNotes: MidiNote[]) => {
    setProjectData(prev => {
      if (!prev) return null;
      return { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, notes: newNotes } : c) } : t) };
    });
    sendChange({ type: 'CLIP_UPDATE', payload: { trackId, clipId, updates: { notes: newNotes } } });
  }, [sendChange]);

  const handleUpdateClip = useCallback((trackId: string, clipId: string, updates: Partial<DawClip>) => {
    setProjectData(prev => {
      if (!prev) return null;
      return { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) } : t) };
    });
    sendChange({ type: 'CLIP_UPDATE', payload: { trackId, clipId, updates } });
  }, [sendChange]);

  const handleClipMouseDown = (e: React.MouseEvent, clip: DawClip, track: DawTrack) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const edgeThreshold = 8;
    if (e.clientX > rect.right - edgeThreshold) setResizingClip({ clipId: clip.id, trackId: track.id, edge: 'end', initialX: e.clientX, initialStartTime: clip.startTime, initialDuration: clip.duration });
    else if (e.clientX < rect.left + edgeThreshold) setResizingClip({ clipId: clip.id, trackId: track.id, edge: 'start', initialX: e.clientX, initialStartTime: clip.startTime, initialDuration: clip.duration });
    else setDraggingClip({ clipId: clip.id, trackId: track.id, initialX: e.clientX, initialStartTime: clip.startTime });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!timelineContainerRef.current || !projectData) return;
    const timelineRect = timelineContainerRef.current.getBoundingClientRect();
    const pixelsPerBeat = (timelineRect.width * (zoom[0] / 100)) / 32;
    if (draggingClip) {
      const deltaX = e.clientX - draggingClip.initialX;
      const deltaBeats = deltaX / pixelsPerBeat;
      let newStartTime = draggingClip.initialStartTime + deltaBeats;
      newStartTime = Math.round(newStartTime * 4) / 4;
      newStartTime = Math.max(0, newStartTime);
      handleUpdateClip(draggingClip.trackId, draggingClip.clipId, { startTime: newStartTime });
    }
    if (resizingClip) {
      const deltaX = e.clientX - resizingClip.initialX;
      const deltaBeats = deltaX / pixelsPerBeat;
      if (resizingClip.edge === 'end') {
        const newDuration = resizingClip.initialDuration + deltaBeats;
        handleUpdateClip(resizingClip.trackId, resizingClip.clipId, { duration: Math.max(0.25, newDuration) });
      } else {
        const newStartTime = resizingClip.initialStartTime + deltaBeats;
        const newDuration = resizingClip.initialDuration - deltaBeats;
        if (newDuration >= 0.25) handleUpdateClip(resizingClip.trackId, resizingClip.clipId, { startTime: Math.max(0, newStartTime), duration: newDuration });
      }
    }
  }, [draggingClip, resizingClip, projectData, zoom, handleUpdateClip]);

  const handleMouseUp = useCallback(() => {
    setDraggingClip(null);
    setResizingClip(null);
  }, []);

  useEffect(() => {
    if (draggingClip || resizingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClip, resizingClip, handleMouseMove, handleMouseUp]);

  const handleArmTrack = async (trackId: string) => {
    if (recordingTrackId === trackId) {
      // TODO: Implement recording functionality
      const newClip: DawClip = {
        id: `clip_${Date.now()}`,
        name: `Rec ${new Date().toLocaleTimeString()}`,
        startTime: playbackState.currentTime / (60 / projectData!.bpm),
        duration: 8,
        waveform: Array.from({ length: 100 }, () => Math.random() * 2 - 1),
      };
      setProjectData(prev => prev ? { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip], isArmed: false } : t) } : null);
      sendChange({ type: 'CLIP_ADD', payload: { trackId, clip: newClip } });
      sendChange({ type: 'TRACK_UPDATE', payload: { trackId, updates: { isArmed: false } } });
      setRecordingTrackId(null);
      toast.success("Recording finished");
    } else {
      // TODO: Implement recording start
      setRecordingTrackId(trackId);
      updateTrack(trackId, { isArmed: true });
      toast.info("Recording started...");
    }
  };

  const handleDropOnTrack = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const sampleData = e.dataTransfer.getData('application/json');
    if (sampleData) {
      const sample: Sample = JSON.parse(sampleData);
      const timelineRect = timelineContainerRef.current!.getBoundingClientRect();
      const pixelsPerBeat = (timelineRect.width * (zoom[0] / 100)) / 32;
      const startTime = (e.clientX - timelineRect.left) / pixelsPerBeat;

      const newClip: DawClip = {
        id: `clip_${Date.now()}`,
        name: sample.name,
        startTime: Math.round(startTime * 4) / 4,
        duration: sample.durationSeconds || 4,
        audioUrl: sample.fileUrl,
        waveform: Array.from({ length: 100 }, () => Math.random() * 2 - 1),
      };
      setProjectData(prev => prev ? { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t) } : null);
      sendChange({ type: 'CLIP_ADD', payload: { trackId, clip: newClip } });
      toast.success(`Sample "${sample.name}" added to track.`);
    }
  };

  const handleToggleAutomation = (trackId: string, parameter: string) => {
    let newAutomation: AutomationData[] | undefined;
    setProjectData(prev => {
      if (!prev) return null;
      const newTracks = prev.tracks.map(t => {
        if (t.id === trackId) {
          const existing = t.automation.find(a => a.parameter === parameter);
          if (existing) {
            newAutomation = t.automation.filter(a => a.parameter !== parameter);
          } else {
            const auto: AutomationData = { id: `auto_${Date.now()}`, parameter: parameter as any, points: [], enabled: true };
            newAutomation = [...t.automation, auto];
          }
          return { ...t, automation: newAutomation };
        }
        return t;
      });
      return { ...prev, tracks: newTracks };
    });
    if (newAutomation && newAutomation.length > 0) {
      // Send individual automation updates for each automation item
      newAutomation.forEach(auto => {
        sendChange({ type: 'AUTOMATION_UPDATE', payload: { trackId, automationId: auto.id, points: auto.points } });
      });
    }
  };

  const handleUpdateAutomation = (trackId: string, automationId: string, newPoints: AutomationPoint[]) => {
    setProjectData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tracks: prev.tracks.map(t => {
          if (t.id === trackId) {
            return { ...t, automation: t.automation.map(a => a.id === automationId ? { ...a, points: newPoints } : a) };
          }
          return t;
        })
      };
    });
    sendChange({ type: 'AUTOMATION_UPDATE', payload: { trackId, automationId, points: newPoints } });
  };

  const instruments = [
    { name: "Signature Log Drum", type: "drums", icon: Drum, description: "Authentic amapiano log drum synthesizer", color: "bg-red-500" },
    { name: "Amapiano Piano", type: "piano", icon: Piano, description: "Classic M1-style piano with gospel voicings", color: "bg-blue-500" },
    { name: "Deep Bass Synth", type: "bass", icon: Music, description: "Sub-bass synthesizer with rhythmic emphasis", color: "bg-purple-500" },
    { name: "Vocal Sampler", type: "vocals", icon: Mic, description: "Advanced vocal processing and chopping", color: "bg-pink-500" },
    { name: "Shaker Groove Engine", type: "percussion", icon: Drum, description: "AI-powered percussion generator", color: "bg-green-500" },
    { name: "Saxophone VST", type: "lead", icon: Music, description: "Realistic saxophone for Private School style", color: "bg-yellow-500" }
  ];

  const effects: { name: Effect['name'], category: string, description: string }[] = [
    { name: "EQ", category: "Core", description: "Professional 8-band parametric EQ" },
    { name: "Compressor", category: "Core", description: "Vintage-style compressor with amapiano preset" },
    { name: "Reverb", category: "Core", description: "Spatial reverb with hall and room settings" },
    { name: "Delay", category: "Core", description: "Tempo-synced delay with feedback control" },
    { name: "Limiter", category: "Core", description: "Transparent peak limiting" },
    { name: "Log Drum Saturator", category: "Amapiano", description: "Enhance log drum character" },
    { name: "Shaker Groove Engine", category: "Amapiano", description: "Intelligent percussion enhancement" },
    { name: "3D Imager", category: "Amapiano", description: "Spatial width and depth control" },
    { name: "Gospel Harmonizer", category: "Amapiano", description: "Authentic chord voicing enhancement" }
  ];

  const aiSuggestions = [
    "Generate a 4 bar log drum pattern",
    "Suggest a jazzy piano chord progression for 8 bars",
    "Add a complex percussion layer",
    "Create a simple bass line that complements the log drums", 
    "Generate a soulful saxophone melody for the bridge section"
  ];

  // RENDER LOGIC
  if (isListLoading) return <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner message="Loading projects..." /></div>;
  if (isListError) return <div className="flex flex-col items-center justify-center h-full"><ErrorMessage error={listError as Error} /></div>;
  if (projectsList && projectsList.projects.length === 0) return <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner message="Creating your first project..." /></div>;
  if (createDefaultProjectMutation.isError) return <div className="flex flex-col items-center justify-center h-full"><ErrorMessage error={createDefaultProjectMutation.error as Error} /></div>;
  if (!activeProjectId || isProjectLoading) return <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner message="Loading project..." /></div>;
  if (isProjectError) return <div className="flex flex-col items-center justify-center h-full"><ErrorMessage error={projectError as Error} /></div>;
  if (!projectData) return <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner message="Initializing DAW..." /></div>;

  const totalDuration = (32 * 4 / projectData.bpm) * 60;
  const selectedTrack = projectData.tracks.find(t => t.id === selectedTrackId) || null;

  return (
    <div className="h-full flex flex-col text-foreground">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="text-xl font-bold bg-transparent border-0 p-0 h-auto focus-visible:ring-0" />
            </div>
            <Badge variant="outline">Professional DAW</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={isConnected ? disconnect : connect} className={isConnected ? 'border-green-500 text-green-500' : ''}>
              <Users className="w-4 h-4 mr-2" />
              {isConnected ? 'Session Active' : 'Collaborate'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'timeline' ? 'session' : 'timeline')}>
              {viewMode === 'timeline' ? <Grid className="w-4 h-4 mr-2" /> : <List className="w-4 h-4 mr-2" />}
              {viewMode === 'timeline' ? 'Session View' : 'Timeline View'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSampleBrowser(!showSampleBrowser)}>
              <Music className="w-4 h-4 mr-2" />
              Samples
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsOpenProjectOpen(true)}><FolderOpen className="w-4 h-4 mr-2" />Open</Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" onClick={() => setShowMixer(!showMixer)}><Sliders className="w-4 h-4 mr-2" />Mixer</Button>
            <Button variant="outline" size="sm" onClick={() => setShowPianoRoll(!showPianoRoll)}><Piano className="w-4 h-4 mr-2" />Piano Roll</Button>
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}><Settings className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${showAIAssistant ? 'w-80' : 'w-64'} bg-muted/10 border-r border-border overflow-y-auto transition-all duration-200`}>
          <Tabs defaultValue="instruments" className="h-full">
            <TabsList className="grid w-full grid-cols-4 m-2 bg-muted/20">
              <TabsTrigger value="instruments" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Instruments</TabsTrigger>
              <TabsTrigger value="effects" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Effects</TabsTrigger>
              <TabsTrigger value="plugins" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">Plugins</TabsTrigger>
              <TabsTrigger value="ai-assistant" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">AI</TabsTrigger>
            </TabsList>
            <TabsContent value="instruments" className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Amapiano Instruments</h3>
                <div className="space-y-2">
                  {instruments.map((instrument) => {
                    const Icon = instrument.icon;
                    return (
                      <Card key={instrument.name} className="p-3 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{instrument.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{instrument.description}</div>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleAddTrack(instrument)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="effects" className="p-4 space-y-4">
              <div className="space-y-4">
                {["Core", "Amapiano"].map((category) => (
                  <div key={category}>
                    <h4 className="font-semibold mb-2 text-sm">{category} Effects</h4>
                    <div className="space-y-1">
                      {effects.filter(effect => effect.category === category).map((effect) => (
                        <Card key={effect.name} className="p-2 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{effect.name}</div>
                              <div className="text-xs text-muted-foreground">{effect.description}</div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleAddEffectToTrack(effect.name)}><Plus className="w-3 h-3" /></Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="plugins" className="h-full">
              <PluginPanel />
            </TabsContent>
            <TabsContent value="ai-assistant" className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" />AI Assistant</h3>
                <Card className="p-3 mb-4 bg-muted/20 border-border">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Natural Language Prompt</label>
                      <Input placeholder="Generate a log drum pattern..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <Button size="sm" className="w-full" onClick={() => handleAIGenerate(aiPrompt)} disabled={aiGenerateMutation.isPending}>
                      {aiGenerateMutation.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Zap className="w-3 h-3 mr-2" />}
                      Generate
                    </Button>
                  </div>
                </Card>
                <AIPromptParser prompt={aiPrompt} className="mb-4" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
                  {aiSuggestions.map((suggestion: string, index: number) => (
                    <Button key={index} variant="outline" size="sm" onClick={() => handleAIGenerate(suggestion)} className="w-full text-left h-auto p-3 justify-start whitespace-normal">
                      <Wand2 className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5 text-primary" />
                      <span className="text-xs">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main DAW Area */}
        <div className="flex-1 flex flex-col">
          {/* Transport Controls */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={playbackState.isPlaying ? pause : play}>{playbackState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</Button>
                  <Button variant="outline" size="sm" onClick={stop}><Square className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => seekTo(Math.max(0, playbackState.currentTime - 5))}><SkipBack className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => seekTo(playbackState.currentTime + 5)}><SkipForward className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => {/* TODO: implement loop toggle */}} className={playbackState.loop ? 'bg-primary/20 text-primary' : ''}><RotateCcw className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">BPM:</span>
                    <div className="w-20"><Slider value={[projectData.bpm]} onValueChange={([v]) => handleUpdateProjectSettings({ bpm: v })} min={80} max={160} step={1} /></div>
                    <span className="text-sm text-muted-foreground w-8">{projectData.bpm}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    <div className="w-20"><Slider value={[projectData.masterVolume * 100]} onValueChange={([v]) => { const newVolume = v / 100; setProjectData({ ...projectData, masterVolume: newVolume }); updateMasterVolume(newVolume); }} /></div>
                    <span className="text-sm text-muted-foreground w-8">{Math.round(projectData.masterVolume * 100)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Zoom:</span>
                    <div className="w-20"><Slider value={zoom} onValueChange={setZoom} min={25} max={400} step={25} /></div>
                    <span className="text-sm text-muted-foreground">{zoom[0]}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline or Session View */}
          <div className="flex-1 overflow-auto bg-background" ref={timelineContainerRef}>
            {viewMode === 'session' ? (
              <SessionView tracks={projectData.tracks} onPlayClip={(trackId, clipId) => {
                const track = projectData.tracks.find(t => t.id === trackId);
                const clip = track?.clips.find(c => c.id === clipId);
                if (track && clip && clip.audioUrl) playBuffer(clip.audioUrl, 0, 0);
              }} />
            ) : (
              <div className="h-full flex">
                {/* Track List */}
                <div className="w-80 border-r border-border bg-muted/10 overflow-y-auto">
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Tracks</h3>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleAddTrack()}><Plus className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setShowSampleBrowser(true)}><Upload className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {projectData.tracks.map((track) => (
                      <div key={track.id} className={`p-3 border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${selectedTrackId === track.id ? 'bg-primary/10' : ''}`} onClick={() => setSelectedTrackId(track.id)}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${track.color}`} />
                          <Input value={track.name} onChange={(e) => updateTrack(track.id, { name: e.target.value })} className="font-medium text-sm flex-1 border-0 p-0 h-auto bg-transparent focus-visible:ring-0" />
                          <Button size="sm" variant="ghost" className="w-6 h-6 p-0" onClick={() => handleRemoveTrack(track.id)}><Minus className="w-3 h-3 text-red-500" /></Button>
                          <Button size="sm" variant="ghost" className={`w-6 h-6 p-0 ${recordingTrackId === track.id ? 'text-red-500 animate-pulse' : ''}`} onClick={(e) => { e.stopPropagation(); handleArmTrack(track.id); }}><Mic className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="w-6 h-6 p-0" onClick={() => setShowEffectsPanel(true)}><Sliders className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="w-6 h-6 p-0" onClick={() => setShowPianoRoll(true)}><Piano className="w-3 h-3" /></Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <Button size="sm" variant={track.mixer.isMuted ? "destructive" : "outline"} className="w-8 h-6 text-xs" onClick={() => updateMixer(track.id, { isMuted: !track.mixer.isMuted })}>M</Button>
                          <Button size="sm" variant={track.mixer.isSolo ? "secondary" : "outline"} className="w-8 h-6 text-xs" onClick={() => updateMixer(track.id, { isSolo: !track.mixer.isSolo })}>S</Button>
                          <div className="flex-1"><Slider value={[track.mixer.volume * 100]} onValueChange={([v]) => updateMixer(track.id, { volume: v / 100 })} /></div>
                          <span className="text-xs w-8 text-right text-muted-foreground">{Math.round(track.mixer.volume * 100)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleToggleAutomation(track.id, 'volume')}>Vol</Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleToggleAutomation(track.id, 'pan')}>Pan</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 overflow-auto">
                  <div className="h-full relative" style={{ width: `${zoom[0]}%` }}>
                    <div className="h-8 bg-muted/20 border-b border-border flex items-center px-4 sticky top-0 z-10">
                      {Array.from({ length: 32 }, (_, i) => (<div key={i} className="flex-1 text-xs text-center border-r border-border/30 py-1 text-muted-foreground">{i + 1}</div>))}
                    </div>
                    <div className="space-y-1">
                      {projectData.tracks.map((track: any) => (
                        <TrackLane 
                          key={track.id}
                          track={track}
                          projectData={projectData}
                          zoom={zoom}
                          handleClipMouseDown={handleClipMouseDown}
                          handleDropOnTrack={handleDropOnTrack}
                          handleToggleAutomation={handleToggleAutomation}
                          handleUpdateAutomation={handleUpdateAutomation}
                          timelineContainerRef={timelineContainerRef}
                        />
                      ))}
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-20" style={{ left: `${(playbackState.currentTime / 120) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals and Panels */}
      <OpenProjectModal isOpen={isOpenProjectOpen} onClose={() => setIsOpenProjectOpen(false)} onLoadProject={setActiveProjectId} />
      {projectData && <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} projectData={projectData} onSave={handleUpdateProjectSettings} />}
      {showMixer && projectData && <MixerPanel tracks={projectData.tracks} masterVolume={projectData.masterVolume} volumeLevels={new Map()} masterVolumeLevel={masterVolume} onClose={() => setShowMixer(false)} onTrackVolumeChange={(trackId, volume) => updateMixer(trackId, { volume })} onMasterVolumeChange={(volume) => { setProjectData({ ...projectData, masterVolume: volume }); updateMasterVolume(volume); }} />}
      {showPianoRoll && <PianoRollPanel selectedTrack={selectedTrack} onClose={() => setShowPianoRoll(false)} onUpdateNotes={handleUpdateNotes} audioContext={audioContext} />}
      {showEffectsPanel && <EffectsPanel selectedTrack={selectedTrack} onClose={() => setShowEffectsPanel(false)} onUpdateEffectParam={handleUpdateEffectParam} />}
      {showSampleBrowser && <SampleBrowserPanel onClose={() => setShowSampleBrowser(false)} />}
      {showPluginPanel && <PluginPanel />}
    </div>
  );
}
