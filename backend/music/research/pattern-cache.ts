/**
 * Pattern Sparsity Cache
 * 
 * Intelligent caching system that exploits temporal and spatial sparsity
 * in music generation through pattern reuse.
 */

import log from "encore.dev/log";
import type { Genre, PatternCategory } from "../types";

/**
 * Cached pattern with signature for efficient lookup
 */
export interface CachedPattern {
  signature: string; // Unique pattern identifier
  type: PatternCategory;
  genre: Genre;
  audioBuffer: Buffer;
  metadata: {
    bpm?: number;
    keySignature?: string;
    duration: number;
    culturalScore: number;
  };
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
}

/**
 * Pattern generation request
 */
export interface PatternRequest {
  type: PatternCategory;
  genre: Genre;
  bpm?: number;
  keySignature?: string;
  culturalElements?: string[];
}

/**
 * Cache statistics for performance monitoring
 */
export interface CacheStatistics {
  totalPatterns: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageGenerationTime: number;
  averageCacheRetrievalTime: number;
  totalSizeMB: number;
  computationalSavings: number; // Percentage
}

/**
 * Pattern Sparsity Cache Engine
 * 
 * Implements intelligent caching with:
 * - Pattern signature generation
 * - LRU eviction policy
 * - Cultural element matching
 * - Performance metrics tracking
 */
export class PatternSparseCache {
  private cache: Map<string, CachedPattern> = new Map();
  private maxCacheSize: number;
  private maxCacheSizeMB: number;
  
  // Performance metrics
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private totalGenerationTime: number = 0;
  private totalCacheRetrievalTime: number = 0;
  
  constructor(
    maxPatterns: number = 1000,
    maxSizeMB: number = 500
  ) {
    this.maxCacheSize = maxPatterns;
    this.maxCacheSizeMB = maxSizeMB;
    
    log.info("Pattern Sparse Cache initialized", {
      maxPatterns,
      maxSizeMB
    });
  }

  /**
   * Generate unique signature for pattern request
   */
  private generateSignature(request: PatternRequest): string {
    const parts = [
      request.genre,
      request.type,
      request.bpm?.toString() || 'any',
      request.keySignature || 'any',
      (request.culturalElements || []).sort().join(',')
    ];
    
    return parts.join(':');
  }

  /**
   * Check if pattern exists in cache
   */
  async getFromCache(request: PatternRequest): Promise<CachedPattern | null> {
    const startTime = Date.now();
    const signature = this.generateSignature(request);
    
    const cached = this.cache.get(signature);
    const retrievalTime = Date.now() - startTime;
    
    this.totalCacheRetrievalTime += retrievalTime;
    
    if (cached) {
      this.cacheHits++;
      cached.usageCount++;
      cached.lastUsed = new Date();
      
      log.info("Cache HIT", {
        signature,
        usageCount: cached.usageCount,
        retrievalTime: retrievalTime + 'ms'
      });
      
      return cached;
    } else {
      this.cacheMisses++;
      
      log.info("Cache MISS", {
        signature,
        retrievalTime: retrievalTime + 'ms'
      });
      
      return null;
    }
  }

  /**
   * Generate new pattern and add to cache
   */
  async generateAndCache(
    request: PatternRequest
  ): Promise<CachedPattern> {
    const startTime = Date.now();
    const signature = this.generateSignature(request);
    
    // Simulate pattern generation
    // In production, this would call actual AI generation
    const audioBuffer = await this.simulateGeneration(request);
    
    const generationTime = Date.now() - startTime;
    this.totalGenerationTime += generationTime;
    
    const cached: CachedPattern = {
      signature,
      type: request.type,
      genre: request.genre,
      audioBuffer,
      metadata: {
        bpm: request.bpm,
        keySignature: request.keySignature,
        duration: 4.0, // 4 bars at typical BPM
        culturalScore: 0.85 + Math.random() * 0.15
      },
      usageCount: 1,
      lastUsed: new Date(),
      createdAt: new Date()
    };
    
    // Add to cache
    await this.addToCache(cached);
    
    log.info("Pattern generated and cached", {
      signature,
      generationTime: generationTime + 'ms',
      culturalScore: cached.metadata.culturalScore.toFixed(2)
    });
    
    return cached;
  }

  /**
   * Add pattern to cache with eviction if needed
   */
  private async addToCache(pattern: CachedPattern): Promise<void> {
    // Check if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      await this.evictLRU();
    }
    
    // Check total size
    const currentSizeMB = this.getTotalSizeMB();
    if (currentSizeMB >= this.maxCacheSizeMB) {
      await this.evictLRU();
    }
    
    this.cache.set(pattern.signature, pattern);
  }

  /**
   * Evict least recently used pattern
   */
  private async evictLRU(): Promise<void> {
    let oldestTime = Date.now();
    let oldestSignature: string | null = null;
    
    for (const [signature, pattern] of this.cache.entries()) {
      const lastUsedTime = pattern.lastUsed.getTime();
      if (lastUsedTime < oldestTime) {
        oldestTime = lastUsedTime;
        oldestSignature = signature;
      }
    }
    
    if (oldestSignature) {
      this.cache.delete(oldestSignature);
      log.info("Evicted LRU pattern", { signature: oldestSignature });
    }
  }

  /**
   * Get pattern with intelligent caching
   */
  async get(request: PatternRequest): Promise<CachedPattern> {
    // Try cache first
    const cached = await this.getFromCache(request);
    if (cached) {
      return cached;
    }
    
    // Generate new if not cached
    return await this.generateAndCache(request);
  }

  /**
   * Generate multiple patterns with batch optimization
   */
  async getBatch(
    requests: PatternRequest[]
  ): Promise<CachedPattern[]> {
    const results: CachedPattern[] = [];
    const toGenerate: PatternRequest[] = [];
    
    // Check cache for each request
    for (const request of requests) {
      const cached = await this.getFromCache(request);
      if (cached) {
        results.push(cached);
      } else {
        toGenerate.push(request);
      }
    }
    
    // Batch generate uncached patterns
    if (toGenerate.length > 0) {
      log.info("Batch generating patterns", {
        total: requests.length,
        cached: results.length,
        toGenerate: toGenerate.length,
        cacheEfficiency: ((results.length / requests.length) * 100).toFixed(1) + '%'
      });
      
      for (const request of toGenerate) {
        const generated = await this.generateAndCache(request);
        results.push(generated);
      }
    }
    
    return results;
  }

  /**
   * Simulate pattern generation
   */
  private async simulateGeneration(
    request: PatternRequest
  ): Promise<Buffer> {
    // Simulate generation time based on pattern complexity
    const complexity = request.type === 'chord_progression' ? 200 : 150;
    await new Promise(resolve => setTimeout(resolve, complexity));
    
    // Return simulated audio buffer
    const bufferSize = 44100 * 4; // 4 seconds at 44.1kHz
    return Buffer.alloc(bufferSize);
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    
    const averageGenerationTime = this.cacheMisses > 0
      ? this.totalGenerationTime / this.cacheMisses
      : 0;
    
    const averageCacheRetrievalTime = this.cacheHits > 0
      ? this.totalCacheRetrievalTime / this.cacheHits
      : 0;
    
    const computationalSavings = totalRequests > 0
      ? ((this.cacheHits * averageGenerationTime) / 
         (totalRequests * averageGenerationTime)) * 100
      : 0;
    
    return {
      totalPatterns: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate,
      averageGenerationTime,
      averageCacheRetrievalTime,
      totalSizeMB: this.getTotalSizeMB(),
      computationalSavings
    };
  }

  /**
   * Get total cache size in MB
   */
  private getTotalSizeMB(): number {
    let totalBytes = 0;
    for (const pattern of this.cache.values()) {
      totalBytes += pattern.audioBuffer.length;
    }
    return totalBytes / (1024 * 1024);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalGenerationTime = 0;
    this.totalCacheRetrievalTime = 0;
    
    log.info("Cache cleared");
  }

  /**
   * Warm up cache with common patterns
   */
  async warmUp(genre: Genre): Promise<void> {
    log.info("Warming up cache", { genre });
    
    const commonPatterns: PatternRequest[] = [
      // Common chord progressions
      { type: 'chord_progression', genre, keySignature: 'Cm' },
      { type: 'chord_progression', genre, keySignature: 'Fm' },
      { type: 'chord_progression', genre, keySignature: 'Am' },
      
      // Common drum patterns
      { type: 'drum_pattern', genre, bpm: 115 },
      { type: 'drum_pattern', genre, bpm: 118 },
      
      // Common bass patterns
      { type: 'bass_pattern', genre, keySignature: 'C' },
      { type: 'bass_pattern', genre, keySignature: 'F' }
    ];
    
    await this.getBatch(commonPatterns);
    
    log.info("Cache warm-up complete", {
      patternsLoaded: commonPatterns.length,
      cacheSize: this.cache.size
    });
  }

  /**
   * Get most used patterns
   */
  getMostUsedPatterns(limit: number = 10): CachedPattern[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Predict cache efficiency for a set of requests
   */
  predictEfficiency(requests: PatternRequest[]): {
    expectedHits: number;
    expectedMisses: number;
    estimatedTimeSavings: number;
  } {
    let expectedHits = 0;
    let expectedMisses = 0;
    
    for (const request of requests) {
      const signature = this.generateSignature(request);
      if (this.cache.has(signature)) {
        expectedHits++;
      } else {
        expectedMisses++;
      }
    }
    
    const stats = this.getStatistics();
    const estimatedTimeSavings = 
      expectedHits * (stats.averageGenerationTime - stats.averageCacheRetrievalTime);
    
    return {
      expectedHits,
      expectedMisses,
      estimatedTimeSavings
    };
  }
}

/**
 * Global pattern cache instance
 */
let globalPatternCache: PatternSparseCache | null = null;

/**
 * Get or create global pattern cache
 */
export function getPatternCache(): PatternSparseCache {
  if (!globalPatternCache) {
    globalPatternCache = new PatternSparseCache();
  }
  return globalPatternCache;
}

/**
 * Initialize pattern cache with warm-up
 */
export async function initializePatternCache(genre: Genre): Promise<PatternSparseCache> {
  const cache = getPatternCache();
  await cache.warmUp(genre);
  return cache;
}
