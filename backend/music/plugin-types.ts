export type PluginType = 'effect' | 'instrument' | 'utility';
export type PluginFormat = 'JUCE' | 'WebAudio' | 'Native';

export interface DspModule {
  id: string;
  name: string;
  type: 'filter' | 'dynamics' | 'modulation' | 'spatial' | 'distortion' | 'utility';
  parameters: DspParameter[];
  order: number;
}

export interface DspParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'enum';
  defaultValue: number | boolean | string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  enumValues?: string[];
  description?: string;
}

export interface SignalChain {
  modules: DspModule[];
  routing: 'serial' | 'parallel' | 'mixed';
}

export interface SmartTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  genre?: string;
  category: 'genre_specific' | 'functional' | 'experimental';
  signalChain: SignalChain;
  presetParameters: Record<string, number | boolean | string>;
  tags: string[];
  targetFramework: PluginFormat;
  verified: boolean;
  downloads: number;
  rating: number;
  culturalContext?: string;
  useCase?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCustomization {
  templateId: string;
  overrides: Record<string, number | boolean | string>;
  enabledModules: string[];
  disabledModules: string[];
}

export interface GeneratedPlugin {
  id: string;
  name: string;
  description: string;
  type: PluginType;
  format: PluginFormat;
  sourceCode: string;
  sourceTemplateId?: string;
  customizations?: TemplateCustomization;
  version: string;
  parameters: DspParameter[];
  signalChain: SignalChain;
  metadata: {
    author: string;
    createdAt: Date;
    lineage?: string[];
    tags: string[];
  };
}

export interface PluginGenealogy {
  pluginId: string;
  baseTemplate?: string;
  customizations?: Record<string, any>;
  derivedFrom?: string[];
  userModifications?: PluginModification[];
  createdAt: Date;
}

export interface PluginModification {
  timestamp: Date;
  type: 'parameter_change' | 'module_add' | 'module_remove' | 'chain_reorder';
  description: string;
  changes: Record<string, any>;
}

export interface TemplateMatch {
  template: SmartTemplate;
  score: number;
  reasoning: string;
}

export interface TemplateAnalytics {
  templateId: string;
  totalGenerations: number;
  customizationRate: number;
  averageRating: number;
  popularCustomizations: Array<{
    parameter: string;
    averageValue: number;
    usageCount: number;
  }>;
  combinedWith: Array<{
    templateId: string;
    count: number;
  }>;
}
