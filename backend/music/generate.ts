import { api } from "encore.dev/api";
import { musicDB } from "./db";
import { generatedTracks } from "./storage";
import type { Genre, Mood } from "./types";

export interface GenerateTrackRequest {
  prompt: string;
  genre: Genre;
  mood?: Mood;
  bpm?: number;
  keySignature?: string;
  duration?: number;
}

export interface GenerateTrackResponse {
  id: number;
  audioUrl: string;
  stems: {
    drums: string;
    bass: string;
    piano: string;
    other: string;
  };
  metadata: {
    bpm: number;
    keySignature: string;
    duration: number;
  };
}

// Generates an amapiano track from a text prompt
export const generateTrack = api<GenerateTrackRequest, GenerateTrackResponse>(
  { expose: true, method: "POST", path: "/generate/track" },
  async (req) => {
    // Simulate AI music generation
    const trackId = Math.floor(Math.random() * 1000000);
    const audioFileName = `generated_${trackId}.wav`;
    const stemsData = {
      drums: `stems/${trackId}_drums.wav`,
      bass: `stems/${trackId}_bass.wav`,
      piano: `stems/${trackId}_piano.wav`,
      other: `stems/${trackId}_other.wav`
    };

    // Generate mock audio data (in real implementation, this would call AI service)
    const mockAudioBuffer = Buffer.from("mock audio data");
    await generatedTracks.upload(audioFileName, mockAudioBuffer);

    // Store in database
    await musicDB.exec`
      INSERT INTO generated_tracks (prompt, genre, mood, bpm, key_signature, file_url, stems_data)
      VALUES (${req.prompt}, ${req.genre}, ${req.mood || null}, ${req.bpm || 120}, ${req.keySignature || "C"}, ${audioFileName}, ${JSON.stringify(stemsData)})
    `;

    const audioUrl = generatedTracks.publicUrl(audioFileName);

    return {
      id: trackId,
      audioUrl,
      stems: {
        drums: generatedTracks.publicUrl(stemsData.drums),
        bass: generatedTracks.publicUrl(stemsData.bass),
        piano: generatedTracks.publicUrl(stemsData.piano),
        other: generatedTracks.publicUrl(stemsData.other)
      },
      metadata: {
        bpm: req.bpm || 120,
        keySignature: req.keySignature || "C",
        duration: req.duration || 180
      }
    };
  }
);

export interface GenerateLoopRequest {
  category: "log_drum" | "piano" | "percussion" | "bass";
  genre: Genre;
  bpm?: number;
  bars?: number;
  keySignature?: string;
}

export interface GenerateLoopResponse {
  id: number;
  audioUrl: string;
  metadata: {
    category: string;
    bpm: number;
    bars: number;
    keySignature: string;
  };
}

// Generates specific amapiano loops and patterns
export const generateLoop = api<GenerateLoopRequest, GenerateLoopResponse>(
  { expose: true, method: "POST", path: "/generate/loop" },
  async (req) => {
    const loopId = Math.floor(Math.random() * 1000000);
    const fileName = `loop_${req.category}_${loopId}.wav`;

    // Generate mock loop data
    const mockLoopBuffer = Buffer.from("mock loop data");
    await generatedTracks.upload(fileName, mockLoopBuffer);

    const audioUrl = generatedTracks.publicUrl(fileName);

    return {
      id: loopId,
      audioUrl,
      metadata: {
        category: req.category,
        bpm: req.bpm || 120,
        bars: req.bars || 4,
        keySignature: req.keySignature || "C"
      }
    };
  }
);
