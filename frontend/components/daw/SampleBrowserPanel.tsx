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
    <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-white border-t-4 border-yellow-400 z-50 shadow-2xl">
      <Card className="bg-white h-full border-none">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b-2 border-gray-200 bg-yellow-400">
          <CardTitle className="flex items-center gap-2 text-black text-lg font-bold">
            🎵 Sample Browser
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-black/10 text-black">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="h-full pb-12 overflow-y-auto bg-gray-50">
          <div className="p-4 sticky top-0 bg-white z-10 border-b border-gray-200 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search samples..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-2 border-gray-300 text-black placeholder:text-gray-500 focus:border-yellow-400"
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
                  className="p-4 bg-white hover:bg-yellow-50 border-2 border-gray-300 hover:border-yellow-400 rounded-lg cursor-grab transition-all shadow-sm hover:shadow-md"
                  draggable
                  onDragStart={(e) => handleDragStart(e, sample)}
                >
                  <p className="font-bold truncate text-black text-sm">{sample.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{sample.category} • {sample.genre}</p>
                  <Button 
                    size="sm" 
                    onClick={() => handlePlay(sample)} 
                    className="mt-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold w-full"
                  >
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
