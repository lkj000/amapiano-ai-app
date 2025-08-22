import { api } from "encore.dev/api";
import { musicDB } from "./db";
import type { Genre, SampleCategory, Sample } from "./types";

export interface ListSamplesRequest {
  genre?: Genre;
  category?: SampleCategory;
  tags?: string[];
  limit?: number;
}

export interface ListSamplesResponse {
  samples: Sample[];
  total: number;
}

// Lists available amapiano samples and loops
export const listSamples = api<ListSamplesRequest, ListSamplesResponse>(
  { expose: true, method: "GET", path: "/samples" },
  async (req) => {
    let query = `SELECT * FROM samples WHERE 1=1`;
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

    if (req.tags && req.tags.length > 0) {
      query += ` AND tags && $${paramIndex}`;
      params.push(req.tags);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    if (req.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(req.limit);
    }

    const samples = await musicDB.rawQueryAll<Sample>(query, ...params);

    return {
      samples,
      total: samples.length
    };
  }
);

export interface SearchSamplesRequest {
  query: string;
  genre?: Genre;
  category?: SampleCategory;
}

export interface SearchSamplesResponse {
  samples: Sample[];
  suggestions: string[];
}

// Searches samples by name, tags, or characteristics
export const searchSamples = api<SearchSamplesRequest, SearchSamplesResponse>(
  { expose: true, method: "GET", path: "/samples/search" },
  async (req) => {
    const searchQuery = `
      SELECT * FROM samples 
      WHERE (name ILIKE $1 OR $1 = ANY(tags))
      ${req.genre ? 'AND genre = $2' : ''}
      ${req.category ? `AND category = $${req.genre ? '3' : '2'}` : ''}
      ORDER BY 
        CASE 
          WHEN name ILIKE $1 THEN 1
          WHEN $1 = ANY(tags) THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 50
    `;

    const params = [`%${req.query}%`];
    if (req.genre) params.push(req.genre);
    if (req.category) params.push(req.category);

    const samples = await musicDB.rawQueryAll<Sample>(searchQuery, ...params);

    // Mock suggestions based on search
    const suggestions = [
      "log drum deep",
      "piano jazzy",
      "saxophone smooth",
      "percussion shuffle",
      "bass groovy"
    ].filter(s => s.includes(req.query.toLowerCase()));

    return {
      samples,
      suggestions
    };
  }
);

export interface GetSampleRequest {
  id: number;
}

// Retrieves a specific sample by ID
export const getSample = api<GetSampleRequest, Sample>(
  { expose: true, method: "GET", path: "/samples/:id" },
  async (req) => {
    const sample = await musicDB.queryRow<Sample>`
      SELECT * FROM samples WHERE id = ${req.id}
    `;

    if (!sample) {
      throw new Error("Sample not found");
    }

    return sample;
  }
);

export interface GetSamplesByArtistRequest {
  artist: string;
}

export interface GetSamplesByArtistResponse {
  samples: Sample[];
  artistInfo: {
    name: string;
    style: string;
    description: string;
  };
}

// Gets samples in the style of specific amapiano artists
export const getSamplesByArtist = api<GetSamplesByArtistRequest, GetSamplesByArtistResponse>(
  { expose: true, method: "GET", path: "/samples/artist/:artist" },
  async (req) => {
    const artistStyles: Record<string, any> = {
      kabza_da_small: {
        name: "Kabza De Small",
        style: "Classic Amapiano",
        description: "Known for pioneering the amapiano sound with signature log drums and soulful piano melodies",
        tags: ["classic", "log_drum", "soulful", "energetic"]
      },
      kelvin_momo: {
        name: "Kelvin Momo",
        style: "Private School Amapiano",
        description: "Master of the sophisticated, jazz-influenced private school amapiano sound",
        tags: ["private_school", "jazzy", "sophisticated", "mellow"]
      },
      babalwa_m: {
        name: "Babalwa M",
        style: "Melodic Amapiano",
        description: "Known for melodic and vocal-driven amapiano productions",
        tags: ["melodic", "vocal", "smooth", "groovy"]
      }
    };

    const artistInfo = artistStyles[req.artist];
    
    if (!artistInfo) {
      throw new Error("Artist not found");
    }
    
    // Mock samples for the artist style
    const samples = await musicDB.queryAll<Sample>`
      SELECT * FROM samples 
      WHERE tags && ${artistInfo.tags}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return {
      samples,
      artistInfo
    };
  }
);
