import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Download, BookOpen, Music, TrendingUp, Heart, Pause, AlertCircle, Volume2 } from 'lucide-react';
import backend from '~backend/client';
import type { Genre } from '~backend/music/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '@/components/ui/use-toast';

export default function PatternsPage() {
  const { toast } = useToast();
  const [selectedGenre, setSelectedGenre] = useState<Genre>('amapiano');
  const [chordComplexity, setChordComplexity] = useState<'simple' | 'intermediate' | 'advanced' | ''>('');
  const [drumStyle, setDrumStyle] = useState<'classic' | 'modern' | 'minimal' | ''>('');
  const [playingPattern, setPlayingPattern] = useState<{ id: number; audio: HTMLAudioElement } | null>(null);

  useEffect(() => {
    return () => {
      if (playingPattern) {
        playingPattern.audio.pause();
      }
    };
  }, [playingPattern]);

  const { data: chordProgressions, isLoading: isLoadingChords, error: errorChords } = useQuery({
    queryKey: ['chordProgressions', selectedGenre, chordComplexity],
    queryFn: () => backend.music.getChordProgressions({
      genre: selectedGenre,
      complexity: chordComplexity || undefined
    }),
  });

  const { data: drumPatterns, isLoading: isLoadingDrums, error: errorDrums } = useQuery({
    queryKey: ['drumPatterns', selectedGenre, drumStyle],
    queryFn: () => backend.music.getDrumPatterns({
      genre: selectedGenre,
      style: drumStyle || undefined
    }),
  });

  const handlePlay = (patternId: number, patternName: string, type: 'chord' | 'drum') => {
    if (playingPattern && playingPattern.id === patternId) {
      playingPattern.audio.pause();
      setPlayingPattern(null);
      return;
    }

    if (playingPattern) {
      playingPattern.audio.pause();
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = {
      chord: 261.63, // C4
      drum: 130.81,  // C3
    };
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = type === 'drum' ? 'square' : 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 3);
    
    const mockAudio = {
      pause: () => {
        try { oscillator.stop(); } catch(e) {}
        setPlayingPattern(null);
      },
      play: () => Promise.resolve(),
    } as HTMLAudioElement;

    setPlayingPattern({ id: patternId, audio: mockAudio });
    
    toast({
      title: "Demo Playback",
      description: `Playing ${patternName}... (demo audio)`,
    });

    setTimeout(() => {
      setPlayingPattern(null);
    }, 3000);
  };

  const handleDownload = (patternName: string) => {
    const content = `Demo MIDI file for: ${patternName}\nThis would contain actual MIDI data in the full version.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patternName.toLowerCase().replace(/\s+/g, '-')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Downloading ${patternName}.mid... (demo file)`,
    });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case "simple": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "intermediate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "advanced": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStyleColor = (style: string) => {
    const colors = {
      classic: 'bg-blue-500/20 text-blue-400',
      modern: 'bg-purple-500/20 text-purple-400',
      minimal: 'bg-gray-500/20 text-gray-400',
      jazzy: 'bg-yellow-500/20 text-yellow-400',
      sophisticated: 'bg-indigo-500/20 text-indigo-400',
      smooth: 'bg-green-500/20 text-green-400',
      soulful: 'bg-orange-500/20 text-orange-400',
      energetic: 'bg-red-500/20 text-red-400',
      deep: 'bg-cyan-500/20 text-cyan-400'
    };
    return colors[style as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Pattern Library</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Learn from 1,000+ chord progressions and drum patterns with cultural context and complexity ratings.
        </p>
      </div>

      <Card className="bg-blue-400/10 border-blue-400/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="text-blue-400 font-medium">Demo Mode</div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            This is a demonstration of the pattern library interface. In the full version, you'll hear actual musical patterns and download real MIDI files. 
            Currently, play buttons generate demo tones and downloads create placeholder files.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <label className="text-white font-medium">Genre:</label>
            <Select value={selectedGenre} onValueChange={(value: any) => setSelectedGenre(value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amapiano">Classic Amapiano</SelectItem>
                <SelectItem value="private_school_amapiano">Private School Amapiano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chords" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger value="chords" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">Chord Progressions</TabsTrigger>
          <TabsTrigger value="drums" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">Drum Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="chords" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Music className="h-5 w-5 mr-2" />
                Chord Progressions
              </CardTitle>
              <CardDescription className="text-white/70">
                {selectedGenre === 'private_school_amapiano' 
                  ? 'Sophisticated jazz-influenced chord progressions with complex harmonies'
                  : 'Classic amapiano chord progressions with soulful and deep house influences'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Select value={chordComplexity} onValueChange={(value: any) => setChordComplexity(value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white w-64">
                    <SelectValue placeholder="All Complexities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Complexities</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingChords ? <LoadingSpinner /> : errorChords ? <ErrorMessage error={errorChords as Error} /> : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {chordProgressions?.progressions.map((progression) => (
                    <Card key={progression.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl mb-2 text-white">{progression.name}</CardTitle>
                          <Button variant="ghost" size="sm" className="text-white/60 hover:text-red-500">
                            <Heart className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-black/20 p-4 rounded-lg space-y-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400 mb-1">
                              {progression.chords.join(' - ')}
                            </div>
                            <div className="text-sm text-white/70">
                              Roman Numerals: {progression.romanNumerals.join(' - ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getComplexityColor(progression.complexity)}>
                            {progression.complexity}
                          </Badge>
                          <Badge className={getStyleColor(progression.style)}>
                            {progression.style}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 flex-1" onClick={() => handlePlay(progression.id, progression.name, 'chord')}>
                            {playingPattern?.id === progression.id ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                            {playingPattern?.id === progression.id ? 'Stop' : 'Play'}
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => handleDownload(progression.name)}>
                            <Download className="w-3 h-3 mr-1" />
                            MIDI
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drums" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Drum Patterns
              </CardTitle>
              <CardDescription className="text-white/70">
                Signature amapiano drum patterns featuring the iconic log drum and percussive elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Select value={drumStyle} onValueChange={(value: any) => setDrumStyle(value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white w-64">
                    <SelectValue placeholder="All Styles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Styles</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingDrums ? <LoadingSpinner /> : errorDrums ? <ErrorMessage error={errorDrums as Error} /> : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {drumPatterns?.patterns.map((pattern) => (
                    <Card key={pattern.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl mb-2 text-white">{pattern.name}</CardTitle>
                          <Badge className={getStyleColor(pattern.style)}>
                            {pattern.style}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-black/20 p-4 rounded-lg space-y-3 font-mono text-sm">
                          <div>
                            <div className="text-red-400 font-medium">Log Drum:</div>
                            <div className="text-red-300 tracking-wider">{pattern.logDrum}</div>
                          </div>
                          <div>
                            <div className="text-blue-400 font-medium">Kick:</div>
                            <div className="text-blue-300 tracking-wider">{pattern.kick}</div>
                          </div>
                          <div>
                            <div className="text-green-400 font-medium">Snare:</div>
                            <div className="text-green-300 tracking-wider">{pattern.snare}</div>
                          </div>
                          <div>
                            <div className="text-yellow-400 font-medium">Hi-Hat:</div>
                            <div className="text-yellow-300 tracking-wider">{pattern.hiHat}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 flex-1" onClick={() => handlePlay(pattern.id, pattern.name, 'drum')}>
                            {playingPattern?.id === pattern.id ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                            {playingPattern?.id === pattern.id ? 'Stop' : 'Play'}
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => handleDownload(pattern.name)}>
                            <Download className="w-3 h-3 mr-1" />
                            MIDI
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
