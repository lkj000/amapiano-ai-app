import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import backend from '~backend/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Zap, Settings, ChevronRight, Layers } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

interface TemplateCustomizationModalProps {
  templateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (plugin: any) => void;
}

export default function TemplateCustomizationModal({
  templateId,
  isOpen,
  onClose,
  onGenerate,
}: TemplateCustomizationModalProps) {
  const [pluginName, setPluginName] = useState('');
  const [customizations, setCustomizations] = useState<Record<string, any>>({});
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      return await backend.music.getTemplate({ templateId });
    },
    enabled: !!templateId && isOpen,
  });

  useEffect(() => {
    if (template) {
      setPluginName(template.name);
      setCustomizations(template.presetParameters || {});
      setEnabledModules(template.signalChain?.modules?.map((m: any) => m.id) || []);
    }
  }, [template]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error('No template selected');
      return await backend.music.generateFromTemplate({
        templateId,
        customizations,
        enabledModules,
        pluginName,
      });
    },
    onSuccess: (data) => {
      toast.success(`Plugin "${data.plugin.name}" generated successfully!`);
      onGenerate(data.plugin);
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to generate plugin', { description: error.message });
    },
  });

  const handleCustomizationChange = (key: string, value: any) => {
    setCustomizations((prev) => ({ ...prev, [key]: value }));
  };

  const handleModuleToggle = (moduleId: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  if (!isOpen || !templateId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Customize Template
          </DialogTitle>
          <DialogDescription>
            Customize parameters and modules before generating your plugin
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner />
          </div>
        ) : template ? (
          <div className="space-y-6">
            <div>
              <Label htmlFor="pluginName">Plugin Name</Label>
              <Input
                id="pluginName"
                value={pluginName}
                onChange={(e) => setPluginName(e.target.value)}
                placeholder="My Custom Plugin"
                className="mt-2"
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4" />
                <h3 className="font-semibold">Signal Chain Modules</h3>
                <Badge variant="secondary">{enabledModules.length} enabled</Badge>
              </div>
              <div className="space-y-2">
                {template.signalChain?.modules?.map((module: any, idx: number) => (
                  <Card key={module.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground w-6">
                          {idx + 1}
                        </div>
                        {idx > 0 && (
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{module.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {module.type} • {module.parameters?.length || 0} parameters
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={enabledModules.includes(module.id)}
                        onCheckedChange={() => handleModuleToggle(module.id)}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Preset Parameters
              </h3>
              <div className="space-y-4">
                {Object.entries(template.presetParameters || {}).map(([key, defaultValue]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {customizations[key] ?? defaultValue}
                      </span>
                    </div>
                    {typeof defaultValue === 'number' ? (
                      <Slider
                        id={key}
                        min={0}
                        max={100}
                        step={1}
                        value={[customizations[key] ?? defaultValue]}
                        onValueChange={(values) =>
                          handleCustomizationChange(key, values[0])
                        }
                        className="w-full"
                      />
                    ) : typeof defaultValue === 'boolean' ? (
                      <Switch
                        id={key}
                        checked={customizations[key] ?? defaultValue}
                        onCheckedChange={(checked) =>
                          handleCustomizationChange(key, checked)
                        }
                      />
                    ) : (
                      <Input
                        id={key}
                        value={customizations[key] ?? defaultValue}
                        onChange={(e) =>
                          handleCustomizationChange(key, e.target.value)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {template.culturalContext && (
              <>
                <Separator />
                <Card className="p-4 bg-muted/30">
                  <h4 className="font-medium text-sm mb-2">Cultural Context</h4>
                  <p className="text-xs text-muted-foreground">
                    {template.culturalContext}
                  </p>
                </Card>
              </>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || enabledModules.length === 0}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <LoadingSpinner />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Plugin
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
