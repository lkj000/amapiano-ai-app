import React, { useState } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Puzzle, Sparkles, Code } from 'lucide-react';
import TemplateBrowser from '../plugin/TemplateBrowser';
import TemplateCustomizationModal from '../plugin/TemplateCustomizationModal';
import { toast } from 'sonner';

export default function PluginPanel() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [generatedPlugins, setGeneratedPlugins] = useState<any[]>([]);

  const handleQuickGenerate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsCustomizing(false);
    generatePlugin(templateId, {}, []);
  };

  const handleCustomize = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsCustomizing(true);
  };

  const generatePlugin = async (
    templateId: string,
    customizations: Record<string, any>,
    enabledModules: string[]
  ) => {
    toast.info('Generating plugin...');
  };

  const handlePluginGenerated = (plugin: any) => {
    setGeneratedPlugins((prev) => [...prev, plugin]);
    toast.success('Plugin added to your library!');
  };

  return (
    <div className="p-4 space-y-4 h-full flex flex-col overflow-hidden">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-primary" />
          Smart Templates
        </CardTitle>
        <CardDescription>
          One-click generators for proven audio processing tools
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="my-plugins">
            <Code className="w-4 h-4 mr-2" />
            My Plugins ({generatedPlugins.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="flex-1 overflow-y-auto mt-4">
          <TemplateBrowser
            onSelectTemplate={handleQuickGenerate}
            onCustomizeTemplate={handleCustomize}
          />
        </TabsContent>

        <TabsContent value="my-plugins" className="flex-1 overflow-y-auto mt-4">
          {generatedPlugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Code className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Plugins Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Generate plugins from templates to see them here. Each plugin includes
                complete source code and can be customized further.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {generatedPlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/20 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{plugin.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {plugin.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {plugin.signalChain?.modules?.length || 0} modules
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {plugin.format}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TemplateCustomizationModal
        templateId={selectedTemplateId}
        isOpen={isCustomizing}
        onClose={() => setIsCustomizing(false)}
        onGenerate={handlePluginGenerated}
      />
    </div>
  );
}
