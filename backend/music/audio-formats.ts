import { api, APIError } from "encore.dev/api";
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import log from "encore.dev/log";
import { objectStorage } from "./storage";

export interface AudioFormatConversionRequest {
  sourceUrl: string;
  targetFormat: 'wav' | 'flac' | 'mp3' | 'aac' | 'ogg' | 'aiff';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  normalize?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface AudioFormatConversionResponse {
  convertedUrl: string;
  originalFormat: string;
  targetFormat: string;
  originalSize: number;
  convertedSize: number;
  conversionTime: number;
  metadata: AudioMetadata;
}

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  bitrate: number;
  format: string;
  codec: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
}

export interface StemExportRequest {
  trackId: number;
  format: 'wav' | 'flac' | 'aiff';
  quality: 'professional' | 'studio';
  includeMetadata: boolean;
  normalizeStems?: boolean;
  stemTypes: ('drums' | 'bass' | 'piano' | 'vocals' | 'other')[];
}

export interface StemExportResponse {
  trackId: number;
  stemUrls: Record<string, string>;
  format: string;
  totalSize: number;
  exportTime: number;
}

export interface MasteringRequest {
  trackId: number;
  targetLoudness: number; // LUFS
  ceilingLevel: number; // dBFS
  enableLimiting: boolean;
  enableEQ: boolean;
  enableCompression: boolean;
  enableStereoEnhancement: boolean;
  referenceTrackUrl?: string;
}

export interface MasteringResponse {
  masteredTrackUrl: string;
  originalLoudness: number;
  targetLoudness: number;
  peakLevel: number;
  dynamicRange: number;
  processingTime: number;
}

export class ProfessionalAudioProcessor {
  private tempDir: string;

  constructor() {
    this.tempDir = tmpdir();
  }

  async convertAudioFormat(request: AudioFormatConversionRequest): Promise<AudioFormatConversionResponse> {
    const startTime = Date.now();
    
    try {
      log.info("Starting audio format conversion", { 
        targetFormat: request.targetFormat,
        quality: request.quality 
      });

      // Download source file
      const sourceFile = await this.downloadAudioFile(request.sourceUrl);
      const outputFile = join(this.tempDir, `converted_${Date.now()}.${request.targetFormat}`);

      // Get original metadata
      const originalMetadata = await this.getAudioMetadata(sourceFile);
      
      // Build FFmpeg command
      const ffmpegArgs = await this.buildFFmpegCommand(sourceFile, outputFile, request);
      
      // Run conversion
      await this.runFFmpeg(ffmpegArgs);
      
      // Get converted file info
      const convertedStats = await fs.stat(outputFile);
      const convertedMetadata = await this.getAudioMetadata(outputFile);
      
      // Upload converted file
      const convertedUrl = await this.uploadAudioFile(outputFile, request.targetFormat);
      
      // Cleanup temporary files
      await fs.unlink(sourceFile);
      await fs.unlink(outputFile);

      const conversionTime = Date.now() - startTime;

      log.info("Audio format conversion completed", {
        conversionTime,
        originalSize: originalMetadata.bitrate,
        convertedSize: convertedMetadata.bitrate
      });

      return {
        convertedUrl,
        originalFormat: originalMetadata.format,
        targetFormat: request.targetFormat,
        originalSize: originalMetadata.bitrate,
        convertedSize: convertedMetadata.bitrate,
        conversionTime,
        metadata: convertedMetadata
      };

    } catch (error) {
      log.error("Audio format conversion failed", { error: (error as Error).message });
      throw APIError.internal("Audio format conversion failed");
    }
  }

  async exportStems(request: StemExportRequest): Promise<StemExportResponse> {
    const startTime = Date.now();
    
    try {
      log.info("Starting stem export", { 
        trackId: request.trackId,
        stemTypes: request.stemTypes 
      });

      // Get track data and separated stems
      const trackData = await this.getTrackData(request.trackId);
      const separatedStems = await this.separateAudioStems(trackData.audioUrl);
      
      const stemUrls: Record<string, string> = {};
      let totalSize = 0;

      // Process each requested stem
      for (const stemType of request.stemTypes) {
        if (separatedStems[stemType]) {
          const processedStem = await this.processStemForExport(
            separatedStems[stemType],
            request.format,
            request.quality,
            request.normalizeStems
          );
          
          const stemUrl = await this.uploadAudioFile(processedStem.path, request.format);
          stemUrls[stemType] = stemUrl;
          totalSize += processedStem.size;
          
          // Cleanup temporary file
          await fs.unlink(processedStem.path);
        }
      }

      const exportTime = Date.now() - startTime;

      log.info("Stem export completed", {
        trackId: request.trackId,
        stemCount: Object.keys(stemUrls).length,
        exportTime
      });

      return {
        trackId: request.trackId,
        stemUrls,
        format: request.format,
        totalSize,
        exportTime
      };

    } catch (error) {
      log.error("Stem export failed", { error: (error as Error).message });
      throw APIError.internal("Stem export failed");
    }
  }

  async masterAudio(request: MasteringRequest): Promise<MasteringResponse> {
    const startTime = Date.now();
    
    try {
      log.info("Starting audio mastering", { 
        trackId: request.trackId,
        targetLoudness: request.targetLoudness 
      });

      // Get track data
      const trackData = await this.getTrackData(request.trackId);
      const sourceFile = await this.downloadAudioFile(trackData.audioUrl);
      
      // Analyze original audio
      const originalAnalysis = await this.analyzeAudioLoudness(sourceFile);
      
      // Apply mastering chain
      const masteredFile = await this.applyMasteringChain(sourceFile, request);
      
      // Analyze mastered audio
      const masteredAnalysis = await this.analyzeAudioLoudness(masteredFile);
      
      // Upload mastered file
      const masteredUrl = await this.uploadAudioFile(masteredFile, 'wav');
      
      // Cleanup
      await fs.unlink(sourceFile);
      await fs.unlink(masteredFile);

      const processingTime = Date.now() - startTime;

      log.info("Audio mastering completed", {
        trackId: request.trackId,
        originalLoudness: originalAnalysis.integratedLoudness,
        masteredLoudness: masteredAnalysis.integratedLoudness,
        processingTime
      });

      return {
        masteredTrackUrl: masteredUrl,
        originalLoudness: originalAnalysis.integratedLoudness,
        targetLoudness: masteredAnalysis.integratedLoudness,
        peakLevel: masteredAnalysis.truePeak,
        dynamicRange: masteredAnalysis.loudnessRange,
        processingTime
      };

    } catch (error) {
      log.error("Audio mastering failed", { error: (error as Error).message });
      throw APIError.internal("Audio mastering failed");
    }
  }

  async downloadAudioFile(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio file: ${response.statusText}`);
    }

    const fileName = `temp_${Date.now()}.audio`;
    const filePath = join(this.tempDir, fileName);
    const buffer = await response.arrayBuffer();
    
    await fs.writeFile(filePath, Buffer.from(buffer));
    return filePath;
  }

  private async uploadAudioFile(filePath: string, format: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const fileName = `processed_${Date.now()}.${format}`;
    
    const uploadResult = await objectStorage.uploadAudio(buffer, fileName);
    return uploadResult.url;
  }

  async getAudioMetadata(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(stdout);
            const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
            
            resolve({
              duration: parseFloat(metadata.format.duration),
              sampleRate: parseInt(audioStream.sample_rate),
              bitDepth: audioStream.bits_per_sample || 16,
              channels: audioStream.channels,
              bitrate: parseInt(metadata.format.bit_rate || '0'),
              format: metadata.format.format_name,
              codec: audioStream.codec_name,
              title: metadata.format.tags?.title,
              artist: metadata.format.tags?.artist,
              album: metadata.format.tags?.album,
              genre: metadata.format.tags?.genre,
              year: metadata.format.tags?.date ? parseInt(metadata.format.tags.date) : undefined
            });
          } catch (error) {
            reject(new Error(`Failed to parse metadata: ${error}`));
          }
        } else {
          reject(new Error(`FFprobe failed: ${stderr}`));
        }
      });
    });
  }

  private async buildFFmpegCommand(
    input: string, 
    output: string, 
    request: AudioFormatConversionRequest
  ): Promise<string[]> {
    const args = ['-i', input];

    // Sample rate
    if (request.sampleRate) {
      args.push('-ar', request.sampleRate.toString());
    }

    // Channels
    if (request.channels) {
      args.push('-ac', request.channels.toString());
    }

    // Quality settings based on format and quality level
    switch (request.targetFormat) {
      case 'wav':
      case 'aiff':
        if (request.bitDepth) {
          const sampleFormat = request.bitDepth === 16 ? 's16' : 
                              request.bitDepth === 24 ? 's32' : 's16';
          args.push('-sample_fmt', sampleFormat);
        }
        break;

      case 'flac':
        const flacQuality = request.quality === 'lossless' ? '8' :
                           request.quality === 'high' ? '6' :
                           request.quality === 'medium' ? '4' : '2';
        args.push('-compression_level', flacQuality);
        break;

      case 'mp3':
        const mp3Quality = request.quality === 'high' ? '320k' :
                          request.quality === 'medium' ? '192k' : '128k';
        args.push('-b:a', mp3Quality);
        break;

      case 'aac':
        const aacQuality = request.quality === 'high' ? '256k' :
                          request.quality === 'medium' ? '128k' : '96k';
        args.push('-b:a', aacQuality);
        break;

      case 'ogg':
        const oggQuality = request.quality === 'high' ? '6' :
                          request.quality === 'medium' ? '4' : '2';
        args.push('-q:a', oggQuality);
        break;
    }

    // Audio filters
    const filters = [];

    if (request.normalize) {
      filters.push('loudnorm=I=-23:TP=-2:LRA=11');
    }

    if (request.fadeIn) {
      filters.push(`afade=t=in:ss=0:d=${request.fadeIn}`);
    }

    if (request.fadeOut) {
      filters.push(`afade=t=out:st=${request.fadeOut}:d=3`);
    }

    if (filters.length > 0) {
      args.push('-af', filters.join(','));
    }

    args.push('-y', output);
    return args;
  }

  private async runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }

  private async getTrackData(trackId: number): Promise<{ audioUrl: string }> {
    // Mock implementation - in real app, this would query the database
    return {
      audioUrl: `https://example.com/tracks/${trackId}.wav`
    };
  }

  private async separateAudioStems(audioUrl: string): Promise<Record<string, Buffer>> {
    // Mock implementation - in real app, this would use actual stem separation
    const mockStems = {
      drums: Buffer.from("MOCK_DRUMS_DATA"),
      bass: Buffer.from("MOCK_BASS_DATA"),
      piano: Buffer.from("MOCK_PIANO_DATA"),
      vocals: Buffer.from("MOCK_VOCALS_DATA"),
      other: Buffer.from("MOCK_OTHER_DATA")
    };

    return mockStems;
  }

  private async processStemForExport(
    stemBuffer: Buffer,
    format: string,
    quality: string,
    normalize?: boolean
  ): Promise<{ path: string; size: number }> {
    const tempPath = join(this.tempDir, `stem_${Date.now()}.${format}`);
    
    // Write buffer to temp file
    await fs.writeFile(tempPath, stemBuffer);
    
    // Process with FFmpeg if needed
    if (normalize || format !== 'wav') {
      const processedPath = join(this.tempDir, `processed_stem_${Date.now()}.${format}`);
      const args = ['-i', tempPath];
      
      if (normalize) {
        args.push('-af', 'loudnorm=I=-23:TP=-2:LRA=11');
      }
      
      args.push('-y', processedPath);
      await this.runFFmpeg(args);
      
      // Remove original temp file
      await fs.unlink(tempPath);
      
      const stats = await fs.stat(processedPath);
      return { path: processedPath, size: stats.size };
    }

    const stats = await fs.stat(tempPath);
    return { path: tempPath, size: stats.size };
  }

  private async analyzeAudioLoudness(filePath: string): Promise<{
    integratedLoudness: number;
    loudnessRange: number;
    truePeak: number;
  }> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', filePath,
        '-af', 'loudnorm=I=-23:TP=-2:LRA=11:print_format=json',
        '-f', 'null',
        '-'
      ]);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        try {
          // Extract loudness measurements from stderr
          const jsonMatch = stderr.match(/\{[^}]+\}/);
          if (jsonMatch) {
            const measurements = JSON.parse(jsonMatch[0]);
            resolve({
              integratedLoudness: parseFloat(measurements.input_i),
              loudnessRange: parseFloat(measurements.input_lra),
              truePeak: parseFloat(measurements.input_tp)
            });
          } else {
            // Fallback values
            resolve({
              integratedLoudness: -23,
              loudnessRange: 11,
              truePeak: -2
            });
          }
        } catch (error) {
          reject(new Error(`Failed to parse loudness analysis: ${error}`));
        }
      });
    });
  }

  private async applyMasteringChain(inputFile: string, request: MasteringRequest): Promise<string> {
    const outputFile = join(this.tempDir, `mastered_${Date.now()}.wav`);
    const filters = [];

    // EQ
    if (request.enableEQ) {
      filters.push('equalizer=f=60:width_type=o:width=2:g=-3'); // High-pass
      filters.push('equalizer=f=2000:width_type=o:width=0.5:g=1'); // Presence boost
      filters.push('equalizer=f=10000:width_type=o:width=2:g=2'); // Air
    }

    // Compression
    if (request.enableCompression) {
      filters.push('acompressor=threshold=0.125:ratio=4:attack=5:release=50');
    }

    // Stereo enhancement
    if (request.enableStereoEnhancement) {
      filters.push('extrastereo=m=1.5:c=false');
    }

    // Loudness normalization and limiting
    if (request.enableLimiting) {
      filters.push(`loudnorm=I=${request.targetLoudness}:TP=${request.ceilingLevel}:LRA=11`);
    }

    const args = ['-i', inputFile];
    
    if (filters.length > 0) {
      args.push('-af', filters.join(','));
    }
    
    args.push('-y', outputFile);

    await this.runFFmpeg(args);
    return outputFile;
  }
}

// Create singleton instance
const audioProcessor = new ProfessionalAudioProcessor();

// API endpoints
export const convertAudioFormat = api(
  { expose: true, method: "POST", path: "/audio/convert" },
  async (request: AudioFormatConversionRequest): Promise<AudioFormatConversionResponse> => {
    return await audioProcessor.convertAudioFormat(request);
  }
);

export const exportStems = api(
  { expose: true, method: "POST", path: "/audio/export-stems" },
  async (request: StemExportRequest): Promise<StemExportResponse> => {
    return await audioProcessor.exportStems(request);
  }
);

export const masterAudio = api(
  { expose: true, method: "POST", path: "/audio/master" },
  async (request: MasteringRequest): Promise<MasteringResponse> => {
    return await audioProcessor.masterAudio(request);
  }
);

export const getAudioMetadata = api(
  { expose: true, method: "GET", path: "/audio/metadata" },
  async ({ url }: { url: string }): Promise<AudioMetadata> => {
    const tempFile = await audioProcessor.downloadAudioFile(url);
    const metadata = await audioProcessor.getAudioMetadata(tempFile);
    await fs.unlink(tempFile);
    return metadata;
  }
);