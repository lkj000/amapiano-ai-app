import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Piano } from 'lucide-react';
import type { DawTrack } from '~backend/music/types';

interface PianoRollPanelProps {
  selectedTrack: DawTrack | null;
  onClose: () => void;
}

export default function PianoRollPanel({ selectedTrack, onClose }: PianoRollPanelProps) {
  const notes = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-background/80 backdrop-blur-sm border-t border-border z-40 p-4">
      <Card className="bg-muted/50 h-full text-white">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4">
          <CardTitle className="flex items-center gap-2"><Piano className="w-5 h-5" /> Piano Roll: {selectedTrack?.name || 'No Track Selected'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="h-full pb-12 overflow-auto">
          <div className="flex h-full">
            {/* Keyboard */}
            <div className="w-24 bg-background">
              {notes.map(note => (
                <div key={note} className={`h-8 border-b border-border/50 flex items-center justify-center text-xs ${note.includes('#') ? 'bg-black text-white' : 'bg-white text-black'}`}>
                  {note}5
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex-grow bg-muted/20 relative">
              {/* Grid lines */}
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-r border-border/20" style={{ left: `${(i / 16) * 100}%` }}></div>
              ))}
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-b border-border/20" style={{ top: `${(i / 12) * 100}%` }}></div>
              ))}
              {/* Notes */}
              {selectedTrack?.clips[0]?.notes?.map((note, i) => (
                <div key={i} className="absolute bg-primary/80 rounded border border-primary" style={{
                  left: `${(note.startTime / 16) * 100}%`,
                  width: `${(note.duration / 16) * 100}%`,
                  top: `${((127 - note.pitch) % 12) * (100 / 12)}%`,
                  height: `${100 / 12}%`
                }}></div>
              ))}
              <div className="absolute bg-primary/80 rounded border border-primary" style={{ left: '12.5%', width: '12.5%', top: '41.66%', height: '8.33%' }}></div>
              <div className="absolute bg-primary/80 rounded border border-primary" style={{ left: '37.5%', width: '6.25%', top: '58.33%', height: '8.33%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
