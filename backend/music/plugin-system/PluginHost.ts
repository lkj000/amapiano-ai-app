/**
 * PLUGIN HOST
 * 
 * Manages plugin lifecycle, audio routing, and integration with the DAW.
 */

import type {
  IPlugin,
  IPluginHost,
  PluginMetadata,
  PluginPreset,
  PluginFormat,
  PluginRegistryEntry
} from './types';

export class PluginHost implements IPluginHost {
  private plugins: Map<string, IPlugin> = new Map();
  private pluginRegistry: Map<string, PluginMetadata> = new Map();
  private audioContext: AudioContext;
  private pluginConnections: Map<string, {
    input: AudioNode;
    output: AudioNode;
    workletNode?: AudioWorkletNode;
  }> = new Map();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  // Plugin lifecycle
  async loadPlugin(url: string, type: PluginFormat): Promise<IPlugin> {
    switch (type) {
      case 'javascript':
        return await this.loadJavaScriptPlugin(url);
      case 'wasm':
        return await this.loadWASMPlugin(url);
      case 'native':
        throw new Error('Native plugins not yet supported in browser');
      default:
        throw new Error(`Unsupported plugin format: ${type}`);
    }
  }

  private async loadJavaScriptPlugin(url: string): Promise<IPlugin> {
    try {
      // Dynamically import the plugin module
      const module = await import(/* @vite-ignore */ url);
      
      if (!module.default || typeof module.default !== 'function') {
        throw new Error('Plugin must export a default constructor function');
      }

      // Instantiate the plugin
      const PluginClass = module.default;
      const plugin: IPlugin = new PluginClass();

      // Initialize the plugin
      await plugin.initialize(this.audioContext.sampleRate, 512);

      // Register and store the plugin
      this.plugins.set(plugin.metadata.id, plugin);
      this.pluginRegistry.set(plugin.metadata.id, plugin.metadata);

      console.log('Loaded JavaScript plugin:', plugin.metadata.name);

      return plugin;
    } catch (error) {
      console.error('Failed to load JavaScript plugin:', error);
      throw error;
    }
  }

  private async loadWASMPlugin(url: string): Promise<IPlugin> {
    try {
      // Load WASM module
      const response = await fetch(url);
      const wasmBytes = await response.arrayBuffer();
      const wasmModule = await WebAssembly.compile(wasmBytes);
      const wasmInstance = await WebAssembly.instantiate(wasmModule);

      // Create wrapper plugin
      const plugin = this.createWASMPluginWrapper(wasmInstance, url);

      await plugin.initialize(this.audioContext.sampleRate, 512);

      this.plugins.set(plugin.metadata.id, plugin);
      this.pluginRegistry.set(plugin.metadata.id, plugin.metadata);

      console.log('Loaded WASM plugin:', plugin.metadata.name);

      return plugin;
    } catch (error) {
      console.error('Failed to load WASM plugin:', error);
      throw error;
    }
  }

  private createWASMPluginWrapper(wasmInstance: WebAssembly.Instance, url: string): IPlugin {
    // This would create a JavaScript wrapper around the WASM plugin
    // For now, throw an error as this is a complex implementation
    throw new Error('WASM plugin wrapper not yet implemented');
  }

  unloadPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      // Disconnect audio
      this.disconnectPlugin(pluginId);
      
      // Dispose plugin
      plugin.dispose();
      
      // Remove from registry
      this.plugins.delete(pluginId);
      this.pluginConnections.delete(pluginId);
      
      console.log('Unloaded plugin:', pluginId);
    }
  }

  getPlugin(pluginId: string): IPlugin | null {
    return this.plugins.get(pluginId) || null;
  }

  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  // Audio routing
  connectPlugin(pluginId: string, inputNode: AudioNode, outputNode: AudioNode): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Create AudioWorkletNode for the plugin
    this.createPluginWorklet(pluginId, plugin).then(workletNode => {
      // Connect: input -> worklet -> output
      inputNode.connect(workletNode);
      workletNode.connect(outputNode);

      this.pluginConnections.set(pluginId, {
        input: inputNode,
        output: outputNode,
        workletNode
      });

      console.log('Connected plugin:', pluginId);
    });
  }

  private async createPluginWorklet(pluginId: string, plugin: IPlugin): Promise<AudioWorkletNode> {
    // Register Audio Worklet processor if not already registered
    const processorName = `plugin-processor-${pluginId}`;
    
    try {
      await this.audioContext.audioWorklet.addModule(
        this.createWorkletProcessorCode(plugin)
      );
    } catch (error) {
      // Processor might already be registered
      console.warn('Worklet processor registration:', error);
    }

    // Create worklet node
    const workletNode = new AudioWorkletNode(this.audioContext, processorName);

    // Setup parameter automation
    plugin.parameters.forEach(param => {
      if (param.isAutomatable && param.type === 'float') {
        const audioParam = (workletNode.parameters as any).get(param.id);
        if (audioParam) {
          audioParam.value = plugin.getParameter(param.id) as number;
        }
      }
    });

    return workletNode;
  }

  private createWorkletProcessorCode(plugin: IPlugin): string {
    // Generate AudioWorklet processor code for this plugin
    // This is a simplified version - in practice, you'd need more sophisticated code generation
    const code = `
      class PluginProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.pluginState = {};
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          const output = outputs[0];

          if (!input || !output) {
            return true;
          }

          // Process audio through plugin
          // This would call the actual plugin processing code
          for (let channel = 0; channel < output.length; channel++) {
            const inputChannel = input[channel] || new Float32Array(output[channel].length);
            const outputChannel = output[channel];
            
            // Copy input to output (bypass for now)
            outputChannel.set(inputChannel);
          }

          return true;
        }
      }

      registerProcessor('plugin-processor-${plugin.metadata.id}', PluginProcessor);
    `;

    // Create a blob URL for the processor code
    const blob = new Blob([code], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  disconnectPlugin(pluginId: string): void {
    const connection = this.pluginConnections.get(pluginId);
    if (connection) {
      if (connection.workletNode) {
        connection.workletNode.disconnect();
      }
      this.pluginConnections.delete(pluginId);
      console.log('Disconnected plugin:', pluginId);
    }
  }

  // Automation
  automateParameter(
    pluginId: string,
    parameterId: string,
    value: number,
    time?: number
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const param = plugin.getParameterInfo(parameterId);
    if (!param) {
      throw new Error(`Parameter ${parameterId} not found`);
    }

    if (!param.isAutomatable) {
      throw new Error(`Parameter ${parameterId} is not automatable`);
    }

    const connection = this.pluginConnections.get(pluginId);
    if (connection?.workletNode) {
      const audioParam = (connection.workletNode.parameters as any).get(parameterId);
      if (audioParam) {
        const targetTime = time ?? this.audioContext.currentTime;
        audioParam.linearRampToValueAtTime(value, targetTime);
      }
    } else {
      // Fallback to direct parameter set
      plugin.setParameter(parameterId, value);
    }
  }

  // Preset management
  savePluginPreset(pluginId: string, name: string): PluginPreset {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    return plugin.savePreset(name);
  }

  loadPluginPreset(pluginId: string, preset: PluginPreset): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.loadPreset(preset);
  }

  // Plugin scanning and discovery
  async scanPlugins(directory?: string): Promise<PluginMetadata[]> {
    // In a real implementation, this would scan a directory for plugin files
    // For web, we'll return the registered plugins
    return Array.from(this.pluginRegistry.values());
  }

  registerPlugin(metadata: PluginMetadata): void {
    this.pluginRegistry.set(metadata.id, metadata);
    console.log('Registered plugin:', metadata.name);
  }

  // UI management
  showPluginUI(pluginId: string, container: HTMLElement): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.metadata.hasCustomUI || !plugin.createUI) {
      throw new Error(`Plugin ${pluginId} does not have a custom UI`);
    }

    const ui = plugin.createUI();
    container.innerHTML = '';
    container.appendChild(ui);
  }

  hidePluginUI(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.destroyUI) {
      plugin.destroyUI();
    }
  }

  // Utility methods
  getPluginsByType(type: string): IPlugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => plugin.metadata.type === type
    );
  }

  getPluginsByCategory(category: string): IPlugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => plugin.metadata.category === category
    );
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  dispose(): void {
    // Unload all plugins
    Array.from(this.plugins.keys()).forEach(pluginId => {
      this.unloadPlugin(pluginId);
    });

    this.plugins.clear();
    this.pluginRegistry.clear();
    this.pluginConnections.clear();
  }
}
