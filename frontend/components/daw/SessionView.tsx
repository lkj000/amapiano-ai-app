import React from 'react';
import { Button } from '@/components/ui/button';
import type { DawTrack } from '~backend/music/types';

interface SessionViewProps {
  tracks: DawTrack[];
  onPlayClip: (trackId: string, clipId: string) => void;
}

export default function SessionView({ tracks, onPlayClip }: SessionViewProps) {
  const numScenes = 8; // For demonstration purposes

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="grid gap-2" style={{ gridTemplateColumns: `150px repeat(${numScenes}, 1fr)` }}>
        {/* Headers */}
        <div className="font-bold text-muted-foreground">Track</div>
        {Array.from({ length: numScenes }).map((_, i) => (
          <div key={i} className="font-bold text-muted-foreground text-center">Scene {i + 1}</div>
        ))}

        {/* Tracks */}
        {tracks.map(track => (
          <React.Fragment key={track.id}>
            <div className={`p-2 rounded-lg flex items-center ${track.color} text-primary-foreground`}>
              {track.name}
            </div>
            {Array.from({ length: numScenes }).map((_, sceneIndex) => {
              const clip = track.clips.find(c => Math.floor(c.startTime / 4) === sceneIndex); // Simple scene mapping
              return (
                <div key={sceneIndex} className="p-1">
                  {clip ? (
                    <Button
                      className={`w-full h-16 ${track.color}/80`}
                      onClick={() => onPlayClip(track.id, clip.id)}
                    >
                      {clip.name}
                    </Button>
                  ) : (
                    <div className="w-full h-16 bg-muted/20 rounded-lg" />
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
