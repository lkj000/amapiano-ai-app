import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { SmartTemplate, GeneratedPlugin, TemplateCustomization, TemplateMatch, TemplateAnalytics } from "./plugin-types";
import { PluginCodeGenerator } from "./plugin-codegen";

const codegen = new PluginCodeGenerator();

export interface ListTemplatesRequest {
  category?: 'genre_specific' | 'functional' | 'experimental';
  genre?: string;
  verified?: boolean;
  limit?: number;
}

export interface ListTemplatesResponse {
  templates: SmartTemplate[];
  total: number;
}

export const listTemplates = api(
  { method: "GET", path: "/plugins/templates", expose: true },
  async (req: ListTemplatesRequest): Promise<ListTemplatesResponse> => {
    let query = `SELECT 
      id, name, version, description, author, genre, category,
      signal_chain::text as signal_chain,
      preset_parameters::text as preset_parameters,
      tags,
      target_framework, verified, downloads, rating,
      cultural_context, use_case, created_at, updated_at
    FROM smart_templates WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (req.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(req.category);
      paramIndex++;
    }

    if (req.genre) {
      query += ` AND genre = $${paramIndex}`;
      params.push(req.genre);
      paramIndex++;
    }

    if (req.verified !== undefined) {
      query += ` AND verified = $${paramIndex}`;
      params.push(req.verified);
      paramIndex++;
    }

    query += ' ORDER BY rating DESC, downloads DESC';

    const limitValue = req.limit || 50;
    query += ` LIMIT $${paramIndex}`;
    params.push(limitValue);

    const results = await musicDB.rawQueryAll<any>(query, params);
    
    const templates: SmartTemplate[] = results.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      author: row.author,
      genre: row.genre,
      category: row.category,
      signalChain: JSON.parse(row.signal_chain),
      presetParameters: JSON.parse(row.preset_parameters),
      tags: row.tags || [],
      targetFramework: row.target_framework,
      verified: row.verified,
      downloads: row.downloads,
      rating: row.rating ? parseFloat(row.rating) : 0,
      culturalContext: row.cultural_context,
      useCase: row.use_case,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { templates, total: templates.length };
  }
);

export interface GetTemplateRequest {
  templateId: string;
}

export const getTemplate = api(
  { method: "GET", path: "/plugins/templates/:templateId", expose: true },
  async ({ templateId }: GetTemplateRequest): Promise<SmartTemplate> => {
    const results = await musicDB.rawQueryAll<any>(
      `SELECT 
        id, name, version, description, author, genre, category,
        signal_chain::text as signal_chain,
        preset_parameters::text as preset_parameters,
        tags,
        target_framework, verified, downloads, rating,
        cultural_context, use_case, created_at, updated_at
      FROM smart_templates WHERE id = $1`,
      [templateId]
    );

    if (results.length === 0) {
      throw APIError.notFound(`Template ${templateId} not found`);
    }

    const row = results[0];
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      author: row.author,
      genre: row.genre,
      category: row.category,
      signalChain: JSON.parse(row.signal_chain),
      presetParameters: JSON.parse(row.preset_parameters),
      tags: row.tags || [],
      targetFramework: row.target_framework,
      verified: row.verified,
      downloads: row.downloads,
      rating: row.rating ? parseFloat(row.rating) : 0,
      culturalContext: row.cultural_context,
      useCase: row.use_case,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface GeneratePluginRequest {
  templateId: string;
  customizations?: Record<string, any>;
  enabledModules?: string[];
  pluginName?: string;
}

export interface GeneratePluginResponse {
  plugin: GeneratedPlugin;
}

export const generateFromTemplate = api(
  { method: "POST", path: "/plugins/generate", expose: true },
  async (req: GeneratePluginRequest): Promise<GeneratePluginResponse> => {
    const templateResults = await musicDB.rawQueryAll<any>(
      `SELECT 
        id, name, version, description, author, genre, category,
        signal_chain::text as signal_chain,
        preset_parameters::text as preset_parameters,
        tags,
        target_framework, verified, downloads, rating,
        cultural_context, use_case, created_at, updated_at
      FROM smart_templates WHERE id = $1`,
      [req.templateId]
    );

    if (templateResults.length === 0) {
      throw APIError.notFound(`Template ${req.templateId} not found`);
    }

    const templateRow = templateResults[0];
    const template: SmartTemplate = {
      id: templateRow.id,
      name: templateRow.name,
      version: templateRow.version,
      description: templateRow.description,
      author: templateRow.author,
      genre: templateRow.genre,
      category: templateRow.category,
      signalChain: JSON.parse(templateRow.signal_chain),
      presetParameters: JSON.parse(templateRow.preset_parameters),
      tags: JSON.parse(templateRow.tags),
      targetFramework: templateRow.target_framework,
      verified: templateRow.verified,
      downloads: templateRow.downloads,
      rating: templateRow.rating ? parseFloat(templateRow.rating) : 0,
      culturalContext: templateRow.cultural_context,
      useCase: templateRow.use_case,
      createdAt: templateRow.created_at,
      updatedAt: templateRow.updated_at,
    };

    const plugin = codegen.generatePlugin(template, req.customizations, req.enabledModules);

    if (req.pluginName) {
      plugin.name = req.pluginName;
    }

    await musicDB.rawQueryAll(
      `INSERT INTO generated_plugins 
      (id, name, description, type, format, source_code, source_template_id, customizations, version, parameters, signal_chain, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [
        plugin.id,
        plugin.name,
        plugin.description,
        plugin.type,
        plugin.format,
        plugin.sourceCode,
        plugin.sourceTemplateId || null,
        JSON.stringify(plugin.customizations),
        plugin.version,
        JSON.stringify(plugin.parameters),
        JSON.stringify(plugin.signalChain),
        JSON.stringify(plugin.metadata)
      ]
    );

    await musicDB.rawQueryAll(
      `INSERT INTO plugin_genealogy (plugin_id, base_template, customizations, derived_from, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [plugin.id, req.templateId, JSON.stringify(req.customizations || {}), [req.templateId]]
    );

    await trackUsageEvent(plugin.id, req.templateId, 'generate', {
      customizations: req.customizations,
      enabledModules: req.enabledModules
    });

    await musicDB.rawQueryAll(
      'UPDATE smart_templates SET downloads = downloads + 1 WHERE id = $1',
      [req.templateId]
    );

    return { plugin };
  }
);

export interface SuggestTemplatesRequest {
  prompt: string;
  limit?: number;
}

export interface SuggestTemplatesResponse {
  suggestions: TemplateMatch[];
}

export const suggestTemplates = api(
  { method: "POST", path: "/plugins/suggest", expose: true },
  async (req: SuggestTemplatesRequest): Promise<SuggestTemplatesResponse> => {
    const allTemplates = await musicDB.rawQueryAll<any>(
      `SELECT 
        id, name, version, description, author, genre, category,
        signal_chain::text as signal_chain,
        preset_parameters::text as preset_parameters,
        tags,
        target_framework, verified, downloads, rating,
        cultural_context, use_case, created_at, updated_at
      FROM smart_templates ORDER BY rating DESC`
    );

    const templates: SmartTemplate[] = allTemplates.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      author: row.author,
      genre: row.genre,
      category: row.category,
      signalChain: JSON.parse(row.signal_chain),
      presetParameters: JSON.parse(row.preset_parameters),
      tags: row.tags || [],
      targetFramework: row.target_framework,
      verified: row.verified,
      downloads: row.downloads,
      rating: row.rating ? parseFloat(row.rating) : 0,
      culturalContext: row.cultural_context,
      useCase: row.use_case,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const matches = matchTemplates(req.prompt, templates);
    const limit = req.limit || 3;

    return { suggestions: matches.slice(0, limit) };
  }
);

export interface GetTemplateAnalyticsRequest {
  templateId: string;
}

export const getTemplateAnalytics = api(
  { method: "GET", path: "/plugins/templates/:templateId/analytics", expose: true },
  async ({ templateId }: GetTemplateAnalyticsRequest): Promise<TemplateAnalytics> => {
    const results = await musicDB.rawQueryAll<any>(
      'SELECT * FROM template_analytics WHERE template_id = $1',
      [templateId]
    );

    if (results.length === 0) {
      return {
        templateId,
        totalGenerations: 0,
        customizationRate: 0,
        averageRating: 0,
        popularCustomizations: [],
        combinedWith: []
      };
    }

    const row = results[0];
    return {
      templateId: row.template_id,
      totalGenerations: row.total_generations,
      customizationRate: parseFloat(row.customization_rate),
      averageRating: parseFloat(row.average_rating),
      popularCustomizations: row.popular_customizations,
      combinedWith: row.combined_with
    };
  }
);

export interface GetGeneratedPluginRequest {
  pluginId: string;
}

export const getGeneratedPlugin = api(
  { method: "GET", path: "/plugins/:pluginId", expose: true },
  async ({ pluginId }: GetGeneratedPluginRequest): Promise<GeneratedPlugin> => {
    const results = await musicDB.rawQueryAll<any>(
      'SELECT * FROM generated_plugins WHERE id = $1',
      [pluginId]
    );

    if (results.length === 0) {
      throw APIError.notFound(`Plugin ${pluginId} not found`);
    }

    const row = results[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      format: row.format,
      sourceCode: row.source_code,
      sourceTemplateId: row.source_template_id,
      customizations: row.customizations,
      version: row.version,
      parameters: row.parameters,
      signalChain: row.signal_chain,
      metadata: row.metadata
    };
  }
);

async function trackUsageEvent(
  pluginId: string | null,
  templateId: string,
  eventType: 'generate' | 'customize' | 'download' | 'rate' | 'use',
  eventData: any
): Promise<void> {
  await musicDB.rawQueryAll(
    `INSERT INTO plugin_usage_events (plugin_id, template_id, event_type, event_data, created_at)
    VALUES ($1, $2, $3, $4, NOW())`,
    [pluginId, templateId, eventType, JSON.stringify(eventData)]
  );

  const analyticsExists = await musicDB.rawQueryAll(
    'SELECT template_id FROM template_analytics WHERE template_id = $1',
    [templateId]
  );

  if (analyticsExists.length === 0) {
    await musicDB.rawQueryAll(
      `INSERT INTO template_analytics (template_id, total_generations, updated_at)
      VALUES ($1, 0, NOW())`,
      [templateId]
    );
  }

  if (eventType === 'generate') {
    await musicDB.rawQueryAll(
      `UPDATE template_analytics 
      SET total_generations = total_generations + 1, updated_at = NOW()
      WHERE template_id = $1`,
      [templateId]
    );
  }
}

function matchTemplates(prompt: string, templates: SmartTemplate[]): TemplateMatch[] {
  const promptLower = prompt.toLowerCase();
  const matches: TemplateMatch[] = [];

  for (const template of templates) {
    let score = 0;
    let reasoning = '';

    if (template.name.toLowerCase().includes(promptLower)) {
      score += 0.4;
      reasoning += 'Name match. ';
    }

    if (template.description && template.description.toLowerCase().includes(promptLower)) {
      score += 0.3;
      reasoning += 'Description match. ';
    }

    for (const tag of template.tags || []) {
      if (promptLower.includes(tag.toLowerCase())) {
        score += 0.1;
        reasoning += `Tag match: ${tag}. `;
      }
    }

    if (template.genre && promptLower.includes(template.genre.toLowerCase())) {
      score += 0.3;
      reasoning += `Genre match: ${template.genre}. `;
    }

    if (promptLower.includes('vocal') && (template.tags || []).includes('vocals')) {
      score += 0.5;
      reasoning += 'Vocal processing detected. ';
    }

    if ((promptLower.includes('chill') || promptLower.includes('lo-fi') || promptLower.includes('lofi')) && 
        template.id === 'chillifier') {
      score += 0.6;
      reasoning += 'Lo-fi/chill vibe detected. ';
    }

    if ((promptLower.includes('amapiano') || promptLower.includes('log drum')) && 
        template.id === 'amapianorizer') {
      score += 0.7;
      reasoning += 'Amapiano style detected. ';
    }

    if (score > 0.5) {
      matches.push({ template, score, reasoning: reasoning.trim() });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
