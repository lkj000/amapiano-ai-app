/**
 * React Hook for Plugin Management
 * 
 * Provides a React interface to the plugin system for easy integration
 * into the Amapiano AI DAW frontend.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PluginHost } from '../../backend/music/plugin-system/PluginHost';
import type {
  IPlugin,
  PluginMetadata,
  PluginPreset,
  PluginFormat,
  PluginRegistryEntry
} from '../../backend/music/plugin-system/types';
import backend from '~backend/client';

interface UsePluginSystemOptions {
  audioContext: AudioContext;
  autoLoadFeatured?: boolean;
}

interface PluginInstance {
  id: string;
  plugin: IPlugin;
  isActive: boolean;
  presetId?: string;
}

export const usePluginSystem = (options: UsePluginSystemOptions) => {
  const { audioContext, autoLoadFeatured = false } = options;
  
  const pluginHostRef = useRef<PluginHost | null>(null);
  const [loadedPlugins, setLoadedPlugins] = useState<PluginInstance[]>([]);
  const [availablePlugins, setAvailablePlugins] = useState<PluginRegistryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize plugin host
  useEffect(() => {
    if (audioContext && !pluginHostRef.current) {
      pluginHostRef.current = new PluginHost(audioContext);
      console.log('Plugin host initialized');
    }

    return () => {
      if (pluginHostRef.current) {
        pluginHostRef.current.dispose();
        pluginHostRef.current = null;
      }
    };
  }, [audioContext]);

  // Fetch available plugins from marketplace
  const fetchAvailablePlugins = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await backend.plugin.searchPlugins({
        filters,
        limit: 50,
        sortBy: 'downloads',
        sortOrder: 'desc'
      });

      setAvailablePlugins(response.plugins);
      
      if (autoLoadFeatured) {
        // Auto-load featured plugins
        const featured = response.plugins.filter(p => p.featured);
        for (const plugin of featured.slice(0, 3)) {
          await loadPlugin(plugin.downloadUrl, plugin.metadata.format);
        }
      }

      return response.plugins;
    } catch (err) {
      const errorMsg = `Failed to fetch plugins: ${(err as Error).message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [autoLoadFeatured]);

  // Load a plugin
  const loadPlugin = useCallback(async (url: string, format: PluginFormat) => {
    if (!pluginHostRef.current) {
      throw new Error('Plugin host not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const plugin = await pluginHostRef.current.loadPlugin(url, format);
      
      const instance: PluginInstance = {
        id: plugin.metadata.id,
        plugin,
        isActive: false
      };

      setLoadedPlugins(prev => [...prev, instance]);
      
      console.log('Plugin loaded:', plugin.metadata.name);
      return plugin;
    } catch (err) {
      const errorMsg = `Failed to load plugin: ${(err as Error).message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Unload a plugin
  const unloadPlugin = useCallback((pluginId: string) => {
    if (!pluginHostRef.current) return;

    try {
      pluginHostRef.current.unloadPlugin(pluginId);
      setLoadedPlugins(prev => prev.filter(p => p.id !== pluginId));
      console.log('Plugin unloaded:', pluginId);
    } catch (err) {
      const errorMsg = `Failed to unload plugin: ${(err as Error).message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
    }
  }, []);

  // Connect plugin to audio graph
  const connectPlugin = useCallback((
    pluginId: string,
    inputNode: AudioNode,
    outputNode: AudioNode
  ) => {
    if (!pluginHostRef.current) return;

    try {
      pluginHostRef.current.connectPlugin(pluginId, inputNode, outputNode);
      setLoadedPlugins(prev => prev.map(p => 
        p.id === pluginId ? { ...p, isActive: true } : p
      ));
      console.log('Plugin connected:', pluginId);
    } catch (err) {
      const errorMsg = `Failed to connect plugin: ${(err as Error).message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
    }
  }, []);

  // Disconnect plugin from audio graph
  const disconnectPlugin = useCallback((pluginId: string) => {
    if (!pluginHostRef.current) return;

    try {
      pluginHostRef.current.disconnectPlugin(pluginId);
      setLoadedPlugins(prev => prev.map(p => 
        p.id === pluginId ? { ...p, isActive: false } : p
      ));
      console.log('Plugin disconnected:', pluginId);
    } catch (err) {
      const errorMsg = `Failed to disconnect plugin: ${(err as Error).message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
    }
  }, []);

  // Set plugin parameter
  const setParameter = useCallback((
    pluginId: string,
    parameterId: string,
    value: number | string | boolean
  ) => {
    const instance = loadedPlugins.find(p => p.id === pluginId);
    if (!instance) {
      console.warn('Plugin not found:', pluginId);
      return;
    }

    try {
      instance.plugin.setParameter(parameterId, value);
    } catch (err) {
      console.error('Failed to set parameter:', err);
    }
  }, [loadedPlugins]);

  // Get plugin parameter
  const getParameter = useCallback((
    pluginId: string,
    parameterId: string
  ): number | string | boolean | undefined => {
    const instance = loadedPlugins.find(p => p.id === pluginId);
    if (!instance) return undefined;

    try {
      return instance.plugin.getParameter(parameterId);
    } catch (err) {
      console.error('Failed to get parameter:', err);
      return undefined;
    }
  }, [loadedPlugins]);

  // Load preset
  const loadPreset = useCallback((pluginId: string, preset: PluginPreset) => {
    const instance = loadedPlugins.find(p => p.id === pluginId);
    if (!instance) {
      console.warn('Plugin not found:', pluginId);
      return;
    }

    try {
      instance.plugin.loadPreset(preset);
      setLoadedPlugins(prev => prev.map(p => 
        p.id === pluginId ? { ...p, presetId: preset.id } : p
      ));
      console.log('Preset loaded:', preset.name);
    } catch (err) {
      console.error('Failed to load preset:', err);
    }
  }, [loadedPlugins]);

  // Save preset
  const savePreset = useCallback((
    pluginId: string,
    name: string,
    description?: string
  ): PluginPreset | null => {
    const instance = loadedPlugins.find(p => p.id === pluginId);
    if (!instance) {
      console.warn('Plugin not found:', pluginId);
      return null;
    }

    try {
      const preset = instance.plugin.savePreset(name, description);
      console.log('Preset saved:', preset.name);
      return preset;
    } catch (err) {
      console.error('Failed to save preset:', err);
      return null;
    }
  }, [loadedPlugins]);

  // Get plugin by ID
  const getPlugin = useCallback((pluginId: string): IPlugin | null => {
    const instance = loadedPlugins.find(p => p.id === pluginId);
    return instance?.plugin || null;
  }, [loadedPlugins]);

  // Automate parameter
  const automateParameter = useCallback((
    pluginId: string,
    parameterId: string,
    value: number,
    time?: number
  ) => {
    if (!pluginHostRef.current) return;

    try {
      pluginHostRef.current.automateParameter(pluginId, parameterId, value, time);
    } catch (err) {
      console.error('Failed to automate parameter:', err);
    }
  }, []);

  // Download plugin from marketplace
  const downloadPlugin = useCallback(async (pluginId: string) => {
    try {
      setIsLoading(true);
      const response = await backend.plugin.downloadPlugin({ pluginId });
      
      // Load the downloaded plugin
      const pluginEntry = availablePlugins.find(p => p.metadata.id === pluginId);
      if (pluginEntry) {
        await loadPlugin(response.downloadUrl, pluginEntry.metadata.format);
      }

      return response.downloadUrl;
    } catch (err) {
      const errorMsg = `Failed to download plugin: ${(err as Error).message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [availablePlugins, loadPlugin]);

  // Rate plugin
  const ratePlugin = useCallback(async (pluginId: string, rating: number) => {
    try {
      await backend.plugin.ratePlugin({ pluginId, rating });
      
      // Update local state
      setAvailablePlugins(prev => prev.map(p => 
        p.metadata.id === pluginId 
          ? { ...p, rating: ((p.rating * p.reviews) + rating) / (p.reviews + 1), reviews: p.reviews + 1 }
          : p
      ));

      return true;
    } catch (err) {
      console.error('Failed to rate plugin:', err);
      return false;
    }
  }, []);

  // Get plugin statistics
  const getStats = useCallback(async () => {
    try {
      const stats = await backend.plugin.getPluginStats();
      return stats;
    } catch (err) {
      console.error('Failed to get plugin stats:', err);
      return null;
    }
  }, []);

  return {
    // State
    loadedPlugins,
    availablePlugins,
    isLoading,
    error,

    // Plugin Management
    loadPlugin,
    unloadPlugin,
    connectPlugin,
    disconnectPlugin,
    getPlugin,

    // Parameter Control
    setParameter,
    getParameter,
    automateParameter,

    // Preset Management
    loadPreset,
    savePreset,

    // Marketplace
    fetchAvailablePlugins,
    downloadPlugin,
    ratePlugin,
    getStats,

    // Plugin Host
    pluginHost: pluginHostRef.current
  };
};

// Helper hook for individual plugin instance
export const usePlugin = (pluginId: string, pluginSystem: ReturnType<typeof usePluginSystem>) => {
  const plugin = pluginSystem.getPlugin(pluginId);
  const [parameters, setParameters] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!plugin) return;

    // Initialize parameters
    const params: Record<string, any> = {};
    plugin.parameters.forEach(param => {
      params[param.id] = plugin.getParameter(param.id);
    });
    setParameters(params);
  }, [plugin]);

  const setParam = useCallback((id: string, value: any) => {
    pluginSystem.setParameter(pluginId, id, value);
    setParameters(prev => ({ ...prev, [id]: value }));
  }, [pluginId, pluginSystem]);

  return {
    plugin,
    parameters,
    setParameter: setParam,
    metadata: plugin?.metadata,
    presets: plugin?.getPresets() || []
  };
};
