import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Piano, Plus, Trash2 } from 'lucide-react';
import type { DawTrack, MidiNote } from '~backend/music/types';

interface PianoRollPanelProps {
  selectedTrack: DawTrack | null;
  onClose: () => void;
  onUpdateNotes: (trackId: string, clipId: string, notes: MidiNote[]) => void;
  audioContext: AudioContext | null;
}

export default function PianoRollPanel({ selectedTrack, onClose, onUpdateNotes, audioContext }: PianoRollPanelProps) {
  const notes = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];
  const clip = selectedTrack?.clips[0]; // For simplicity, we edit the first clip

  const playNotePreview = (pitch: number) => {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 440 * Math.pow(2, (pitch - 69) / 12);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
  };

  const handleGridClick = (beat: number, pitch: number) => {
    if (!selectedTrack || !clip) return;
    playNotePreview(pitch);
    const newNote: MidiNote = {
      pitch,
      velocity: 100,
      startTime: beat,
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
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-background/80 backdrop-blur-sm border-t border-border z-40 p-4">
      <Card className="bg-muted/50 h-full text-foreground">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Piano className="w-5 h-5" /> Piano Roll: {selectedTrack?.name || 'No Track Selected'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-full pb-12 overflow-auto">
          <div className="flex h-full">
            {/* Keyboard */}
            <div className="w-24 bg-background">
              {notes.map((note, i) => (
                <div key={note} className={`h-8 border-b border-border/50 flex items-center justify-center text-xs ${note.includes('#') ? 'bg-black text-white' : 'bg-white/80 text-black'}`}>
                  {note}5
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex-grow bg-muted/20 relative">
              {/* Grid cells for interaction */}
              {Array.from({ length: 16 * 12 }).map((_, i) => {
                const beat = i % 16;
                const pitchIndex = Math.floor(i / 16);
                const pitch = 71 - pitchIndex; // C5 is 72, so this maps to the visual keyboard
                return (
                  <div
                    key={i}
                    className="absolute border-r border-b border-border/20 hover:bg-primary/20 cursor-pointer"
                    style={{
                      left: `${(beat / 16) * 100}%`,
                      top: `${(pitchIndex / 12) * 100}%`,
                      width: `${100 / 16}%`,
                      height: `${100 / 12}%`,
                    }}
                    onClick={() => handleGridClick(beat, pitch)}
                  />
                );
              })}
              {/* Notes */}
              {clip?.notes?.map((note, i) => (
                <div
                  key={i}
                  className="absolute bg-primary/80 rounded border border-primary group flex items-center justify-end pr-1 cursor-pointer"
                  style={{
                    left: `${(note.startTime / 16) * 100}%`,
                    width: `${(note.duration / 16) * 100}%`,
                    top: `${((71 - note.pitch) / 12) * 100}%`,
                    height: `${100 / 12}%`
                  }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(i); }}
                >
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteNote(i); }}>
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
