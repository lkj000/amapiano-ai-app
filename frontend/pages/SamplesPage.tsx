import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Download, Heart, Search, Music, Star, Pause, AlertCircle } from 'lucide-react';
import backend from '~backend/client';
import type { Genre, SampleCategory, Sample } from '~backend/music/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '@/components/ui/use-toast';

export default function SamplesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SampleCategory | "">("");
  const [selectedGenre, setSelectedGenre] = useState<Genre | "">("");
  const [selectedArtist, setSelectedArtist] = useState<'kabza_da_small' | 'kelvin_momo' | 'babalwa_m' | ''>('');
  const [playingSample, setPlayingSample] = useState<{ id: number; audio: HTMLAudioElement } | null>(null);

  useEffect(() => {
    return () => {
      if (playingSample) {
        playingSample.audio.pause();
      }
    };
  }, [playingSample]);

  const { data: samplesData, isLoading, error, refetch } = useQuery({
    queryKey: ['samples', selectedGenre, selectedCategory],
    queryFn: () => backend.music.listSamples({
      genre: selectedGenre || undefined,
      category: selectedCategory || undefined,
      limit: 50
    }),
    enabled: !searchQuery && !selectedArtist,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['searchSamples', searchQuery, selectedGenre, selectedCategory],
    queryFn: () => backend.music.searchSamples({
      query: searchQuery,
      genre: selectedGenre || undefined,
      category: selectedCategory || undefined
    }),
    enabled: searchQuery.length > 0,
  });

  const { data: artistSamples, isLoading: isLoadingArtist } = useQuery({
    queryKey: ['artistSamples', selectedArtist],
    queryFn: () => backend.music.getSamplesByArtist({ artist: selectedArtist! }),
    enabled: !!selectedArtist,
  });

  const { data: statsData } = useQuery({
    queryKey: ['sampleStats'],
    queryFn: () => backend.music.getSampleStats(),
  });

  const displaySamples = searchQuery ? searchResults?.samples : artistSamples?.samples || samplesData?.samples || [];
  const isLoadingAny = isLoading || isSearching || isLoadingArtist;

  const handlePlay = (sample: Sample) => {
    if (playingSample && playingSample.id === sample.id) {
      playingSample.audio.pause();
      setPlayingSample(null);
      return;
    }
  
    if (playingSample) {
      playingSample.audio.pause();
    }
  
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();
  
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
  
    const categoryFrequencies: { [key in SampleCategory]?: number } = {
      log_drum: 80,
      bass: 60,
      piano: 440,
      vocal: 523,
      saxophone: 392,
      guitar: 330,
      synth: 660,
      percussion: 880,
    };
  
    const frequency = categoryFrequencies[sample.category] || 440;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
    if (['log_drum', 'bass', 'percussion'].includes(sample.category)) {
      oscillator.type = 'square';
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(frequency * 2, audioContext.currentTime);
    } else {
      oscillator.type = 'sine';
    }
  
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
  
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 2);
  
    const mockAudio = {
      pause: () => { try { oscillator.stop(); } catch (e) {} setPlayingSample(null); },
      play: () => Promise.resolve(),
    } as HTMLAudioElement;
  
    setPlayingSample({ id: sample.id, audio: mockAudio });
  
    toast({
      title: "Demo Playback",
      description: `Playing ${sample.name}... (demo audio)`,
    });
  
    setTimeout(() => setPlayingSample(null), 2000);
  };

  const handleDownload = (sample: Sample) => {
    const content = `Demo Audio File for: ${sample.name}\nThis would be a high-quality WAV file in the full version.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sample.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Downloading ${sample.name}... (demo file)`,
    });
  };

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'log_drum', label: 'Log Drum' },
    { value: 'piano', label: 'Piano' },
    { value: 'percussion', label: 'Percussion' },
    { value: 'bass', label: 'Bass' },
    { value: 'vocal', label: 'Vocal' },
    { value: 'saxophone', label: 'Saxophone' },
    { value: 'guitar', label: 'Guitar' },
    { value: 'synth', label: 'Synth' }
  ];

  const genres = [
    { value: '', label: 'All Genres' },
    { value: 'amapiano', label: 'Classic Amapiano' },
    { value: 'private_school_amapiano', label: 'Private School' }
  ];

  const artistStyles = [
    { value: 'kabza_da_small', label: 'Kabza De Small', description: 'Samples inspired by the legendary style of Kabza De Small' },
    { value: 'kelvin_momo', label: 'Kelvin Momo', description: 'Samples inspired by the legendary style of Kelvin Momo' },
    { value: 'babalwa_m', label: 'Babalwa M', description: 'Samples inspired by the legendary style of Babalwa M' }
  ];

  const getCategoryColor = (category: SampleCategory) => {
    const colors = {
      log_drum: 'bg-red-500/20 text-red-400',
      piano: 'bg-blue-500/20 text-blue-400',
      percussion: 'bg-green-500/20 text-green-400',
      bass: 'bg-purple-500/20 text-purple-400',
      vocal: 'bg-pink-500/20 text-pink-400',
      saxophone: 'bg-yellow-500/20 text-yellow-400',
      guitar: 'bg-orange-500/20 text-orange-400',
      synth: 'bg-cyan-500/20 text-cyan-400'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedCategory('');
    setSelectedArtist('');
  };

  if (error) {
    return <ErrorMessage error={error as Error} retry={refetch} />;
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Sample Library</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Explore 10,000+ authentic amapiano samples curated by South African artists and producers.
        </p>
      </div>

      <Card className="bg-blue-400/10 border-blue-400/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="text-blue-400 font-medium">Demo Mode</div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            This is a demonstration of the sample library interface. In the full version, you'll have access to thousands of authentic amapiano samples with high-quality audio playback and download functionality.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder="Search samples, tags, or styles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={(v: any) => setSelectedCategory(v)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedGenre} onValueChange={(v: any) => setSelectedGenre(v)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre.value} value={genre.value}>
                    {genre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="samples" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/10">
          <TabsTrigger value="samples" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">Sample Collection</TabsTrigger>
          <TabsTrigger value="artists" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">Artist Styles</TabsTrigger>
        </TabsList>

        <TabsContent value="samples">
          {isLoadingAny ? <LoadingSpinner /> : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!displaySamples || displaySamples.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Music className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No samples found</h3>
                  <p className="text-white/70">Try adjusting your search criteria</p>
                </div>
              ) : (
                displaySamples?.map((sample) => (
                  <Card key={sample.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1 text-white">{sample.name}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-red-500">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between text-white/70"><span>BPM:</span><span>{sample.bpm}</span></div>
                          <div className="flex justify-between text-white/70"><span>Key:</span><span>{sample.keySignature}</span></div>
                          <div className="flex justify-between text-white/70"><span>Length:</span><span>{sample.durationSeconds}s</span></div>
                          <div className="flex justify-between text-white/70">
                            <span>Rating:</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>4.8</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`${getCategoryColor(sample.category)} text-xs`}>{sample.category}</Badge>
                          <Badge variant="outline" className="text-xs border-white/20 text-white/70">{sample.genre}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {sample.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs opacity-60 border-white/20 text-white/60">#{tag}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 flex-1" onClick={() => handlePlay(sample)}>
                            {playingSample?.id === sample.id ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                            {playingSample?.id === sample.id ? 'Stop' : 'Play'}
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 border-white/20 text-white" onClick={() => handleDownload(sample)}>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="artists">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artistStyles.map((artist) => (
              <Card key={artist.value} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg text-white">{artist.label} Style Pack</CardTitle>
                  <CardDescription className="text-white/70">{artist.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-white/70">
                      Contains 50+ samples including piano loops, drum patterns, and signature sounds
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">Premium Pack</Badge>
                      <div className="flex items-center gap-1 text-white">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">4.9</span>
                      </div>
                    </div>
                    <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => setSelectedArtist(artist.value as any)}>
                      Explore Pack
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
