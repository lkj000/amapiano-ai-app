import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, Puzzle, UploadCloud } from 'lucide-react';

export default function PluginPanel() {
  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-primary" />
          Plugin System
        </CardTitle>
        <CardDescription>
          Extend the DAW with custom instruments and effects.
        </CardDescription>
      </CardHeader>
      
      <div className="flex-grow flex flex-col items-center justify-center text-center bg-muted/20 rounded-lg p-6">
        <Puzzle className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Plugin System</h3>
        <p className="text-muted-foreground max-w-md">
          No plugins loaded. Load plugins to extend your DAW with custom instruments and effects.
        </p>
      </div>
    </div>
  );
}
