import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Piano, Plus, Trash2 } from 'lucide-react';
import type { DawTrack, MidiNote } from '~backend/music/types';

interface PianoRollPanelProps {
  selectedTrack: DawTrack | null;
  onClose: () => void;
  onUpdateNotes: (trackId: string, clipId: string, notes: MidiNote[]) => void;
}

export default function PianoRollPanel({ selectedTrack, onClose, onUpdateNotes }: PianoRollPanelProps) {
  const notes = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];
  const clip = selectedTrack?.clips[0]; // For simplicity, we edit the first clip

  const handleAddNote = () => {
    if (!selectedTrack || !clip) return;
    const newNote: MidiNote = {
      pitch: 60, // C4
      velocity: 100,
      startTime: 0,
      duration: 1,
    };
    const newNotes = [...(clip.notes || []), newNote];
    onUpdateNotes(selectedTrack.id, clip.id, newNotes);
  };

  const handleDeleteNote = (noteIndex: number) => {
    if (!selectedTrack || !clip) return;
    const newNotes = clip.notes?.filter((_, index) => index !== noteIndex) || [];
    onUpdateNotes(selectedTrack.id, clip.id, newNotes);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-black/50 backdrop-blur-sm border-t border-white/10 z-40 p-4">
      <Card className="bg-black/20 h-full text-white">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Piano className="w-5 h-5" /> Piano Roll: {selectedTrack?.name || 'No Track Selected'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAddNote} disabled={!clip}>
              <Plus className="w-4 h-4 mr-2" /> Add Note
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-full pb-12 overflow-auto">
          <div className="flex h-full">
            {/* Keyboard */}
            <div className="w-24 bg-black/30">
              {notes.map(note => (
                <div key={note} className={`h-8 border-b border-white/10 flex items-center justify-center text-xs ${note.includes('#') ? 'bg-black text-white' : 'bg-white/80 text-black'}`}>
                  {note}5
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex-grow bg-black/10 relative">
              {/* Grid lines */}
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-r border-white/10" style={{ left: `${(i / 16) * 100}%` }}></div>
              ))}
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-b border-white/10" style={{ top: `${(i / 12) * 100}%` }}></div>
              ))}
              {/* Notes */}
              {clip?.notes?.map((note, i) => (
                <div
                  key={i}
                  className="absolute bg-yellow-400/80 rounded border border-yellow-500 group flex items-center justify-end pr-1"
                  style={{
                    left: `${(note.startTime / 16) * 100}%`,
                    width: `${(note.duration / 16) * 100}%`,
                    top: `${((127 - note.pitch) % 12) * (100 / 12)}%`,
                    height: `${100 / 12}%`
                  }}
                >
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteNote(i)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
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
