import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TemplatesSuggestionsProps {
  prompt: string;
}

export default function TemplatesSuggestions({ prompt }: TemplatesSuggestionsProps) {
  const [debouncedPrompt, setDebouncedPrompt] = useState(prompt);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPrompt(prompt);
    }, 500);

    return () => clearTimeout(timer);
  }, [prompt]);

  const { data: suggestionsData } = useQuery({
    queryKey: ['templateSuggestions', debouncedPrompt],
    queryFn: async () => {
      if (!debouncedPrompt || debouncedPrompt.length < 3) return null;
      return await backend.music.suggestTemplates({
        prompt: debouncedPrompt,
        limit: 2
      });
    },
    enabled: debouncedPrompt.length >= 3
  });

  if (!suggestionsData?.suggestions || suggestionsData.suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-3 mb-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">Suggested Templates</h4>
      </div>
      <div className="space-y-2">
        {suggestionsData.suggestions.map((match: any) => (
          <div
            key={match.template.id}
            className="bg-background/50 rounded-lg p-2 border border-border/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {match.template.name}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {Math.round(match.score * 100)}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {match.template.description}
                </p>
                <p className="text-xs text-primary/70 mt-1 italic">
                  {match.reasoning}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  const pluginsTab = document.querySelector('[value="plugins"]') as HTMLElement;
                  if (pluginsTab) pluginsTab.click();
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Switch to the Plugins tab to customize and generate these templates.
      </p>
    </Card>
  );
}
