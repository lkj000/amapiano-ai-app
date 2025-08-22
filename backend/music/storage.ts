import { Bucket } from "encore.dev/storage/objects";

export const audioFiles = new Bucket("audio-files", { public: true });
export const generatedTracks = new Bucket("generated-tracks", { public: true });
export const extractedStems = new Bucket("extracted-stems", { public: true });
