/**
 * PLUGIN REGISTRY API
 * 
 * Backend API for plugin marketplace, discovery, and distribution.
 */

import { api, APIError } from "encore.dev/api";
import { musicDB } from "../db";
import log from "encore.dev/log";
import type {
  PluginMetadata,
  PluginRegistryEntry,
  PluginSearchFilters,
  PluginType,
  PluginFormat
} from "./types";

export interface RegisterPluginRequest {
  metadata: PluginMetadata;
  downloadUrl: string;
  sourceCode?: string;
}

export interface RegisterPluginResponse {
  id: string;
  approved: boolean;
  message: string;
}

export interface SearchPluginsRequest {
  filters?: PluginSearchFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'downloads' | 'rating' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchPluginsResponse {
  plugins: PluginRegistryEntry[];
  total: number;
  hasMore: boolean;
}

export interface PluginStatsResponse {
  totalPlugins: number;
  totalDownloads: number;
  averageRating: number;
  byType: Record<PluginType, number>;
  byCategory: Record<string, number>;
  featured: PluginRegistryEntry[];
  mostDownloaded: PluginRegistryEntry[];
  topRated: PluginRegistryEntry[];
}

// Register a new plugin
export const registerPlugin = api<RegisterPluginRequest, RegisterPluginResponse>(
  { expose: true, method: "POST", path: "/plugins/register" },
  async (req) => {
    try {
      log.info("Registering new plugin", { 
        name: req.metadata.name,
        type: req.metadata.type
      });

      // Validate metadata
      if (!req.metadata.id || !req.metadata.name || !req.metadata.version) {
        throw APIError.invalidArgument("Plugin metadata is incomplete");
      }

      // Check if plugin already exists
      const existing = await musicDB.queryRow<{ id: string }>`
        SELECT id FROM plugin_registry
        WHERE plugin_id = ${req.metadata.id} AND version = ${req.metadata.version}
      `;

      if (existing) {
        throw APIError.alreadyExists("Plugin version already registered");
      }

      // Insert into registry
      await musicDB.exec`
        INSERT INTO plugin_registry (
          plugin_id,
          name,
          version,
          author,
          description,
          type,
          format,
          category,
          tags,
          cultural_context,
          download_url,
          source_code,
          license,
          price,
          website,
          documentation,
          verified,
          featured,
          downloads,
          rating,
          reviews,
          created_at,
          updated_at
        ) VALUES (
          ${req.metadata.id},
          ${req.metadata.name},
          ${req.metadata.version},
          ${req.metadata.author},
          ${req.metadata.description},
          ${req.metadata.type},
          ${req.metadata.format},
          ${req.metadata.category},
          ${JSON.stringify(req.metadata.tags)},
          ${JSON.stringify(req.metadata.culturalContext)},
          ${req.downloadUrl},
          ${req.sourceCode || null},
          ${req.metadata.license},
          ${req.metadata.price || 0},
          ${req.metadata.website || null},
          ${req.metadata.documentation || null},
          ${false},
          ${false},
          ${0},
          ${0},
          ${0},
          NOW(),
          NOW()
        )
      `;

      log.info("Plugin registered successfully", { id: req.metadata.id });

      return {
        id: req.metadata.id,
        approved: false,
        message: "Plugin submitted for review. Verification pending."
      };

    } catch (error) {
      log.error("Plugin registration failed", { error: (error as Error).message });
      throw error instanceof APIError ? error : APIError.internal("Failed to register plugin");
    }
  }
);

// Search plugins
export const searchPlugins = api<SearchPluginsRequest, SearchPluginsResponse>(
  { expose: true, method: "GET", path: "/plugins/search" },
  async (req) => {
    try {
      let query = `SELECT * FROM plugin_registry WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (req.filters) {
        if (req.filters.type) {
          query += ` AND type = $${paramIndex}`;
          params.push(req.filters.type);
          paramIndex++;
        }

        if (req.filters.category) {
          query += ` AND category = $${paramIndex}`;
          params.push(req.filters.category);
          paramIndex++;
        }

        if (req.filters.format) {
          query += ` AND format = $${paramIndex}`;
          params.push(req.filters.format);
          paramIndex++;
        }

        if (req.filters.license) {
          query += ` AND license = $${paramIndex}`;
          params.push(req.filters.license);
          paramIndex++;
        }

        if (req.filters.verified !== undefined) {
          query += ` AND verified = $${paramIndex}`;
          params.push(req.filters.verified);
          paramIndex++;
        }

        if (req.filters.featured !== undefined) {
          query += ` AND featured = $${paramIndex}`;
          params.push(req.filters.featured);
          paramIndex++;
        }

        if (req.filters.minRating !== undefined) {
          query += ` AND rating >= $${paramIndex}`;
          params.push(req.filters.minRating);
          paramIndex++;
        }

        if (req.filters.tags && req.filters.tags.length > 0) {
          query += ` AND tags @> $${paramIndex}::jsonb`;
          params.push(JSON.stringify(req.filters.tags));
          paramIndex++;
        }

        if (req.filters.genre) {
          query += ` AND cultural_context->>'genre' = $${paramIndex}`;
          params.push(req.filters.genre);
          paramIndex++;
        }
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = await musicDB.rawQueryRow<{ count: number }>(countQuery, ...params);
      const total = countResult?.count || 0;

      // Add sorting
      const sortBy = req.sortBy || 'newest';
      const sortOrder = req.sortOrder || 'desc';
      
      switch (sortBy) {
        case 'downloads':
          query += ` ORDER BY downloads ${sortOrder.toUpperCase()}`;
          break;
        case 'rating':
          query += ` ORDER BY rating ${sortOrder.toUpperCase()}`;
          break;
        case 'name':
          query += ` ORDER BY name ${sortOrder.toUpperCase()}`;
          break;
        default:
          query += ` ORDER BY created_at ${sortOrder.toUpperCase()}`;
      }

      // Add pagination
      const limit = req.limit || 20;
      const offset = req.offset || 0;
      
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const plugins = await musicDB.rawQueryAll<any>(query, ...params);

      // Transform to PluginRegistryEntry
      const entries: PluginRegistryEntry[] = plugins.map(p => ({
        metadata: {
          id: p.plugin_id,
          name: p.name,
          version: p.version,
          author: p.author,
          description: p.description,
          type: p.type,
          format: p.format,
          category: p.category,
          tags: JSON.parse(p.tags || '[]'),
          culturalContext: JSON.parse(p.cultural_context || '{}'),
          supportsAutomation: true,
          supportsMIDI: p.type === 'instrument',
          hasCustomUI: true,
          license: p.license,
          price: p.price,
          website: p.website,
          documentation: p.documentation
        },
        downloadUrl: p.download_url,
        version: p.version,
        downloads: p.downloads,
        rating: p.rating,
        reviews: p.reviews,
        verified: p.verified,
        featured: p.featured,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      log.info("Plugins searched", { total, returned: entries.length });

      return {
        plugins: entries,
        total,
        hasMore: offset + limit < total
      };

    } catch (error) {
      log.error("Plugin search failed", { error: (error as Error).message });
      throw APIError.internal("Failed to search plugins");
    }
  }
);

// Get plugin details
export const getPlugin = api(
  { expose: true, method: "GET", path: "/plugins/:pluginId" },
  async ({ pluginId }: { pluginId: string }): Promise<PluginRegistryEntry> => {
    try {
      const plugin = await musicDB.queryRow<any>`
        SELECT * FROM plugin_registry
        WHERE plugin_id = ${pluginId}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!plugin) {
        throw APIError.notFound("Plugin not found");
      }

      return {
        metadata: {
          id: plugin.plugin_id,
          name: plugin.name,
          version: plugin.version,
          author: plugin.author,
          description: plugin.description,
          type: plugin.type,
          format: plugin.format,
          category: plugin.category,
          tags: JSON.parse(plugin.tags || '[]'),
          culturalContext: JSON.parse(plugin.cultural_context || '{}'),
          supportsAutomation: true,
          supportsMIDI: plugin.type === 'instrument',
          hasCustomUI: true,
          license: plugin.license,
          price: plugin.price,
          website: plugin.website,
          documentation: plugin.documentation
        },
        downloadUrl: plugin.download_url,
        version: plugin.version,
        downloads: plugin.downloads,
        rating: plugin.rating,
        reviews: plugin.reviews,
        verified: plugin.verified,
        featured: plugin.featured,
        createdAt: plugin.created_at,
        updatedAt: plugin.updated_at
      };

    } catch (error) {
      log.error("Get plugin failed", { error: (error as Error).message, pluginId });
      throw error instanceof APIError ? error : APIError.internal("Failed to get plugin");
    }
  }
);

// Download plugin (increments download counter)
export const downloadPlugin = api(
  { expose: true, method: "POST", path: "/plugins/:pluginId/download" },
  async ({ pluginId }: { pluginId: string }): Promise<{ downloadUrl: string }> => {
    try {
      const plugin = await musicDB.queryRow<{ download_url: string }>`
        UPDATE plugin_registry
        SET downloads = downloads + 1
        WHERE plugin_id = ${pluginId}
        RETURNING download_url
      `;

      if (!plugin) {
        throw APIError.notFound("Plugin not found");
      }

      log.info("Plugin downloaded", { pluginId });

      return { downloadUrl: plugin.download_url };

    } catch (error) {
      log.error("Download plugin failed", { error: (error as Error).message, pluginId });
      throw error instanceof APIError ? error : APIError.internal("Failed to download plugin");
    }
  }
);

// Rate plugin
export const ratePlugin = api(
  { expose: true, method: "POST", path: "/plugins/:pluginId/rate" },
  async ({ pluginId, rating }: { pluginId: string; rating: number }): Promise<{ success: boolean; averageRating: number }> => {
    try {
      if (rating < 1 || rating > 5) {
        throw APIError.invalidArgument("Rating must be between 1 and 5");
      }

      // Update plugin rating (simplified - in production, track individual user ratings)
      const result = await musicDB.queryRow<{ rating: number; reviews: number }>`
        UPDATE plugin_registry
        SET 
          rating = ((rating * reviews) + ${rating}) / (reviews + 1),
          reviews = reviews + 1
        WHERE plugin_id = ${pluginId}
        RETURNING rating, reviews
      `;

      if (!result) {
        throw APIError.notFound("Plugin not found");
      }

      log.info("Plugin rated", { pluginId, rating, newAverage: result.rating });

      return {
        success: true,
        averageRating: result.rating
      };

    } catch (error) {
      log.error("Rate plugin failed", { error: (error as Error).message, pluginId });
      throw error instanceof APIError ? error : APIError.internal("Failed to rate plugin");
    }
  }
);

// Get plugin statistics
export const getPluginStats = api<void, PluginStatsResponse>(
  { expose: true, method: "GET", path: "/plugins/stats" },
  async () => {
    try {
      const stats = await musicDB.queryRow<any>`
        SELECT 
          COUNT(*) as total_plugins,
          SUM(downloads) as total_downloads,
          AVG(rating) as average_rating
        FROM plugin_registry
      `;

      const byType = await musicDB.queryAll<{ type: PluginType; count: number }>`
        SELECT type, COUNT(*) as count
        FROM plugin_registry
        GROUP BY type
      `;

      const byCategory = await musicDB.queryAll<{ category: string; count: number }>`
        SELECT category, COUNT(*) as count
        FROM plugin_registry
        GROUP BY category
      `;

      const featured = await musicDB.queryAll<any>`
        SELECT * FROM plugin_registry
        WHERE featured = true
        ORDER BY downloads DESC
        LIMIT 10
      `;

      const mostDownloaded = await musicDB.queryAll<any>`
        SELECT * FROM plugin_registry
        ORDER BY downloads DESC
        LIMIT 10
      `;

      const topRated = await musicDB.queryAll<any>`
        SELECT * FROM plugin_registry
        WHERE reviews > 10
        ORDER BY rating DESC
        LIMIT 10
      `;

      return {
        totalPlugins: stats?.total_plugins || 0,
        totalDownloads: stats?.total_downloads || 0,
        averageRating: stats?.average_rating || 0,
        byType: byType.reduce((acc, row) => {
          acc[row.type] = row.count;
          return acc;
        }, {} as Record<PluginType, number>),
        byCategory: byCategory.reduce((acc, row) => {
          acc[row.category] = row.count;
          return acc;
        }, {} as Record<string, number>),
        featured: featured.map(transformToEntry),
        mostDownloaded: mostDownloaded.map(transformToEntry),
        topRated: topRated.map(transformToEntry)
      };

    } catch (error) {
      log.error("Get plugin stats failed", { error: (error as Error).message });
      throw APIError.internal("Failed to get plugin statistics");
    }
  }
);

function transformToEntry(p: any): PluginRegistryEntry {
  return {
    metadata: {
      id: p.plugin_id,
      name: p.name,
      version: p.version,
      author: p.author,
      description: p.description,
      type: p.type,
      format: p.format,
      category: p.category,
      tags: JSON.parse(p.tags || '[]'),
      culturalContext: JSON.parse(p.cultural_context || '{}'),
      supportsAutomation: true,
      supportsMIDI: p.type === 'instrument',
      hasCustomUI: true,
      license: p.license,
      price: p.price,
      website: p.website,
      documentation: p.documentation
    },
    downloadUrl: p.download_url,
    version: p.version,
    downloads: p.downloads,
    rating: p.rating,
    reviews: p.reviews,
    verified: p.verified,
    featured: p.featured,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}
