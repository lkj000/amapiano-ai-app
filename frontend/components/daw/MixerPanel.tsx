import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { X, Volume2 } from 'lucide-react';
import type { DawTrack } from '~backend/music/types';

interface MixerPanelProps {
  tracks: DawTrack[];
  masterVolume: number;
  volumeLevels: Map<string, number>;
  masterVolumeLevel: number;
  onClose: () => void;
  onTrackVolumeChange: (trackId: string, volume: number) => void;
  onMasterVolumeChange: (volume: number) => void;
}

const VolumeMeter = React.memo(({ level }: { level: number }) => {
  const height = Math.min(100, Math.max(0, level * 200)); // Amplify for better visibility
  const color = height > 95 ? 'bg-red-500' : height > 80 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-full h-full bg-muted rounded-full overflow-hidden relative">
      <div 
        className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-75`} 
        style={{ height: `${height}%` }}
      ></div>
    </div>
  );
});

export default function MixerPanel({ 
  tracks, 
  masterVolume, 
  volumeLevels,
  masterVolumeLevel,
  onClose, 
  onTrackVolumeChange, 
  onMasterVolumeChange 
}: MixerPanelProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-background/80 backdrop-blur-sm border-t border-border z-40 p-4">
      <Card className="bg-muted/50 h-full text-foreground">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-border">
          <CardTitle className="flex items-center gap-2"><Volume2 className="w-5 h-5" /> Mixer</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="h-full pb-12">
          <div className="flex gap-8 h-full items-center justify-center">
            {/* Track Channels */}
            {tracks.map(track => (
              <div key={track.id} className="flex items-center space-x-2 h-full pt-4">
                <div className="h-full w-2">
                  <VolumeMeter level={volumeLevels.get(track.id) || 0} />
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Slider
                    orientation="vertical"
                    value={[track.mixer.volume * 100]}
                    onValueChange={([v]) => onTrackVolumeChange(track.id, v / 100)}
                    max={100}
                    step={1}
                    className="h-32"
                  />
                  <span className="text-xs truncate w-20 text-center">{track.name}</span>
                </div>
              </div>
            ))}
            {/* Master Channel */}
            <div className="flex items-center space-x-2 h-full pt-4 border-l pl-8 border-border">
              <div className="h-full w-2">
                <VolumeMeter level={masterVolumeLevel} />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Slider
                  orientation="vertical"
                  value={[masterVolume * 100]}
                  onValueChange={([v]) => onMasterVolumeChange(v / 100)}
                  max={100}
                  step={1}
                  className="h-32"
                />
                <span className="text-xs font-bold">Master</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
