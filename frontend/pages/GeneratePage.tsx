import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { Radio, Play, Download, Layers, Sparkles, AlertCircle, CheckCircle, Pause, Volume2, Mic, Circle, X, Upload, Youtube, Music, FileAudio, FileVideo, LinkIcon } from 'lucide-react';
import backend from '~backend/client';
import type { GenerateTrackRequest, GenerateLoopRequest } from '~backend/music/generate';
import type { AnalyzeAudioRequest, AnalyzeAudioResponse } from '~backend/music/analyze';

export default function GeneratePage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'track' | 'loop'>('track');
  const [playingAudio, setPlayingAudio] = useState<{ type: 'track' | 'stem' | 'loop'; id: string; audio: HTMLAudioElement } | null>(null);
  
  // Track generation state
  const [trackForm, setTrackForm] = useState<GenerateTrackRequest>({
    prompt: '',
    genre: 'private_school_amapiano',
    mood: 'mellow',
    bpm: 115,
    keySignature: 'F#m',
    duration: 180,
    sourceAnalysisId: undefined,
  });

  // Reference Track State
  const [referenceSourceType, setReferenceSourceType] = useState<'youtube' | 'upload' | 'url' | 'tiktok'>('youtube');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceAnalysis, setReferenceAnalysis] = useState<AnalyzeAudioResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loop generation state
  const [loopForm, setLoopForm] = useState<GenerateLoopRequest>({
    category: 'log_drum',
    genre: 'amapiano',
    bpm: 120,
    bars: 4,
    keySignature: 'C'
  });

  // Microphone recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<{ url: string; blob: Blob } | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playingAudio) {
        playingAudio.audio.pause();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [playingAudio]);

  useEffect(() => {
    const sourceId = searchParams.get('sourceId');
    const bpm = searchParams.get('bpm');
    const key = searchParams.get('key');
    const prompt = searchParams.get('prompt');

    if (sourceId) {
      const analysisId = parseInt(sourceId, 10);
      if (!isNaN(analysisId)) {
        setTrackForm(prev => ({
          ...prev,
          sourceAnalysisId: analysisId,
          bpm: bpm ? parseInt(bpm, 10) : 115,
          keySignature: key || 'F#m',
          prompt: prev.prompt || (prompt ? 
            `A track inspired by: ${decodeURIComponent(prompt)}` :
            'A track inspired by the analyzed audio')
        }));
        
        toast({
          title: "Reference Track Loaded!",
          description: "Generating a new track based on the analyzed audio.",
        });
      }
    }
  }, [searchParams, toast]);

  const generateTrackMutation = useMutation({
    mutationFn: (data: GenerateTrackRequest) => backend.music.generateTrack(data),
    onSuccess: (data) => {
      toast({
        title: "Track Generated!",
        description: "Your amapiano track has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Track generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate track. Please check your inputs and try again.",
        variant: "destructive",
      });
    },
  });

  const generateLoopMutation = useMutation({
    mutationFn: (data: GenerateLoopRequest) => backend.music.generateLoop(data),
    onSuccess: (data) => {
      toast({
        title: "Loop Generated!",
        description: "Your amapiano loop has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Loop generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate loop. Please check your inputs and try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeReferenceMutation = useMutation({
    mutationFn: (data: AnalyzeAudioRequest) => backend.music.analyzeAudio(data),
    onSuccess: (data) => {
      toast({
        title: "Reference Analyzed",
        description: "Reference track is ready. Its characteristics have been applied to the settings below.",
      });
      setReferenceAnalysis(data);
      setTrackForm(prev => ({
        ...prev,
        sourceAnalysisId: data.id,
        bpm: data.metadata.bpm,
        keySignature: data.metadata.keySignature,
        prompt: prev.prompt || `A track inspired by ${data.metadata.originalFileName || 'the reference audio'}`
      }));
    },
    onError: (error) => {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    }
  });

  const handlePlay = (audioUrl: string, type: 'track' | 'stem' | 'loop', id: string, name?: string) => {
    if (playingAudio && playingAudio.id === id) {
      playingAudio.audio.pause();
      setPlayingAudio(null);
      return;
    }

    if (playingAudio) {
      playingAudio.audio.pause();
    }

    // Create a demo audio context with a simple tone
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different types
    const frequencies = {
      track: 220, // A3
      stem: 330,  // E4
      loop: 440   // A4
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 2);
    
    // Create a mock audio element for state management
    const mockAudio = {
      pause: () => {
        oscillator.stop();
        setPlayingAudio(null);
      },
      play: () => Promise.resolve(),
      currentTime: 0,
      duration: 2
    } as HTMLAudioElement;

    setPlayingAudio({ type, id, audio: mockAudio });
    
    toast({
      title: "Demo Playback",
      description: `Playing ${name || type}... (demo audio)`,
    });

    // Auto-stop after 2 seconds
    setTimeout(() => {
      setPlayingAudio(null);
    }, 2000);
  };

  const handleDownload = (audioUrl: string, filename: string) => {
    // Create a mock download by generating a simple audio file
    const canvas = document.createElement('canvas');
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `Downloading ${filename}... (demo file)`,
        });
      }
    }, 'audio/wav');
  };

  const handleGenerateTrack = () => {
    if (!trackForm.prompt.trim() && !recordedAudio) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description or record an audio prompt.",
        variant: "destructive",
      });
      return;
    }

    // Validate BPM range
    if (trackForm.bpm) {
      const genreBpmRanges = {
        amapiano: [100, 130],
        private_school_amapiano: [95, 125]
      };
      const [minBpm, maxBpm] = genreBpmRanges[trackForm.genre];
      if (trackForm.bpm < minBpm || trackForm.bpm > maxBpm) {
        toast({
          title: "Invalid BPM",
          description: `For ${trackForm.genre}, BPM must be between ${minBpm} and ${maxBpm}.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate duration
    if (trackForm.duration && (trackForm.duration < 15 || trackForm.duration > 1200)) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be between 15 seconds and 20 minutes.",
        variant: "destructive",
      });
      return;
    }

    let finalPrompt = trackForm.prompt;
    if (recordedAudio) {
      finalPrompt = trackForm.prompt 
        ? `${trackForm.prompt} (with inspiration from recorded audio)`
        : `A track inspired by the recorded audio prompt.`;
    }

    console.log('Generating track with data:', { ...trackForm, prompt: finalPrompt });
    generateTrackMutation.mutate({ ...trackForm, prompt: finalPrompt });
  };

  const handleGenerateLoop = () => {
    // Validate BPM range
    if (loopForm.bpm) {
      const genreBpmRanges = {
        amapiano: [100, 130],
        private_school_amapiano: [95, 125]
      };
      const [minBpm, maxBpm] = genreBpmRanges[loopForm.genre];
      if (loopForm.bpm < minBpm || loopForm.bpm > maxBpm) {
        toast({
          title: "Invalid BPM",
          description: `For ${loopForm.genre}, BPM must be between ${minBpm} and ${maxBpm}.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate bars
    if (loopForm.bars && (loopForm.bars < 1 || loopForm.bars > 16)) {
      toast({
        title: "Invalid Bars",
        description: "Bars must be between 1 and 16.",
        variant: "destructive",
      });
      return;
    }

    console.log('Generating loop with data:', loopForm);
    generateLoopMutation.mutate(loopForm);
  };

  const clearReference = () => {
    setReferenceAnalysis(null);
    setReferenceUrl('');
    setReferenceFile(null);
    setTrackForm(prev => ({
      ...prev,
      sourceAnalysisId: undefined,
    }));
    
    // Clear URL parameters
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete('sourceId');
    currentParams.delete('bpm');
    currentParams.delete('key');
    currentParams.delete('prompt');
    setSearchParams(currentParams);
    
    toast({
      title: "Reference Cleared",
      description: "You can now create a track from scratch or add a new reference.",
    });
  };

  const handleAnalyzeReference = () => {
    let request: AnalyzeAudioRequest;
    if (referenceSourceType === 'upload') {
      if (!referenceFile) {
        toast({ title: "File Required", description: "Please select a file to use as a reference.", variant: "destructive" });
        return;
      }
      request = {
        sourceUrl: `upload://${referenceFile.name}`,
        sourceType: 'upload',
        fileName: referenceFile.name,
        fileSize: referenceFile.size,
      };
    } else {
      if (!referenceUrl.trim()) {
        toast({ title: "URL Required", description: "Please enter a valid URL for the reference.", variant: "destructive" });
        return;
      }
      request = {
        sourceUrl: referenceUrl,
        sourceType: referenceSourceType,
      };
    }
    analyzeReferenceMutation.mutate(request);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const audioChunks: Blob[] = [];
  
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
  
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ url: audioUrl, blob: audioBlob });
        stream.getTracks().forEach(track => track.stop()); // Stop mic access
      };
  
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings to use this feature.",
        variant: "destructive",
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const moods = [
    { value: 'chill', label: 'Chill' },
    { value: 'energetic', label: 'Energetic' },
    { value: 'soulful', label: 'Soulful' },
    { value: 'groovy', label: 'Groovy' },
    { value: 'mellow', label: 'Mellow' },
    { value: 'uplifting', label: 'Uplifting' },
    { value: 'deep', label: 'Deep' },
    { value: 'jazzy', label: 'Jazzy' }
  ];

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">AI Music Generation</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Create authentic amapiano tracks and loops using advanced AI. Describe your vision, provide a reference, and let our AI bring it to life.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center space-x-4">
        <Button
          variant={activeTab === 'track' ? 'default' : 'outline'}
          onClick={() => setActiveTab('track')}
          className={activeTab === 'track' ? 'bg-yellow-400 text-black' : 'border-white/20 text-white'}
        >
          <Radio className="h-4 w-4 mr-2" />
          Full Track
        </Button>
        <Button
          variant={activeTab === 'loop' ? 'default' : 'outline'}
          onClick={() => setActiveTab('loop')}
          className={activeTab === 'loop' ? 'bg-yellow-400 text-black' : 'border-white/20 text-white'}
        >
          <Layers className="h-4 w-4 mr-2" />
          Loop/Pattern
        </Button>
      </div>

      {activeTab === 'track' && (
        <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Generate Full Track</CardTitle>
            <CardDescription className="text-white/70">
              Create a complete amapiano track from your description, optionally guided by a reference track.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Reference Track Section */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Reference Track (Optional)</CardTitle>
                <CardDescription className="text-white/70">
                  Provide a reference track to guide the AI's generation process.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!referenceAnalysis ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <Label className="text-white">Source Type</Label>
                        <Select value={referenceSourceType} onValueChange={(v: any) => setReferenceSourceType(v)}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="upload">Upload File</SelectItem>
                            <SelectItem value="url">Audio URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        {referenceSourceType === 'upload' ? (
                          <div>
                            <Label className="text-white">Upload File</Label>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" className="border-white/20 text-white" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2" /> Choose File
                              </Button>
                              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                              {referenceFile && <span className="text-white/70 text-sm">{referenceFile.name}</span>}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label className="text-white">URL</Label>
                            <Input 
                              value={referenceUrl}
                              onChange={(e) => setReferenceUrl(e.target.value)}
                              placeholder={`Enter ${referenceSourceType} URL...`}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleAnalyzeReference} disabled={analyzeReferenceMutation.isPending} className="w-full">
                      {analyzeReferenceMutation.isPending ? 'Analyzing...' : 'Analyze Reference'}
                    </Button>
                  </>
                ) : (
                  <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="text-white font-semibold">Reference Analyzed</p>
                          <p className="text-white/70 text-sm truncate max-w-xs">
                            {referenceAnalysis.metadata.originalFileName || referenceAnalysis.metadata.genre}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearReference}>Clear</Button>
                    </div>
                    <div className="text-xs text-white/60 mt-2 grid grid-cols-3 gap-2">
                      <span>BPM: {referenceAnalysis.metadata.bpm}</span>
                      <span>Key: {referenceAnalysis.metadata.keySignature}</span>
                      <span>Genre: {referenceAnalysis.metadata.genre}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-white">Track Description or Audio Prompt</Label>
              <div className="relative">
                <Textarea
                  id="prompt"
                  placeholder="Describe your track... e.g., 'A soulful amapiano track with jazzy piano chords, deep log drums, and a groovy bassline perfect for late night vibes'"
                  value={trackForm.prompt}
                  onChange={(e) => setTrackForm({ ...trackForm, prompt: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12"
                  rows={4}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 bottom-2 text-white/60 hover:text-white"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <Circle className="h-4 w-4 text-red-500 fill-current animate-pulse" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {isRecording && (
                <div className="text-center text-sm text-red-400 animate-pulse">
                  Recording... {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
                </div>
              )}
              {recordedAudio && (
                <div className="mt-2">
                  <Label className="text-white">Recorded Prompt</Label>
                  <div className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                    <audio src={recordedAudio.url} controls className="w-full h-8" />
                    <Button variant="ghost" size="icon" onClick={() => setRecordedAudio(null)}>
                      <X className="h-4 w-4 text-white/60" />
                    </Button>
                  </div>
                </div>
              )}
              {trackForm.sourceAnalysisId && (
                <p className="text-white/60 text-sm">
                  💡 Tip: The AI will use the reference track as inspiration while following your description.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-white">Genre</Label>
                <Select value={trackForm.genre} onValueChange={(value: any) => setTrackForm({ ...trackForm, genre: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amapiano">Classic Amapiano</SelectItem>
                    <SelectItem value="private_school_amapiano">Private School Amapiano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Mood</Label>
                <Select value={trackForm.mood} onValueChange={(value) => setTrackForm({ ...trackForm, mood: value as any })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    {moods.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>{mood.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">BPM: {trackForm.bpm}</Label>
                <Slider
                  value={[trackForm.bpm || 115]}
                  onValueChange={([value]) => setTrackForm({ ...trackForm, bpm: value })}
                  min={95}
                  max={140}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>95</span>
                  <span>140</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Key</Label>
                <Select value={trackForm.keySignature} onValueChange={(value) => setTrackForm({ ...trackForm, keySignature: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {keys.map((key) => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-white">Duration: {Math.floor((trackForm.duration || 180) / 60)}:{((trackForm.duration || 180) % 60).toString().padStart(2, '0')}</Label>
                <Slider
                  value={[trackForm.duration || 180]}
                  onValueChange={([value]) => setTrackForm({ ...trackForm, duration: value })}
                  min={15}
                  max={1200}
                  step={15}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>0:15</span>
                  <span>20:00</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerateTrack}
              disabled={generateTrackMutation.isPending}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
            >
              {generateTrackMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {trackForm.sourceAnalysisId ? 'Generate from Reference' : 'Generate Track'}
                </>
              )}
            </Button>

            {generateTrackMutation.data && (
              <Card className="bg-gradient-to-r from-green-400/10 to-blue-400/10 border-green-400/20">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <CardTitle className="text-white text-lg">Track Generated Successfully!</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handlePlay(generateTrackMutation.data!.audioUrl, 'track', 'main-track', 'Generated Track')}
                    >
                      {playingAudio?.id === 'main-track' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {playingAudio?.id === 'main-track' ? 'Stop' : 'Play Track'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/20 text-white"
                      onClick={() => handleDownload(generateTrackMutation.data!.audioUrl, 'amapiano-track.wav')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-white/70">
                      <span className="font-medium">BPM:</span> {generateTrackMutation.data.metadata.bpm}
                    </div>
                    <div className="text-white/70">
                      <span className="font-medium">Key:</span> {generateTrackMutation.data.metadata.keySignature}
                    </div>
                    <div className="text-white/70">
                      <span className="font-medium">Duration:</span> {Math.floor(generateTrackMutation.data.metadata.duration / 60)}:{(generateTrackMutation.data.metadata.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>

                  {/* Stems */}
                  <div className="space-y-2">
                    <h4 className="text-white font-medium flex items-center">
                      <Volume2 className="h-4 w-4 mr-2" />
                      Individual Stems:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(generateTrackMutation.data.stems).map(([stem, url]) => (
                        url && (
                          <div key={stem} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <span className="text-white/70 capitalize text-sm font-medium">{stem}</span>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-white/10"
                                onClick={() => handlePlay(url, 'stem', `stem-${stem}`, `${stem} stem`)}
                              >
                                {playingAudio?.id === `stem-${stem}` ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-white/10"
                                onClick={() => handleDownload(url, `${stem}-stem.wav`)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'loop' && (
        <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Generate Loop/Pattern</CardTitle>
            <CardDescription className="text-white/70">
              Create specific amapiano loops and patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-white">Category</Label>
                <Select value={loopForm.category} onValueChange={(value: any) => setLoopForm({ ...loopForm, category: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="log_drum">Log Drum</SelectItem>
                    <SelectItem value="piano">Piano</SelectItem>
                    <SelectItem value="percussion">Percussion</SelectItem>
                    <SelectItem value="bass">Bass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Genre</Label>
                <Select value={loopForm.genre} onValueChange={(value: any) => setLoopForm({ ...loopForm, genre: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amapiano">Classic Amapiano</SelectItem>
                    <SelectItem value="private_school_amapiano">Private School Amapiano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">BPM: {loopForm.bpm}</Label>
                <Slider
                  value={[loopForm.bpm || 120]}
                  onValueChange={([value]) => setLoopForm({ ...loopForm, bpm: value })}
                  min={95}
                  max={140}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>95</span>
                  <span>140</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Bars: {loopForm.bars}</Label>
                <Slider
                  value={[loopForm.bars || 4]}
                  onValueChange={([value]) => setLoopForm({ ...loopForm, bars: value })}
                  min={1}
                  max={16}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>1</span>
                  <span>16</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-white">Key</Label>
                <Select value={loopForm.keySignature} onValueChange={(value) => setLoopForm({ ...loopForm, keySignature: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {keys.map((key) => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateLoop}
              disabled={generateLoopMutation.isPending}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
            >
              {generateLoopMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Generate Loop
                </>
              )}
            </Button>

            {generateLoopMutation.data && (
              <Card className="bg-gradient-to-r from-purple-400/10 to-pink-400/10 border-purple-400/20">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <CardTitle className="text-white text-lg">Loop Generated Successfully!</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Button 
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handlePlay(generateLoopMutation.data!.audioUrl, 'loop', 'main-loop', 'Generated Loop')}
                    >
                      {playingAudio?.id === 'main-loop' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {playingAudio?.id === 'main-loop' ? 'Stop' : 'Play Loop'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/20 text-white"
                      onClick={() => handleDownload(generateLoopMutation.data!.audioUrl, `${generateLoopMutation.data!.metadata.category}-loop.wav`)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-white/70">
                      <span className="font-medium">Category:</span> {generateLoopMutation.data.metadata.category}
                    </div>
                    <div className="text-white/70">
                      <span className="font-medium">BPM:</span> {generateLoopMutation.data.metadata.bpm}
                    </div>
                    <div className="text-white/70">
                      <span className="font-medium">Bars:</span> {generateLoopMutation.data.metadata.bars}
                    </div>
                    <div className="text-white/70">
                      <span className="font-medium">Key:</span> {generateLoopMutation.data.metadata.keySignature}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">💡 Generation Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/70">
            <div>
              <h4 className="text-white font-medium mb-2">For Better Results:</h4>
              <ul className="space-y-1">
                <li>• Be specific about the mood and style you want</li>
                <li>• Mention specific instruments (log drums, piano, saxophone)</li>
                <li>• Include tempo descriptions (slow, groovy, energetic)</li>
                <li>• Reference time of day or setting (late night, club, chill)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Example Prompts:</h4>
              <ul className="space-y-1">
                <li>• "Deep log drums with soulful piano for late night vibes"</li>
                <li>• "Jazzy private school amapiano with saxophone melody"</li>
                <li>• "Energetic classic amapiano with heavy percussion"</li>
                <li>• "Mellow track with complex chords and smooth bassline"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Notice */}
      <Card className="bg-blue-400/10 border-blue-400/20 max-w-4xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="text-blue-400 font-medium">Demo Mode</div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            This is a demonstration of the music generation interface. In the full version, you'll hear actual AI-generated amapiano tracks. 
            Currently, play buttons generate demo tones and downloads create placeholder files.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
