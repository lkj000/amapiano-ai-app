import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Layers, Beaker } from 'lucide-react';
import TemplateCard from './TemplateCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';

interface TemplateBrowserProps {
  onSelectTemplate: (templateId: string) => void;
  onCustomizeTemplate: (templateId: string) => void;
}

export default function TemplateBrowser({ onSelectTemplate, onCustomizeTemplate }: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['templates', selectedCategory, selectedGenre],
    queryFn: async () => {
      return await backend.music.listTemplates({
        category: selectedCategory !== 'all' ? selectedCategory as any : undefined,
        genre: selectedGenre !== 'all' ? selectedGenre : undefined,
        verified: true,
        limit: 50
      });
    }
  });

  const templates = templatesData?.templates || [];

  const filteredTemplates = templates.filter((template: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.tags.some((tag: string) => tag.toLowerCase().includes(query))
    );
  });

  const genreTemplates = filteredTemplates.filter((t: any) => t.category === 'genre_specific');
  const functionalTemplates = filteredTemplates.filter((t: any) => t.category === 'functional');
  const experimentalTemplates = filteredTemplates.filter((t: any) => t.category === 'experimental');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error as Error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            <SelectItem value="amapiano">Amapiano</SelectItem>
            <SelectItem value="private_school_amapiano">Private School</SelectItem>
            <SelectItem value="bacardi">Bacardi</SelectItem>
            <SelectItem value="sgija">Sgija</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({filteredTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="genre_specific">
            <Sparkles className="w-3 h-3 mr-1" />
            Genre ({genreTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="functional">
            <Layers className="w-3 h-3 mr-1" />
            Functional ({functionalTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="experimental">
            <Beaker className="w-3 h-3 mr-1" />
            Experimental ({experimentalTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {filteredTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No templates found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template: any) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onGenerate={onSelectTemplate}
                  onCustomize={onCustomizeTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="genre_specific" className="mt-4">
          {genreTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No genre-specific templates found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {genreTemplates.map((template: any) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onGenerate={onSelectTemplate}
                  onCustomize={onCustomizeTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="functional" className="mt-4">
          {functionalTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No functional templates found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {functionalTemplates.map((template: any) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onGenerate={onSelectTemplate}
                  onCustomize={onCustomizeTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experimental" className="mt-4">
          {experimentalTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No experimental templates found</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experimentalTemplates.map((template: any) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onGenerate={onSelectTemplate}
                  onCustomize={onCustomizeTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
