import { SmartTemplate, DspModule, DspParameter, GeneratedPlugin, PluginFormat } from './plugin-types';

export class PluginCodeGenerator {
  generatePlugin(
    template: SmartTemplate,
    customizations?: Record<string, any>,
    enabledModules?: string[]
  ): GeneratedPlugin {
    const filteredModules = enabledModules
      ? template.signalChain.modules.filter(m => enabledModules.includes(m.id))
      : template.signalChain.modules;

    const mergedParams = { ...template.presetParameters, ...customizations };

    const sourceCode = this.generateSourceCode(
      template.targetFramework,
      template.name,
      filteredModules,
      mergedParams
    );

    const pluginId = `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: pluginId,
      name: template.name,
      description: template.description,
      type: 'effect',
      format: template.targetFramework,
      sourceCode,
      sourceTemplateId: template.id,
      customizations: customizations ? { templateId: template.id, overrides: customizations, enabledModules: enabledModules || [], disabledModules: [] } : undefined,
      version: template.version,
      parameters: this.extractAllParameters(filteredModules),
      signalChain: { modules: filteredModules, routing: template.signalChain.routing },
      metadata: {
        author: template.author,
        createdAt: new Date(),
        lineage: [template.id],
        tags: template.tags,
      },
    };
  }

  private generateSourceCode(
    format: PluginFormat,
    name: string,
    modules: DspModule[],
    params: Record<string, any>
  ): string {
    if (format === 'WebAudio') {
      return this.generateWebAudioCode(name, modules, params);
    } else if (format === 'JUCE') {
      return this.generateJUCECode(name, modules, params);
    }
    return this.generateNativeCode(name, modules, params);
  }

  private generateWebAudioCode(
    name: string,
    modules: DspModule[],
    params: Record<string, any>
  ): string {
    const className = name.replace(/\s+/g, '');
    
    const moduleDeclarations = modules.map(m => 
      `  private ${m.id}: ${this.getWebAudioNodeType(m.type)};`
    ).join('\n');

    const moduleInitializations = modules.map((m, idx) => {
      const init = this.generateModuleInitialization(m, params);
      const connection = idx < modules.length - 1 
        ? `    this.${m.id}.connect(this.${modules[idx + 1].id});`
        : `    this.${m.id}.connect(this.output);`;
      return `${init}\n${connection}`;
    }).join('\n\n');

    const parameterGettersSetters = this.generateParameterAccessors(modules);

    return `
class ${className}Plugin {
  private context: AudioContext;
  private input: GainNode;
  private output: GainNode;
${moduleDeclarations}

  constructor(context: AudioContext) {
    this.context = context;
    this.input = context.createGain();
    this.output = context.createGain();

    this.initializeModules();
  }

  private initializeModules(): void {
${moduleInitializations}
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  getInput(): AudioNode {
    return this.input;
  }

  getOutput(): AudioNode {
    return this.output;
  }

${parameterGettersSetters}

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
${modules.map(m => `    this.${m.id}.disconnect();`).join('\n')}
  }
}

export default ${className}Plugin;
`;
  }

  private generateJUCECode(
    name: string,
    modules: DspModule[],
    params: Record<string, any>
  ): string {
    const className = name.replace(/\s+/g, '');
    
    return `
#pragma once
#include <JuceHeader.h>

class ${className}Processor : public juce::AudioProcessor {
public:
  ${className}Processor() {
    // Initialize DSP modules
${modules.map(m => `    // ${m.name} initialization`).join('\n')}
  }

  void prepareToPlay(double sampleRate, int samplesPerBlock) override {
    // Prepare DSP chain
  }

  void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override {
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
      buffer.clear(i, 0, buffer.getNumSamples());

    // Process through DSP chain
${modules.map((m, idx) => `    // Stage ${idx + 1}: ${m.name}`).join('\n')}
  }

  void releaseResources() override {}
  
  const juce::String getName() const override { return "${name}"; }
  bool acceptsMidi() const override { return false; }
  bool producesMidi() const override { return false; }
  double getTailLengthSeconds() const override { return 0.0; }

private:
${modules.map(m => `  // ${m.name} processor`).join('\n')}

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${className}Processor)
};
`;
  }

  private generateNativeCode(
    name: string,
    modules: DspModule[],
    params: Record<string, any>
  ): string {
    return `
// ${name} - Native Implementation
// Generated plugin code

class ${name.replace(/\s+/g, '')} {
  constructor() {
    this.modules = [];
${modules.map(m => `    this.modules.push(this.create${m.name.replace(/\s+/g, '')}());`).join('\n')}
  }

  process(input) {
    let output = input;
${modules.map(m => `    output = this.${m.id}.process(output);`).join('\n')}
    return output;
  }

${modules.map(m => this.generateNativeModule(m)).join('\n\n')}
}
`;
  }

  private getWebAudioNodeType(type: string): string {
    const typeMap: Record<string, string> = {
      filter: 'BiquadFilterNode',
      dynamics: 'DynamicsCompressorNode',
      spatial: 'ConvolverNode | DelayNode',
      distortion: 'WaveShaperNode',
      modulation: 'GainNode',
      utility: 'GainNode'
    };
    return typeMap[type] || 'GainNode';
  }

  private generateModuleInitialization(module: DspModule, params: Record<string, any>): string {
    switch (module.type) {
      case 'filter':
        return this.generateFilterInit(module, params);
      case 'dynamics':
        return this.generateCompressorInit(module, params);
      case 'spatial':
        return this.generateSpatialInit(module, params);
      case 'distortion':
        return this.generateDistortionInit(module, params);
      default:
        return `    this.${module.id} = this.context.createGain();`;
    }
  }

  private generateFilterInit(module: DspModule, params: Record<string, any>): string {
    const freqParam = module.parameters.find(p => p.name.toLowerCase().includes('freq'));
    const gainParam = module.parameters.find(p => p.name.toLowerCase().includes('gain'));
    
    return `    this.${module.id} = this.context.createBiquadFilter();
    this.${module.id}.type = 'lowshelf';
    this.${module.id}.frequency.value = ${freqParam?.defaultValue || 440};
    this.${module.id}.gain.value = ${gainParam?.defaultValue || 0};`;
  }

  private generateCompressorInit(module: DspModule, params: Record<string, any>): string {
    const ratioParam = module.parameters.find(p => p.name.toLowerCase().includes('ratio'));
    const thresholdParam = module.parameters.find(p => p.name.toLowerCase().includes('threshold'));
    const attackParam = module.parameters.find(p => p.name.toLowerCase().includes('attack'));
    const releaseParam = module.parameters.find(p => p.name.toLowerCase().includes('release'));

    return `    this.${module.id} = this.context.createDynamicsCompressor();
    this.${module.id}.ratio.value = ${ratioParam?.defaultValue || 4};
    this.${module.id}.threshold.value = ${thresholdParam?.defaultValue || -24};
    this.${module.id}.attack.value = ${attackParam ? (attackParam.defaultValue as number) / 1000 : 0.003};
    this.${module.id}.release.value = ${releaseParam ? (releaseParam.defaultValue as number) / 1000 : 0.25};`;
  }

  private generateSpatialInit(module: DspModule, params: Record<string, any>): string {
    if (module.name.toLowerCase().includes('delay')) {
      const timeParam = module.parameters.find(p => p.name.toLowerCase().includes('time'));
      return `    this.${module.id} = this.context.createDelay();
    this.${module.id}.delayTime.value = ${timeParam ? (timeParam.defaultValue as number) / 1000 : 0.25};`;
    }
    
    return `    this.${module.id} = this.context.createGain();`;
  }

  private generateDistortionInit(module: DspModule, params: Record<string, any>): string {
    return `    this.${module.id} = this.context.createWaveShaper();
    this.${module.id}.curve = this.makeDistortionCurve(400);
    this.${module.id}.oversample = '4x';`;
  }

  private generateParameterAccessors(modules: DspModule[]): string {
    const accessors: string[] = [];

    modules.forEach(module => {
      module.parameters.forEach(param => {
        const methodName = `${module.id}_${param.id}`;
        accessors.push(`
  set${this.capitalize(methodName)}(value: number): void {
    // Set ${param.name} on ${module.name}
    // this.${module.id}.${param.id}.value = value;
  }

  get${this.capitalize(methodName)}(): number {
    // Get ${param.name} from ${module.name}
    // return this.${module.id}.${param.id}.value;
    return ${param.defaultValue};
  }`);
      });
    });

    return accessors.join('\n');
  }

  private generateNativeModule(module: DspModule): string {
    return `  create${module.name.replace(/\s+/g, '')}() {
    return {
      process: (input) => {
        // ${module.name} processing logic
        return input;
      }
    };
  }`;
  }

  private extractAllParameters(modules: DspModule[]): DspParameter[] {
    const allParams: DspParameter[] = [];
    modules.forEach(module => {
      module.parameters.forEach(param => {
        allParams.push({
          ...param,
          id: `${module.id}_${param.id}`,
          name: `${module.name} - ${param.name}`
        });
      });
    });
    return allParams;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
