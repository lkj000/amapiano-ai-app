/**
 * Research Metrics Collection System
 * 
 * Comprehensive performance and quality tracking for doctoral research experiments.
 */

import log from "encore.dev/log";
import { musicDB } from "../db";
import type { Genre } from "../types";

/**
 * Performance metrics for generation operations
 */
export interface PerformanceMetrics {
  operationId: string;
  operationType: 'generation' | 'analysis' | 'quantization' | 'caching';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  
  // Resource usage
  cpuUsage?: number; // Percentage
  memoryUsageMB?: number;
  gpuUsage?: number; // Percentage
  
  // Efficiency metrics
  throughput?: number; // Operations per second
  latency?: number; // Milliseconds
  costUSD?: number; // Estimated cloud cost
}

/**
 * Cultural authenticity metrics
 */
export interface CulturalMetrics {
  operationId: string;
  genre: Genre;
  authenticityScore: number; // 0-1
  
  // Element-specific scores
  rhythmicAuthenticity: number;
  harmonicAuthenticity: number;
  melodicAuthenticity: number;
  timbralAuthenticity: number;
  
  // Cultural elements detected
  culturalElementsDetected: string[];
  culturalElementsPreserved: string[];
  
  // Expert validation
  expertValidated: boolean;
  expertScore?: number; // 0-10 from expert panel
  expertComments?: string;
}

/**
 * Quality assessment metrics
 */
export interface QualityMetrics {
  operationId: string;
  
  // Overall quality
  overallScore: number; // 0-1
  
  // Dimension scores
  technicalQuality: number; // Audio fidelity, clarity
  musicalCoherence: number; // Musical structure, flow
  culturalAuthenticity: number; // From CulturalMetrics
  educationalValue: number; // Learning potential
  innovationScore: number; // Creative originality
  
  // Objective measurements
  pesqScore?: number; // Perceptual quality
  stoiScore?: number; // Speech/audio intelligibility
  snrDB?: number; // Signal-to-noise ratio
}

/**
 * Experimental results for research tracking
 */
export interface ExperimentResult {
  experimentId: string;
  experimentName: string;
  configuration: Record<string, any>;
  timestamp: Date;
  
  // Metrics
  performance: PerformanceMetrics;
  cultural: CulturalMetrics;
  quality: QualityMetrics;
  
  // Comparisons
  baselineComparison?: {
    performanceImprovement: number; // Percentage
    culturalImprovement: number;
    qualityImprovement: number;
  };
  
  // Research notes
  notes?: string;
  tags?: string[];
}

/**
 * Metrics tracking system for research experiments
 */
export class ResearchMetricsCollector {
  private experiments: Map<string, ExperimentResult> = new Map();
  private activeOperations: Map<string, Date> = new Map();
  
  /**
   * Start tracking an operation
   */
  startOperation(
    operationId: string,
    operationType: PerformanceMetrics['operationType']
  ): void {
    this.activeOperations.set(operationId, new Date());
    
    log.info("Operation started", {
      operationId,
      operationType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * End tracking and record performance metrics
   */
  endOperation(
    operationId: string,
    operationType: PerformanceMetrics['operationType'],
    metadata?: Partial<PerformanceMetrics>
  ): PerformanceMetrics {
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      throw new Error(`Operation ${operationId} not found`);
    }
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    
    const metrics: PerformanceMetrics = {
      operationId,
      operationType,
      startTime,
      endTime,
      durationMs,
      ...metadata
    };
    
    this.activeOperations.delete(operationId);
    
    log.info("Operation completed", {
      operationId,
      operationType,
      durationMs,
      ...metadata
    });
    
    return metrics;
  }

  /**
   * Record cultural authenticity metrics
   */
  recordCulturalMetrics(metrics: CulturalMetrics): void {
    log.info("Cultural metrics recorded", {
      operationId: metrics.operationId,
      genre: metrics.genre,
      authenticityScore: (metrics.authenticityScore * 100).toFixed(1) + '%',
      elementsDetected: metrics.culturalElementsDetected.length,
      elementsPreserved: metrics.culturalElementsPreserved.length,
      expertValidated: metrics.expertValidated
    });
  }

  /**
   * Record quality assessment metrics
   */
  recordQualityMetrics(metrics: QualityMetrics): void {
    log.info("Quality metrics recorded", {
      operationId: metrics.operationId,
      overallScore: (metrics.overallScore * 100).toFixed(1) + '%',
      technicalQuality: metrics.technicalQuality.toFixed(2),
      musicalCoherence: metrics.musicalCoherence.toFixed(2),
      culturalAuthenticity: metrics.culturalAuthenticity.toFixed(2)
    });
  }

  /**
   * Record complete experiment result
   */
  async recordExperiment(result: ExperimentResult): Promise<void> {
    this.experiments.set(result.experimentId, result);
    
    // Store in database for persistence
    await musicDB.exec`
      INSERT INTO research_experiments (
        experiment_id,
        experiment_name,
        configuration,
        performance_metrics,
        cultural_metrics,
        quality_metrics,
        baseline_comparison,
        notes,
        tags,
        created_at
      ) VALUES (
        ${result.experimentId},
        ${result.experimentName},
        ${JSON.stringify(result.configuration)},
        ${JSON.stringify(result.performance)},
        ${JSON.stringify(result.cultural)},
        ${JSON.stringify(result.quality)},
        ${JSON.stringify(result.baselineComparison || null)},
        ${result.notes || ''},
        ${JSON.stringify(result.tags || [])},
        ${result.timestamp}
      )
      ON CONFLICT (experiment_id) DO UPDATE SET
        performance_metrics = EXCLUDED.performance_metrics,
        cultural_metrics = EXCLUDED.cultural_metrics,
        quality_metrics = EXCLUDED.quality_metrics,
        updated_at = NOW()
    `;
    
    log.info("Experiment recorded", {
      experimentId: result.experimentId,
      experimentName: result.experimentName,
      overallScore: (result.quality.overallScore * 100).toFixed(1) + '%',
      durationMs: result.performance.durationMs
    });
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ExperimentResult | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): ExperimentResult[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Calculate aggregate statistics across experiments
   */
  getAggregateStatistics(): {
    totalExperiments: number;
    averagePerformance: {
      latencyMs: number;
      throughput: number;
      cost: number;
    };
    averageCultural: {
      authenticityScore: number;
      preservationRate: number;
    };
    averageQuality: {
      overallScore: number;
      technicalQuality: number;
      musicalCoherence: number;
    };
    bestExperiment: ExperimentResult | null;
  } {
    const experiments = this.getAllExperiments();
    
    if (experiments.length === 0) {
      return {
        totalExperiments: 0,
        averagePerformance: { latencyMs: 0, throughput: 0, cost: 0 },
        averageCultural: { authenticityScore: 0, preservationRate: 0 },
        averageQuality: { overallScore: 0, technicalQuality: 0, musicalCoherence: 0 },
        bestExperiment: null
      };
    }
    
    // Calculate averages
    let totalLatency = 0;
    let totalThroughput = 0;
    let totalCost = 0;
    let totalAuthenticity = 0;
    let totalPreservation = 0;
    let totalQuality = 0;
    let totalTechnical = 0;
    let totalCoherence = 0;
    
    for (const exp of experiments) {
      totalLatency += exp.performance.durationMs;
      totalThroughput += exp.performance.throughput || 0;
      totalCost += exp.performance.costUSD || 0;
      totalAuthenticity += exp.cultural.authenticityScore;
      
      const preservationRate = exp.cultural.culturalElementsPreserved.length /
        Math.max(exp.cultural.culturalElementsDetected.length, 1);
      totalPreservation += preservationRate;
      
      totalQuality += exp.quality.overallScore;
      totalTechnical += exp.quality.technicalQuality;
      totalCoherence += exp.quality.musicalCoherence;
    }
    
    const count = experiments.length;
    
    // Find best experiment (highest quality score)
    const bestExperiment = experiments.reduce((best, current) =>
      current.quality.overallScore > best.quality.overallScore ? current : best
    );
    
    return {
      totalExperiments: count,
      averagePerformance: {
        latencyMs: totalLatency / count,
        throughput: totalThroughput / count,
        cost: totalCost / count
      },
      averageCultural: {
        authenticityScore: totalAuthenticity / count,
        preservationRate: totalPreservation / count
      },
      averageQuality: {
        overallScore: totalQuality / count,
        technicalQuality: totalTechnical / count,
        musicalCoherence: totalCoherence / count
      },
      bestExperiment
    };
  }

  /**
   * Compare experiment against baseline
   */
  compareToBaseline(
    experimentId: string,
    baselineId: string
  ): {
    performanceImprovement: number;
    culturalImprovement: number;
    qualityImprovement: number;
    efficiencyGain: number;
  } {
    const experiment = this.experiments.get(experimentId);
    const baseline = this.experiments.get(baselineId);
    
    if (!experiment || !baseline) {
      throw new Error('Experiment or baseline not found');
    }
    
    const performanceImprovement = 
      ((baseline.performance.durationMs - experiment.performance.durationMs) / 
       baseline.performance.durationMs) * 100;
    
    const culturalImprovement = 
      ((experiment.cultural.authenticityScore - baseline.cultural.authenticityScore) / 
       baseline.cultural.authenticityScore) * 100;
    
    const qualityImprovement = 
      ((experiment.quality.overallScore - baseline.quality.overallScore) / 
       baseline.quality.overallScore) * 100;
    
    // Efficiency = Quality / (Latency × Cost)
    const experimentEfficiency = 
      experiment.quality.overallScore / 
      (experiment.performance.durationMs * (experiment.performance.costUSD || 1));
    
    const baselineEfficiency = 
      baseline.quality.overallScore / 
      (baseline.performance.durationMs * (baseline.performance.costUSD || 1));
    
    const efficiencyGain = 
      ((experimentEfficiency - baselineEfficiency) / baselineEfficiency) * 100;
    
    return {
      performanceImprovement,
      culturalImprovement,
      qualityImprovement,
      efficiencyGain
    };
  }

  /**
   * Generate research report
   */
  generateReport(): string {
    const stats = this.getAggregateStatistics();
    
    const report = `
# Research Metrics Report
Generated: ${new Date().toISOString()}

## Overview
- Total Experiments: ${stats.totalExperiments}
- Best Experiment: ${stats.bestExperiment?.experimentName || 'N/A'}

## Average Performance
- Latency: ${stats.averagePerformance.latencyMs.toFixed(0)}ms
- Throughput: ${stats.averagePerformance.throughput.toFixed(2)} ops/sec
- Cost: $${stats.averagePerformance.cost.toFixed(4)} per operation

## Average Cultural Authenticity
- Authenticity Score: ${(stats.averageCultural.authenticityScore * 100).toFixed(1)}%
- Preservation Rate: ${(stats.averageCultural.preservationRate * 100).toFixed(1)}%

## Average Quality
- Overall Score: ${(stats.averageQuality.overallScore * 100).toFixed(1)}%
- Technical Quality: ${(stats.averageQuality.technicalQuality * 100).toFixed(1)}%
- Musical Coherence: ${(stats.averageQuality.musicalCoherence * 100).toFixed(1)}%

## Best Experiment Details
${stats.bestExperiment ? `
- Name: ${stats.bestExperiment.experimentName}
- Quality Score: ${(stats.bestExperiment.quality.overallScore * 100).toFixed(1)}%
- Latency: ${stats.bestExperiment.performance.durationMs}ms
- Cultural Score: ${(stats.bestExperiment.cultural.authenticityScore * 100).toFixed(1)}%
` : 'No experiments recorded'}
    `.trim();
    
    return report;
  }
}

/**
 * Global metrics collector instance
 */
let globalMetricsCollector: ResearchMetricsCollector | null = null;

/**
 * Get or create global metrics collector
 */
export function getMetricsCollector(): ResearchMetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new ResearchMetricsCollector();
  }
  return globalMetricsCollector;
}
