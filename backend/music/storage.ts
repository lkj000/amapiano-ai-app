import { Bucket } from "encore.dev/storage/objects";
import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { audioFormatConverter } from "./audio-formats";

// Production-ready storage buckets with organizational structure
export const audioFiles = new Bucket("audio-files", { public: true });
export const generatedTracks = new Bucket("generated-tracks", { public: true });
export const extractedStems = new Bucket("extracted-stems", { public: true });
export const sampleLibrary = new Bucket("sample-library", { public: true });
export const userProjects = new Bucket("user-projects", { public: false }); // Private bucket for user projects
export const backupStorage = new Bucket("backups", { public: false }); // Private backups

export interface UploadOptions {
  metadata?: Record<string, string>;
  contentType?: string;
  convertFormat?: 'wav' | 'mp3' | 'flac';
  normalize?: boolean;
  trimSilence?: boolean;
}

export interface StorageMetadata {
  fileName: string;
  size: number;
  uploadedAt: Date;
  contentType: string;
  metadata?: Record<string, string>;
}

// Enhanced object storage with format conversion and preprocessing
export const objectStorage = {
  // Audio file upload with preprocessing
  async uploadAudio(buffer: Buffer, fileName: string, options?: UploadOptions): Promise<{ url: string; metadata: StorageMetadata }> {
    try {
      let processedBuffer = buffer;

      // Apply audio preprocessing if requested
      if (options?.normalize) {
        log.info("Normalizing audio before upload", { fileName });
        processedBuffer = await audioFormatConverter.normalizeAudio(processedBuffer);
      }

      if (options?.trimSilence) {
        log.info("Trimming silence before upload", { fileName });
        processedBuffer = await audioFormatConverter.trimSilence(processedBuffer);
      }

      // Convert format if requested
      if (options?.convertFormat) {
        log.info("Converting audio format before upload", { fileName, targetFormat: options.convertFormat });
        processedBuffer = await audioFormatConverter.convert(processedBuffer, {
          targetFormat: options.convertFormat,
          quality: 'high'
        });
        // Update filename with correct extension
        fileName = fileName.replace(/\.[^.]+$/, `.${options.convertFormat}`);
      }

      await audioFiles.upload(fileName, processedBuffer, {
        contentType: options?.contentType || 'audio/wav',
      });

      const url = audioFiles.publicUrl(fileName);
      
      const metadata: StorageMetadata = {
        fileName,
        size: processedBuffer.length,
        uploadedAt: new Date(),
        contentType: options?.contentType || 'audio/wav',
        metadata: options?.metadata
      };

      log.info("Audio file uploaded successfully", { fileName, size: processedBuffer.length, url });

      return { url, metadata };
    } catch (error) {
      log.error("Audio upload failed", { error: (error as Error).message, fileName });
      throw APIError.internal("Failed to upload audio file");
    }
  },
  
  async downloadAudio(fileName: string): Promise<Buffer> {
    try {
      const buffer = await audioFiles.download(fileName);
      log.info("Audio file downloaded", { fileName, size: buffer.length });
      return buffer;
    } catch (error) {
      log.error("Audio download failed", { error: (error as Error).message, fileName });
      throw APIError.notFound("Audio file not found");
    }
  },

  async deleteAudio(fileName: string): Promise<void> {
    try {
      await audioFiles.remove(fileName);
      log.info("Audio file deleted", { fileName });
    } catch (error) {
      log.error("Audio deletion failed", { error: (error as Error).message, fileName });
      throw APIError.internal("Failed to delete audio file");
    }
  },
  
  async uploadTrack(buffer: Buffer, fileName: string, options?: UploadOptions): Promise<{ url: string; metadata: StorageMetadata }> {
    try {
      let processedBuffer = buffer;

      if (options?.normalize) {
        processedBuffer = await audioFormatConverter.normalizeAudio(processedBuffer);
      }

      if (options?.convertFormat) {
        processedBuffer = await audioFormatConverter.convert(processedBuffer, {
          targetFormat: options.convertFormat,
          quality: 'high'
        });
        fileName = fileName.replace(/\.[^.]+$/, `.${options.convertFormat}`);
      }

      await generatedTracks.upload(fileName, processedBuffer, {
        contentType: options?.contentType || 'audio/wav',
      });

      const url = generatedTracks.publicUrl(fileName);
      
      const metadata: StorageMetadata = {
        fileName,
        size: processedBuffer.length,
        uploadedAt: new Date(),
        contentType: options?.contentType || 'audio/wav',
        metadata: options?.metadata
      };

      log.info("Track uploaded successfully", { fileName, size: processedBuffer.length });

      return { url, metadata };
    } catch (error) {
      log.error("Track upload failed", { error: (error as Error).message, fileName });
      throw APIError.internal("Failed to upload track");
    }
  },

  async downloadTrack(fileName: string): Promise<Buffer> {
    try {
      return await generatedTracks.download(fileName);
    } catch (error) {
      log.error("Track download failed", { error: (error as Error).message, fileName });
      throw APIError.notFound("Track not found");
    }
  },

  async deleteTrack(fileName: string): Promise<void> {
    try {
      await generatedTracks.remove(fileName);
      log.info("Track deleted", { fileName });
    } catch (error) {
      log.error("Track deletion failed", { error: (error as Error).message, fileName });
      throw APIError.internal("Failed to delete track");
    }
  },
  
  async uploadStem(buffer: Buffer, fileName: string, options?: UploadOptions): Promise<{ url: string; metadata: StorageMetadata }> {
    try {
      let processedBuffer = buffer;

      if (options?.convertFormat) {
        processedBuffer = await audioFormatConverter.convert(processedBuffer, {
          targetFormat: options.convertFormat,
          quality: 'lossless'
        });
        fileName = fileName.replace(/\.[^.]+$/, `.${options.convertFormat}`);
      }

      await extractedStems.upload(fileName, processedBuffer, {
        contentType: options?.contentType || 'audio/wav',
      });

      const url = extractedStems.publicUrl(fileName);
      
      const metadata: StorageMetadata = {
        fileName,
        size: processedBuffer.length,
        uploadedAt: new Date(),
        contentType: options?.contentType || 'audio/wav',
        metadata: options?.metadata
      };

      log.info("Stem uploaded successfully", { fileName, size: processedBuffer.length });

      return { url, metadata };
    } catch (error) {
      log.error("Stem upload failed", { error: (error as Error).message, fileName });
      throw APIError.internal("Failed to upload stem");
    }
  },

  async downloadStem(fileName: string): Promise<Buffer> {
    try {
      return await extractedStems.download(fileName);
    } catch (error) {
      log.error("Stem download failed", { error: (error as Error).message, fileName });
      throw APIError.notFound("Stem not found");
    }
  },

  async deleteStem(fileName: string): Promise<void> {
    try {
      await extractedStems.remove(fileName);
      log.info("Stem deleted", { fileName });
    } catch (error) {
      log.error("Stem deletion failed", { error: (error as Error).message, fileName });
      throw APIError.internal("Failed to delete stem");
    }
  },

  // Sample library management
  async uploadSample(buffer: Buffer, fileName: string, category: string, options?: UploadOptions): Promise<{ url: string; metadata: StorageMetadata }> {
    try {
      const fullPath = `${category}/${fileName}`;
      
      let processedBuffer = buffer;

      if (options?.normalize) {
        processedBuffer = await audioFormatConverter.normalizeAudio(processedBuffer, -18); // Quieter for samples
      }

      if (options?.trimSilence) {
        processedBuffer = await audioFormatConverter.trimSilence(processedBuffer);
      }

      if (options?.convertFormat) {
        processedBuffer = await audioFormatConverter.convert(processedBuffer, {
          targetFormat: options.convertFormat,
          quality: 'lossless'
        });
      }

      await sampleLibrary.upload(fullPath, processedBuffer, {
        contentType: options?.contentType || 'audio/wav',
      });

      const url = sampleLibrary.publicUrl(fullPath);
      
      const metadata: StorageMetadata = {
        fileName: fullPath,
        size: processedBuffer.length,
        uploadedAt: new Date(),
        contentType: options?.contentType || 'audio/wav',
        metadata: { ...options?.metadata, category }
      };

      log.info("Sample uploaded successfully", { fileName: fullPath, category, size: processedBuffer.length });

      return { url, metadata };
    } catch (error) {
      log.error("Sample upload failed", { error: (error as Error).message, fileName, category });
      throw APIError.internal("Failed to upload sample");
    }
  },

  async downloadSample(category: string, fileName: string): Promise<Buffer> {
    try {
      const fullPath = `${category}/${fileName}`;
      return await sampleLibrary.download(fullPath);
    } catch (error) {
      log.error("Sample download failed", { error: (error as Error).message, fileName, category });
      throw APIError.notFound("Sample not found");
    }
  },

  async deleteSample(category: string, fileName: string): Promise<void> {
    try {
      const fullPath = `${category}/${fileName}`;
      await sampleLibrary.remove(fullPath);
      log.info("Sample deleted", { fileName: fullPath, category });
    } catch (error) {
      log.error("Sample deletion failed", { error: (error as Error).message, fileName, category });
      throw APIError.internal("Failed to delete sample");
    }
  },

  // User project management (private storage)
  async uploadProject(buffer: Buffer, userId: string, projectId: string, fileName: string): Promise<{ url: string }> {
    try {
      const fullPath = `${userId}/${projectId}/${fileName}`;
      
      await userProjects.upload(fullPath, buffer, {
        contentType: 'application/json',
      });

      // Since this is a private bucket, we can't use publicUrl
      // Return a reference instead
      const url = `project://${fullPath}`;
      
      log.info("Project uploaded successfully", { userId, projectId, fileName });

      return { url };
    } catch (error) {
      log.error("Project upload failed", { error: (error as Error).message, userId, projectId });
      throw APIError.internal("Failed to upload project");
    }
  },

  async downloadProject(userId: string, projectId: string, fileName: string): Promise<Buffer> {
    try {
      const fullPath = `${userId}/${projectId}/${fileName}`;
      return await userProjects.download(fullPath);
    } catch (error) {
      log.error("Project download failed", { error: (error as Error).message, userId, projectId });
      throw APIError.notFound("Project not found");
    }
  },

  async deleteProject(userId: string, projectId: string, fileName: string): Promise<void> {
    try {
      const fullPath = `${userId}/${projectId}/${fileName}`;
      await userProjects.remove(fullPath);
      log.info("Project deleted", { userId, projectId, fileName });
    } catch (error) {
      log.error("Project deletion failed", { error: (error as Error).message, userId, projectId });
      throw APIError.internal("Failed to delete project");
    }
  },

  // Backup management
  async createBackup(buffer: Buffer, backupId: string, type: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${type}/${backupId}_${timestamp}.backup`;
      
      await backupStorage.upload(fileName, buffer);
      
      log.info("Backup created successfully", { backupId, type, fileName });
    } catch (error) {
      log.error("Backup creation failed", { error: (error as Error).message, backupId, type });
      throw APIError.internal("Failed to create backup");
    }
  },

  async restoreBackup(backupId: string, type: string, timestamp: string): Promise<Buffer> {
    try {
      const fileName = `${type}/${backupId}_${timestamp}.backup`;
      const buffer = await backupStorage.download(fileName);
      
      log.info("Backup restored successfully", { backupId, type, fileName });
      
      return buffer;
    } catch (error) {
      log.error("Backup restoration failed", { error: (error as Error).message, backupId, type });
      throw APIError.notFound("Backup not found");
    }
  },

  // Bulk operations
  async uploadMultipleStem(stemBuffers: Record<string, Buffer>, trackId: string, qualityTier: string): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    
    for (const [stemName, buffer] of Object.entries(stemBuffers)) {
      const fileName = `stems/${trackId}_${stemName}_${qualityTier}.wav`;
      const { url } = await this.uploadStem(buffer, fileName);
      urls[stemName] = url;
    }
    
    log.info("Multiple stems uploaded", { trackId, count: Object.keys(stemBuffers).length });
    
    return urls;
  },

  // Storage management
  async getStorageStats(): Promise<{
    audioFiles: { count: number };
    generatedTracks: { count: number };
    extractedStems: { count: number };
    sampleLibrary: { count: number };
  }> {
    // Note: This is a simplified version. In production, you'd implement
    // proper bucket listing and size calculation
    log.info("Getting storage statistics");
    
    return {
      audioFiles: { count: 0 },
      generatedTracks: { count: 0 },
      extractedStems: { count: 0 },
      sampleLibrary: { count: 0 }
    };
  }
};

// API endpoints for storage management
export const uploadAudioFile = api(
  { expose: true, method: "POST", path: "/storage/audio/upload" },
  async (req: { fileName: string; audioData: string; options?: UploadOptions }): Promise<{ url: string; metadata: StorageMetadata }> => {
    // Convert base64 to buffer
    const buffer = Buffer.from(req.audioData, 'base64');
    return await objectStorage.uploadAudio(buffer, req.fileName, req.options);
  }
);

export const downloadAudioFile = api(
  { expose: true, method: "GET", path: "/storage/audio/:fileName" },
  async (req: { fileName: string }): Promise<{ audioData: string }> => {
    const buffer = await objectStorage.downloadAudio(req.fileName);
    return { audioData: buffer.toString('base64') };
  }
);

export const deleteAudioFile = api(
  { expose: true, method: "DELETE", path: "/storage/audio/:fileName" },
  async (req: { fileName: string }): Promise<{ success: boolean }> => {
    await objectStorage.deleteAudio(req.fileName);
    return { success: true };
  }
);

export const getStorageStats = api(
  { expose: true, method: "GET", path: "/storage/stats" },
  async (): Promise<{
    audioFiles: { count: number };
    generatedTracks: { count: number };
    extractedStems: { count: number };
    sampleLibrary: { count: number };
  }> => {
    return await objectStorage.getStorageStats();
  }
);
