import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Search, Play, Pause } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';
import type { Sample } from '~backend/music/types';

interface SampleBrowserPanelProps {
  onClose: () => void;
}

export default function SampleBrowserPanel({ onClose }: SampleBrowserPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSampleId, setPlayingSampleId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['samples', searchQuery],
    queryFn: async () => {
      return await backend.music.listSamples({ limit: 100 });
    },
  });

  const handlePlay = (sample: Sample) => {
    if (playingSampleId === sample.id) {
      audioRef.current?.pause();
      setPlayingSampleId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(sample.fileUrl);
    audioRef.current = audio;
    audio.play();
    setPlayingSampleId(sample.id);
    audio.onended = () => setPlayingSampleId(null);
  };

  const handleDragStart = (e: React.DragEvent, sample: Sample) => {
    e.dataTransfer.setData('application/json', JSON.stringify(sample));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-gray-900 border-t-2 border-white/20 z-40 p-4 shadow-2xl">
      <Card className="bg-gray-800 h-full text-white border-white/10">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-white/20 bg-gray-900">
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            🎵 Sample Browser
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="h-full pb-12 overflow-y-auto">
          <div className="p-4 sticky top-0 bg-gray-900 z-10 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search samples..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="p-4">
            {isLoading && <LoadingSpinner />}
            {isError && <ErrorMessage error={error as Error} />}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.samples?.map((sample: any) => (
                <div
                  key={sample.id}
                  className="p-3 bg-gray-700 hover:bg-gray-600 border border-white/10 rounded-lg cursor-grab transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, sample)}
                >
                  <p className="font-medium truncate text-white">{sample.name}</p>
                  <p className="text-xs text-gray-400">{sample.category} • {sample.genre}</p>
                  <Button size="sm" variant="ghost" onClick={() => handlePlay(sample)} className="mt-2 hover:bg-white/10 text-white">
                    {playingSampleId === sample.id ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" /> Play
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
