import React, { useState, useEffect } from 'react';
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
import { Radio, Play, Download, Layers, Sparkles } from 'lucide-react';
import backend from '~backend/client';
import type { GenerateTrackRequest, GenerateLoopRequest } from '~backend/music/generate';

export default function GeneratePage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'track' | 'loop'>('track');
  
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

  // Loop generation state
  const [loopForm, setLoopForm] = useState<GenerateLoopRequest>({
    category: 'log_drum',
    genre: 'amapiano',
    bpm: 120,
    bars: 4,
    keySignature: 'C'
  });

  useEffect(() => {
    const sourceId = searchParams.get('sourceId');
    const bpm = searchParams.get('bpm');
    const key = searchParams.get('key');
    const prompt = searchParams.get('prompt');

    if (sourceId) {
      setTrackForm(prev => ({
        ...prev,
        sourceAnalysisId: parseInt(sourceId, 10),
        bpm: bpm ? parseInt(bpm, 10) : prev.bpm,
        keySignature: key || prev.keySignature,
        prompt: `A Private School Amapiano track (114-120 bpm) inspired by the TikTok video: ${prompt || ''}`
      }));
      toast({
        title: "Remix Mode Activated!",
        description: "Generating a new track based on the analyzed audio.",
      });
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
        description: "Failed to generate track. Please try again.",
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
        description: "Failed to generate loop. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateTrack = () => {
    if (!trackForm.prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your track.",
        variant: "destructive",
      });
      return;
    }
    generateTrackMutation.mutate(trackForm);
  };

  const handleGenerateLoop = () => {
    generateLoopMutation.mutate(loopForm);
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
          Create authentic amapiano tracks and loops using advanced AI. Describe your vision and let our AI bring it to life.
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
              Create a complete amapiano track from your description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {trackForm.sourceAnalysisId && (
              <Card className="bg-green-400/10 border-green-400/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-green-400" />
                    <div className="text-green-400 font-medium">Remix Mode</div>
                  </div>
                  <p className="text-white/80 text-sm mt-2">
                    Generating a new track inspired by the analyzed audio. Parameters have been pre-filled.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-white">Track Description</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your track... e.g., 'A soulful amapiano track with jazzy piano chords, deep log drums, and a groovy bassline perfect for late night vibes'"
                value={trackForm.prompt}
                onChange={(e) => setTrackForm({ ...trackForm, prompt: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                rows={4}
              />
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
                <Select value={trackForm.mood} onValueChange={(value) => setTrackForm({ ...trackForm, mood: value })}>
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
                  value={[trackForm.bpm || 120]}
                  onValueChange={([value]) => setTrackForm({ ...trackForm, bpm: value })}
                  min={100}
                  max={140}
                  step={1}
                  className="w-full"
                />
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
                  min={60}
                  max={300}
                  step={15}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerateTrack}
              disabled={generateTrackMutation.isPending}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
            >
              {generateTrackMutation.isPending ? 'Generating...' : 'Generate Track'}
            </Button>

            {generateTrackMutation.data && (
              <div className="space-y-4 p-4 bg-white/10 rounded-lg">
                <h3 className="text-white font-semibold">Generated Track</h3>
                <div className="flex items-center space-x-4">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600">
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/20 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
              </div>
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
                  value={[loopForm.bpm]}
                  onValueChange={([value]) => setLoopForm({ ...loopForm, bpm: value })}
                  min={100}
                  max={140}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Bars: {loopForm.bars}</Label>
                <Slider
                  value={[loopForm.bars]}
                  onValueChange={([value]) => setLoopForm({ ...loopForm, bars: value })}
                  min={1}
                  max={8}
                  step={1}
                  className="w-full"
                />
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
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
            >
              {generateLoopMutation.isPending ? 'Generating...' : 'Generate Loop'}
            </Button>

            {generateLoopMutation.data && (
              <div className="space-y-4 p-4 bg-white/10 rounded-lg">
                <h3 className="text-white font-semibold">Generated Loop</h3>
                <div className="flex items-center space-x-4">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600">
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/20 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
