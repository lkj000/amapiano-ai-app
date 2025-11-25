import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Loader2, Music, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { aiAudioService } from '@/services/aiAudioService';
import type { MidiNote } from '~backend/music/types';

interface AIAudioGeneratorProps {
  onGenerated?: (notes: MidiNote[], duration: number) => void;
  defaultGenre?: 'amapiano' | 'private_school_amapiano';
}

export const AIAudioGenerator: React.FC<AIAudioGeneratorProps> = ({ 
  onGenerated,
  defaultGenre = 'amapiano'
}) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState<'amapiano' | 'private_school_amapiano'>(defaultGenre);
  const [instrument, setInstrument] = useState('Amapiano Piano');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<MidiNote[] | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe what you want to create",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const result = await aiAudioService.generateAndPlay({
        prompt,
        genre,
        instrument,
        playImmediately: true,
      });

      setGeneratedNotes(result.notes);
      setIsPlaying(true);

      toast({
        title: "✨ AI Generation Complete!",
        description: `Generated ${result.notes.length} notes. Playing now...`,
      });

      // Auto-stop playing state after duration
      setTimeout(() => {
        setIsPlaying(false);
      }, result.duration * 1000 * 4); // Convert beats to ms

      if (onGenerated) {
        onGenerated(result.notes, result.duration);
      }

    } catch (error) {
      console.error('AI generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate audio",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = async () => {
    if (!generatedNotes) return;

    if (isPlaying) {
      setIsPlaying(false);
    } else {
      try {
        const result = await aiAudioService.generateAndPlay({
          prompt,
          genre,
          instrument,
          playImmediately: true,
        });
        setIsPlaying(true);

        setTimeout(() => {
          setIsPlaying(false);
        }, result.duration * 1000 * 4);

      } catch (error) {
        console.error('Playback failed:', error);
      }
    }
  };

  const quickPrompts = [
    { label: 'Log Drum Pattern', prompt: 'Deep log drum pattern with authentic amapiano groove and syncopation', instrument: 'Signature Log Drum' },
    { label: 'Piano Chords', prompt: 'Soulful piano chord progression with gospel influences', instrument: 'Amapiano Piano' },
    { label: 'Shaker Pattern', prompt: 'Rhythmic shaker pattern with South African feel', instrument: 'Shaker Groove Engine' },
    { label: 'Bass Line', prompt: 'Deep sub-bass line that follows the chord progression', instrument: 'Deep Bass' },
  ];

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          AI-Powered Generation
        </CardTitle>
        <CardDescription>
          Describe your musical idea in natural language - AI will generate authentic amapiano MIDI patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Prompts */}
        <div className="space-y-2">
          <Label>Quick Prompts</Label>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((qp) => (
              <Button
                key={qp.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrompt(qp.prompt);
                  setInstrument(qp.instrument);
                }}
                className="text-xs"
              >
                {qp.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Genre Selection */}
        <div className="space-y-2">
          <Label htmlFor="ai-genre">Genre Style</Label>
          <Select value={genre} onValueChange={(val) => setGenre(val as any)}>
            <SelectTrigger id="ai-genre">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amapiano">Classic Amapiano</SelectItem>
              <SelectItem value="private_school_amapiano">Private School Amapiano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Instrument Selection */}
        <div className="space-y-2">
          <Label htmlFor="ai-instrument">Instrument</Label>
          <Select value={instrument} onValueChange={setInstrument}>
            <SelectTrigger id="ai-instrument">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Signature Log Drum">Signature Log Drum</SelectItem>
              <SelectItem value="Amapiano Piano">Amapiano Piano</SelectItem>
              <SelectItem value="Shaker Groove Engine">Shaker Groove Engine</SelectItem>
              <SelectItem value="Deep Bass">Deep Bass</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="ai-prompt">Describe Your Musical Idea</Label>
          <Textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A jazzy piano progression with Cmaj9, Am7, Fmaj7 chords, slow and soulful..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            💡 Tip: Be specific about rhythm, notes, mood, or cultural elements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI Generating...
              </>
            ) : (
              <>
                <Music className="mr-2 h-4 w-4" />
                Generate & Play
              </>
            )}
          </Button>

          {generatedNotes && (
            <Button
              onClick={handlePlayPause}
              variant="outline"
              className="px-3"
              disabled={isGenerating}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Generation Status */}
        {generatedNotes && (
          <div className="rounded-lg border border-green-500/30 bg-green-950/20 p-3">
            <p className="text-sm text-green-400">
              ✓ Generated {generatedNotes.length} MIDI notes • {isPlaying ? '🎵 Playing...' : '⏸️ Ready to play'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
