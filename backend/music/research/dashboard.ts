/**
 * Research Dashboard Data Aggregation
 * 
 * Provides comprehensive research metrics and visualizations for
 * doctoral thesis experiments.
 */

import log from "encore.dev/log";
import { musicDB } from "../db";

/**
 * Dashboard overview data
 */
export interface ResearchDashboard {
  overview: {
    totalExperiments: number;
    activeExperiments: number;
    completedExperiments: number;
    totalPublications: number;
  };
  
  performance: {
    averageLatency: number;
    averageThroughput: number;
    averageCost: number;
    latencyReduction: number; // vs baseline
    costReduction: number; // vs baseline
  };
  
  cultural: {
    averageAuthenticity: number;
    averagePreservation: number;
    totalValidations: number;
    expertPanelSize: number;
  };
  
  quality: {
    averageOverallScore: number;
    averageTechnicalQuality: number;
    averageMusicalCoherence: number;
    averageInnovation: number;
  };
  
  caq: {
    totalExperiments: number;
    averageCompression: number;
    averagePreservation: number;
    efficiencyGain: number;
  };
  
  cache: {
    averageHitRate: number;
    averageSavings: number;
    totalPatternsCached: number;
  };
  
  topExperiments: Array<{
    experimentId: string;
    experimentName: string;
    overallScore: number;
    culturalScore: number;
    latencyMs: number;
  }>;
}

/**
 * Time series data for visualizations
 */
export interface TimeSeriesData {
  timestamps: Date[];
  latency: number[];
  cultural: number[];
  quality: number[];
  cost: number[];
}

/**
 * Research Dashboard Service
 */
export class ResearchDashboardService {
  /**
   * Get complete dashboard data
   */
  async getDashboard(): Promise<ResearchDashboard> {
    log.info("Generating research dashboard");
    
    // Overview stats
    const overview = await this.getOverviewStats();
    
    // Performance metrics
    const performance = await this.getPerformanceMetrics();
    
    // Cultural metrics
    const cultural = await this.getCulturalMetrics();
    
    // Quality metrics
    const quality = await this.getQualityMetrics();
    
    // CAQ metrics
    const caq = await this.getCAQMetrics();
    
    // Cache metrics
    const cache = await this.getCacheMetrics();
    
    // Top experiments
    const topExperiments = await this.getTopExperiments();
    
    return {
      overview,
      performance,
      cultural,
      quality,
      caq,
      cache,
      topExperiments
    };
  }

  private async getOverviewStats() {
    const experiments = await musicDB.queryRow<any>`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM research_experiments
    `;
    
    const publications = await musicDB.queryRow<any>`
      SELECT COUNT(*) as total
      FROM research_publications
    `;
    
    return {
      totalExperiments: experiments?.total || 0,
      activeExperiments: experiments?.active || 0,
      completedExperiments: experiments?.completed || 0,
      totalPublications: publications?.total || 0
    };
  }

  private async getPerformanceMetrics() {
    const metrics = await musicDB.queryRow<any>`
      SELECT 
        AVG((performance_metrics->>'durationMs')::FLOAT) as avg_latency,
        AVG((performance_metrics->>'throughput')::FLOAT) as avg_throughput,
        AVG((performance_metrics->>'costUSD')::FLOAT) as avg_cost
      FROM research_experiments
      WHERE performance_metrics IS NOT NULL
    `;
    
    // Calculate reduction vs baseline (assuming baseline experiment exists)
    const baseline = await musicDB.queryRow<any>`
      SELECT 
        (performance_metrics->>'durationMs')::FLOAT as latency,
        (performance_metrics->>'costUSD')::FLOAT as cost
      FROM research_experiments
      WHERE experiment_name LIKE '%baseline%'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const latencyReduction = baseline 
      ? ((baseline.latency - (metrics?.avg_latency || 0)) / baseline.latency) * 100
      : 0;
    
    const costReduction = baseline
      ? ((baseline.cost - (metrics?.avg_cost || 0)) / baseline.cost) * 100
      : 0;
    
    return {
      averageLatency: metrics?.avg_latency || 0,
      averageThroughput: metrics?.avg_throughput || 0,
      averageCost: metrics?.avg_cost || 0,
      latencyReduction,
      costReduction
    };
  }

  private async getCulturalMetrics() {
    const metrics = await musicDB.queryRow<any>`
      SELECT 
        AVG((cultural_metrics->>'authenticityScore')::FLOAT) as avg_authenticity,
        COUNT(*) as total
      FROM research_experiments
      WHERE cultural_metrics IS NOT NULL
    `;
    
    const validations = await musicDB.queryRow<any>`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT expert_id) as experts
      FROM cultural_validation_sessions
    `;
    
    return {
      averageAuthenticity: metrics?.avg_authenticity || 0,
      averagePreservation: metrics?.avg_authenticity || 0, // Simplified
      totalValidations: validations?.total || 0,
      expertPanelSize: validations?.experts || 0
    };
  }

  private async getQualityMetrics() {
    const metrics = await musicDB.queryRow<any>`
      SELECT 
        AVG((quality_metrics->>'overallScore')::FLOAT) as avg_overall,
        AVG((quality_metrics->>'technicalQuality')::FLOAT) as avg_technical,
        AVG((quality_metrics->>'musicalCoherence')::FLOAT) as avg_coherence,
        AVG((quality_metrics->>'innovationScore')::FLOAT) as avg_innovation
      FROM research_experiments
      WHERE quality_metrics IS NOT NULL
    `;
    
    return {
      averageOverallScore: metrics?.avg_overall || 0,
      averageTechnicalQuality: metrics?.avg_technical || 0,
      averageMusicalCoherence: metrics?.avg_coherence || 0,
      averageInnovation: metrics?.avg_innovation || 0
    };
  }

  private async getCAQMetrics() {
    const metrics = await musicDB.queryRow<any>`
      SELECT 
        COUNT(*) as total,
        AVG(compression_ratio) as avg_compression,
        AVG(cultural_preservation) as avg_preservation,
        AVG(improvement_percentage) as avg_improvement
      FROM caq_experiments
    `;
    
    return {
      totalExperiments: metrics?.total || 0,
      averageCompression: metrics?.avg_compression || 0,
      averagePreservation: metrics?.avg_preservation || 0,
      efficiencyGain: metrics?.avg_improvement || 0
    };
  }

  private async getCacheMetrics() {
    const metrics = await musicDB.queryRow<any>`
      SELECT 
        AVG(hit_rate) as avg_hit_rate,
        AVG(computational_savings_percent) as avg_savings,
        MAX(total_patterns) as max_patterns
      FROM pattern_cache_metrics
    `;
    
    return {
      averageHitRate: metrics?.avg_hit_rate || 0,
      averageSavings: metrics?.avg_savings || 0,
      totalPatternsCached: metrics?.max_patterns || 0
    };
  }

  private async getTopExperiments() {
    const experiments = await musicDB.rawQueryAll<any>(
      `SELECT 
        experiment_id,
        experiment_name,
        (quality_metrics->>'overallScore')::FLOAT as overall_score,
        (cultural_metrics->>'authenticityScore')::FLOAT as cultural_score,
        (performance_metrics->>'durationMs')::FLOAT as latency_ms
      FROM research_experiments
      WHERE quality_metrics IS NOT NULL
      ORDER BY (quality_metrics->>'overallScore')::FLOAT DESC
      LIMIT 10`
    );
    
    return experiments.map((e: any) => ({
      experimentId: e.experiment_id,
      experimentName: e.experiment_name,
      overallScore: e.overall_score,
      culturalScore: e.cultural_score,
      latencyMs: e.latency_ms
    }));
  }

  /**
   * Get time series data for visualizations
   */
  async getTimeSeriesData(
    days: number = 30
  ): Promise<TimeSeriesData> {
    const experiments = await musicDB.rawQueryAll<any>(
      `SELECT 
        created_at,
        (performance_metrics->>'durationMs')::FLOAT as latency,
        (cultural_metrics->>'authenticityScore')::FLOAT as cultural,
        (quality_metrics->>'overallScore')::FLOAT as quality,
        (performance_metrics->>'costUSD')::FLOAT as cost
      FROM research_experiments
      WHERE created_at >= NOW() - INTERVAL '$1 days'
      ORDER BY created_at ASC`,
      [days]
    );
    
    return {
      timestamps: experiments.map((e: any) => e.created_at),
      latency: experiments.map((e: any) => e.latency || 0),
      cultural: experiments.map((e: any) => e.cultural || 0),
      quality: experiments.map((e: any) => e.quality || 0),
      cost: experiments.map((e: any) => e.cost || 0)
    };
  }

  /**
   * Get ablation study results
   */
  async getAblationStudies() {
    const studies = await musicDB.rawQueryAll<any>(
      `SELECT 
        study_id,
        study_name,
        disabled_features,
        performance_delta,
        quality_delta,
        cultural_delta,
        feature_importance
      FROM ablation_studies
      ORDER BY created_at DESC
      LIMIT 20`
    );
    
    return studies;
  }

  /**
   * Generate research summary
   */
  async generateSummary(): Promise<string> {
    const dashboard = await this.getDashboard();
    
    return `
# Research Progress Summary

## Overview
- Total Experiments: ${dashboard.overview.totalExperiments}
- Completed: ${dashboard.overview.completedExperiments}
- Publications: ${dashboard.overview.totalPublications}

## Performance Achievements
- Average Latency: ${dashboard.performance.averageLatency.toFixed(0)}ms
- Latency Reduction: ${dashboard.performance.latencyReduction.toFixed(1)}%
- Cost Reduction: ${dashboard.performance.costReduction.toFixed(1)}%

## Cultural Authenticity
- Average Score: ${(dashboard.cultural.averageAuthenticity * 100).toFixed(1)}%
- Expert Validations: ${dashboard.cultural.totalValidations}
- Expert Panel Size: ${dashboard.cultural.expertPanelSize}

## Quality Metrics
- Overall Quality: ${(dashboard.quality.averageOverallScore * 100).toFixed(1)}%
- Technical Quality: ${(dashboard.quality.averageTechnicalQuality * 100).toFixed(1)}%
- Musical Coherence: ${(dashboard.quality.averageMusicalCoherence * 100).toFixed(1)}%

## CAQ Performance
- Total Experiments: ${dashboard.caq.totalExperiments}
- Average Compression: ${dashboard.caq.averageCompression.toFixed(2)}x
- Cultural Preservation: ${(dashboard.caq.averagePreservation * 100).toFixed(1)}%
- Efficiency Gain: ${dashboard.caq.efficiencyGain.toFixed(1)}%

## Pattern Cache
- Hit Rate: ${(dashboard.cache.averageHitRate * 100).toFixed(1)}%
- Computational Savings: ${dashboard.cache.averageSavings.toFixed(1)}%
- Patterns Cached: ${dashboard.cache.totalPatternsCached}

## Top Performing Experiments
${dashboard.topExperiments.slice(0, 5).map((exp, i) => 
  `${i + 1}. ${exp.experimentName} (Score: ${(exp.overallScore * 100).toFixed(1)}%)`
).join('\n')}
    `.trim();
  }
}

/**
 * Global dashboard service instance
 */
let globalDashboardService: ResearchDashboardService | null = null;

/**
 * Get or create global dashboard service
 */
export function getDashboardService(): ResearchDashboardService {
  if (!globalDashboardService) {
    globalDashboardService = new ResearchDashboardService();
  }
  return globalDashboardService;
}
