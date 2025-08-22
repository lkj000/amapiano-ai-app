import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Search, Music, Clock, Key } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import backend from '~backend/client';
import type { Genre, SampleCategory } from '~backend/music/types';

export default function SamplesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<Genre | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<SampleCategory | ''>('');
  const [selectedArtist, setSelectedArtist] = useState<'kabza_da_small' | 'kelvin_momo' | 'babalwa_m' | ''>('');

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
          Explore our curated collection of authentic amapiano samples from legendary artists like 
          Kabza De Small, Kelvin Momo, and Babalwa M.
        </p>
        {statsData && (
          <div className="flex justify-center space-x-6 text-sm text-white/60">
            <span>{statsData.totalSamples} total samples</span>
            <span>{Object.keys(statsData.samplesByCategory).length} categories</span>
            <span>{statsData.popularTags.length} unique tags</span>
          </div>
        )}
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
          
          {(searchQuery || selectedGenre || selectedCategory || selectedArtist) && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-white/70 text-sm">Active filters:</span>
                {searchQuery && <Badge variant="secondary">Search: {searchQuery}</Badge>}
                {selectedGenre && <Badge variant="secondary">Genre: {selectedGenre}</Badge>}
                {selectedCategory && <Badge variant="secondary">Category: {selectedCategory}</Badge>}
                {selectedArtist && <Badge variant="secondary">Artist: {artists.find(a => a.value === selectedArtist)?.label}</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters} className="border-white/20 text-white">
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Suggestions */}
      {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <span className="text-white/70 text-sm">Suggestions:</span>
              {searchResults.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(suggestion)}
                  className="border-white/20 text-white/70 hover:text-white"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Loading State */}
      {isLoadingAny && <LoadingSpinner />}

      {/* Samples Grid */}
      {!isLoadingAny && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySamples.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Music className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No samples found matching your criteria.</p>
              {(searchQuery || selectedGenre || selectedCategory || selectedArtist) && (
                <Button variant="outline" onClick={clearFilters} className="mt-4 border-white/20 text-white">
                  Clear Filters
                </Button>
              )}
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
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs bg-white/10 text-white/60 cursor-pointer hover:bg-white/20"
                          onClick={() => setSearchQuery(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {sample.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-white/10 text-white/60">
                          +{sample.tags.length - 3} more
                        </Badge>
                      )}
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
      )}

      {/* Load More */}
      {!isLoadingAny && displaySamples.length > 0 && displaySamples.length >= 50 && (
        <div className="text-center">
          <Button variant="outline" className="border-white/20 text-white">
            Load More Samples
          </Button>
        </div>
      )}

      {/* Popular Tags */}
      {statsData?.popularTags && statsData.popularTags.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Popular Tags</CardTitle>
            <CardDescription className="text-white/70">
              Click on a tag to search for samples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statsData.popularTags.slice(0, 20).map((tag, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(tag.tag)}
                  className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                >
                  {tag.tag} ({tag.count})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
