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
      const results = await musicDB.rawQueryAll<any>(
        `SELECT * FROM research_experiments
        ORDER BY created_at DESC
        LIMIT $1`,
        [limit]
      );
      
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
// Research Dashboard Endpoint
// ============================================================================

export const getResearchDashboard = api(
  { expose: true, method: "GET", path: "/research/dashboard" },
  async () => {
    try {
      log.info("Fetching research dashboard data");
      
      // Get aggregate statistics with fallback
      let stats;
      try {
        const collector = getMetricsCollector();
        stats = collector.getAggregateStatistics();
      } catch (err) {
        log.warn("Metrics collector not available, using defaults");
        stats = {
          totalExperiments: 0,
          averagePerformance: { latency: 0, throughput: 0, errorRate: 0 },
          averageCultural: { authenticity: 0, preservation: 0, innovation: 0 },
          averageQuality: { overall: 0, clarity: 0, coherence: 0 }
        };
      }
      
      // Get cache statistics with fallback
      let cacheStats;
      try {
        const cache = getPatternCache();
        cacheStats = cache.getStatistics();
      } catch (err) {
        log.warn("Pattern cache not available, using defaults");
        cacheStats = {
          totalPatterns: 0,
          cacheHits: 0,
          cacheMisses: 0,
          hitRate: 0,
          computationalSavings: 0
        };
      }
      
      // Get recent CAQ experiments
      const caqResults = await musicDB.rawQueryAll<any>(
        `SELECT * FROM caq_experiments ORDER BY created_at DESC LIMIT 10`
      );
      
      return {
        overview: {
          totalExperiments: stats.totalExperiments,
          activeExperiments: 0,
          completedExperiments: stats.totalExperiments,
          totalPublications: 0,
        },
        performance: {
          averageLatency: stats.averagePerformance.latencyMs || 0,
          averageThroughput: stats.averagePerformance.throughput || 0,
          averageCost: stats.averagePerformance.cost || 0,
          latencyReduction: 0,
          costReduction: 0,
        },
        cultural: {
          averageAuthenticity: stats.averageCultural.authenticityScore || 0,
          averagePreservation: stats.averageCultural.preservationRate || 0,
          totalValidations: 0,
          expertPanelSize: 0,
        },
        quality: {
          averageOverallScore: stats.averageQuality.overallScore || 0,
          averageTechnicalQuality: stats.averageQuality.technicalQuality || 0,
          averageMusicalCoherence: stats.averageQuality.musicalCoherence || 0,
          averageInnovation: 0,
        },
        caq: {
          totalExperiments: caqResults.length,
          averageCompression: caqResults.length > 0 
            ? caqResults.reduce((sum, r) => sum + (r.compression_ratio || 0), 0) / caqResults.length 
            : 0,
          averagePreservation: caqResults.length > 0
            ? caqResults.reduce((sum, r) => sum + (r.cultural_preservation || 0), 0) / caqResults.length
            : 0,
          efficiencyGain: 0,
        },
        cache: {
          averageHitRate: cacheStats.hitRate || 0,
          averageSavings: cacheStats.computationalSavings || 0,
          totalPatternsCached: cacheStats.totalPatterns || 0,
        },
        topExperiments: [],
      };
      
    } catch (error) {
      log.error("Failed to get research dashboard", { error: (error as Error).message, stack: (error as Error).stack });
      // Return empty dashboard instead of throwing
      return {
        overview: {
          totalExperiments: 0,
          activeExperiments: 0,
          completedExperiments: 0,
          totalPublications: 0,
        },
        performance: {
          averageLatency: 0,
          averageThroughput: 0,
          averageCost: 0,
          latencyReduction: 0,
          costReduction: 0,
        },
        cultural: {
          averageAuthenticity: 0,
          averagePreservation: 0,
          totalValidations: 0,
          expertPanelSize: 0,
        },
        quality: {
          averageOverallScore: 0,
          averageTechnicalQuality: 0,
          averageMusicalCoherence: 0,
          averageInnovation: 0,
        },
        caq: {
          totalExperiments: 0,
          averageCompression: 0,
          averagePreservation: 0,
          efficiencyGain: 0,
        },
        cache: {
          averageHitRate: 0,
          averageSavings: 0,
          totalPatternsCached: 0,
        },
        topExperiments: [],
      };
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

export const getResearchTimeSeries = api(
  { expose: true, method: "GET", path: "/research/dashboard/timeseries" },
  async ({ days = 30 }: { days?: number }) => {
    try {
      log.info("Fetching research time series", { days });
      
      try {
        const dashboardService = getDashboardService();
        const timeSeries = await dashboardService.getTimeSeriesData(days);
        return timeSeries;
      } catch (err) {
        log.warn("Dashboard service not available, returning empty time series");
        // Return empty time series data
        return {
          dates: [],
          experiments: [],
          cacheHits: [],
          qualityScores: [],
          culturalScores: []
        };
      }
      
    } catch (error) {
      log.error("Failed to get time series", { error: (error as Error).message });
      // Return empty data instead of throwing
      return {
        dates: [],
        experiments: [],
        cacheHits: [],
        qualityScores: [],
        culturalScores: []
      };
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

export const getLearningStatistics = api(
  { expose: true, method: "GET", path: "/research/learning/statistics" },
  async () => {
    try {
      log.info("Fetching learning statistics");
      
      // Get continuous learning stats from database
      const stats = await musicDB.rawQueryRow<any>(
        `SELECT COUNT(*) as total_sessions, AVG(duration_seconds) as avg_duration, 
         SUM(patterns_learned) as total_patterns_learned, AVG(improvement_score) as avg_improvement 
         FROM continuous_learning_sessions`
      );
      
      return {
        totalSessions: stats?.total_sessions || 0,
        averageDuration: stats?.avg_duration || 0,
        totalPatternsLearned: stats?.total_patterns_learned || 0,
        averageImprovement: stats?.avg_improvement || 0,
      };
      
    } catch (error) {
      log.error("Failed to get learning statistics", { error: (error as Error).message });
      // Return empty stats instead of throwing
      return {
        totalSessions: 0,
        averageDuration: 0,
        totalPatternsLearned: 0,
        averageImprovement: 0,
      };
    }
  }
);

export const getRecommenderStatistics = api(
  { expose: true, method: "GET", path: "/research/recommender/statistics" },
  async () => {
    try {
      log.info("Fetching recommender statistics");
      
      // Get pattern recommender stats - handle empty table gracefully
      const stats = await musicDB.rawQueryRow<any>(
        `SELECT 
          COUNT(*)::int as total_recommendations, 
          COALESCE(AVG(relevance_score), 0.0) as avg_relevance, 
          COALESCE(AVG(cultural_alignment), 0.0) as avg_cultural_alignment
         FROM pattern_recommendations`
      );
      
      // Count unique contexts separately to handle JSONB correctly
      const contextCount = await musicDB.rawQueryRow<any>(
        `SELECT COUNT(DISTINCT jsonb_typeof(user_context))::int as unique_contexts 
         FROM pattern_recommendations 
         WHERE user_context IS NOT NULL`
      );
      
      return {
        totalRecommendations: stats?.total_recommendations || 0,
        averageRelevance: parseFloat(stats?.avg_relevance || '0.0'),
        averageCulturalAlignment: parseFloat(stats?.avg_cultural_alignment || '0.0'),
        uniqueContexts: contextCount?.unique_contexts || 0,
      };
      
    } catch (error) {
      log.error("Failed to get recommender statistics", { error: (error as Error).message, stack: (error as Error).stack });
      // Return empty stats instead of throwing
      return {
        totalRecommendations: 0,
        averageRelevance: 0.0,
        averageCulturalAlignment: 0.0,
        uniqueContexts: 0,
      };
    }
  }
);

// ============================================================================
// DistriGen (Distributed Generation) Endpoints
// ============================================================================

import { DistriGen } from "./research/distrigen";

export interface RunDistriGenRequest {
  prompt: string;
  genre: Genre;
  numWorkers?: number;
  bpm?: number;
  keySignature?: string;
  duration?: number;
  culturalAuthenticity?: string;
}

export interface RunDistriGenResponse {
  generationId: string;
  stems: Record<string, string>;
  totalLatency: number;
  averageWorkerLatency: number;
  parallelizationGain: number;
  qualityMetrics: {
    overallQuality: number;
    culturalAuthenticity: number;
    stemQualityScores: Record<string, number>;
  };
  workerStats: Array<{
    workerId: number;
    tasksCompleted: number;
    averageLatency: number;
    successRate: number;
  }>;
}

export const runDistriGenExperiment = api<RunDistriGenRequest, RunDistriGenResponse>(
  { expose: true, method: "POST", path: "/research/distrigen/run" },
  async (req) => {
    try {
      log.info("Starting DistriGen experiment", {
        prompt: req.prompt.substring(0, 50),
        genre: req.genre,
        numWorkers: req.numWorkers
      });

      const distriGen = new DistriGen({ numWorkers: req.numWorkers });

      const result = await distriGen.generateDistributed(
        req.prompt,
        req.genre,
        {
          bpm: req.bpm,
          keySignature: req.keySignature,
          duration: req.duration,
          culturalAuthenticity: req.culturalAuthenticity
        }
      );

      await musicDB.exec`
        INSERT INTO distrigen_stats (
          generation_id,
          num_workers,
          total_latency_ms,
          average_worker_latency_ms,
          parallelization_gain,
          overall_quality,
          cultural_authenticity,
          stem_quality_scores,
          worker_stats,
          created_at
        ) VALUES (
          ${result.generationId},
          ${req.numWorkers || 4},
          ${result.totalLatency},
          ${result.averageWorkerLatency},
          ${result.parallelizationGain},
          ${result.qualityMetrics.overallQuality},
          ${result.qualityMetrics.culturalAuthenticity},
          ${JSON.stringify(result.qualityMetrics.stemQualityScores)},
          ${JSON.stringify(result.workerStats)},
          NOW()
        )
      `;

      const stems: Record<string, string> = {};
      for (const [stemType, buffer] of Object.entries(result.stems)) {
        stems[stemType] = buffer.toString('base64');
      }

      return {
        generationId: result.generationId,
        stems,
        totalLatency: result.totalLatency,
        averageWorkerLatency: result.averageWorkerLatency,
        parallelizationGain: result.parallelizationGain,
        qualityMetrics: result.qualityMetrics,
        workerStats: result.workerStats
      };

    } catch (error) {
      log.error("DistriGen experiment failed", { error: (error as Error).message });
      throw APIError.internal("Failed to run DistriGen experiment");
    }
  }
);

export const getDistriGenScalingAnalysis = api(
  { expose: true, method: "POST", path: "/research/distrigen/scaling" },
  async ({ gpuCounts }: { gpuCounts: number[] }) => {
    try {
      const distriGen = new DistriGen();
      const analysis = await distriGen.getScalingAnalysis(gpuCounts || [1, 2, 4, 8]);

      return analysis;

    } catch (error) {
      log.error("Scaling analysis failed", { error: (error as Error).message });
      throw APIError.internal("Failed to perform scaling analysis");
    }
  }
);

// ============================================================================
// Continuous Learning Endpoints
// ============================================================================

import { continuousLearning } from "./research/continuous-learning";

export interface CollectLearningExampleRequest {
  generationId: string;
  audioData: string;
  metadata: {
    genre: Genre;
    qualityScore: number;
    culturalScore: number;
    bpm?: number;
    keySignature?: string;
    complexity?: string;
    culturalElements?: string[];
  };
}

export const collectLearningExample = api<CollectLearningExampleRequest>(
  { expose: true, method: "POST", path: "/research/learning/collect" },
  async (req) => {
    try {
      const audioBuffer = Buffer.from(req.audioData, 'base64');
      
      const example = await continuousLearning.collectLearningExample(
        req.generationId,
        audioBuffer,
        req.metadata
      );

      return {
        exampleId: example.exampleId,
        collected: true,
        totalExamples: continuousLearning.getStatistics().totalLearningExamples
      };

    } catch (error) {
      log.error("Failed to collect learning example", { error: (error as Error).message });
      throw APIError.internal("Failed to collect learning example");
    }
  }
);

export interface CollectFeedbackRequest {
  generationId: string;
  signalType: 'user_rating' | 'expert_validation' | 'objective_metric' | 'cultural_assessment';
  signalValue: number;
  signalData?: any;
}

export const collectFeedback = api<CollectFeedbackRequest>(
  { expose: true, method: "POST", path: "/research/learning/feedback" },
  async (req) => {
    try {
      const signal = await continuousLearning.collectFeedbackSignal(
        req.generationId,
        req.signalType,
        req.signalValue,
        req.signalData
      );

      return {
        signalId: signal.signalId,
        collected: true,
        weight: signal.weight
      };

    } catch (error) {
      log.error("Failed to collect feedback", { error: (error as Error).message });
      throw APIError.internal("Failed to collect feedback signal");
    }
  }
);

export const triggerModelAdaptation = api(
  { expose: true, method: "POST", path: "/research/learning/adapt" },
  async ({ modelType, adaptationType }: {
    modelType?: 'generation' | 'cultural_validation' | 'quality_assessment';
    adaptationType?: 'fine_tuning' | 'reinforcement' | 'expert_guided';
  }) => {
    try {
      const session = await continuousLearning.triggerAdaptation(
        modelType || 'generation',
        adaptationType || 'fine_tuning'
      );

      return {
        sessionId: session.sessionId,
        modelVersion: session.modelVersion,
        status: session.status,
        examplesUsed: session.examplesUsed,
        performanceImprovement: session.performanceImprovement,
        trainingDuration: session.trainingDuration
      };

    } catch (error) {
      log.error("Model adaptation failed", { error: (error as Error).message });
      throw APIError.internal("Failed to trigger model adaptation");
    }
  }
);

export const getAdaptationRecommendations = api(
  { expose: true, method: "GET", path: "/research/learning/recommendations" },
  async () => {
    try {
      const recommendations = await continuousLearning.getAdaptationRecommendations();
      return recommendations;

    } catch (error) {
      log.error("Failed to get recommendations", { error: (error as Error).message });
      throw APIError.internal("Failed to get adaptation recommendations");
    }
  }
);

// ============================================================================
// Pattern Recommendation Endpoints
// ============================================================================

import { patternRecommender } from "./research/pattern-recommender";
import type { PatternContext } from "./research/pattern-recommender";

export interface GetPatternRecommendationsRequest {
  context: PatternContext;
  limit?: number;
}

export const getPatternRecommendations = api<GetPatternRecommendationsRequest>(
  { expose: true, method: "POST", path: "/research/patterns/recommend" },
  async (req) => {
    try {
      const recommendations = await patternRecommender.getRecommendations(
        req.context,
        req.limit || 10
      );

      return recommendations;

    } catch (error) {
      log.error("Failed to get pattern recommendations", { error: (error as Error).message });
      throw APIError.internal("Failed to get pattern recommendations");
    }
  }
);

export const trackPatternUsage = api(
  { expose: true, method: "POST", path: "/research/patterns/track" },
  async ({ patternId, success }: { patternId: string; success: boolean }) => {
    try {
      await patternRecommender.trackPatternUsage(patternId, success);

      return { tracked: true };

    } catch (error) {
      log.error("Failed to track pattern usage", { error: (error as Error).message });
      throw APIError.internal("Failed to track pattern usage");
    }
  }
);
