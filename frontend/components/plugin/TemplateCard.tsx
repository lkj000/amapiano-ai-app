import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Zap, Settings } from 'lucide-react';

export interface SmartTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  genre?: string;
  category: 'genre_specific' | 'functional' | 'experimental';
  signalChain: any;
  presetParameters: Record<string, number | boolean | string>;
  tags: string[];
  targetFramework: string;
  verified: boolean;
  downloads: number;
  rating: number;
  culturalContext?: string;
  useCase?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateCardProps {
  template: SmartTemplate;
  onGenerate: (templateId: string) => void;
  onCustomize: (templateId: string) => void;
}

export default function TemplateCard({ template, onGenerate, onCustomize }: TemplateCardProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      genre_specific: 'bg-purple-500/20 text-purple-400',
      functional: 'bg-blue-500/20 text-blue-400',
      experimental: 'bg-orange-500/20 text-orange-400'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  const moduleCount = template.signalChain?.modules?.length || 0;
  const signalChainPreview = template.signalChain?.modules
    ?.slice(0, 3)
    .map((m: any) => m.name)
    .join(' → ') || '';

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.verified && (
                <Badge variant="secondary" className="text-xs">
                  ✓ Verified
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge className={getCategoryColor(template.category)}>
            {template.category.replace('_', ' ')}
          </Badge>
          {template.genre && (
            <Badge variant="outline" className="text-xs">
              {template.genre}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-1">Signal Chain ({moduleCount} modules):</div>
          <div className="bg-muted/30 rounded px-2 py-1 truncate">
            {signalChainPreview}
            {moduleCount > 3 && ' ...'}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 4).map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{template.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{template.downloads}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCustomize(template.id)}
            className="gap-2"
          >
            <Settings className="w-3 h-3" />
            Customize
          </Button>
          <Button
            size="sm"
            onClick={() => onGenerate(template.id)}
            className="gap-2"
          >
            <Zap className="w-3 h-3" />
            Generate
          </Button>
        </div>

        {template.useCase && (
          <div className="text-xs text-muted-foreground italic pt-2 border-t">
            "{template.useCase}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
