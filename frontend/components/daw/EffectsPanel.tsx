import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sliders } from 'lucide-react';
import type { DawTrack, Effect } from '~backend/music/types';

interface EffectsPanelProps {
  selectedTrack: DawTrack | null;
  onClose: () => void;
  onUpdateEffectParam: (trackId: string, effectId: string, param: string, value: any) => void;
}

const EQControls = ({ effect, onUpdate }: { effect: Effect, onUpdate: (param: string, value: any) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Type</Label>
        <Select value={effect.params.type || 'peaking'} onValueChange={(v) => onUpdate('type', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Frequency: {effect.params.frequency || 800} Hz</Label>
        <Slider value={[effect.params.frequency || 800]} onValueChange={([v]) => onUpdate('frequency', v)} min={20} max={20000} step={1} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Gain: {effect.params.gain || 0} dB</Label>
        <Slider value={[effect.params.gain || 0]} onValueChange={([v]) => onUpdate('gain', v)} min={-40} max={40} step={0.1} />
      </div>
      <div>
        <Label>Q: {effect.params.q || 1}</Label>
        <Slider value={[effect.params.q || 1]} onValueChange={([v]) => onUpdate('q', v)} min={0.0001} max={1000} step={0.1} />
      </div>
    </div>
  </div>
);

const CompressorControls = ({ effect, onUpdate }: { effect: Effect, onUpdate: (param: string, value: any) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Threshold: {effect.params.threshold || -24} dB</Label>
        <Slider value={[effect.params.threshold || -24]} onValueChange={([v]) => onUpdate('threshold', v)} min={-100} max={0} step={1} />
      </div>
      <div>
        <Label>Ratio: {effect.params.ratio || 12}:1</Label>
        <Slider value={[effect.params.ratio || 12]} onValueChange={([v]) => onUpdate('ratio', v)} min={1} max={20} step={1} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Attack: {Math.round((effect.params.attack || 0.003) * 1000)} ms</Label>
        <Slider value={[(effect.params.attack || 0.003) * 1000]} onValueChange={([v]) => onUpdate('attack', v / 1000)} min={0} max={1000} step={1} />
      </div>
      <div>
        <Label>Release: {Math.round((effect.params.release || 0.25) * 1000)} ms</Label>
        <Slider value={[(effect.params.release || 0.25) * 1000]} onValueChange={([v]) => onUpdate('release', v / 1000)} min={10} max={1000} step={10} />
      </div>
    </div>
  </div>
);

export default function EffectsPanel({ selectedTrack, onClose, onUpdateEffectParam }: EffectsPanelProps) {
  if (!selectedTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-background/80 backdrop-blur-sm border-t border-border z-40 p-4">
      <Card className="bg-muted/50 h-full text-foreground overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-border sticky top-0 bg-muted/80 z-10">
          <CardTitle className="flex items-center gap-2"><Sliders className="w-5 h-5" /> Effects: {selectedTrack.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {selectedTrack.mixer.effects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No effects on this track. Add one from the sidebar.</p>
          ) : (
            selectedTrack.mixer.effects.map(effect => (
              <Card key={effect.id} className="bg-background/50">
                <CardHeader>
                  <CardTitle className="text-base">{effect.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {effect.name === 'EQ' && <EQControls effect={effect} onUpdate={(p, v) => onUpdateEffectParam(selectedTrack!.id, effect.id, p, v)} />}
                  {effect.name === 'Compressor' && <CompressorControls effect={effect} onUpdate={(p, v) => onUpdateEffectParam(selectedTrack!.id, effect.id, p, v)} />}
                  {/* Add other effect controls here */}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
