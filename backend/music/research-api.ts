/**
 * Research API Endpoints
 * 
 * API endpoints for doctoral thesis research experiments, metrics collection,
 * and analysis.
 */

import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { musicDB } from "./db";
import { CAQEngine, createCAQEngine } from "./research/caq";
import { getPatternCache, initializePatternCache } from "./research/pattern-cache";
import { getMetricsCollector } from "./research/metrics";
import { getQualityEngine } from "./research/quality-assessment";
import { getDashboardService } from "./research/dashboard";
import type { Genre } from "./types";
import type { 
  ExperimentResult, 
  PerformanceMetrics, 
  CulturalMetrics, 
  QualityMetrics 
} from "./research/metrics";

// ============================================================================
// CAQ (Culturally-Aware Quantization) Endpoints
// ============================================================================

export interface RunCAQRequest {
  genre: Genre;
  audioData?: string; // Base64 encoded audio (optional for demo)
  compareToNaive?: boolean;
}

export interface RunCAQResponse {
  experimentId: string;
  caqResult: {
    compressionRatio: number;
    culturalPreservation: number;
    processingTime: number;
    metrics: {
      originalSize: number;
      compressedSize: number;
      culturalElementsDetected: number;
      culturalElementsPreserved: number;
    };
  };
  naiveResult?: {
    compressionRatio: number;
    culturalPreservation: number;
    processingTime: number;
  };
  improvement?: {
    compressionDiff: number;
    culturalDiff: number;
    efficiencyGain: number;
  };
}

export const runCAQExperiment = api<RunCAQRequest, RunCAQResponse>(
  { expose: true, method: "POST", path: "/research/caq/run" },
  async (req) => {
    try {
      log.info("Starting CAQ experiment", { genre: req.genre });
      
      // Create CAQ engine
      const caqEngine = createCAQEngine(req.genre);
      
      // Generate sample audio data if not provided
      const audioData = req.audioData 
        ? Buffer.from(req.audioData, 'base64')
        : Buffer.alloc(44100 * 10); // 10 seconds of silence
      
      // Run experiment
      let caqResult;
      let naiveResult;
      let improvement;
      
      if (req.compareToNaive) {
        const comparison = await caqEngine.compareQuantizationMethods(audioData);
        caqResult = comparison.caq;
        naiveResult = comparison.naive;
        improvement = comparison.improvement;
      } else {
        caqResult = await caqEngine.quantize(audioData);
      }
      
      // Generate experiment ID
      const experimentId = `caq_${req.genre}_${Date.now()}`;
      
      // Store results in database
      await musicDB.exec`
        INSERT INTO caq_experiments (
          experiment_id,
          genre,
          precision_bits,
          cultural_weight,
          adaptive_bins,
          compression_ratio,
          cultural_preservation,
          processing_time_ms,
          original_size_bytes,
          compressed_size_bytes,
          cultural_elements_detected,
          cultural_elements_preserved,
          naive_compression_ratio,
          naive_cultural_preservation,
          improvement_percentage
        ) VALUES (
          ${experimentId},
          ${req.genre},
          ${8}, -- Mixed precision (4-8 bits)
          ${0.9},
          ${true},
          ${caqResult.compressionRatio},
          ${caqResult.culturalPreservation},
          ${caqResult.processingTime},
          ${caqResult.metrics.originalSize},
          ${caqResult.metrics.compressedSize},
          ${caqResult.metrics.culturalElementsDetected},
          ${caqResult.metrics.culturalElementsPreserved},
          ${naiveResult?.compressionRatio || null},
          ${naiveResult?.culturalPreservation || null},
          ${improvement ? improvement.efficiencyGain * 100 : null}
        )
      `;
      
      log.info("CAQ experiment complete", {
        experimentId,
        compressionRatio: caqResult.compressionRatio.toFixed(2),
        culturalPreservation: (caqResult.culturalPreservation * 100).toFixed(1) + '%'
      });
      
      return {
        experimentId,
        caqResult,
        naiveResult,
        improvement
      };
      
    } catch (error) {
      log.error("CAQ experiment failed", { error: (error as Error).message });
      throw APIError.internal("Failed to run CAQ experiment");
    }
  }
);

export const getCAQResults = api(
  { expose: true, method: "GET", path: "/research/caq/results" },
  async ({ genre, limit = 10 }: { genre?: Genre; limit?: number }) => {
    try {
      let query = `
        SELECT * FROM caq_experiments
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (genre) {
        query += ` AND genre = $1`;
        params.push(genre);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ${limit}`;
      
      const results = await musicDB.rawQueryAll<any>(query, ...params);
      
      return { results, total: results.length };
      
    } catch (error) {
      log.error("Failed to get CAQ results", { error: (error as Error).message });
      throw APIError.internal("Failed to get CAQ results");
    }
  }
);

// ============================================================================
// Pattern Cache Endpoints
// ============================================================================

export const initPatternCache = api(
  { expose: true, method: "POST", path: "/research/cache/init" },
  async ({ genre }: { genre: Genre }) => {
    try {
      log.info("Initializing pattern cache", { genre });
      
      const cache = await initializePatternCache(genre);
      const stats = cache.getStatistics();
      
      return {
        initialized: true,
        statistics: stats
      };
      
    } catch (error) {
      log.error("Failed to initialize cache", { error: (error as Error).message });
      throw APIError.internal("Failed to initialize pattern cache");
    }
  }
);

export const getCacheStatistics = api(
  { expose: true, method: "GET", path: "/research/cache/statistics" },
  async () => {
    try {
      const cache = getPatternCache();
      const stats = cache.getStatistics();
      
      // Store metrics in database
      await musicDB.exec`
        INSERT INTO pattern_cache_metrics (
          metric_id,
          total_patterns,
          cache_hits,
          cache_misses,
          hit_rate,
          avg_generation_time_ms,
          avg_cache_retrieval_time_ms,
          total_size_mb,
          computational_savings_percent,
          max_cache_size,
          max_cache_size_mb
        ) VALUES (
          ${'cache_' + Date.now()},
          ${stats.totalPatterns},
          ${stats.cacheHits},
          ${stats.cacheMisses},
          ${stats.hitRate},
          ${stats.averageGenerationTime},
          ${stats.averageCacheRetrievalTime},
          ${stats.totalSizeMB},
          ${stats.computationalSavings},
          ${1000},
          ${500}
        )
      `;
      
      return { statistics: stats };
      
    } catch (error) {
      log.error("Failed to get cache statistics", { error: (error as Error).message });
      throw APIError.internal("Failed to get cache statistics");
    }
  }
);

// ============================================================================
// Research Metrics Endpoints
// ============================================================================

export const recordExperiment = api<ExperimentResult, { success: boolean }>(
  { expose: true, method: "POST", path: "/research/experiments" },
  async (req) => {
    try {
      const collector = getMetricsCollector();
      await collector.recordExperiment(req);
      
      return { success: true };
      
    } catch (error) {
      log.error("Failed to record experiment", { error: (error as Error).message });
      throw APIError.internal("Failed to record experiment");
    }
  }
);

export const getExperiments = api(
  { expose: true, method: "GET", path: "/research/experiments" },
  async ({ limit = 50 }: { limit?: number }) => {
    try {
      const results = await musicDB.rawQueryAll<any>`
        SELECT * FROM research_experiments
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return { experiments: results, total: results.length };
      
    } catch (error) {
      log.error("Failed to get experiments", { error: (error as Error).message });
      throw APIError.internal("Failed to get experiments");
    }
  }
);

export const getExperimentMetrics = api(
  { expose: true, method: "GET", path: "/research/experiments/metrics" },
  async () => {
    try {
      const collector = getMetricsCollector();
      const stats = collector.getAggregateStatistics();
      
      return {
        totalExperiments: stats.totalExperiments,
        averagePerformance: stats.averagePerformance,
        averageCultural: stats.averageCultural,
        averageQuality: stats.averageQuality,
        bestExperiment: stats.bestExperiment
      };
      
    } catch (error) {
      log.error("Failed to get metrics", { error: (error as Error).message });
      throw APIError.internal("Failed to get experiment metrics");
    }
  }
);

export const compareExperiments = api(
  { expose: true, method: "GET", path: "/research/experiments/compare" },
  async ({ experimentId, baselineId }: { experimentId: string; baselineId: string }) => {
    try {
      const collector = getMetricsCollector();
      const comparison = collector.compareToBaseline(experimentId, baselineId);
      
      return {
        experimentId,
        baselineId,
        comparison
      };
      
    } catch (error) {
      log.error("Failed to compare experiments", { error: (error as Error).message });
      throw APIError.internal("Failed to compare experiments");
    }
  }
);

// ============================================================================
// Performance Benchmarks
// ============================================================================

export interface RecordBenchmarkRequest {
  systemName: string;
  hardwareConfig: Record<string, any>;
  softwareConfig: Record<string, any>;
  latencyMs: number;
  throughput?: number;
  costPerOperation?: number;
  cpuUsage?: number;
  memoryUsageMB?: number;
  gpuUsage?: number;
  qualityScore: number;
  culturalScore: number;
}

export const recordBenchmark = api<RecordBenchmarkRequest, { benchmarkId: string }>(
  { expose: true, method: "POST", path: "/research/benchmarks" },
  async (req) => {
    try {
      const benchmarkId = `bench_${req.systemName}_${Date.now()}`;
      
      // Calculate efficiency score
      const efficiency = req.qualityScore / 
        (req.latencyMs * (req.costPerOperation || 1));
      
      await musicDB.exec`
        INSERT INTO performance_benchmarks (
          benchmark_id,
          system_name,
          hardware_config,
          software_config,
          latency_ms,
          throughput_ops_per_sec,
          cost_per_operation,
          cpu_usage_percent,
          memory_usage_mb,
          gpu_usage_percent,
          quality_score,
          cultural_score,
          efficiency_score
        ) VALUES (
          ${benchmarkId},
          ${req.systemName},
          ${JSON.stringify(req.hardwareConfig)},
          ${JSON.stringify(req.softwareConfig)},
          ${req.latencyMs},
          ${req.throughput || null},
          ${req.costPerOperation || null},
          ${req.cpuUsage || null},
          ${req.memoryUsageMB || null},
          ${req.gpuUsage || null},
          ${req.qualityScore},
          ${req.culturalScore},
          ${efficiency}
        )
      `;
      
      log.info("Benchmark recorded", {
        benchmarkId,
        systemName: req.systemName,
        efficiency: efficiency.toFixed(6)
      });
      
      return { benchmarkId };
      
    } catch (error) {
      log.error("Failed to record benchmark", { error: (error as Error).message });
      throw APIError.internal("Failed to record benchmark");
    }
  }
);

export const getBenchmarks = api(
  { expose: true, method: "GET", path: "/research/benchmarks" },
  async ({ systemName, limit = 20 }: { systemName?: string; limit?: number }) => {
    try {
      let query = `
        SELECT * FROM performance_benchmarks
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (systemName) {
        query += ` AND system_name = $1`;
        params.push(systemName);
      }
      
      query += ` ORDER BY efficiency_score DESC LIMIT ${limit}`;
      
      const benchmarks = await musicDB.rawQueryAll<any>(query, ...params);
      
      return { benchmarks, total: benchmarks.length };
      
    } catch (error) {
      log.error("Failed to get benchmarks", { error: (error as Error).message });
      throw APIError.internal("Failed to get benchmarks");
    }
  }
);

// ============================================================================
// Research Report Generation
// ============================================================================

export const generateResearchReport = api(
  { expose: true, method: "GET", path: "/research/report" },
  async () => {
    try {
      const collector = getMetricsCollector();
      const report = collector.generateReport();
      
      // Get additional statistics from database
      const caqStats = await musicDB.queryRow<any>`
        SELECT 
          AVG(compression_ratio) as avg_compression,
          AVG(cultural_preservation) as avg_preservation,
          COUNT(*) as total_experiments
        FROM caq_experiments
      `;
      
      const cacheStats = await musicDB.queryRow<any>`
        SELECT 
          AVG(hit_rate) as avg_hit_rate,
          AVG(computational_savings_percent) as avg_savings
        FROM pattern_cache_metrics
        ORDER BY measured_at DESC
        LIMIT 10
      `;
      
      const enhancedReport = `
${report}

## CAQ Performance
- Total CAQ Experiments: ${caqStats?.total_experiments || 0}
- Average Compression: ${caqStats ? caqStats.avg_compression.toFixed(2) : 'N/A'}x
- Average Cultural Preservation: ${caqStats ? (caqStats.avg_preservation * 100).toFixed(1) : 'N/A'}%

## Pattern Cache Performance
- Average Hit Rate: ${cacheStats ? (cacheStats.avg_hit_rate * 100).toFixed(1) : 'N/A'}%
- Average Computational Savings: ${cacheStats ? cacheStats.avg_savings.toFixed(1) : 'N/A'}%
      `.trim();
      
      return { report: enhancedReport };
      
    } catch (error) {
      log.error("Failed to generate report", { error: (error as Error).message });
      throw APIError.internal("Failed to generate research report");
    }
  }
);

// ============================================================================
// Research Dashboard
// ============================================================================

export const getResearchDashboard = api(
  { expose: true, method: "GET", path: "/research/dashboard" },
  async () => {
    try {
      const dashboardService = getDashboardService();
      const dashboard = await dashboardService.getDashboard();
      
      return dashboard;
      
    } catch (error) {
      log.error("Failed to get dashboard", { error: (error as Error).message });
      throw APIError.internal("Failed to get research dashboard");
    }
  }
);

export const getResearchTimeSeries = api(
  { expose: true, method: "GET", path: "/research/dashboard/timeseries" },
  async ({ days = 30 }: { days?: number }) => {
    try {
      const dashboardService = getDashboardService();
      const timeSeries = await dashboardService.getTimeSeriesData(days);
      
      return timeSeries;
      
    } catch (error) {
      log.error("Failed to get time series", { error: (error as Error).message });
      throw APIError.internal("Failed to get time series data");
    }
  }
);

export const getResearchSummary = api(
  { expose: true, method: "GET", path: "/research/summary" },
  async () => {
    try {
      const dashboardService = getDashboardService();
      const summary = await dashboardService.generateSummary();
      
      return { summary };
      
    } catch (error) {
      log.error("Failed to generate summary", { error: (error as Error).message });
      throw APIError.internal("Failed to generate research summary");
    }
  }
);
