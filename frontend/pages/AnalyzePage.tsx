import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Search, Upload, Youtube, Music, Layers, Play, Download, Sparkles, FileAudio, FileVideo, AlertCircle, CheckCircle, X, Pause, Volume2, ExternalLink, Clock, Zap, Star, TrendingUp, Award, Brain, Gauge, Target, Mic, Circle } from 'lucide-react';
import backend from '~backend/client';
import type { AnalyzeAudioRequest } from '~backend/music/analyze';

export default function AnalyzePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<'youtube' | 'upload' | 'url' | 'tiktok' | 'microphone'>('youtube');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'amapianorize' | 'batch'>('analyze');
  const [playingAudio, setPlayingAudio] = useState<{ type: 'stem' | 'track' | 'popular'; id: string; audio: HTMLAudioElement } | null>(null);

  // Microphone recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<{ url: string; blob: Blob } | null>(null);

  // Enhanced processing options
  const [enhancedProcessing, setEnhancedProcessing] = useState(false);
  const [culturalAnalysis, setCulturalAnalysis] = useState(false);

  // Enhanced Amapianorize form state
  const [amapianorizeForm, setAmapianorizeForm] = useState({
    sourceAnalysisId: 0,
    targetGenre: 'amapiano' as 'amapiano' | 'private_school_amapiano',
    intensity: 'moderate' as 'subtle' | 'moderate' | 'heavy' | 'extreme',
    preserveVocals: true,
    customPrompt: '',
    additionalOptions: {
      preserveMelody: false,
      addInstruments: [] as string[],
      removeInstruments: [] as string[],
      tempoAdjustment: 'auto' as 'auto' | 'preserve' | number,
      culturalAuthenticity: 'traditional' as 'traditional' | 'modern' | 'fusion',
      qualityEnhancement: true
    }
  });

  // Enhanced batch analysis state
  const [batchSources, setBatchSources] = useState<Array<{
    sourceUrl: string;
    sourceType: 'youtube' | 'upload' | 'url' | 'tiktok' | 'microphone';
    fileName?: string;
  }>>([]);
  const [batchEnhancedProcessing, setBatchEnhancedProcessing] = useState(false);
  const [batchCulturalAnalysis, setBatchCulturalAnalysis] = useState(false);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const analyzeAudioMutation = useMutation({
    mutationFn: (data: AnalyzeAudioRequest) => backend.music.analyzeAudio(data),
    onSuccess: (data) => {
      const qualityText = data.metadata.quality === 'professional' ? 'Professional' :
                         data.metadata.quality === 'high' ? 'High' :
                         data.metadata.quality === 'medium' ? 'Medium' : 'Standard';
      
      toast({
        title: "Enhanced Analysis Complete!",
        description: `Audio analyzed in ${data.processingTime}ms with ${Math.round(data.metadata.confidence * 100)}% confidence. Quality: ${qualityText}${data.metadata.culturalAuthenticity ? `, Cultural Authenticity: ${Math.round(data.metadata.culturalAuthenticity * 100)}%` : ''}`,
      });
      setSelectedFile(null);
      setRecordedAudio(null);
      setUploadProgress(0);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('Enhanced analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze audio with enhanced processing. Please check the file/URL and try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const amapianorizeMutation = useMutation({
    mutationFn: (data: any) => backend.music.amapianorizeTrack(data),
    onSuccess: (data) => {
      toast({
        title: "Enhanced Amapianorization Complete!",
        description: `Track transformed in ${data.processingTime}ms with ${data.metadata.intensity} intensity. Quality Score: ${Math.round(data.metadata.qualityScore * 100)}%, Cultural Authenticity: ${Math.round(data.metadata.culturalAuthenticity * 100)}%`,
      });
    },
    onError: (error) => {
      console.error('Enhanced amapianorize error:', error);
      toast({
        title: "Amapianorization Failed",
        description: "Failed to transform track with enhanced processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const batchAnalyzeMutation = useMutation({
    mutationFn: (data: any) => backend.music.batchAnalyze(data),
    onSuccess: (data) => {
      toast({
        title: "Enhanced Batch Analysis Started!",
        description: `Processing ${data.sources.length} sources with ${data.enhancedFeatures ? 'professional-grade' : 'standard'} processing. Estimated completion: ${Math.round(data.estimatedCompletionTime / 60)} minutes.`,
      });
    },
    onError: (error) => {
      console.error('Enhanced batch analysis error:', error);
      toast({
        title: "Batch Analysis Failed",
        description: "Failed to start enhanced batch analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePlay = (audioUrl: string, type: 'stem' | 'track' | 'popular', id: string, name?: string) => {
    if (playingAudio && playingAudio.id === id) {
      playingAudio.audio.pause();
      setPlayingAudio(null);
      return;
    }

    if (playingAudio) {
      playingAudio.audio.pause();
    }

    // Enhanced demo audio context with professional-grade simulation
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();
    
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Enhanced frequencies and waveforms for professional-grade simulation
    const stemFrequencies = {
      drums: 80,    // Enhanced low frequency for professional drums
      bass: 55,     // Professional sub-bass frequency
      piano: 440,   // Concert pitch A4 for professional piano
      vocals: 523,  // Professional vocal range C5
      other: 330,   // Professional other instruments E4
      track: 220,   // Professional full track A3
      popular: 196  // Professional popular tracks G3
    };
    
    const stemName = id.replace('stem-', '').replace('track-', '').replace('popular-', '');
    const frequency = stemFrequencies[stemName as keyof typeof stemFrequencies] || stemFrequencies.other;
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Professional-grade waveforms and filtering for different stems
    if (stemName === 'drums') {
      oscillator.type = 'square';
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(250, audioContext.currentTime);
    } else if (stemName === 'bass') {
      oscillator.type = 'sawtooth';
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(120, audioContext.currentTime);
    } else if (type === 'popular') {
      oscillator.type = 'triangle';
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(frequency, audioContext.currentTime);
    } else {
      oscillator.type = 'sine';
      filterNode.type = 'highpass';
      filterNode.frequency.setValueAtTime(80, audioContext.currentTime);
    }
    
    // Professional-grade dynamics and envelope
    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 5);
    
    // Create a mock audio element for state management
    const mockAudio = {
      pause: () => {
        try {
          oscillator.stop();
        } catch (e) {
          // Oscillator might already be stopped
        }
        setPlayingAudio(null);
      },
      play: () => Promise.resolve(),
      currentTime: 0,
      duration: 5
    } as HTMLAudioElement;

    setPlayingAudio({ type, id, audio: mockAudio });
    
    toast({
      title: "Professional Demo Playback",
      description: `Playing ${name || stemName}... (professional-grade demo with ${frequency}Hz ${oscillator.type} wave + advanced filtering)`,
    });

    // Auto-stop after 5 seconds
    setTimeout(() => {
      setPlayingAudio(null);
    }, 5000);
  };

  const handleDownload = (audioUrl: string, filename: string, trackInfo?: any) => {
    // Create a comprehensive professional demo file with enhanced track information
    let content = `Professional Demo Audio File: ${filename}\n`;
    content += `This would be studio-quality audio data in the full version.\n`;
    content += `URL: ${audioUrl}\n`;
    content += `Generated: ${new Date().toISOString()}\n`;
    content += `Processing: ${enhancedProcessing ? 'Professional-Grade Enhanced' : 'Standard'}\n`;
    content += `Cultural Analysis: ${culturalAnalysis ? 'Enabled' : 'Disabled'}\n\n`;
    
    if (trackInfo) {
      content += `Enhanced Track Information:\n`;
      content += `Artist: ${trackInfo.artist}\n`;
      content += `Track: ${trackInfo.track}\n`;
      content += `Style: ${trackInfo.style}\n`;
      content += `BPM: ${trackInfo.bpm}\n`;
      content += `Key: ${trackInfo.key}\n`;
      content += `Year: ${trackInfo.year}\n`;
      content += `Complexity: ${trackInfo.complexity}\n`;
      content += `Features: ${trackInfo.features?.join(', ')}\n`;
      content += `Cultural Significance: ${trackInfo.culturalSignificance}\n`;
      content += `Description: ${trackInfo.description || 'N/A'}\n\n`;
    }
    
    content += `Professional Technical Specifications:\n`;
    content += `File Format: WAV (Professional Studio Quality)\n`;
    content += `Sample Rate: ${enhancedProcessing ? '96kHz' : '44.1kHz'} (Professional Grade)\n`;
    content += `Bit Depth: ${enhancedProcessing ? '32-bit' : '24-bit'} (Studio Quality)\n`;
    content += `Quality Tier: ${enhancedProcessing ? 'Professional' : 'Standard'}\n`;
    content += `Channels: Stereo (Professional Mix)\n`;
    content += `Dynamic Range: >90dB (Professional Standard)\n`;
    content += `THD+N: <0.001% (Studio Grade)\n`;
    content += `License: Professional Demo License\n`;
    content += `Cultural Validation: ${culturalAnalysis ? 'Expert Validated' : 'Standard'}\n`;
    content += `\nNote: In the full version, this would be an actual professional-grade audio file with studio-quality processing.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.(wav|mp3|flac)$/i, '_professional_demo.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Professional Download Started",
      description: `Downloading ${filename}... (comprehensive professional demo file with detailed metadata and quality specifications)`,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Enhanced file validation with professional formats
      const supportedFormats = [
        // Professional high-quality audio formats
        'wav', 'flac', 'aiff', 'dsd', 'dsf',
        // High-quality compressed audio formats
        'mp3', 'm4a', 'aac', 'ogg', 'wma', 'opus',
        // Professional video formats
        'mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv', 'mts', 'mxf', 'ts'
      ];
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        toast({
          title: "Unsupported File Format",
          description: `Please select a supported audio or video file. Professional formats supported: ${supportedFormats.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Enhanced file size validation (500MB limit)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 500MB for optimal processing. Please select a smaller file or compress your audio.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setSourceUrl(`upload://${file.name}`);
    }
  };

  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get enhanced upload URL with professional features
      const uploadResponse = await backend.music.getUploadUrl({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        enhancedProcessing,
        culturalAnalysis
      });

      // Enhanced upload progress simulation with professional processing
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + (enhancedProcessing ? 6 : 8); // Slower for enhanced processing
        });
      }, enhancedProcessing ? 200 : 150);

      // Simulate upload with enhanced processing time
      const processingMultiplier = enhancedProcessing ? 1.5 : 1;
      await new Promise(resolve => setTimeout(resolve, uploadResponse.estimatedProcessingTime * 100 * processingMultiplier));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Analyze the uploaded file with enhanced options
      analyzeAudioMutation.mutate({
        sourceUrl: `upload://${uploadResponse.fileId}`,
        sourceType: sourceType as 'upload' | 'microphone',
        fileName: file.name,
        fileSize: file.size,
        enhancedProcessing,
        culturalAnalysis
      });

    } catch (error) {
      console.error('Enhanced upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file with enhanced processing. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAnalyze = () => {
    if (sourceType === 'upload') {
      if (!selectedFile) {
        toast({
          title: "File Required",
          description: "Please select a file to upload and analyze.",
          variant: "destructive",
        });
        return;
      }
      handleFileUpload();
    } else if (sourceType === 'microphone') {
      if (!recordedAudio) {
        toast({ title: "Recording Required", description: "Please record audio from your microphone first.", variant: "destructive" });
        return;
      }
      const recordedFile = new File([recordedAudio.blob], 'recording.webm', { type: 'audio/webm' });
      handleFileUpload(recordedFile);
    } else {
      if (!sourceUrl.trim()) {
        toast({
          title: "URL Required",
          description: "Please enter a valid URL to analyze.",
          variant: "destructive",
        });
        return;
      }

      analyzeAudioMutation.mutate({
        sourceUrl,
        sourceType,
        enhancedProcessing,
        culturalAnalysis
      });
    }
  };

  const handleAmapianorize = () => {
    if (!amapianorizeForm.sourceAnalysisId) {
      toast({
        title: "Analysis Required",
        description: "Please analyze a track first before amapianorizing it.",
        variant: "destructive",
      });
      return;
    }

    amapianorizeMutation.mutate(amapianorizeForm);
  };

  const handleBatchAnalyze = () => {
    if (batchSources.length === 0) {
      toast({
        title: "No Sources Added",
        description: "Please add at least one source for batch analysis.",
        variant: "destructive",
      });
      return;
    }

    batchAnalyzeMutation.mutate({
      sources: batchSources,
      priority: 'normal',
      enhancedProcessing: batchEnhancedProcessing,
      culturalAnalysis: batchCulturalAnalysis
    });
  };

  const addBatchSource = () => {
    if (sourceUrl.trim()) {
      setBatchSources(prev => [...prev, {
        sourceUrl,
        sourceType,
        fileName: selectedFile?.name
      }]);
      setSourceUrl('');
      setSelectedFile(null);
    }
  };

  const removeBatchSource = (index: number) => {
    setBatchSources(prev => prev.filter((_, i) => i !== index));
  };

  const handlePopularTrackAnalyze = (track: any) => {
    setSourceUrl(`https://www.youtube.com/watch?v=${track.videoId || 'demo'}`);
    setSourceType('youtube');
    
    // Simulate analysis for popular track
    analyzeAudioMutation.mutate({
      sourceUrl: `https://www.youtube.com/watch?v=${track.videoId || 'demo'}`,
      sourceType: 'youtube',
      enhancedProcessing,
      culturalAnalysis
    });
  };

  const getSourceIcon = () => {
    switch (sourceType) {
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      case 'tiktok':
        return <Music className="h-4 w-4" />;
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'microphone':
        return <Mic className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const getPlaceholder = () => {
    switch (sourceType) {
      case 'youtube':
        return 'https://www.youtube.com/watch?v=...';
      case 'tiktok':
        return 'https://www.tiktok.com/@user/video/...';
      case 'upload':
        return 'Select an audio or video file';
      case 'microphone':
        return 'Use the recording controls below';
      default:
        return 'https://example.com/audio.mp3';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'aiff', 'dsd', 'dsf', 'opus', 'webm'];
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv', 'mts', 'mxf', 'ts'];
    
    if (audioFormats.includes(extension || '')) {
      return <FileAudio className="h-5 w-5 text-blue-400" />;
    } else if (videoFormats.includes(extension || '')) {
      return <FileVideo className="h-5 w-5 text-purple-400" />;
    }
    return <Music className="h-5 w-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'professional': return 'text-purple-400';
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const clearRemixMode = () => {
    setAmapianorizeForm(prev => ({
      ...prev,
      sourceAnalysisId: 0
    }));
    
    toast({
      title: "Analysis Cleared",
      description: "You can now select a different track to amapianorize.",
    });
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

  // Enhanced popular tracks data with more comprehensive information
  const popularTracks = [
    {
      id: 1,
      artist: 'Kabza De Small',
      track: 'Sponono',
      style: 'Classic Amapiano',
      description: 'Iconic track featuring signature log drums and soulful piano melodies that defined the amapiano sound',
      videoId: 'demo1',
      bpm: 118,
      key: 'F#m',
      duration: '4:32',
      year: 2019,
      features: ['Log drums', 'Piano', 'Vocals', 'Percussion'],
      complexity: 'Intermediate',
      culturalSignificance: 'Pioneering track that established amapiano globally'
    },
    {
      id: 2,
      artist: 'Kelvin Momo',
      track: 'Amukelani',
      style: 'Private School Amapiano',
      description: 'Sophisticated jazz-influenced composition with complex harmonies and subtle instrumentation',
      videoId: 'demo2',
      bpm: 112,
      key: 'Dm',
      duration: '6:18',
      year: 2021,
      features: ['Jazz chords', 'Saxophone', 'Subtle percussion', 'Deep bass'],
      complexity: 'Advanced',
      culturalSignificance: 'Defining example of the private school amapiano sub-genre'
    },
    {
      id: 3,
      artist: 'Babalwa M',
      track: 'Suka',
      style: 'Melodic Amapiano',
      description: 'Melodic and vocal-driven production with emotional depth and sophisticated arrangement',
      videoId: 'demo3',
      bpm: 115,
      key: 'C',
      duration: '5:45',
      year: 2020,
      features: ['Vocals', 'Melodic elements', 'Emotional progression', 'Smooth bass'],
      complexity: 'Intermediate',
      culturalSignificance: 'Showcases the melodic potential of amapiano music'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Professional Audio Analysis & Amapianorize</h1>
        <p className="text-white/80 max-w-3xl mx-auto">
          Advanced AI-powered analysis with professional-grade stem separation, pattern recognition, and transformation capabilities. 
          Upload high-quality files up to 500MB or analyze content from TikTok, YouTube, and more with enhanced accuracy and cultural validation.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 bg-white/10">
          <TabsTrigger value="analyze" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <Search className="h-4 w-4 mr-2" />
            Professional Analysis
          </TabsTrigger>
          <TabsTrigger value="amapianorize" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <Sparkles className="h-4 w-4 mr-2" />
            Enhanced Amapianorize
          </TabsTrigger>
          <TabsTrigger value="batch" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <Layers className="h-4 w-4 mr-2" />
            Batch Processing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Professional Audio Analysis
              </CardTitle>
              <CardDescription className="text-white/70">
                Upload files up to 500MB or analyze content from multiple platforms with enhanced AI processing and cultural validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enhanced Processing Options */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Professional Processing Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Enhanced Processing</Label>
                      <p className="text-white/60 text-sm">Professional-grade stem separation and pattern recognition with 96kHz/32-bit quality</p>
                    </div>
                    <Switch
                      checked={enhancedProcessing}
                      onCheckedChange={setEnhancedProcessing}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Cultural Analysis</Label>
                      <p className="text-white/60 text-sm">Expert cultural validation and educational insights about amapiano authenticity</p>
                    </div>
                    <Switch
                      checked={culturalAnalysis}
                      onCheckedChange={setCulturalAnalysis}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Source Type</Label>
                  <Select value={sourceType} onValueChange={(value: any) => setSourceType(value)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="microphone">
                        <div className="flex items-center space-x-2">
                          <Mic className="h-4 w-4" />
                          <span>Record Microphone</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="upload">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-4 w-4" />
                          <span>Upload File (Up to 500MB)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="youtube">
                        <div className="flex items-center space-x-2">
                          <Youtube className="h-4 w-4" />
                          <span>YouTube Video</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tiktok">
                        <div className="flex items-center space-x-2">
                          <Music className="h-4 w-4" />
                          <span>TikTok Video</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="url">
                        <div className="flex items-center space-x-2">
                          <Music className="h-4 w-4" />
                          <span>Audio URL</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sourceType === 'microphone' && (
                  <div className="space-y-4">
                    {!isRecording && !recordedAudio && (
                      <Button onClick={startRecording} className="w-full bg-red-500 hover:bg-red-600">
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    )}
                    {isRecording && (
                      <div className="flex items-center justify-center space-x-4">
                        <Button onClick={stopRecording} className="w-full bg-gray-500 hover:bg-gray-600">
                          <Circle className="h-4 w-4 mr-2 fill-red-500 text-red-500 animate-pulse" />
                          Stop Recording
                        </Button>
                        <div className="text-white font-mono">{new Date(recordingTime * 1000).toISOString().substr(14, 5)}</div>
                      </div>
                    )}
                    {recordedAudio && (
                      <Card className="bg-white/10 border-white/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Mic className="h-5 w-5 text-green-400" />
                              <div>
                                <div className="text-white font-medium">Recording ready</div>
                                <div className="text-white/60 text-sm">
                                  Duration: {Math.round(recordedAudio.blob.size / 16000)}s
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setRecordedAudio(null)} className="text-white/60 hover:text-white">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <audio src={recordedAudio.url} controls className="w-full mt-4" />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {sourceType === 'upload' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Select Professional Audio/Video File</Label>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.aiff,.dsd,.dsf,.opus,.mp4,.avi,.mov,.mkv,.webm,.3gp,.flv,.wmv,.mts,.mxf,.ts"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        {selectedFile && (
                          <div className="flex items-center space-x-2 text-white/70">
                            <span className="text-sm">Selected:</span>
                            <span className="text-white font-medium">{selectedFile.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedFile && (
                      <Card className="bg-white/10 border-white/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getFileIcon(selectedFile.name)}
                              <div>
                                <div className="text-white font-medium">{selectedFile.name}</div>
                                <div className="text-white/60 text-sm">
                                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                                </div>
                                <div className="text-white/50 text-xs mt-1">
                                  Quality: {selectedFile.name.includes('.wav') || selectedFile.name.includes('.flac') || selectedFile.name.includes('.dsd') ? 'Professional' : 
                                           selectedFile.name.includes('.mp3') || selectedFile.name.includes('.m4a') ? 'High' : 'Standard'}
                                  {enhancedProcessing && ' • Enhanced Processing Enabled'}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFile(null);
                                setSourceUrl('');
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="text-white/60 hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {isUploading && (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-white/70">
                                  {enhancedProcessing ? 'Professional Processing...' : 'Processing...'}
                                </span>
                                <span className="text-white">{uploadProgress}%</span>
                              </div>
                              <Progress value={uploadProgress} className="h-2" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <Card className="bg-blue-400/10 border-blue-400/20">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-2">
                          <Star className="h-5 w-5 text-blue-400 mt-0.5" />
                          <div className="text-blue-400 text-sm">
                            <div className="font-medium mb-1">Professional Format Support</div>
                            <div className="text-blue-300">
                              <strong>Professional Audio:</strong> WAV, FLAC, AIFF, DSD, DSF (up to 96kHz/32-bit)<br />
                              <strong>High-Quality Compressed:</strong> MP3, M4A, AAC, OGG, WMA, Opus<br />
                              <strong>Professional Video:</strong> MP4, AVI, MOV, MKV, WebM, 3GP, FLV, WMV, MTS, MXF, TS<br />
                              <strong>Max size:</strong> 500MB • <strong>Processing:</strong> Professional-grade AI with cultural validation
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {(sourceType === 'youtube' || sourceType === 'tiktok' || sourceType === 'url') && (
                  <div className="space-y-2">
                    <Label htmlFor="sourceUrl" className="text-white">
                      {sourceType === 'youtube' ? 'YouTube URL' : sourceType === 'tiktok' ? 'TikTok URL' : 'Audio URL'}
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        {getSourceIcon()}
                      </div>
                      <Input
                        id="sourceUrl"
                        placeholder={getPlaceholder()}
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={analyzeAudioMutation.isPending || isUploading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
              >
                <Search className="h-4 w-4 mr-2" />
                {analyzeAudioMutation.isPending || isUploading ? 
                  (enhancedProcessing ? 'Professional Processing...' : 'Analyzing...') : 
                  (enhancedProcessing ? 'Professional Analysis' : 'Analyze Audio')
                }
              </Button>

              {analyzeAudioMutation.data && (
                <div className="space-y-6">
                  {/* Enhanced Success Message and Actions */}
                  <Card className="bg-gradient-to-r from-green-400/10 to-blue-400/10 border-green-400/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-6 w-6 text-green-400" />
                          <div>
                            <h4 className="text-white font-semibold">Professional Analysis Complete!</h4>
                            <p className="text-white/70 text-sm">
                              Processed in {analyzeAudioMutation.data.processingTime}ms • 
                              Confidence: {Math.round(analyzeAudioMutation.data.metadata.confidence * 100)}% • 
                              Quality: <span className={getQualityColor(analyzeAudioMutation.data.metadata.quality)}>
                                {analyzeAudioMutation.data.metadata.quality.toUpperCase()}
                              </span>
                              {analyzeAudioMutation.data.metadata.culturalAuthenticity && (
                                <> • Cultural Authenticity: {Math.round(analyzeAudioMutation.data.metadata.culturalAuthenticity * 100)}%</>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              setAmapianorizeForm(prev => ({
                                ...prev,
                                sourceAnalysisId: analyzeAudioMutation.data!.id
                              }));
                              setActiveTab('amapianorize');
                            }}
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Amapianorize
                          </Button>
                          <Link to={`/generate?sourceId=${analyzeAudioMutation.data.id}&bpm=${analyzeAudioMutation.data.metadata.bpm}&key=${analyzeAudioMutation.data.metadata.keySignature}&prompt=${encodeURIComponent(sourceUrl)}`}>
                            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Use as Reference
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Quality Metrics */}
                  {analyzeAudioMutation.data.qualityMetrics && (
                    <Card className="bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center">
                          <Gauge className="h-5 w-5 mr-2" />
                          Professional Quality Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">
                              {Math.round(analyzeAudioMutation.data.qualityMetrics.stemSeparationAccuracy * 100)}%
                            </div>
                            <div className="text-white/70 text-sm">Stem Separation</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {Math.round(analyzeAudioMutation.data.qualityMetrics.patternRecognitionConfidence * 100)}%
                            </div>
                            <div className="text-white/70 text-sm">Pattern Recognition</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">
                              {Math.round(analyzeAudioMutation.data.qualityMetrics.audioQualityScore * 100)}%
                            </div>
                            <div className="text-white/70 text-sm">Audio Quality</div>
                          </div>
                          {analyzeAudioMutation.data.qualityMetrics.culturalAccuracyScore && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-400">
                                {Math.round(analyzeAudioMutation.data.qualityMetrics.culturalAccuracyScore * 100)}%
                              </div>
                              <div className="text-white/70 text-sm">Cultural Accuracy</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Metadata */}
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center">
                        <Zap className="h-5 w-5 mr-2" />
                        Enhanced Track Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-white/70">
                          <span className="font-medium">BPM:</span> {analyzeAudioMutation.data.metadata.bpm}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Key:</span> {analyzeAudioMutation.data.metadata.keySignature}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Genre:</span> {analyzeAudioMutation.data.metadata.genre}
                          {analyzeAudioMutation.data.metadata.subGenre && (
                            <Badge variant="outline" className="ml-2 border-white/20 text-white/60 text-xs">
                              {analyzeAudioMutation.data.metadata.subGenre}
                            </Badge>
                          )}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Duration:</span> {Math.floor(analyzeAudioMutation.data.metadata.duration / 60)}:{(analyzeAudioMutation.data.metadata.duration % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Quality:</span> 
                          <Badge variant="outline" className={`ml-2 border-white/20 ${getQualityColor(analyzeAudioMutation.data.metadata.quality)}`}>
                            {analyzeAudioMutation.data.metadata.quality.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Sample Rate:</span> {analyzeAudioMutation.data.metadata.sampleRate}Hz
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Bit Depth:</span> {analyzeAudioMutation.data.metadata.bitDepth}-bit
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Confidence:</span> {Math.round(analyzeAudioMutation.data.metadata.confidence * 100)}%
                        </div>
                        {analyzeAudioMutation.data.metadata.musicalComplexity && (
                          <div className="text-white/70">
                            <span className="font-medium">Complexity:</span> 
                            <Badge variant="outline" className="ml-2 border-white/20 text-white/60">
                              {analyzeAudioMutation.data.metadata.musicalComplexity}
                            </Badge>
                          </div>
                        )}
                        {analyzeAudioMutation.data.metadata.energyLevel && (
                          <div className="text-white/70">
                            <span className="font-medium">Energy:</span> {Math.round(analyzeAudioMutation.data.metadata.energyLevel * 100)}%
                          </div>
                        )}
                        {analyzeAudioMutation.data.metadata.danceability && (
                          <div className="text-white/70">
                            <span className="font-medium">Danceability:</span> {Math.round(analyzeAudioMutation.data.metadata.danceability * 100)}%
                          </div>
                        )}
                        {analyzeAudioMutation.data.metadata.culturalAuthenticity && (
                          <div className="text-white/70">
                            <span className="font-medium">Cultural Auth:</span> {Math.round(analyzeAudioMutation.data.metadata.culturalAuthenticity * 100)}%
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Educational Insights */}
                  {analyzeAudioMutation.data.educationalInsights && (
                    <Card className="bg-white/10 border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center">
                          <Brain className="h-5 w-5 mr-2" />
                          Educational Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="text-white font-medium mb-2">Musical Theory</h4>
                          <ul className="text-white/70 text-sm space-y-1">
                            {analyzeAudioMutation.data.educationalInsights.musicalTheory.map((insight, i) => (
                              <li key={i}>• {insight}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-2">Cultural Context</h4>
                          <ul className="text-white/70 text-sm space-y-1">
                            {analyzeAudioMutation.data.educationalInsights.culturalContext.map((insight, i) => (
                              <li key={i}>• {insight}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-2">Production Techniques</h4>
                          <ul className="text-white/70 text-sm space-y-1">
                            {analyzeAudioMutation.data.educationalInsights.productionTechniques.map((insight, i) => (
                              <li key={i}>• {insight}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Extracted Stems */}
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center">
                        <Volume2 className="h-5 w-5 mr-2" />
                        Professional Stem Separation
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        AI-powered stem separation with {enhancedProcessing ? 'professional-grade' : 'enhanced'} accuracy. Each stem is professionally isolated and ready for production use.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(analyzeAudioMutation.data.stems).map(([stem, url]) => (
                          <div key={stem} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="flex items-center space-x-3">
                              <Layers className="h-5 w-5 text-yellow-400" />
                              <div>
                                <span className="text-white capitalize font-medium">{stem}</span>
                                <div className="text-white/60 text-xs">
                                  {stem === 'drums' && `Professional low-freq isolation (${enhancedProcessing ? '55Hz' : '80Hz'} square + lowpass)`}
                                  {stem === 'bass' && `Deep bass extraction (${enhancedProcessing ? '45Hz' : '60Hz'} sawtooth + lowpass)`}
                                  {stem === 'piano' && `Harmonic separation (440Hz sine + ${enhancedProcessing ? 'professional' : 'standard'} filtering)`}
                                  {stem === 'vocals' && `Vocal isolation (523Hz sine + ${enhancedProcessing ? 'professional' : 'standard'} processing)`}
                                  {stem === 'other' && `Remaining instruments (330Hz sine + ${enhancedProcessing ? 'professional' : 'standard'} filtering)`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => handlePlay(url, 'stem', `stem-${stem}`, `${stem} stem`)}
                              >
                                {playingAudio?.id === `stem-${stem}` ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => handleDownload(url, `${stem}-stem.wav`)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Detected Patterns */}
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Advanced Pattern Recognition</CardTitle>
                      <CardDescription className="text-white/70">
                        AI-detected musical patterns with {enhancedProcessing ? 'professional-grade' : 'enhanced'} accuracy and detailed analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyzeAudioMutation.data.patterns.map((pattern, index) => (
                          <div key={index} className="p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-white font-medium capitalize flex items-center">
                                <Star className="h-4 w-4 mr-2 text-yellow-400" />
                                {pattern.type.replace('_', ' ')}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="border-green-400/30 text-green-400">
                                  {Math.round(pattern.confidence * 100)}% confidence
                                </Badge>
                                {pattern.data.complexity && (
                                  <Badge variant="outline" className="border-blue-400/30 text-blue-400">
                                    {pattern.data.complexity}
                                  </Badge>
                                )}
                                {pattern.data.culturalStyle && (
                                  <Badge variant="outline" className="border-purple-400/30 text-purple-400">
                                    {pattern.data.culturalStyle}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-white/70 text-sm mb-2">
                              <span className="font-medium">Time:</span> {pattern.timeRange.start}s - {pattern.timeRange.end}s
                            </div>
                            <div className="mt-2 text-white/60 text-sm space-y-1">
                              {pattern.type === 'chord_progression' && pattern.data.chords && (
                                <>
                                  <div><span className="font-medium">Chords:</span> {pattern.data.chords.join(' - ')}</div>
                                  {pattern.data.voicing && <div><span className="font-medium">Voicing:</span> {pattern.data.voicing}</div>}
                                  {pattern.data.quality && <div><span className="font-medium">Style:</span> {pattern.data.quality}</div>}
                                  {pattern.data.culturalSignificance && <div><span className="font-medium">Cultural:</span> {pattern.data.culturalSignificance}</div>}
                                </>
                              )}
                              {pattern.type === 'drum_pattern' && (
                                <>
                                  {pattern.data.pattern && <div><span className="font-medium">Pattern:</span> {pattern.data.pattern}</div>}
                                  {pattern.data.groove && <div><span className="font-medium">Groove:</span> {pattern.data.groove}</div>}
                                  {pattern.data.logDrum?.swing && <div><span className="font-medium">Swing:</span> {pattern.data.logDrum.swing}</div>}
                                  {pattern.data.culturalStyle && <div><span className="font-medium">Cultural Style:</span> {pattern.data.culturalStyle}</div>}
                                </>
                              )}
                              {pattern.data.educationalNote && (
                                <div className="mt-2 p-2 bg-blue-400/10 rounded text-blue-300 text-xs">
                                  <span className="font-medium">Educational Note:</span> {pattern.data.educationalNote}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amapianorize" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Enhanced Amapianorize Engine
              </CardTitle>
              <CardDescription className="text-white/70">
                Advanced AI transformation with sophisticated controls for authentic amapiano conversion and cultural validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!amapianorizeForm.sourceAnalysisId ? (
                <Card className="bg-orange-400/10 border-orange-400/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-400" />
                      <div className="text-orange-400 font-medium">Analysis Required</div>
                    </div>
                    <p className="text-white/80 text-sm mt-2">
                      Please analyze a track first using the "Professional Analysis" tab before you can amapianorize it.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-green-400/10 border-green-400/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <div className="text-green-400 font-medium">Track Ready for Enhanced Amapianorization</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearRemixMode}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <p className="text-white/80 text-sm mt-2">
                      Analysis ID: {amapianorizeForm.sourceAnalysisId} - Ready for professional amapiano transformation with cultural validation!
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white">Target Genre</Label>
                  <Select 
                    value={amapianorizeForm.targetGenre} 
                    onValueChange={(value: any) => setAmapianorizeForm(prev => ({ ...prev, targetGenre: value }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amapiano">Classic Amapiano - Traditional log drums & soulful piano</SelectItem>
                      <SelectItem value="private_school_amapiano">Private School - Jazz harmonies & sophisticated arrangement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Transformation Intensity</Label>
                  <Select 
                    value={amapianorizeForm.intensity} 
                    onValueChange={(value: any) => setAmapianorizeForm(prev => ({ ...prev, intensity: value }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle - Light amapiano influence, preserve original character</SelectItem>
                      <SelectItem value="moderate">Moderate - Balanced transformation with clear amapiano elements</SelectItem>
                      <SelectItem value="heavy">Heavy - Full amapiano conversion with complete restructuring</SelectItem>
                      <SelectItem value="extreme">Extreme - Maximum transformation with cultural authenticity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enhanced Options */}
              <div className="space-y-4">
                <h4 className="text-white font-medium">Professional Options</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="preserveVocals"
                        checked={amapianorizeForm.preserveVocals}
                        onChange={(e) => setAmapianorizeForm(prev => ({ ...prev, preserveVocals: e.target.checked }))}
                        className="rounded border-white/20 bg-white/10"
                      />
                      <Label htmlFor="preserveVocals" className="text-white">
                        Preserve Original Vocals
                      </Label>
                    </div>
                    <p className="text-white/60 text-xs">
                      Keep original vocals while transforming instrumentals with professional quality
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="preserveMelody"
                        checked={amapianorizeForm.additionalOptions.preserveMelody}
                        onChange={(e) => setAmapianorizeForm(prev => ({ 
                          ...prev, 
                          additionalOptions: { ...prev.additionalOptions, preserveMelody: e.target.checked }
                        }))}
                        className="rounded border-white/20 bg-white/10"
                      />
                      <Label htmlFor="preserveMelody" className="text-white">
                        Preserve Main Melody
                      </Label>
                    </div>
                    <p className="text-white/60 text-xs">
                      Keep the main melodic line intact during professional transformation
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="qualityEnhancement"
                        checked={amapianorizeForm.additionalOptions.qualityEnhancement}
                        onChange={(e) => setAmapianorizeForm(prev => ({ 
                          ...prev, 
                          additionalOptions: { ...prev.additionalOptions, qualityEnhancement: e.target.checked }
                        }))}
                        className="rounded border-white/20 bg-white/10"
                      />
                      <Label htmlFor="qualityEnhancement" className="text-white">
                        Quality Enhancement
                      </Label>
                    </div>
                    <p className="text-white/60 text-xs">
                      Apply professional-grade audio enhancement and mastering
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Cultural Authenticity</Label>
                    <Select 
                      value={amapianorizeForm.additionalOptions.culturalAuthenticity} 
                      onValueChange={(value: any) => setAmapianorizeForm(prev => ({ 
                        ...prev, 
                        additionalOptions: { ...prev.additionalOptions, culturalAuthenticity: value }
                      }))}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="traditional">Traditional - Maximum cultural authenticity</SelectItem>
                        <SelectItem value="modern">Modern - Contemporary amapiano interpretation</SelectItem>
                        <SelectItem value="fusion">Fusion - Cross-cultural musical dialogue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrompt" className="text-white">Custom Instructions (Optional)</Label>
                <Input
                  id="customPrompt"
                  placeholder="e.g., 'Make it more jazzy with saxophone elements' or 'Keep the original melody but add professional log drums'"
                  value={amapianorizeForm.customPrompt}
                  onChange={(e) => setAmapianorizeForm(prev => ({ ...prev, customPrompt: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <Button
                onClick={handleAmapianorize}
                disabled={amapianorizeMutation.isPending || !amapianorizeForm.sourceAnalysisId}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {amapianorizeMutation.isPending ? 'Professional Amapianorizing...' : 'Enhanced Amapianorize Track'}
              </Button>

              {amapianorizeMutation.data && (
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-purple-400/10 to-pink-400/10 border-purple-400/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Enhanced Amapianorization Complete!</CardTitle>
                      <CardDescription className="text-white/70">
                        Your track has been professionally transformed into {amapianorizeMutation.data.metadata.genre} style in {amapianorizeMutation.data.processingTime}ms with {amapianorizeMutation.data.metadata.intensity} intensity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Enhanced Quality Metrics */}
                      {amapianorizeMutation.data.qualityMetrics && (
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-400">
                              {Math.round(amapianorizeMutation.data.qualityMetrics.transformationAccuracy * 100)}%
                            </div>
                            <div className="text-white/70 text-sm">Transformation</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-400">
                              {Math.round(amapianorizeMutation.data.qualityMetrics.culturalFidelity * 100)}%
                            </div>
                            <div className="text-white/70 text-sm">Cultural Fidelity</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-400">
                              {Math.round(amapianorizeMutation.data.qualityMetrics.audioQuality * 100)}%
                            </div>
                            <div className="text-white/70 text-sm">Audio Quality</div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-white/70">
                          <span className="font-medium">BPM:</span> {amapianorizeMutation.data.metadata.bpm}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Key:</span> {amapianorizeMutation.data.metadata.keySignature}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Intensity:</span> {amapianorizeMutation.data.metadata.intensity}
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Duration:</span> {Math.floor(amapianorizeMutation.data.metadata.duration / 60)}:{(amapianorizeMutation.data.metadata.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>

                      {/* Enhanced Transformation Details */}
                      <div className="space-y-2">
                        <h5 className="text-white font-medium">Professional Transformation Details:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-green-400 font-medium">Added:</span>
                            <ul className="text-white/60 mt-1">
                              {amapianorizeMutation.data.metadata.transformationDetails.elementsAdded.map((element, i) => (
                                <li key={i}>• {element}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-yellow-400 font-medium">Modified:</span>
                            <ul className="text-white/60 mt-1">
                              {amapianorizeMutation.data.metadata.transformationDetails.elementsModified.map((element, i) => (
                                <li key={i}>• {element}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-blue-400 font-medium">Preserved:</span>
                            <ul className="text-white/60 mt-1">
                              {amapianorizeMutation.data.metadata.transformationDetails.elementsPreserved.map((element, i) => (
                                <li key={i}>• {element}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-purple-400 font-medium">Cultural:</span>
                            <ul className="text-white/60 mt-1">
                              {amapianorizeMutation.data.metadata.transformationDetails.culturalEnhancements.map((element, i) => (
                                <li key={i}>• {element}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <Button 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handlePlay(amapianorizeMutation.data!.amapianorizedTrackUrl, 'track', 'amapianorized-track', 'Enhanced Amapianorized Track')}
                        >
                          {playingAudio?.id === 'amapianorized-track' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          {playingAudio?.id === 'amapianorized-track' ? 'Stop' : 'Play Enhanced Track'}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-white/20 text-white"
                          onClick={() => handleDownload(amapianorizeMutation.data!.amapianorizedTrackUrl, 'enhanced-amapianorized-track.wav')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      {/* Enhanced Amapianorized Stems */}
                      <div className="space-y-2">
                        <h4 className="text-white font-medium flex items-center">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Professional Amapianorized Stems:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(amapianorizeMutation.data.stems).map(([stem, url]) => (
                            url && (
                              <div key={stem} className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors">
                                <span className="text-white/70 capitalize text-sm">{stem}</span>
                                <div className="flex space-x-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handlePlay(url, 'stem', `amapiano-stem-${stem}`, `Enhanced Amapianorized ${stem} stem`)}
                                  >
                                    {playingAudio?.id === `amapiano-stem-${stem}` ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDownload(url, `enhanced-amapianorized-${stem}-stem.wav`)}
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Professional Batch Analysis
              </CardTitle>
              <CardDescription className="text-white/70">
                Process multiple audio sources simultaneously with professional-grade processing and cultural validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enhanced Batch Processing Options */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Batch Processing Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Enhanced Processing</Label>
                      <p className="text-white/60 text-sm">Apply professional-grade processing to all sources in the batch</p>
                    </div>
                    <Switch
                      checked={batchEnhancedProcessing}
                      onCheckedChange={setBatchEnhancedProcessing}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Cultural Analysis</Label>
                      <p className="text-white/60 text-sm">Include cultural validation and educational insights for all sources</p>
                    </div>
                    <Switch
                      checked={batchCulturalAnalysis}
                      onCheckedChange={setBatchCulturalAnalysis}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={addBatchSource}
                    disabled={!sourceUrl.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Add Source
                  </Button>
                  <span className="text-white/70 text-sm">
                    {batchSources.length}/20 sources added
                    {batchEnhancedProcessing && ' • Enhanced Processing Enabled'}
                    {batchCulturalAnalysis && ' • Cultural Analysis Enabled'}
                  </span>
                </div>

                {batchSources.length > 0 && (
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Professional Batch Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {batchSources.map((source, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                            <div className="flex items-center space-x-2">
                              {getSourceIcon()}
                              <span className="text-white/70 text-sm truncate max-w-md">
                                {source.fileName || source.sourceUrl}
                              </span>
                              <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                                {source.sourceType}
                              </Badge>
                              {batchEnhancedProcessing && (
                                <Badge variant="outline" className="border-purple-400/20 text-purple-400 text-xs">
                                  Enhanced
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeBatchSource(index)}
                              className="text-white/60 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleBatchAnalyze}
                  disabled={batchAnalyzeMutation.isPending || batchSources.length === 0}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {batchAnalyzeMutation.isPending ? 'Starting Professional Batch...' : 
                   `Analyze ${batchSources.length} Sources${batchEnhancedProcessing ? ' (Enhanced)' : ''}`}
                </Button>

                {batchAnalyzeMutation.data && (
                  <Card className="bg-green-400/10 border-green-400/20">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <div className="text-green-400 font-medium">Professional Batch Analysis Started</div>
                      </div>
                      <p className="text-white/80 text-sm mt-2">
                        Batch ID: {batchAnalyzeMutation.data.batchId}<br />
                        Processing: {batchAnalyzeMutation.data.enhancedFeatures ? 'Professional-Grade Enhanced' : 'Standard'}<br />
                        Estimated completion: {Math.round(batchAnalyzeMutation.data.estimatedCompletionTime / 60)} minutes<br />
                        Queue position: {batchAnalyzeMutation.data.queuePosition}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Popular Analysis Examples */}
      <Card className="bg-white/5 border-white/10 max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Music className="h-5 w-5 mr-2" />
            Professional Popular Tracks Analysis
          </CardTitle>
          <CardDescription className="text-white/70">
            Try analyzing these classic amapiano tracks with professional-grade AI processing. Each track includes detailed cultural context and musical analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTracks.map((track) => (
              <Card key={track.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-white text-lg">{track.track}</CardTitle>
                      <p className="text-white/70 text-sm font-medium">{track.artist}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="border-yellow-400/30 text-yellow-400 w-fit text-xs">
                          {track.style}
                        </Badge>
                        <Badge variant="outline" className="border-blue-400/30 text-blue-400 w-fit text-xs">
                          {track.complexity}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-white/60 text-xs text-right">
                      <div>{track.year}</div>
                      <div>{track.duration}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/60 text-sm">{track.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs text-white/70">
                    <div>
                      <span className="font-medium">BPM:</span> {track.bpm}
                    </div>
                    <div>
                      <span className="font-medium">Key:</span> {track.key}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-white/70 text-xs font-medium">Musical Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {track.features.map((feature, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs bg-white/10 text-white/60"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-white/70 text-xs font-medium">Cultural Significance:</div>
                    <p className="text-white/50 text-xs">{track.culturalSignificance}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/20 text-white hover:bg-white/10 flex-1"
                      onClick={() => handlePlay(`demo-${track.videoId}`, 'popular', `popular-${track.id}`, `${track.artist} - ${track.track}`)}
                    >
                      {playingAudio?.id === `popular-${track.id}` ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {playingAudio?.id === `popular-${track.id}` ? 'Stop' : 'Play'}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-yellow-400 hover:bg-yellow-500 text-black"
                      onClick={() => handlePopularTrackAnalyze(track)}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Analyze
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => handleDownload(`demo-${track.videoId}`, `${track.artist}-${track.track}.wav`, track)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Professional demo track</span>
                    <div className="flex items-center space-x-1">
                      <ExternalLink className="h-3 w-3" />
                      <span>YouTube</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Demo Notice */}
      <Card className="bg-blue-400/10 border-blue-400/20 max-w-6xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-blue-400" />
            <div className="text-blue-400 font-medium">Professional Demo Mode</div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            This is a professional demonstration of the enhanced audio analysis interface. In the full version, you'll experience:
            • Real AI-powered stem separation with 95%+ accuracy • Actual studio-quality audio playback and downloads
            • Professional-grade pattern recognition with cultural validation • Batch processing with priority queuing • Real-time analysis progress with quality metrics
            Currently, professional demo tones with advanced filtering simulate different stem types, and downloads create comprehensive metadata files with technical specifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
