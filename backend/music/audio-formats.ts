import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import log from "encore.dev/log";
import { APIError } from "encore.dev/api";

export type AudioFormat = 'wav' | 'mp3' | 'flac' | 'aac' | 'ogg' | 'aiff' | 'm4a';

export interface AudioMetadata {
  format: AudioFormat;
  sampleRate: number;
  bitDepth?: number;
  bitrate?: number;
  channels: number;
  duration: number;
  codec?: string;
  fileSize: number;
}

export interface ConversionOptions {
  targetFormat: AudioFormat;
  sampleRate?: number;
  bitDepth?: number;
  bitrate?: number;
  channels?: number;
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

export class AudioFormatConverter {
  private tempDir: string;

  constructor() {
    this.tempDir = tmpdir();
  }

  async convert(inputBuffer: Buffer, options: ConversionOptions): Promise<Buffer> {
    try {
      log.info("Starting audio format conversion", {
        targetFormat: options.targetFormat,
        quality: options.quality || 'high'
      });

      const inputPath = join(this.tempDir, `input_${Date.now()}.wav`);
      const outputPath = join(this.tempDir, `output_${Date.now()}.${options.targetFormat}`);

      // Write input buffer to temporary file
      await fs.writeFile(inputPath, inputBuffer);

      // Convert using ffmpeg
      await this.runFFmpeg(inputPath, outputPath, options);

      // Read converted file
      const outputBuffer = await fs.readFile(outputPath);

      // Clean up temporary files
      await Promise.all([
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {})
      ]);

      log.info("Audio conversion completed", {
        inputSize: inputBuffer.length,
        outputSize: outputBuffer.length,
        format: options.targetFormat
      });

      return outputBuffer;

    } catch (error) {
      log.error("Audio conversion failed", { error: (error as Error).message });
      throw APIError.internal("Failed to convert audio format");
    }
  }

  private async runFFmpeg(inputPath: string, outputPath: string, options: ConversionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = this.buildFFmpegArgs(inputPath, outputPath, options);

      const ffmpeg = spawn('ffmpeg', args);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });
    });
  }

  private buildFFmpegArgs(inputPath: string, outputPath: string, options: ConversionOptions): string[] {
    const args = ['-i', inputPath, '-y']; // -y to overwrite output file

    // Set sample rate
    if (options.sampleRate) {
      args.push('-ar', options.sampleRate.toString());
    }

    // Set channels
    if (options.channels) {
      args.push('-ac', options.channels.toString());
    }

    // Set format-specific options
    switch (options.targetFormat) {
      case 'mp3':
        args.push('-codec:a', 'libmp3lame');
        if (options.bitrate) {
          args.push('-b:a', `${options.bitrate}k`);
        } else {
          args.push('-q:a', this.getMP3Quality(options.quality));
        }
        break;

      case 'flac':
        args.push('-codec:a', 'flac');
        args.push('-compression_level', '8');
        break;

      case 'aac':
        args.push('-codec:a', 'aac');
        if (options.bitrate) {
          args.push('-b:a', `${options.bitrate}k`);
        } else {
          args.push('-b:a', this.getAACBitrate(options.quality));
        }
        break;

      case 'ogg':
        args.push('-codec:a', 'libvorbis');
        if (options.bitrate) {
          args.push('-b:a', `${options.bitrate}k`);
        } else {
          args.push('-q:a', this.getOGGQuality(options.quality));
        }
        break;

      case 'wav':
        args.push('-codec:a', 'pcm_s16le');
        if (options.bitDepth === 24) {
          args.push('-codec:a', 'pcm_s24le');
        } else if (options.bitDepth === 32) {
          args.push('-codec:a', 'pcm_s32le');
        }
        break;

      case 'aiff':
        args.push('-codec:a', 'pcm_s16be');
        break;

      case 'm4a':
        args.push('-codec:a', 'aac');
        args.push('-b:a', this.getAACBitrate(options.quality));
        break;
    }

    args.push(outputPath);

    return args;
  }

  private getMP3Quality(quality?: string): string {
    switch (quality) {
      case 'low': return '9';
      case 'medium': return '5';
      case 'high': return '2';
      case 'lossless': return '0';
      default: return '2'; // High quality by default
    }
  }

  private getAACBitrate(quality?: string): string {
    switch (quality) {
      case 'low': return '96k';
      case 'medium': return '128k';
      case 'high': return '256k';
      case 'lossless': return '320k';
      default: return '256k';
    }
  }

  private getOGGQuality(quality?: string): string {
    switch (quality) {
      case 'low': return '3';
      case 'medium': return '5';
      case 'high': return '8';
      case 'lossless': return '10';
      default: return '8';
    }
  }

  async extractMetadata(audioBuffer: Buffer): Promise<AudioMetadata> {
    try {
      const inputPath = join(this.tempDir, `metadata_${Date.now()}.audio`);
      await fs.writeFile(inputPath, audioBuffer);

      const metadata = await this.getFFprobeMetadata(inputPath);

      await fs.unlink(inputPath).catch(() => {});

      return metadata;

    } catch (error) {
      log.error("Metadata extraction failed", { error: (error as Error).message });
      
      // Return default metadata
      return {
        format: 'wav',
        sampleRate: 44100,
        bitDepth: 16,
        channels: 2,
        duration: 0,
        fileSize: audioBuffer.length
      };
    }
  }

  private async getFFprobeMetadata(inputPath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
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
            const data = JSON.parse(stdout);
            const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
            
            resolve({
              format: this.detectFormat(data.format.format_name),
              sampleRate: parseInt(audioStream.sample_rate),
              bitDepth: audioStream.bits_per_sample,
              bitrate: parseInt(data.format.bit_rate) / 1000,
              channels: audioStream.channels,
              duration: parseFloat(data.format.duration),
              codec: audioStream.codec_name,
              fileSize: parseInt(data.format.size)
            });
          } catch (error) {
            reject(new Error(`Failed to parse ffprobe output: ${error}`));
          }
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`Failed to start FFprobe: ${error.message}`));
      });
    });
  }

  private detectFormat(formatName: string): AudioFormat {
    if (formatName.includes('wav')) return 'wav';
    if (formatName.includes('mp3')) return 'mp3';
    if (formatName.includes('flac')) return 'flac';
    if (formatName.includes('aac') || formatName.includes('m4a')) return 'aac';
    if (formatName.includes('ogg')) return 'ogg';
    if (formatName.includes('aiff')) return 'aiff';
    return 'wav'; // Default
  }

  async normalizeAudio(audioBuffer: Buffer, targetLUFS: number = -14): Promise<Buffer> {
    try {
      log.info("Normalizing audio", { targetLUFS });

      const inputPath = join(this.tempDir, `normalize_input_${Date.now()}.wav`);
      const outputPath = join(this.tempDir, `normalize_output_${Date.now()}.wav`);

      await fs.writeFile(inputPath, audioBuffer);

      // Use ffmpeg loudnorm filter for LUFS normalization
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputPath,
          '-af', `loudnorm=I=${targetLUFS}:TP=-1.5:LRA=11`,
          '-y',
          outputPath
        ]);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg normalization failed: ${stderr}`));
          }
        });

        ffmpeg.on('error', (error) => {
          reject(error);
        });
      });

      const normalizedBuffer = await fs.readFile(outputPath);

      await Promise.all([
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {})
      ]);

      return normalizedBuffer;

    } catch (error) {
      log.warn("Audio normalization failed, returning original", { error: (error as Error).message });
      return audioBuffer;
    }
  }

  async trimSilence(audioBuffer: Buffer, threshold: number = -50): Promise<Buffer> {
    try {
      log.info("Trimming silence from audio", { threshold });

      const inputPath = join(this.tempDir, `trim_input_${Date.now()}.wav`);
      const outputPath = join(this.tempDir, `trim_output_${Date.now()}.wav`);

      await fs.writeFile(inputPath, audioBuffer);

      // Use ffmpeg silenceremove filter
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputPath,
          '-af', `silenceremove=start_periods=1:start_threshold=${threshold}dB:stop_periods=-1:stop_threshold=${threshold}dB`,
          '-y',
          outputPath
        ]);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg trim failed: ${stderr}`));
          }
        });

        ffmpeg.on('error', (error) => {
          reject(error);
        });
      });

      const trimmedBuffer = await fs.readFile(outputPath);

      await Promise.all([
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {})
      ]);

      return trimmedBuffer;

    } catch (error) {
      log.warn("Silence trimming failed, returning original", { error: (error as Error).message });
      return audioBuffer;
    }
  }

  async resample(audioBuffer: Buffer, targetSampleRate: number): Promise<Buffer> {
    return await this.convert(audioBuffer, {
      targetFormat: 'wav',
      sampleRate: targetSampleRate,
      quality: 'lossless'
    });
  }

  async mixToMono(audioBuffer: Buffer): Promise<Buffer> {
    return await this.convert(audioBuffer, {
      targetFormat: 'wav',
      channels: 1,
      quality: 'lossless'
    });
  }

  async mixToStereo(audioBuffer: Buffer): Promise<Buffer> {
    return await this.convert(audioBuffer, {
      targetFormat: 'wav',
      channels: 2,
      quality: 'lossless'
    });
  }
}

// Create singleton instance
export const audioFormatConverter = new AudioFormatConverter();
