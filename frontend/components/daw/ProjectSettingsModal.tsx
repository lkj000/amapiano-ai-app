import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DawProjectData } from '~backend/music/types';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: DawProjectData;
  onSave: (updatedData: Partial<DawProjectData>) => void;
}

export default function ProjectSettingsModal({ isOpen, onClose, projectData, onSave }: ProjectSettingsModalProps) {
  const [bpm, setBpm] = useState(projectData.bpm);
  const [keySignature, setKeySignature] = useState(projectData.keySignature);

  useEffect(() => {
    if (isOpen) {
      setBpm(projectData.bpm);
      setKeySignature(projectData.keySignature);
    }
  }, [projectData, isOpen]);

  const handleSave = () => {
    onSave({ bpm, keySignature });
    onClose();
  };

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>Manage your project's global settings.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bpm" className="text-right">BPM</Label>
            <Input
              id="bpm"
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="col-span-3 bg-muted border-border"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="key" className="text-right">Key</Label>
            <Select value={keySignature} onValueChange={setKeySignature}>
              <SelectTrigger className="col-span-3 bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keys.map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
