import log from "encore.dev/log";

/**
 * Monitoring and metrics utilities for the Amapiano AI DAW
 */

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface PerformanceMetrics {
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  p95Latency: number;
  p99Latency: number;
}

class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();

  /**
   * Record a metric value
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const values = this.metrics.get(key) || [];
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    
    this.metrics.set(key, values);
    
    log.info("Metric recorded", { 
      metric: name, 
      value, 
      tags 
    });
  }

  /**
   * Increment a counter
   */
  increment(name: string, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
  }

  /**
   * Get average of a metric
   */
  getAverage(name: string, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags);
    const values = this.metrics.get(key);
    
    if (!values || values.length === 0) {
      return 0;
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Get percentile of a metric
   */
  getPercentile(name: string, percentile: number, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags);
    const values = this.metrics.get(key);
    
    if (!values || values.length === 0) {
      return 0;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get counter value
   */
  getCount(name: string, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags);
    return this.counters.get(key) || 0;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }

  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}|${tagStr}`;
  }
}

export const metrics = new MetricsCollector();

/**
 * Performance monitoring decorator
 */
export function monitor(operationName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const tags = { operation: operationName };

      try {
        metrics.increment('request.count', tags);
        const result = await originalMethod.apply(this, args);
        
        const duration = Date.now() - start;
        metrics.record('request.latency', duration, tags);
        metrics.increment('request.success', tags);
        
        log.info("Operation completed", {
          operation: operationName,
          duration,
          success: true
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        metrics.record('request.latency', duration, tags);
        metrics.increment('request.error', tags);
        
        log.error("Operation failed", {
          operation: operationName,
          duration,
          error: (error as Error).message,
          success: false
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Structured logging utilities
 */
export const logger = {
  /**
   * Log API request
   */
  request(endpoint: string, params?: any): void {
    log.info("API request", {
      endpoint,
      params,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log API response
   */
  response(endpoint: string, statusCode: number, duration: number): void {
    log.info("API response", {
      endpoint,
      statusCode,
      duration,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log error with context
   */
  error(message: string, context?: any): void {
    log.error(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log warning
   */
  warn(message: string, context?: any): void {
    log.warn(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log info
   */
  info(message: string, context?: any): void {
    log.info(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log debug (only in development)
   */
  debug(message: string, context?: any): void {
    log.debug(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, metadata?: any): void {
    log.info("Performance metric", {
      operation,
      duration,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Performance tracking helper
 */
export class PerformanceTracker {
  private startTime: number;
  private operation: string;
  private metadata: any;

  constructor(operation: string, metadata?: any) {
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = Date.now();
  }

  /**
   * End tracking and log performance
   */
  end(additionalMetadata?: any): number {
    const duration = Date.now() - this.startTime;
    
    logger.performance(this.operation, duration, {
      ...this.metadata,
      ...additionalMetadata
    });
    
    metrics.record('operation.duration', duration, {
      operation: this.operation
    });
    
    return duration;
  }

  /**
   * Add checkpoint
   */
  checkpoint(name: string): void {
    const elapsed = Date.now() - this.startTime;
    logger.debug(`Checkpoint: ${name}`, {
      operation: this.operation,
      checkpoint: name,
      elapsed
    });
  }
}

/**
 * Track API endpoint performance
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: any
): Promise<T> {
  const tracker = new PerformanceTracker(operation, metadata);
  
  try {
    const result = await fn();
    tracker.end({ success: true });
    return result;
  } catch (error) {
    tracker.end({ 
      success: false, 
      error: (error as Error).message 
    });
    throw error;
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const requestCount = metrics.getCount('request.count');
  const errorCount = metrics.getCount('request.error');
  const averageLatency = metrics.getAverage('request.latency');
  const p95Latency = metrics.getPercentile('request.latency', 95);
  const p99Latency = metrics.getPercentile('request.latency', 99);
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

  return {
    requestCount,
    averageLatency: Math.round(averageLatency),
    errorRate: Math.round(errorRate * 100) / 100,
    p95Latency: Math.round(p95Latency),
    p99Latency: Math.round(p99Latency)
  };
}
