import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { X, Volume2 } from 'lucide-react';
import type { DawTrack } from '~backend/music/types';

interface MixerPanelProps {
  tracks: DawTrack[];
  masterVolume: number;
  onClose: () => void;
  onTrackVolumeChange: (trackId: string, volume: number) => void;
  onMasterVolumeChange: (volume: number) => void;
}

export default function MixerPanel({ tracks, masterVolume, onClose, onTrackVolumeChange, onMasterVolumeChange }: MixerPanelProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-black/50 backdrop-blur-sm border-t border-white/10 z-40 p-4">
      <Card className="bg-black/20 h-full text-white">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-white/10">
          <CardTitle className="flex items-center gap-2"><Volume2 className="w-5 h-5" /> Mixer</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="h-full pb-12">
          <div className="flex gap-8 h-full items-center justify-center">
            {/* Track Channels */}
            {tracks.map(track => (
              <div key={track.id} className="flex flex-col items-center space-y-2 h-full pt-4">
                <div className="flex-grow w-2 bg-black/30 rounded-full overflow-hidden relative">
                  <div className="absolute bottom-0 left-0 right-0 bg-green-500" style={{ height: `${track.mixer.volume * 100}%` }}></div>
                </div>
                <Slider
                  value={[track.mixer.volume * 100]}
                  onValueChange={([v]) => onTrackVolumeChange(track.id, v / 100)}
                  max={100}
                  step={1}
                  className="w-24"
                />
                <span className="text-xs truncate w-20 text-center">{track.name}</span>
              </div>
            ))}
            {/* Master Channel */}
            <div className="flex flex-col items-center space-y-2 h-full pt-4 border-l pl-8 border-white/10">
              <div className="flex-grow w-2 bg-black/30 rounded-full overflow-hidden relative">
                <div className="absolute bottom-0 left-0 right-0 bg-yellow-400" style={{ height: `${masterVolume * 100}%` }}></div>
              </div>
              <Slider
                value={[masterVolume * 100]}
                onValueChange={([v]) => onMasterVolumeChange(v / 100)}
                max={100}
                step={1}
                className="w-24"
              />
              <span className="text-xs font-bold">Master</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
