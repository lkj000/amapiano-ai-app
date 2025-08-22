import { api } from "encore.dev/api";
import { musicDB } from "./db";
import type { Genre, PatternCategory, Pattern } from "./types";

export interface ListPatternsRequest {
  genre?: Genre;
  category?: PatternCategory;
  bpm?: number;
  keySignature?: string;
}

export interface ListPatternsResponse {
  patterns: Pattern[];
}

// Lists available amapiano patterns and progressions
export const listPatterns = api<ListPatternsRequest, ListPatternsResponse>(
  { expose: true, method: "GET", path: "/patterns" },
  async (req) => {
    let query = `SELECT * FROM patterns WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (req.genre) {
      query += ` AND genre = $${paramIndex}`;
      params.push(req.genre);
      paramIndex++;
    }

    if (req.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(req.category);
      paramIndex++;
    }

    if (req.bpm) {
      query += ` AND bpm BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(req.bpm - 10, req.bpm + 10);
      paramIndex += 2;
    }

    if (req.keySignature) {
      query += ` AND key_signature = $${paramIndex}`;
      params.push(req.keySignature);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const patterns = await musicDB.rawQueryAll<Pattern>(query, ...params);

    return { patterns };
  }
);

export interface GetChordProgressionsRequest {
  genre: Genre;
  complexity?: "simple" | "intermediate" | "advanced";
}

export interface GetChordProgressionsResponse {
  progressions: {
    id: number;
    name: string;
    chords: string[];
    romanNumerals: string[];
    complexity: string;
    style: string;
  }[];
}

// Gets chord progressions specific to amapiano styles
export const getChordProgressions = api<GetChordProgressionsRequest, GetChordProgressionsResponse>(
  { expose: true, method: "GET", path: "/patterns/chords" },
  async (req) => {
    const progressions = req.genre === "private_school_amapiano" ? [
      {
        id: 1,
        name: "Private School Classic",
        chords: ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
        romanNumerals: ["Imaj9", "vim7", "IVmaj7", "V7sus4"],
        complexity: "intermediate",
        style: "jazzy"
      },
      {
        id: 2,
        name: "Kelvin Momo Style",
        chords: ["Dm9", "G13", "Cmaj7", "Am7"],
        romanNumerals: ["iim9", "V13", "Imaj7", "vim7"],
        complexity: "advanced",
        style: "sophisticated"
      },
      {
        id: 3,
        name: "Smooth Jazz Influence",
        chords: ["Fmaj7", "Em7", "Am7", "Dm7"],
        romanNumerals: ["IVmaj7", "iiim7", "vim7", "iim7"],
        complexity: "intermediate",
        style: "smooth"
      }
    ] : [
      {
        id: 4,
        name: "Classic Amapiano",
        chords: ["C", "Am", "F", "G"],
        romanNumerals: ["I", "vi", "IV", "V"],
        complexity: "simple",
        style: "soulful"
      },
      {
        id: 5,
        name: "Kabza Style",
        chords: ["Cm", "Fm", "G", "Cm"],
        romanNumerals: ["i", "iv", "V", "i"],
        complexity: "simple",
        style: "energetic"
      },
      {
        id: 6,
        name: "Deep House Influence",
        chords: ["Am7", "Dm7", "G7", "Cmaj7"],
        romanNumerals: ["vim7", "iim7", "V7", "Imaj7"],
        complexity: "intermediate",
        style: "deep"
      }
    ];

    const filtered = req.complexity 
      ? progressions.filter(p => p.complexity === req.complexity)
      : progressions;

    return { progressions: filtered };
  }
);

export interface GetDrumPatternsRequest {
  genre: Genre;
  style?: "classic" | "modern" | "minimal";
}

export interface GetDrumPatternsResponse {
  patterns: {
    id: number;
    name: string;
    logDrum: string;
    kick: string;
    snare: string;
    hiHat: string;
    style: string;
  }[];
}

// Gets drum patterns specific to amapiano
export const getDrumPatterns = api<GetDrumPatternsRequest, GetDrumPatternsResponse>(
  { expose: true, method: "GET", path: "/patterns/drums" },
  async (req) => {
    const patterns = [
      {
        id: 1,
        name: "Classic Log Drum",
        logDrum: "x-x-.-x-x-.-x-.-",
        kick: "x...x...x...x...",
        snare: "....x.......x...",
        hiHat: "x.x.x.x.x.x.x.x.",
        style: "classic"
      },
      {
        id: 2,
        name: "Private School Subtle",
        logDrum: "x.-.x.-.x.-.x.-.",
        kick: "x.......x.......",
        snare: "........x.......",
        hiHat: "..x...x...x...x.",
        style: "minimal"
      },
      {
        id: 3,
        name: "Modern Amapiano",
        logDrum: "x-x.x-x.x-x.x-x.",
        kick: "x...x.x.x...x.x.",
        snare: "....x.......x...",
        hiHat: "x.x.x.x.x.x.x.x.",
        style: "modern"
      }
    ];

    const filtered = req.style 
      ? patterns.filter(p => p.style === req.style)
      : patterns;

    return { patterns: filtered };
  }
);
