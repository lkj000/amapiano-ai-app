import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Download, Music, Clock, Key, Layers, Pause, Volume2, AlertCircle } from 'lucide-react';
import backend from '~backend/client';
import type { Genre, PatternCategory } from '~backend/music/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '@/components/ui/use-toast';

export default function PatternsPage() {
  const { toast } = useToast();
  const [selectedGenre, setSelectedGenre] = useState<Genre>('amapiano');
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory | ''>('');
  const [chordComplexity, setChordComplexity] = useState<'simple' | 'intermediate' | 'advanced' | ''>('');
  const [drumStyle, setDrumStyle] = useState<'classic' | 'modern' | 'minimal' | ''>('');
  const [playingPattern, setPlayingPattern] = useState<{ id: number; type: string } | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playingPattern) {
        setPlayingPattern(null);
      }
    };
  }, [playingPattern]);

  const { data: patternsData, isLoading: isLoadingAll, error: errorAll } = useQuery({
    queryKey: ['patterns', selectedGenre, selectedCategory],
    queryFn: () => backend.music.listPatterns({
      genre: selectedGenre,
      category: selectedCategory || undefined
    }),
  });

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

  const handlePlay = (patternId: number, patternName: string, type: string = 'pattern') => {
    if (playingPattern && playingPattern.id === patternId) {
      setPlayingPattern(null);
      return;
    }

    // Create a demo audio context with different tones for different pattern types
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different pattern types
    const frequencies = {
      chord: 261.63, // C4
      drum: 130.81,  // C3
      pattern: 196.00 // G3
    };
    
    const frequency = frequencies[type as keyof typeof frequencies] || frequencies.pattern;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type === 'drum' ? 'square' : 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 3);
    
    setPlayingPattern({ id: patternId, type });
    
    toast({
      title: "Demo Playback",
      description: `Playing ${patternName}... (demo audio)`,
    });

    // Auto-stop after 3 seconds
    setTimeout(() => {
      setPlayingPattern(null);
    }, 3000);
  };

  const handleDownload = (patternName: string, type: string = 'mid') => {
    // Create a simple text file as a demo MIDI file
    const content = `Demo MIDI file for: ${patternName}\nThis would contain actual MIDI data in the full version.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patternName.toLowerCase().replace(/\s+/g, '-')}.${type}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Downloading ${patternName}.${type}... (demo file)`,
    });
  };

  const getComplexityColor = (complexity: string) => {
    const colors = {
      simple: 'bg-green-500/20 text-green-400',
      intermediate: 'bg-yellow-500/20 text-yellow-400',
      advanced: 'bg-red-500/20 text-red-400'
    };
    return colors[complexity as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
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
          Explore chord progressions, drum patterns, and musical structures that define amapiano music. 
          Learn from the masters and create your own variations.
        </p>
      </div>

      {/* Demo Notice */}
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

      {/* Genre Selection */}
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

      <Tabs defaultValue="chords" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/10">
          <TabsTrigger value="chords" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Chord Progressions
          </TabsTrigger>
          <TabsTrigger value="drums" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            Drum Patterns
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            All Patterns
          </TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {chordProgressions?.progressions.map((progression) => (
                    <Card key={progression.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-white text-lg">{progression.name}</CardTitle>
                          <div className="flex space-x-2">
                            <Badge className={getComplexityColor(progression.complexity)}>
                              {progression.complexity}
                            </Badge>
                            <Badge className={getStyleColor(progression.style)}>
                              {progression.style}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-white/70 text-sm font-medium">Chords:</div>
                          <div className="flex flex-wrap gap-2">
                            {progression.chords.map((chord, index) => (
                              <Badge key={index} variant="outline" className="border-yellow-400/30 text-yellow-400">
                                {chord}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-white/70 text-sm font-medium">Roman Numerals:</div>
                          <div className="text-white/60 text-sm font-mono bg-black/20 p-2 rounded">
                            {progression.romanNumerals.join(' - ')}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            className="bg-green-500 hover:bg-green-600 flex-1" 
                            onClick={() => handlePlay(progression.id, progression.name, 'chord')}
                          >
                            {playingPattern?.id === progression.id ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                            {playingPattern?.id === progression.id ? 'Stop' : 'Play'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-white/20 text-white" 
                            onClick={() => handleDownload(progression.name, 'mid')}
                          >
                            <Download className="h-3 w-3" />
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {drumPatterns?.patterns.map((pattern) => (
                    <Card key={pattern.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-white text-lg">{pattern.name}</CardTitle>
                          <Badge className={getStyleColor(pattern.style)}>
                            {pattern.style}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3 font-mono text-sm">
                          <div className="space-y-1">
                            <div className="text-red-400 font-medium">Log Drum:</div>
                            <div className="bg-black/30 p-2 rounded text-red-300 tracking-wider">{pattern.logDrum}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-blue-400 font-medium">Kick:</div>
                            <div className="bg-black/30 p-2 rounded text-blue-300 tracking-wider">{pattern.kick}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-green-400 font-medium">Snare:</div>
                            <div className="bg-black/30 p-2 rounded text-green-300 tracking-wider">{pattern.snare}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-yellow-400 font-medium">Hi-Hat:</div>
                            <div className="bg-black/30 p-2 rounded text-yellow-300 tracking-wider">{pattern.hiHat}</div>
                          </div>
                        </div>

                        <div className="text-xs text-white/50 bg-black/20 p-2 rounded">
                          <strong>Legend:</strong> x = hit, - = accent, . = rest
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            className="bg-green-500 hover:bg-green-600 flex-1" 
                            onClick={() => handlePlay(pattern.id, pattern.name, 'drum')}
                          >
                            {playingPattern?.id === pattern.id ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                            {playingPattern?.id === pattern.id ? 'Stop' : 'Play'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-white/20 text-white" 
                            onClick={() => handleDownload(pattern.name, 'mid')}
                          >
                            <Download className="h-3 w-3" />
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

        <TabsContent value="all" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                All Patterns
              </CardTitle>
              <CardDescription className="text-white/70">
                Complete collection of musical patterns and structures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white w-64">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="drum_pattern">Drum Patterns</SelectItem>
                    <SelectItem value="bass_pattern">Bass Patterns</SelectItem>
                    <SelectItem value="chord_progression">Chord Progressions</SelectItem>
                    <SelectItem value="melody">Melodies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingAll ? <LoadingSpinner /> : errorAll ? <ErrorMessage error={errorAll as Error} /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {patternsData?.patterns.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Layers className="h-12 w-12 text-white/30 mx-auto mb-4" />
                      <p className="text-white/60">No patterns found matching your criteria.</p>
                    </div>
                  ) : (
                    patternsData?.patterns.map((pattern) => (
                      <Card key={pattern.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-white text-lg">{pattern.name}</CardTitle>
                          <Badge variant="outline" className="border-white/20 text-white/70 w-fit">
                            {pattern.category.replace('_', ' ')}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                            {pattern.bpm && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{pattern.bpm} BPM</span>
                              </div>
                            )}
                            {pattern.keySignature && (
                              <div className="flex items-center space-x-1">
                                <Key className="h-3 w-3" />
                                <span>Key {pattern.keySignature}</span>
                              </div>
                            )}
                            {pattern.bars && (
                              <div className="flex items-center space-x-1">
                                <Music className="h-3 w-3" />
                                <span>{pattern.bars} bars</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              className="bg-green-500 hover:bg-green-600 flex-1" 
                              onClick={() => handlePlay(pattern.id, pattern.name)}
                            >
                              {playingPattern?.id === pattern.id ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                              {playingPattern?.id === pattern.id ? 'Stop' : 'Play'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-white/20 text-white" 
                              onClick={() => handleDownload(pattern.name, 'mid')}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
