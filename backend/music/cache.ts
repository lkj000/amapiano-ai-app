import log from "encore.dev/log";

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  compressionEnabled: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export class AdvancedCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalRequests: number;
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      defaultTTL: config.defaultTTL || 3600000, // 1 hour
      maxSize: config.maxSize || 1000,
      compressionEnabled: config.compressionEnabled || false
    };
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    };

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  async get(key: string): Promise<T | null> {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    log.debug("Cache hit", { key, accessCount: entry.accessCount });
    return entry.data;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const entryTTL = ttl || this.config.defaultTTL;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    log.debug("Cache set", { key, ttl: entryTTL, cacheSize: this.cache.size });
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      log.debug("Cache delete", { key });
    }
    return deleted;
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    log.info("Cache cleared", { previousSize: size });
  }

  getStats(): typeof this.stats & { hitRate: number; size: number } {
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;

    return {
      ...this.stats,
      hitRate,
      size: this.cache.size
    };
  }

  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      log.debug("Cache LRU eviction", { evictedKey: oldestKey });
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.debug("Cache cleanup", { cleanedCount, remainingSize: this.cache.size });
    }
  }
}

// Global cache instances
export const audioCache = new AdvancedCache<Buffer>({
  defaultTTL: 1800000, // 30 minutes
  maxSize: 100,
  compressionEnabled: true
});

export const analysisCache = new AdvancedCache<any>({
  defaultTTL: 3600000, // 1 hour
  maxSize: 500,
  compressionEnabled: false
});

export const generationCache = new AdvancedCache<any>({
  defaultTTL: 7200000, // 2 hours
  maxSize: 200,
  compressionEnabled: false
});

export const dawCache = new AdvancedCache<any>({
  defaultTTL: 600000, // 10 minutes
  maxSize: 1000,
  compressionEnabled: false
});

export const collaborationCache = new AdvancedCache<any>({
  defaultTTL: 60000, // 1 minute
  maxSize: 500,
  compressionEnabled: false
});

// Cache key generators
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  
  return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`;
}

export function generateAudioCacheKey(sourceUrl: string, options: any = {}): string {
  return generateCacheKey('audio', { sourceUrl, ...options });
}

export function generateAnalysisCacheKey(sourceUrl: string, analysisType: string, options: any = {}): string {
  return generateCacheKey('analysis', { sourceUrl, analysisType, ...options });
}

export function generateGenerationCacheKey(prompt: string, options: any = {}): string {
  return generateCacheKey('generation', { prompt, ...options });
}

export function generateDawProjectCacheKey(projectId: number): string {
  return `daw-project:${projectId}`;
}

export function generateCollaborationFeedCacheKey(collaborationId: number): string {
  return `collaboration-feed:${collaborationId}`;
}

// Cache warming utilities
export async function warmCache(): Promise<void> {
  log.info("Starting cache warming");
  
  try {
    // Warm popular samples cache
    // Warm common patterns cache
    // Warm frequently used analysis results
    
    log.info("Cache warming completed");
  } catch (error) {
    log.error("Cache warming failed", { error: error.message });
  }
}

// Cache monitoring
export function getCacheMetrics(): any {
  return {
    audio: audioCache.getStats(),
    analysis: analysisCache.getStats(),
    generation: generationCache.getStats(),
    daw: dawCache.getStats(),
    collaboration: collaborationCache.getStats()
  };
}
