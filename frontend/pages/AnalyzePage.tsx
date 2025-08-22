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
import { Search, Upload, Youtube, Music, Layers, Play, Download, Sparkles, FileAudio, FileVideo, AlertCircle, CheckCircle, X } from 'lucide-react';
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
                      <CardTitle className="text-white text-lg">Extracted Stems</CardTitle>
                      <CardDescription className="text-white/70">
                        Individual instrument tracks separated from the original audio
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(analyzeAudioMutation.data.stems).map(([stem, url]) => (
                          <div key={stem} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Layers className="h-5 w-5 text-yellow-400" />
                              <span className="text-white capitalize">{stem}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline" className="border-white/20 text-white">
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="border-white/20 text-white">
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
                        <Button className="bg-green-500 hover:bg-green-600">
                          <Play className="h-4 w-4 mr-2" />
                          Play Amapianorized Track
                        </Button>
                        <Button variant="outline" className="border-white/20 text-white">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      {/* Amapianorized Stems */}
                      <div className="space-y-2">
                        <h4 className="text-white font-medium">Amapianorized Stems:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(amapianorizeMutation.data.stems).map(([stem, url]) => (
                            url && (
                              <div key={stem} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                <span className="text-white/70 capitalize text-sm">{stem}</span>
                                <div className="flex space-x-1">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Play className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
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
          <CardTitle className="text-white">Popular Tracks to Analyze</CardTitle>
          <CardDescription className="text-white/70">
            Try analyzing these classic amapiano tracks or upload your own files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { artist: 'Kabza De Small', track: 'Sponono', style: 'Classic Amapiano' },
              { artist: 'Kelvin Momo', track: 'Amukelani', style: 'Private School' },
              { artist: 'Babalwa M', track: 'Suka', style: 'Melodic Amapiano' },
              { artist: 'Focalistic', track: 'Ke Star', style: 'Commercial Amapiano' }
            ].map((example, index) => (
              <div key={index} className="p-3 bg-white/5 rounded-lg">
                <div className="text-white font-medium">{example.artist}</div>
                <div className="text-white/70 text-sm">{example.track}</div>
                <div className="text-yellow-400 text-xs">{example.style}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
