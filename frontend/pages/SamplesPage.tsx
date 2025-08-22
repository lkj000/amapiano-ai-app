import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Search, Filter, Music, Clock, Key } from 'lucide-react';
import backend from '~backend/client';
import type { Genre, SampleCategory } from '~backend/music/types';

export default function SamplesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<Genre | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<SampleCategory | ''>('');
  const [selectedArtist, setSelectedArtist] = useState<'kabza_da_small' | 'kelvin_momo' | 'babalwa_m' | ''>('');

  const { data: samplesData, isLoading } = useQuery({
    queryKey: ['samples', selectedGenre, selectedCategory],
    queryFn: () => backend.music.listSamples({
      genre: selectedGenre || undefined,
      category: selectedCategory || undefined,
      limit: 50
    }),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['searchSamples', searchQuery, selectedGenre, selectedCategory],
    queryFn: () => backend.music.searchSamples({
      query: searchQuery,
      genre: selectedGenre || undefined,
      category: selectedCategory || undefined
    }),
    enabled: searchQuery.length > 0,
  });

  const { data: artistSamples } = useQuery({
    queryKey: ['artistSamples', selectedArtist],
    queryFn: () => backend.music.getSamplesByArtist({ artist: selectedArtist! }),
    enabled: !!selectedArtist,
  });

  const displaySamples = searchQuery ? searchResults?.samples : artistSamples?.samples || samplesData?.samples || [];

  const categories = [
    { value: 'log_drum', label: 'Log Drum' },
    { value: 'piano', label: 'Piano' },
    { value: 'percussion', label: 'Percussion' },
    { value: 'bass', label: 'Bass' },
    { value: 'vocal', label: 'Vocal' },
    { value: 'saxophone', label: 'Saxophone' },
    { value: 'guitar', label: 'Guitar' },
    { value: 'synth', label: 'Synth' }
  ];

  const artists = [
    { value: 'kabza_da_small', label: 'Kabza De Small' },
    { value: 'kelvin_momo', label: 'Kelvin Momo' },
    { value: 'babalwa_m', label: 'Babalwa M' }
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

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Sample Library</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Explore our curated collection of authentic amapiano samples from legendary artists like 
          Kabza De Small, Kelvin Momo, and Babalwa M.
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Search samples..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10"
                />
              </div>
            </div>

            <Select value={selectedGenre} onValueChange={(value: any) => setSelectedGenre(value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genres</SelectItem>
                <SelectItem value="amapiano">Classic Amapiano</SelectItem>
                <SelectItem value="private_school_amapiano">Private School</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedArtist} onValueChange={(value: any) => setSelectedArtist(value)}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="All Artists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Artists</SelectItem>
                {artists.map((artist) => (
                  <SelectItem key={artist.value} value={artist.value}>
                    {artist.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Artist Info */}
      {artistSamples?.artistInfo && (
        <Card className="bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white">{artistSamples.artistInfo.name}</CardTitle>
            <CardDescription className="text-white/80">
              <span className="text-yellow-400 font-medium">{artistSamples.artistInfo.style}</span> - {artistSamples.artistInfo.description}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Samples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-white/10 rounded mb-4"></div>
                <div className="h-3 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))
        ) : displaySamples.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Music className="h-12 w-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No samples found matching your criteria.</p>
          </div>
        ) : (
          displaySamples.map((sample) => (
            <Card key={sample.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-white text-lg">{sample.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getCategoryColor(sample.category)}>
                        {sample.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-white/70">
                        {sample.genre === 'private_school_amapiano' ? 'Private School' : 'Classic'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                  {sample.bpm && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{sample.bpm} BPM</span>
                    </div>
                  )}
                  {sample.keySignature && (
                    <div className="flex items-center space-x-1">
                      <Key className="h-3 w-3" />
                      <span>Key {sample.keySignature}</span>
                    </div>
                  )}
                  {sample.durationSeconds && (
                    <div className="flex items-center space-x-1">
                      <Music className="h-3 w-3" />
                      <span>{sample.durationSeconds.toFixed(1)}s</span>
                    </div>
                  )}
                </div>

                {sample.tags && sample.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sample.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-white/10 text-white/60">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 flex-1">
                    <Play className="h-3 w-3 mr-1" />
                    Play
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/20 text-white">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {displaySamples.length > 0 && (
        <div className="text-center">
          <Button variant="outline" className="border-white/20 text-white">
            Load More Samples
          </Button>
        </div>
      )}
    </div>
  );
}
