import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Search, Upload, Youtube, Music, Layers, Play, Download } from 'lucide-react';
import backend from '~backend/client';
import type { AnalyzeAudioRequest } from '~backend/music/analyze';

export default function AnalyzePage() {
  const { toast } = useToast();
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<'youtube' | 'upload' | 'url'>('youtube');

  const analyzeAudioMutation = useMutation({
    mutationFn: (data: AnalyzeAudioRequest) => backend.music.analyzeAudio(data),
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete!",
        description: "Audio has been analyzed and stems extracted successfully.",
      });
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze audio. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
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
  };

  const getSourceIcon = () => {
    switch (sourceType) {
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
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
      case 'upload':
        return 'Upload an audio file';
      default:
        return 'https://example.com/audio.mp3';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Audio Analysis</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Analyze amapiano tracks to extract stems, identify patterns, and understand the musical structure. 
          Perfect for learning from your favorite artists like Kabza De Small and Kelvin Momo.
        </p>
      </div>

      <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Analyze Audio</CardTitle>
          <CardDescription className="text-white/70">
            Extract stems and patterns from YouTube videos, uploaded files, or audio URLs
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
                  <SelectItem value="youtube">
                    <div className="flex items-center space-x-2">
                      <Youtube className="h-4 w-4" />
                      <span>YouTube Video</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="url">
                    <div className="flex items-center space-x-2">
                      <Music className="h-4 w-4" />
                      <span>Audio URL</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="upload">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Upload File</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceUrl" className="text-white">
                {sourceType === 'youtube' ? 'YouTube URL' : sourceType === 'upload' ? 'File Upload' : 'Audio URL'}
              </Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    {getSourceIcon()}
                  </div>
                  <Input
                    id="sourceUrl"
                    placeholder={getPlaceholder()}
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10"
                    disabled={sourceType === 'upload'}
                  />
                </div>
                {sourceType === 'upload' && (
                  <Button variant="outline" className="border-white/20 text-white">
                    Browse
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzeAudioMutation.isPending || (sourceType === 'upload')}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
          >
            <Search className="h-4 w-4 mr-2" />
            {analyzeAudioMutation.isPending ? 'Analyzing...' : 'Analyze Audio'}
          </Button>

          {analyzeAudioMutation.data && (
            <div className="space-y-6">
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

      {/* Popular Analysis Examples */}
      <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Popular Tracks to Analyze</CardTitle>
          <CardDescription className="text-white/70">
            Try analyzing these classic amapiano tracks
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
