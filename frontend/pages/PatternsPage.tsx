import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Download, BookOpen, Music, TrendingUp, Heart, Pause, AlertCircle, Volume2, Sparkles, Info, Lightbulb, Target, Award } from 'lucide-react';
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
  
  // Recommendation state
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [projectBpm, setProjectBpm] = useState('118');
  const [projectKey, setProjectKey] = useState('C');
  const [userSkillLevel, setUserSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [culturalPreference, setCulturalPreference] = useState<'traditional' | 'modern' | 'fusion'>('traditional');
  const [creativeGoal, setCreativeGoal] = useState<'learning' | 'production' | 'experimentation'>('production');

  useEffect(() => {
    return () => {
      if (playingPattern) {
        playingPattern.audio.pause();
      }
    };
  }, [playingPattern]);

  const { data: chordProgressions, isLoading: isLoadingChords, error: errorChords } = useQuery({
    queryKey: ['chordProgressions', selectedGenre, chordComplexity],
    queryFn: () => backend.music.listPatterns({
      genre: selectedGenre,
      category: 'chord_progression',
      complexity: chordComplexity || undefined
    }),
  });

  const { data: drumPatterns, isLoading: isLoadingDrums, error: errorDrums } = useQuery({
    queryKey: ['drumPatterns', selectedGenre, drumStyle],
    queryFn: () => backend.music.listPatterns({
      genre: selectedGenre,
      category: 'drum_pattern'
    }),
  });

  // Pattern Recommendations
  const { data: recommendations, isLoading: isLoadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['patternRecommendations', selectedGenre, projectBpm, projectKey, userSkillLevel],
    queryFn: () => backend.music.getPatternRecommendations({
      context: {
        currentProject: {
          genre: selectedGenre,
          bpm: parseInt(projectBpm) || undefined,
          keySignature: projectKey,
          existingPatterns: [],
          complexity: userSkillLevel
        },
        userPreferences: {
          favoritePatterns: [],
          culturalAuthenticity: culturalPreference,
          skillLevel: userSkillLevel
        },
        creativeGoal: creativeGoal
      },
      limit: 10
    }),
    enabled: showRecommendations
  });

  const trackUsageMutation = useMutation({
    mutationFn: (data: { patternId: string; success: boolean }) => 
      backend.music.trackPatternUsage(data),
    onSuccess: () => {
      toast({
        title: "Usage Tracked",
        description: "Pattern usage recorded for improving recommendations",
      });
    }
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
      chord: 261.63,
      drum: 130.81,
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

  const handleUsePattern = (patternId: number, patternName: string) => {
    trackUsageMutation.mutate({ patternId: patternId.toString(), success: true });
    
    toast({
      title: "Pattern Applied",
      description: `${patternName} added to your project`,
    });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case "simple": 
      case "beginner": 
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "intermediate": 
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "advanced": 
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "expert":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default: 
        return "bg-gray-500/20 text-gray-400";
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

  const RecommendationCard = ({ rec, category }: { rec: any; category: string }) => (
    <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50 transition-all">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <CardTitle className="text-white flex items-center gap-2">
              {rec.pattern.name}
              <Badge className="bg-purple-600">
                {(rec.relevanceScore * 100).toFixed(0)}% Match
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              {category === 'culturally' && <Award className="inline h-4 w-4 mr-1 text-yellow-400" />}
              {category === 'progressive' && <Target className="inline h-4 w-4 mr-1 text-green-400" />}
              {rec.pattern.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reasoning */}
        {rec.reasoning && rec.reasoning.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Why This Pattern?</span>
            </div>
            <ul className="space-y-1">
              {rec.reasoning.slice(0, 3).map((reason: string, idx: number) => (
                <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Music Theory */}
        {rec.musicTheory && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">Music Theory</span>
            </div>
            <p className="text-sm text-white/80">{rec.musicTheory}</p>
          </div>
        )}

        {/* Cultural Context */}
        {rec.culturalContext && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">Cultural Context</span>
            </div>
            <p className="text-sm text-white/80">{rec.culturalContext}</p>
          </div>
        )}

        {/* Usage Example */}
        {rec.usageExample && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">How to Use</span>
            </div>
            <p className="text-sm text-white/80">{rec.usageExample}</p>
          </div>
        )}

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge className={getComplexityColor(rec.difficulty)}>
            {rec.difficulty}
          </Badge>
          {rec.pattern.culturalSignificance && rec.pattern.culturalSignificance >= 0.8 && (
            <Badge className="bg-yellow-600">
              Culturally Significant
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700 flex-1"
            onClick={() => handleUsePattern(rec.pattern.id, rec.pattern.name)}
          >
            <Music className="h-3 w-3 mr-1" />
            Use This Pattern
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-white/20 text-white"
            onClick={() => handleDownload(rec.pattern.name)}
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Pattern Library</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Learn from 1,000+ chord progressions and drum patterns with AI-powered recommendations and cultural context.
        </p>
      </div>

      {/* AI Recommendations Section */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            AI-Powered Pattern Recommendations
          </CardTitle>
          <CardDescription>
            Get personalized pattern suggestions based on your project context and skill level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Sparkles className="h-4 w-4 mr-2" />
                Get Personalized Recommendations
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Configure Your Recommendations
                </DialogTitle>
                <DialogDescription>
                  Tell us about your project to get the most relevant pattern suggestions
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Project Context */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Project BPM</Label>
                    <Input 
                      type="number" 
                      value={projectBpm}
                      onChange={(e) => setProjectBpm(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="118"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Key Signature</Label>
                    <Select value={projectKey} onValueChange={setProjectKey}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(key => (
                          <SelectItem key={key} value={key}>{key}</SelectItem>
                        ))}
                        {['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'].map(key => (
                          <SelectItem key={key} value={key}>{key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* User Preferences */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Your Skill Level</Label>
                    <Select value={userSkillLevel} onValueChange={(value: any) => setUserSkillLevel(value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white">Cultural Preference</Label>
                    <Select value={culturalPreference} onValueChange={(value: any) => setCulturalPreference(value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="traditional">Traditional/Authentic</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="fusion">Fusion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="text-white text-sm font-medium mb-2">Creative Goal</div>
                  <Select value={creativeGoal} onValueChange={(value: any) => { setCreativeGoal(value); }}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="learning">Learning & Education</SelectItem>
                      <SelectItem value="production">Music Production</SelectItem>
                      <SelectItem value="experimentation">Experimentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => refetchRecommendations()}
                  disabled={isLoadingRecommendations}
                >
                  {isLoadingRecommendations ? (
                    <>
                      <LoadingSpinner />
                      Generating Recommendations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Recommendations
                    </>
                  )}
                </Button>

                {/* Recommendations Display */}
                {recommendations && (
                  <div className="space-y-6 mt-6">
                    {/* Primary Recommendations */}
                    {(recommendations as any).primary && (recommendations as any).primary.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-purple-400" />
                          Top Recommendations for You
                        </h3>
                        <div className="grid gap-4">
                          {(recommendations as any).primary.slice(0, 3).map((rec: any, idx: number) => (
                            <RecommendationCard key={idx} rec={rec} category="primary" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progressive Learning */}
                    {(recommendations as any).progressive && (recommendations as any).progressive.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Target className="h-5 w-5 text-green-400" />
                          Challenge Yourself (Next Level)
                        </h3>
                        <div className="grid gap-4">
                          {(recommendations as any).progressive.map((rec: any, idx: number) => (
                            <RecommendationCard key={idx} rec={rec} category="progressive" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Culturally Significant */}
                    {(recommendations as any).culturallySignificant && (recommendations as any).culturallySignificant.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Award className="h-5 w-5 text-yellow-400" />
                          Culturally Significant Patterns
                        </h3>
                        <div className="grid gap-4">
                          {(recommendations as any).culturallySignificant.slice(0, 2).map((rec: any, idx: number) => (
                            <RecommendationCard key={idx} rec={rec} category="culturally" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="bg-blue-400/10 border-blue-400/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="text-blue-400 font-medium">Demo Mode</div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            Pattern recommendations are powered by AI and provide personalized suggestions based on your context.
            In demo mode, play buttons generate tones and downloads create placeholder files.
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
                  {chordProgressions?.patterns.map((progression: any) => (
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
                              {progression.name}
                            </div>
                            <div className="text-sm text-white/70">
                              {progression.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getComplexityColor(progression.complexity)}>
                            {progression.complexity || 'intermediate'}
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
                  {drumPatterns?.patterns.map((pattern: any) => (
                    <Card key={pattern.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl mb-2 text-white">{pattern.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-black/20 p-4 rounded-lg space-y-3 font-mono text-sm">
                          <div>
                            <div className="text-red-400 font-medium">Pattern Description:</div>
                            <div className="text-red-300 tracking-wider">{pattern.description || 'Drum pattern'}</div>
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
