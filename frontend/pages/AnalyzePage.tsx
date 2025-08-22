import React, { useState, useRef } from 'react';
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
import { Search, Upload, Youtube, Music, Layers, Play, Download, Sparkles, FileAudio, FileVideo, AlertCircle, CheckCircle, X, Pause, Volume2, ExternalLink } from 'lucide-react';
import backend from '~backend/client';
import type { AnalyzeAudioRequest } from '~backend/music/analyze';

export default function AnalyzePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<'youtube' | 'upload' | 'url' | 'tiktok'>('youtube');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'amapianorize'>('analyze');
  const [playingAudio, setPlayingAudio] = useState<{ type: 'stem' | 'track' | 'popular'; id: string; audio: HTMLAudioElement } | null>(null);

  // Amapianorize form state
  const [amapianorizeForm, setAmapianorizeForm] = useState({
    sourceAnalysisId: 0,
    targetGenre: 'amapiano' as 'amapiano' | 'private_school_amapiano',
    intensity: 'moderate' as 'subtle' | 'moderate' | 'heavy',
    preserveVocals: true,
    customPrompt: ''
  });

  const analyzeAudioMutation = useMutation({
    mutationFn: (data: AnalyzeAudioRequest) => backend.music.analyzeAudio(data),
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete!",
        description: "Audio has been analyzed and stems extracted successfully.",
      });
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze audio. Please check the file/URL and try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const amapianorizeMutation = useMutation({
    mutationFn: (data: any) => backend.music.amapianorizeTrack(data),
    onSuccess: (data) => {
      toast({
        title: "Amapianorization Complete!",
        description: "Your track has been successfully transformed into amapiano style.",
      });
    },
    onError: (error) => {
      console.error('Amapianorize error:', error);
      toast({
        title: "Amapianorization Failed",
        description: "Failed to transform track. Please try again.",
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

    // Create a demo audio context with different tones for different types
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies and waveforms for different stem types
    const stemFrequencies = {
      drums: 80,    // Low frequency for drums
      bass: 60,     // Very low for bass
      piano: 440,   // A4 for piano
      vocals: 523,  // C5 for vocals
      other: 330,   // E4 for other instruments
      track: 220,   // A3 for full track
      popular: 196  // G3 for popular tracks
    };
    
    const stemName = id.replace('stem-', '').replace('track-', '').replace('popular-', '');
    const frequency = stemFrequencies[stemName as keyof typeof stemFrequencies] || stemFrequencies.other;
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Different waveforms for different stems
    if (stemName === 'drums') {
      oscillator.type = 'square';
    } else if (stemName === 'bass') {
      oscillator.type = 'sawtooth';
    } else if (type === 'popular') {
      oscillator.type = 'triangle';
    } else {
      oscillator.type = 'sine';
    }
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 4);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 4);
    
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
      duration: 4
    } as HTMLAudioElement;

    setPlayingAudio({ type, id, audio: mockAudio });
    
    toast({
      title: "Demo Playback",
      description: `Playing ${name || stemName}... (demo audio with ${frequency}Hz ${oscillator.type} wave)`,
    });

    // Auto-stop after 4 seconds
    setTimeout(() => {
      setPlayingAudio(null);
    }, 4000);
  };

  const handleDownload = (audioUrl: string, filename: string, trackInfo?: any) => {
    // Create a comprehensive demo file with track information
    let content = `Demo audio file: ${filename}\n`;
    content += `This would be actual audio data in the full version.\n`;
    content += `URL: ${audioUrl}\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    
    if (trackInfo) {
      content += `Track Information:\n`;
      content += `Artist: ${trackInfo.artist}\n`;
      content += `Track: ${trackInfo.track}\n`;
      content += `Style: ${trackInfo.style}\n`;
      content += `Description: ${trackInfo.description || 'N/A'}\n\n`;
    }
    
    content += `File Format: WAV (44.1kHz, 16-bit)\n`;
    content += `Quality: Professional\n`;
    content += `License: Demo purposes only\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.(wav|mp3|flac)$/i, '.txt'); // Change extension for demo
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Downloading ${filename}... (demo file with track info)`,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const supportedFormats = [
        'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma',
        'mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv'
      ];
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        toast({
          title: "Unsupported File Format",
          description: `Please select a supported audio or video file. Supported formats: ${supportedFormats.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 100MB. Please select a smaller file.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setSourceUrl(`upload://${file.name}`);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get upload URL
      const uploadResponse = await backend.music.getUploadUrl({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // In a real implementation, you would upload to the signed URL
      // For demo purposes, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Analyze the uploaded file
      analyzeAudioMutation.mutate({
        sourceUrl: `upload://${uploadResponse.fileId}`,
        sourceType: 'upload',
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
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
        sourceType
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

  const handlePopularTrackAnalyze = (track: any) => {
    setSourceUrl(`https://www.youtube.com/watch?v=${track.videoId || 'demo'}`);
    setSourceType('youtube');
    
    // Simulate analysis for popular track
    analyzeAudioMutation.mutate({
      sourceUrl: `https://www.youtube.com/watch?v=${track.videoId || 'demo'}`,
      sourceType: 'youtube'
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
      default:
        return 'https://example.com/audio.mp3';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'];
    const videoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', '3gp', 'flv', 'wmv'];
    
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

  // Popular tracks data with more comprehensive information
  const popularTracks = [
    {
      id: 1,
      artist: 'Kabza De Small',
      track: 'Sponono',
      style: 'Classic Amapiano',
      description: 'Iconic track featuring signature log drums and soulful piano melodies',
      videoId: 'demo1',
      bpm: 118,
      key: 'F#m',
      duration: '4:32',
      year: 2019,
      features: ['Log drums', 'Piano', 'Vocals', 'Percussion']
    },
    {
      id: 2,
      artist: 'Kelvin Momo',
      track: 'Amukelani',
      style: 'Private School Amapiano',
      description: 'Sophisticated jazz-influenced composition with complex harmonies',
      videoId: 'demo2',
      bpm: 112,
      key: 'Dm',
      duration: '6:18',
      year: 2021,
      features: ['Jazz chords', 'Saxophone', 'Subtle percussion', 'Deep bass']
    },
    {
      id: 3,
      artist: 'Babalwa M',
      track: 'Suka',
      style: 'Melodic Amapiano',
      description: 'Melodic and vocal-driven production with emotional depth',
      videoId: 'demo3',
      bpm: 115,
      key: 'C',
      duration: '5:45',
      year: 2020,
      features: ['Vocals', 'Melodic elements', 'Emotional progression', 'Smooth bass']
    },
    {
      id: 4,
      artist: 'Focalistic',
      track: 'Ke Star',
      style: 'Commercial Amapiano',
      description: 'High-energy commercial amapiano with rap vocals and catchy hooks',
      videoId: 'demo4',
      bpm: 120,
      key: 'Am',
      duration: '3:28',
      year: 2020,
      features: ['Rap vocals', 'Commercial appeal', 'Energetic drums', 'Catchy hooks']
    },
    {
      id: 5,
      artist: 'DJ Maphorisa',
      track: 'Midnight Starring',
      style: 'Deep Amapiano',
      description: 'Deep, atmospheric amapiano with hypnotic rhythms and rich textures',
      videoId: 'demo5',
      bpm: 116,
      key: 'Gm',
      duration: '7:12',
      year: 2019,
      features: ['Deep atmosphere', 'Hypnotic rhythms', 'Rich textures', 'Extended mix']
    },
    {
      id: 6,
      artist: 'Mas Musiq',
      track: 'Zaka',
      style: 'Soulful Amapiano',
      description: 'Soulful amapiano with gospel influences and uplifting melodies',
      videoId: 'demo6',
      bpm: 114,
      key: 'F',
      duration: '4:56',
      year: 2020,
      features: ['Gospel influence', 'Uplifting melodies', 'Soulful vocals', 'Spiritual vibe']
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Audio Analysis & Amapianorize</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Analyze any audio or video file to extract stems and patterns, or transform any music into authentic amapiano style. 
          Upload from your device or provide URLs from TikTok, YouTube, and more.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger value="analyze" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Analyze Audio
          </TabsTrigger>
          <TabsTrigger value="amapianorize" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Amapianorize Track
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Analyze Audio/Video</CardTitle>
              <CardDescription className="text-white/70">
                Upload files from your device or analyze content from TikTok, YouTube, and other sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Source Type</Label>
                  <Select value={sourceType} onValueChange={(value: any) => setSourceType(value)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-4 w-4" />
                          <span>Upload File</span>
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

                {sourceType === 'upload' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Select File</Label>
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
                          accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.mp4,.avi,.mov,.mkv,.webm,.3gp,.flv,.wmv"
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
                                <span className="text-white/70">Uploading...</span>
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
                          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                          <div className="text-blue-400 text-sm">
                            <div className="font-medium mb-1">Supported Formats</div>
                            <div className="text-blue-300">
                              <strong>Audio:</strong> MP3, WAV, FLAC, M4A, AAC, OGG, WMA<br />
                              <strong>Video:</strong> MP4, AVI, MOV, MKV, WebM, 3GP, FLV, WMV<br />
                              <strong>Max size:</strong> 100MB
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
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
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
              >
                <Search className="h-4 w-4 mr-2" />
                {analyzeAudioMutation.isPending || isUploading ? 'Analyzing...' : 'Analyze Audio'}
              </Button>

              {analyzeAudioMutation.data && (
                <div className="space-y-6">
                  {/* Success Message and Remix Button */}
                  <Card className="bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border-yellow-400/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                        <div>
                          <h4 className="text-white font-semibold">Analysis Complete!</h4>
                          <p className="text-white/70 text-sm">Ready to create something new?</p>
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
                            Remix Track
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Metadata */}
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Track Information</CardTitle>
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
                        </div>
                        <div className="text-white/70">
                          <span className="font-medium">Duration:</span> {Math.floor(analyzeAudioMutation.data.metadata.duration / 60)}:{(analyzeAudioMutation.data.metadata.duration % 60).toString().padStart(2, '0')}
                        </div>
                        {analyzeAudioMutation.data.metadata.originalFileName && (
                          <div className="text-white/70 md:col-span-2">
                            <span className="font-medium">File:</span> {analyzeAudioMutation.data.metadata.originalFileName}
                          </div>
                        )}
                        {analyzeAudioMutation.data.metadata.fileType && (
                          <div className="text-white/70">
                            <span className="font-medium">Type:</span> 
                            <Badge variant="outline" className="ml-2 border-white/20 text-white/70">
                              {analyzeAudioMutation.data.metadata.fileType}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Extracted Stems */}
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center">
                        <Volume2 className="h-5 w-5 mr-2" />
                        Extracted Stems
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Individual instrument tracks separated from the original audio. Click play to hear demo tones representing each stem.
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
                                  {stem === 'drums' && 'Low frequency square wave (80Hz)'}
                                  {stem === 'bass' && 'Very low sawtooth wave (60Hz)'}
                                  {stem === 'piano' && 'Mid frequency sine wave (440Hz)'}
                                  {stem === 'vocals' && 'High frequency sine wave (523Hz)'}
                                  {stem === 'other' && 'Mixed frequency sine wave (330Hz)'}
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

                  {/* Detected Patterns */}
                  <Card className="bg-white/10 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Detected Patterns</CardTitle>
                      <CardDescription className="text-white/70">
                        Musical patterns and structures identified in the track
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyzeAudioMutation.data.patterns.map((pattern, index) => (
                          <div key={index} className="p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-white font-medium capitalize">
                                {pattern.type.replace('_', ' ')}
                              </h4>
                              <span className="text-yellow-400 text-sm">
                                {Math.round(pattern.confidence * 100)}% confidence
                              </span>
                            </div>
                            <div className="text-white/70 text-sm">
                              <span className="font-medium">Time:</span> {pattern.timeRange.start}s - {pattern.timeRange.end}s
                            </div>
                            <div className="mt-2 text-white/60 text-sm">
                              {pattern.type === 'chord_progression' && pattern.data.chords && (
                                <span>Chords: {pattern.data.chords.join(' - ')}</span>
                              )}
                              {pattern.type === 'drum_pattern' && pattern.data.pattern && (
                                <span>Pattern: {pattern.data.pattern}</span>
                              )}
                              {pattern.type === 'bass_pattern' && pattern.data.notes && (
                                <span>Notes: {pattern.data.notes.join(' - ')}</span>
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
              <CardTitle className="text-white">Amapianorize Track</CardTitle>
              <CardDescription className="text-white/70">
                Transform any music into authentic amapiano style while preserving the original essence
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
                      Please analyze a track first using the "Analyze Audio" tab before you can amapianorize it.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-green-400/10 border-green-400/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div className="text-green-400 font-medium">Track Ready for Amapianorization</div>
                    </div>
                    <p className="text-white/80 text-sm mt-2">
                      Analysis ID: {amapianorizeForm.sourceAnalysisId} - Ready to transform into amapiano style!
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
                      <SelectItem value="amapiano">Classic Amapiano</SelectItem>
                      <SelectItem value="private_school_amapiano">Private School Amapiano</SelectItem>
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
                      <SelectItem value="subtle">Subtle - Light amapiano influence</SelectItem>
                      <SelectItem value="moderate">Moderate - Balanced transformation</SelectItem>
                      <SelectItem value="heavy">Heavy - Full amapiano conversion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                <p className="text-white/60 text-sm">
                  Keep the original vocals intact while transforming the instrumental elements
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrompt" className="text-white">Custom Instructions (Optional)</Label>
                <Input
                  id="customPrompt"
                  placeholder="e.g., 'Make it more jazzy with saxophone elements' or 'Keep the original melody but add log drums'"
                  value={amapianorizeForm.customPrompt}
                  onChange={(e) => setAmapianorizeForm(prev => ({ ...prev, customPrompt: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <Button
                onClick={handleAmapianorize}
                disabled={amapianorizeMutation.isPending || !amapianorizeForm.sourceAnalysisId}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {amapianorizeMutation.isPending ? 'Amapianorizing...' : 'Amapianorize Track'}
              </Button>

              {amapianorizeMutation.data && (
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-purple-400/10 to-pink-400/10 border-purple-400/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Amapianorization Complete!</CardTitle>
                      <CardDescription className="text-white/70">
                        Your track has been successfully transformed into {amapianorizeMutation.data.metadata.genre} style
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                      <div className="flex items-center space-x-4">
                        <Button 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handlePlay(amapianorizeMutation.data!.amapianorizedTrackUrl, 'track', 'amapianorized-track', 'Amapianorized Track')}
                        >
                          {playingAudio?.id === 'amapianorized-track' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                          {playingAudio?.id === 'amapianorized-track' ? 'Stop' : 'Play Amapianorized Track'}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-white/20 text-white"
                          onClick={() => handleDownload(amapianorizeMutation.data!.amapianorizedTrackUrl, 'amapianorized-track.wav')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      {/* Amapianorized Stems */}
                      <div className="space-y-2">
                        <h4 className="text-white font-medium flex items-center">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Amapianorized Stems:
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
                                    onClick={() => handlePlay(url, 'stem', `amapiano-stem-${stem}`, `Amapianorized ${stem} stem`)}
                                  >
                                    {playingAudio?.id === `amapiano-stem-${stem}` ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDownload(url, `amapianorized-${stem}-stem.wav`)}
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
      </Tabs>

      {/* Popular Analysis Examples */}
      <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Music className="h-5 w-5 mr-2" />
            Popular Tracks to Analyze
          </CardTitle>
          <CardDescription className="text-white/70">
            Try analyzing these classic amapiano tracks. Click play to hear demo audio or analyze to extract stems and patterns.
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
                      <Badge variant="outline" className="border-yellow-400/30 text-yellow-400 w-fit">
                        {track.style}
                      </Badge>
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
                    <div className="text-white/70 text-xs font-medium">Features:</div>
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
                    <span>Demo track</span>
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

      {/* Demo Notice */}
      <Card className="bg-blue-400/10 border-blue-400/20 max-w-4xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="text-blue-400 font-medium">Demo Mode</div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            This is a demonstration of the audio analysis interface. In the full version, you'll hear actual separated stems and download real audio files. 
            Currently, play buttons generate demo tones at different frequencies to represent each stem type, and downloads create comprehensive demo files with track information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
