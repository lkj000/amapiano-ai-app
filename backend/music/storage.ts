import { Bucket } from "encore.dev/storage/objects";

export const audioFiles = new Bucket("audio-files", { public: true });
export const generatedTracks = new Bucket("generated-tracks", { public: true });
export const extractedStems = new Bucket("extracted-stems", { public: true });

// Object storage wrapper for easier usage
export const objectStorage = {
  async uploadAudio(buffer: Buffer, fileName: string): Promise<{ url: string }> {
    await audioFiles.upload(fileName, buffer);
    const url = audioFiles.publicUrl(fileName);
    return { url };
  },
  
  async downloadAudio(fileName: string): Promise<Buffer> {
    return await audioFiles.download(fileName);
  },
  
  async uploadTrack(buffer: Buffer, fileName: string): Promise<{ url: string }> {
    await generatedTracks.upload(fileName, buffer);
    const url = generatedTracks.publicUrl(fileName);
    return { url };
  },
  
  async uploadStem(buffer: Buffer, fileName: string): Promise<{ url: string }> {
    await extractedStems.upload(fileName, buffer);
    const url = extractedStems.publicUrl(fileName);
    return { url };
  }
};
