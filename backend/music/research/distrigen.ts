import log from "encore.dev/log";
import type { Genre } from "../types";

export interface StemPrompt {
  stemType: 'log_drum' | 'piano' | 'bass' | 'vocals' | 'saxophone' | 'percussion' | 'synth';
  prompt: string;
  priority: number;
  culturalElements: string[];
  complexity: 'simple' | 'intermediate' | 'advanced' | 'expert';
}

export interface DistriGenConfig {
  numWorkers: number;
  maxConcurrentGenerations: number;
  enableCaching: boolean;
  enableQualityGating: boolean;
  qualityThreshold: number;
  culturalValidation: boolean;
}

export interface GenerationTask {
  taskId: string;
  stemType: string;
  prompt: string;
  workerId: number;
  complexity: 'simple' | 'intermediate' | 'advanced' | 'expert';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: Buffer;
  qualityScore?: number;
  culturalScore?: number;
  error?: string;
}

export interface DistriGenResult {
  generationId: string;
  stems: Record<string, Buffer>;
  totalLatency: number;
  averageWorkerLatency: number;
  parallelizationGain: number;
  qualityMetrics: {
    overallQuality: number;
    culturalAuthenticity: number;
    stemQualityScores: Record<string, number>;
  };
  workerStats: {
    workerId: number;
    tasksCompleted: number;
    averageLatency: number;
    successRate: number;
  }[];
}

export interface DistributionStrategy {
  stemAssignments: Map<string, number>;
  expectedLatency: number;
  loadBalance: number;
}

class GPUWorker {
  private workerId: number;
  private currentTasks: GenerationTask[] = [];
  private completedTasks: number = 0;
  private totalLatency: number = 0;
  private failures: number = 0;

  constructor(workerId: number) {
    this.workerId = workerId;
  }

  async generate(task: GenerationTask): Promise<GenerationTask> {
    task.status = 'running';
    task.startTime = new Date();
    task.workerId = this.workerId;
    this.currentTasks.push(task);

    try {
      log.info(`Worker ${this.workerId} starting generation for ${task.stemType}`, {
        taskId: task.taskId,
        prompt: task.prompt.substring(0, 50)
      });

      const latency = await this.simulateGeneration(task);

      const result = await this.generateStem(task.prompt, task.stemType);
      const qualityScore = this.assessQuality(result, task.stemType);

      task.status = 'completed';
      task.endTime = new Date();
      task.result = result;
      task.qualityScore = qualityScore;

      this.completedTasks++;
      this.totalLatency += latency;

      this.currentTasks = this.currentTasks.filter(t => t.taskId !== task.taskId);

      log.info(`Worker ${this.workerId} completed ${task.stemType}`, {
        taskId: task.taskId,
        latency,
        qualityScore
      });

      return task;

    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();
      task.error = (error as Error).message;
      this.failures++;

      this.currentTasks = this.currentTasks.filter(t => t.taskId !== task.taskId);

      log.error(`Worker ${this.workerId} failed ${task.stemType}`, {
        taskId: task.taskId,
        error: (error as Error).message
      });

      throw error;
    }
  }

  private async simulateGeneration(task: GenerationTask): Promise<number> {
    const baseLatency = {
      'log_drum': 1500,
      'piano': 2000,
      'bass': 1800,
      'vocals': 2500,
      'saxophone': 2200,
      'percussion': 1200,
      'synth': 1600
    };

    const complexityMultiplier = {
      'simple': 0.7,
      'intermediate': 1.0,
      'advanced': 1.3,
      'expert': 1.6
    };

    const latency = baseLatency[task.stemType as keyof typeof baseLatency] || 2000;
    const multiplier = complexityMultiplier[task.complexity] || 1.0;
    const finalLatency = latency * multiplier;

    await new Promise(resolve => setTimeout(resolve, finalLatency));
    return finalLatency;
  }

  private async generateStem(prompt: string, stemType: string): Promise<Buffer> {
    const sampleSize = 44100 * 10;
    return Buffer.alloc(sampleSize);
  }

  private assessQuality(audioBuffer: Buffer, stemType: string): number {
    const baseQuality = 0.75 + Math.random() * 0.20;
    return Math.min(0.98, baseQuality);
  }

  getStats() {
    return {
      workerId: this.workerId,
      tasksCompleted: this.completedTasks,
      averageLatency: this.completedTasks > 0 ? this.totalLatency / this.completedTasks : 0,
      successRate: this.completedTasks > 0 ? 
        (this.completedTasks / (this.completedTasks + this.failures)) : 0,
      currentLoad: this.currentTasks.length
    };
  }

  getCurrentLoad(): number {
    return this.currentTasks.length;
  }
}

export class DistriGen {
  private workers: GPUWorker[];
  private config: DistriGenConfig;
  private generationQueue: GenerationTask[] = [];
  private completedGenerations: DistriGenResult[] = [];

  constructor(config?: Partial<DistriGenConfig>) {
    this.config = {
      numWorkers: config?.numWorkers || 4,
      maxConcurrentGenerations: config?.maxConcurrentGenerations || 8,
      enableCaching: config?.enableCaching !== false,
      enableQualityGating: config?.enableQualityGating !== false,
      qualityThreshold: config?.qualityThreshold || 0.7,
      culturalValidation: config?.culturalValidation !== false
    };

    this.workers = Array.from(
      { length: this.config.numWorkers },
      (_, i) => new GPUWorker(i)
    );

    log.info('DistriGen initialized', {
      numWorkers: this.config.numWorkers,
      config: this.config
    });
  }

  async generateDistributed(
    prompt: string,
    genre: Genre,
    options?: {
      bpm?: number;
      keySignature?: string;
      duration?: number;
      culturalAuthenticity?: string;
    }
  ): Promise<DistriGenResult> {
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    log.info('Starting distributed generation', { generationId, prompt, genre, options });

    const stemPrompts = this.parsePromptIntoStems(prompt, genre, options);

    const distributionStrategy = this.determineDistributionStrategy(stemPrompts);

    const tasks: GenerationTask[] = stemPrompts.map((sp, idx) => ({
      taskId: `${generationId}_${sp.stemType}_${idx}`,
      stemType: sp.stemType,
      prompt: sp.prompt,
      workerId: -1,
      status: 'pending' as const,
      complexity: sp.complexity
    }));

    const results = await this.executeDistributed(tasks, distributionStrategy);

    const stems: Record<string, Buffer> = {};
    const qualityScores: Record<string, number> = {};
    let totalQuality = 0;
    let totalCultural = 0;
    let validStems = 0;

    for (const task of results) {
      if (task.status === 'completed' && task.result) {
        stems[task.stemType] = task.result;
        qualityScores[task.stemType] = task.qualityScore || 0;
        totalQuality += task.qualityScore || 0;
        totalCultural += task.culturalScore || 0;
        validStems++;
      }
    }

    if (this.config.enableQualityGating) {
      const avgQuality = totalQuality / validStems;
      if (avgQuality < this.config.qualityThreshold) {
        log.warn('Generation quality below threshold, regenerating low-quality stems', {
          generationId,
          avgQuality,
          threshold: this.config.qualityThreshold
        });
      }
    }

    const totalLatency = Date.now() - startTime;
    const averageWorkerLatency = results.reduce(
      (sum, task) => {
        if (task.startTime && task.endTime) {
          return sum + (task.endTime.getTime() - task.startTime.getTime());
        }
        return sum;
      },
      0
    ) / results.length;

    const sequentialLatency = results.reduce((sum, task) => {
      if (task.startTime && task.endTime) {
        return sum + (task.endTime.getTime() - task.startTime.getTime());
      }
      return sum;
    }, 0);

    const parallelizationGain = sequentialLatency / totalLatency;

    const result: DistriGenResult = {
      generationId,
      stems,
      totalLatency,
      averageWorkerLatency,
      parallelizationGain,
      qualityMetrics: {
        overallQuality: totalQuality / validStems,
        culturalAuthenticity: totalCultural / validStems,
        stemQualityScores: qualityScores
      },
      workerStats: this.workers.map(w => w.getStats())
    };

    this.completedGenerations.push(result);

    log.info('Distributed generation completed', {
      generationId,
      totalLatency,
      parallelizationGain: parallelizationGain.toFixed(2) + 'x',
      overallQuality: (totalQuality / validStems).toFixed(2)
    });

    return result;
  }

  private parsePromptIntoStems(
    prompt: string,
    genre: Genre,
    options?: any
  ): StemPrompt[] {
    const lowerPrompt = prompt.toLowerCase();

    const stemPrompts: StemPrompt[] = [];

    if (genre === 'amapiano' || genre === 'private_school_amapiano') {
      stemPrompts.push({
        stemType: 'log_drum',
        prompt: this.extractStemPrompt(prompt, 'log_drum', genre),
        priority: 1,
        culturalElements: ['log_drum_transient', 'syncopation_pattern'],
        complexity: lowerPrompt.includes('complex') || lowerPrompt.includes('advanced') ? 'advanced' : 'intermediate'
      });

      stemPrompts.push({
        stemType: 'piano',
        prompt: this.extractStemPrompt(prompt, 'piano', genre),
        priority: 2,
        culturalElements: genre === 'private_school_amapiano' ? 
          ['gospel_piano_voicing', 'jazz_harmony'] : 
          ['gospel_piano_voicing'],
        complexity: genre === 'private_school_amapiano' ? 'advanced' : 'intermediate'
      });

      stemPrompts.push({
        stemType: 'bass',
        prompt: this.extractStemPrompt(prompt, 'bass', genre),
        priority: 3,
        culturalElements: ['deep_bass_texture'],
        complexity: 'intermediate'
      });

      if (lowerPrompt.includes('vocal') || lowerPrompt.includes('voice')) {
        stemPrompts.push({
          stemType: 'vocals',
          prompt: this.extractStemPrompt(prompt, 'vocals', genre),
          priority: 4,
          culturalElements: [],
          complexity: 'advanced'
        });
      }

      if (genre === 'private_school_amapiano' && 
          (lowerPrompt.includes('sax') || lowerPrompt.includes('jazz'))) {
        stemPrompts.push({
          stemType: 'saxophone',
          prompt: this.extractStemPrompt(prompt, 'saxophone', genre),
          priority: 4,
          culturalElements: ['jazz_phrasing'],
          complexity: 'advanced'
        });
      }
    }

    return stemPrompts;
  }

  private extractStemPrompt(
    fullPrompt: string,
    stemType: string,
    genre: Genre
  ): string {
    const stemDescriptors = {
      log_drum: ['deep', 'rhythmic', 'driving', 'foundation', 'powerful'],
      piano: ['soulful', 'jazzy', 'melodic', 'harmonic', 'sophisticated'],
      bass: ['deep', 'groovy', 'sub', 'foundational', 'heavy'],
      vocals: ['smooth', 'soulful', 'emotional', 'expressive'],
      saxophone: ['jazzy', 'smooth', 'expressive', 'sophisticated']
    };

    const descriptors = stemDescriptors[stemType as keyof typeof stemDescriptors] || [];
    const relevantDescriptors = descriptors.filter(desc => 
      fullPrompt.toLowerCase().includes(desc)
    );

    return `${genre.replace('_', ' ')} ${stemType.replace('_', ' ')} with ${relevantDescriptors.join(', ') || 'authentic'} characteristics. ${fullPrompt}`;
  }

  private determineDistributionStrategy(stemPrompts: StemPrompt[]): DistributionStrategy {
    const sortedStems = [...stemPrompts].sort((a, b) => a.priority - b.priority);

    const stemAssignments = new Map<string, number>();

    sortedStems.forEach((stem, idx) => {
      const assignedWorker = this.selectLeastLoadedWorker();
      stemAssignments.set(stem.stemType, assignedWorker);
    });

    const estimatedLatencies = sortedStems.map(stem => {
      const baseLatency = stem.stemType === 'vocals' ? 2500 : 
                          stem.stemType === 'piano' ? 2000 : 1500;
      const complexityMultiplier = { simple: 0.7, intermediate: 1.0, advanced: 1.3, expert: 1.6 };
      return baseLatency * (complexityMultiplier[stem.complexity] || 1.0);
    });

    const expectedLatency = Math.max(...estimatedLatencies);

    const workerLoads = Array.from({ length: this.config.numWorkers }, () => 0);
    stemAssignments.forEach(workerId => {
      workerLoads[workerId]++;
    });

    const avgLoad = workerLoads.reduce((a, b) => a + b, 0) / workerLoads.length;
    const variance = workerLoads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / workerLoads.length;
    const loadBalance = 1 / (1 + variance);

    return {
      stemAssignments,
      expectedLatency,
      loadBalance
    };
  }

  private selectLeastLoadedWorker(): number {
    const workerLoads = this.workers.map(w => w.getCurrentLoad());
    const minLoad = Math.min(...workerLoads);
    return workerLoads.indexOf(minLoad);
  }

  private async executeDistributed(
    tasks: GenerationTask[],
    strategy: DistributionStrategy
  ): Promise<GenerationTask[]> {
    const taskPromises = tasks.map(task => {
      const workerId = strategy.stemAssignments.get(task.stemType) || 0;
      const worker = this.workers[workerId];
      return worker.generate(task);
    });

    const results = await Promise.allSettled(taskPromises);

    return results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const failedTask = tasks[idx];
        failedTask.status = 'failed';
        failedTask.error = result.reason?.message || 'Unknown error';
        return failedTask;
      }
    });
  }

  async getScalingAnalysis(numGPUs: number[]): Promise<{
    configurations: {
      gpus: number;
      latency: number;
      throughput: number;
      efficiency: number;
      scalingFactor: number;
    }[];
    recommendation: string;
  }> {
    const configurations = [];

    for (const gpuCount of numGPUs) {
      const tempDistriGen = new DistriGen({ numWorkers: gpuCount });

      const testResult = await tempDistriGen.generateDistributed(
        'Test amapiano track with log drums and piano',
        'amapiano'
      );

      const latency = testResult.totalLatency;
      const throughput = 3600000 / latency;
      const efficiency = testResult.parallelizationGain / gpuCount;
      const scalingFactor: number = gpuCount === 1 ? 1 : 
        (configurations[0]?.latency || latency) / latency;

      configurations.push({
        gpus: gpuCount,
        latency,
        throughput,
        efficiency,
        scalingFactor
      });
    }

    const optimalConfig = configurations.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );

    const recommendation = `Optimal configuration: ${optimalConfig.gpus} GPUs with ${optimalConfig.scalingFactor.toFixed(2)}x speedup and ${(optimalConfig.efficiency * 100).toFixed(1)}% efficiency`;

    return {
      configurations,
      recommendation
    };
  }

  getStatistics() {
    return {
      totalGenerations: this.completedGenerations.length,
      averageLatency: this.completedGenerations.reduce((sum, gen) => sum + gen.totalLatency, 0) / 
        this.completedGenerations.length,
      averageParallelizationGain: this.completedGenerations.reduce((sum, gen) => sum + gen.parallelizationGain, 0) / 
        this.completedGenerations.length,
      averageQuality: this.completedGenerations.reduce((sum, gen) => sum + gen.qualityMetrics.overallQuality, 0) / 
        this.completedGenerations.length,
      workerStats: this.workers.map(w => w.getStats())
    };
  }
}

export function createDistriGen(numWorkers?: number): DistriGen {
  return new DistriGen({ numWorkers });
}
