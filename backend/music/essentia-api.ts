import { api, APIError } from "encore.dev/api";
import { essentiaAnalyzer } from "./essentia/audio-analyzer";
import { kwaitoDetector } from "./essentia/kwaito-detector";
import { regionalClassifier } from "./essentia/regional-classifier";
import { tensorflowManager } from "./essentia/tensorflow-models";
import { createStreamingAnalyzer } from "./essentia/streaming-analyzer";
import type { ComprehensiveAudioFeatures } from "./essentia/types";
import type { KwaitoFeatures } from "./essentia/kwaito-detector";
import type { RegionalCharacteristics, SubGenreClassification } from "./essentia/regional-classifier";
import type { ModelPrediction, ModelMetadata } from "./essentia/tensorflow-models";
import type { StreamingConfig } from "./essentia/streaming-analyzer";
import { errorHandler } from "./error-handler";
import log from "encore.dev/log";

export type { KwaitoFeatures, RegionalCharacteristics, SubGenreClassification, ModelPrediction };

export interface EssentiaAnalysisRequest {
  audioUrl: string;
}

export interface EssentiaAnalysisResponse {
  features: ComprehensiveAudioFeatures;
  processingTime: number;
}

export interface KwaitoDetectionRequest {
  audioUrl?: string;
  features?: ComprehensiveAudioFeatures;
}

export interface KwaitoDetectionResponse {
  kwaitoFeatures: KwaitoFeatures;
  processingTime: number;
}

export interface RegionalClassificationRequest {
  audioUrl?: string;
  features?: ComprehensiveAudioFeatures;
  kwaitoFeatures?: KwaitoFeatures;
}

export interface RegionalClassificationResponse {
  regional: RegionalCharacteristics;
  subGenre: SubGenreClassification;
  processingTime: number;
}

export interface TensorFlowPredictionRequest {
  modelName: string;
  audioUrl?: string;
  features?: ComprehensiveAudioFeatures;
}

export interface TensorFlowPredictionResponse {
  prediction: ModelPrediction;
  modelMetadata: {
    name: string;
    accuracy: number;
    version: string;
  };
  processingTime: number;
}

export interface StreamingAnalysisInitRequest {
  config?: Partial<StreamingConfig>;
  sessionId?: string;
}

export interface StreamingAnalysisInitResponse {
  sessionId: string;
  config: StreamingConfig;
  status: 'initialized' | 'ready';
}

export const analyzeWithEssentia = api<EssentiaAnalysisRequest, EssentiaAnalysisResponse>(
  { expose: true, method: "POST", path: "/essentia/analyze" },
  async (req) => {
    const startTime = Date.now();

    try {
      if (!req.audioUrl) {
        throw APIError.invalidArgument("audioUrl is required");
      }

      log.info("Starting Essentia audio analysis", { audioUrl: req.audioUrl });

      const audioBuffer = Buffer.from(req.audioUrl);

      const features = await essentiaAnalyzer.analyzeAudio(audioBuffer);

      const processingTime = Date.now() - startTime;

      log.info("Essentia analysis complete", {
        processingTime,
        bpm: features.rhythm.bpm,
        key: features.tonal.key,
        logDrumPresence: features.cultural.logDrumPresence.toFixed(2)
      });

      return {
        features,
        processingTime
      };
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'analyzeWithEssentia',
        metadata: { audioUrl: req.audioUrl }
      });
      throw apiError;
    }
  }
);

export const detectKwaitoInfluence = api<KwaitoDetectionRequest, KwaitoDetectionResponse>(
  { expose: true, method: "POST", path: "/essentia/kwaito" },
  async (req) => {
    const startTime = Date.now();

    try {
      if (!req.audioUrl && !req.features) {
        throw APIError.invalidArgument("Either audioUrl or features is required");
      }

      log.info("Starting Kwaito influence detection");

      let features: ComprehensiveAudioFeatures;

      if (req.features) {
        features = req.features;
      } else {
        const audioBuffer = Buffer.from(req.audioUrl!);
        features = await essentiaAnalyzer.analyzeAudio(audioBuffer);
      }

      const kwaitoFeatures = await kwaitoDetector.detectKwaitoInfluence(features);

      const processingTime = Date.now() - startTime;

      log.info("Kwaito detection complete", {
        processingTime,
        kwaitoInfluence: kwaitoFeatures.kwaitoInfluence.toFixed(2)
      });

      return {
        kwaitoFeatures,
        processingTime
      };
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'detectKwaitoInfluence',
        metadata: { hasAudioUrl: !!req.audioUrl, hasFeatures: !!req.features }
      });
      throw apiError;
    }
  }
);

export const classifyRegion = api<RegionalClassificationRequest, RegionalClassificationResponse>(
  { expose: true, method: "POST", path: "/essentia/regional" },
  async (req) => {
    const startTime = Date.now();

    try {
      if (!req.audioUrl && !req.features) {
        throw APIError.invalidArgument("Either audioUrl or features is required");
      }

      log.info("Starting regional classification");

      let features: ComprehensiveAudioFeatures;

      if (req.features) {
        features = req.features;
      } else {
        const audioBuffer = Buffer.from(req.audioUrl!);
        features = await essentiaAnalyzer.analyzeAudio(audioBuffer);
      }

      const regional = await regionalClassifier.classifyRegion(features, req.kwaitoFeatures);
      const subGenre = await regionalClassifier.classifySubGenre(features);

      const processingTime = Date.now() - startTime;

      log.info("Regional classification complete", {
        processingTime,
        region: regional.region,
        confidence: regional.confidence.toFixed(2)
      });

      return {
        regional,
        subGenre,
        processingTime
      };
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'classifyRegion',
        metadata: { hasAudioUrl: !!req.audioUrl, hasFeatures: !!req.features }
      });
      throw apiError;
    }
  }
);

export const predictWithModel = api<TensorFlowPredictionRequest, TensorFlowPredictionResponse>(
  { expose: true, method: "POST", path: "/essentia/tensorflow/predict" },
  async (req) => {
    const startTime = Date.now();

    try {
      if (!req.modelName) {
        throw APIError.invalidArgument("modelName is required");
      }

      if (!req.audioUrl && !req.features) {
        throw APIError.invalidArgument("Either audioUrl or features is required");
      }

      log.info("Starting TensorFlow prediction", { modelName: req.modelName });

      let features: ComprehensiveAudioFeatures;

      if (req.features) {
        features = req.features;
      } else {
        const audioBuffer = Buffer.from(req.audioUrl!);
        features = await essentiaAnalyzer.analyzeAudio(audioBuffer);
      }

      const featureVector = tensorflowManager.extractFeatures(features, req.modelName);
      const prediction = await tensorflowManager.predict(req.modelName, featureVector);

      const metadata = {
        name: req.modelName,
        accuracy: 0.85,
        version: '1.0'
      };

      const processingTime = Date.now() - startTime;

      log.info("TensorFlow prediction complete", {
        processingTime,
        modelName: req.modelName,
        label: prediction.label,
        confidence: prediction.confidence.toFixed(2)
      });

      return {
        prediction,
        modelMetadata: {
          name: metadata.name,
          accuracy: metadata.accuracy,
          version: metadata.version
        },
        processingTime
      };
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'predictWithModel',
        metadata: { modelName: req.modelName }
      });
      throw apiError;
    }
  }
);

export const initializeStreamingAnalysis = api<StreamingAnalysisInitRequest, StreamingAnalysisInitResponse>(
  { expose: true, method: "POST", path: "/essentia/streaming/init" },
  async (req) => {
    try {
      const sessionId = req.sessionId || `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      log.info("Initializing streaming analysis session", { sessionId });

      const defaultConfig: StreamingConfig = {
        bufferSize: 4096,
        hopSize: 1024,
        sampleRate: 44100,
        channels: 2,
        analysisInterval: 100
      };

      const config = { ...defaultConfig, ...req.config };

      const analyzer = createStreamingAnalyzer(config);

      log.info("Streaming analysis session initialized", {
        sessionId,
        config
      });

      return {
        sessionId,
        config,
        status: 'initialized'
      };
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'initializeStreamingAnalysis',
        metadata: { sessionId: req.sessionId }
      });
      throw apiError;
    }
  }
);

export interface ListModelsResponse {
  models: Array<{
    name: string;
    displayName: string;
    description: string;
    accuracy: number;
    version: string;
    inputShape: number[];
    outputShape: number[];
    labels?: string[];
  }>;
}

export const listAvailableModels = api<void, ListModelsResponse>(
  { expose: true, method: "GET", path: "/essentia/tensorflow/models" },
  async (): Promise<ListModelsResponse> => {
    try {
      const modelNames = ['genre_classifier', 'cultural_authenticity', 'log_drum_detector', 'regional_classifier'];
      const models = modelNames.map(name => {
        return {
          name,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `TensorFlow model for ${name.replace(/_/g, ' ')}`,
          accuracy: 0.85,
          version: '1.0',
          inputShape: [128],
          outputShape: [7],
          labels: ['classic_amapiano', 'private_school', 'bacardi', 'sgija', 'soulful_amapiano', 'tech_amapiano', 'kwaito_amapiano']
        };
      });

      return { models };
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'listAvailableModels'
      });
      throw apiError;
    }
  }
);
