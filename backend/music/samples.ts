import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { audioFiles } from "./storage";
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
    
    // For demo purposes, create mock audio URLs since we don't have actual audio files
    const samplesWithUrls = samples.map(s => ({ 
      ...s, 
      fileUrl: s.fileUrl ? `https://www.soundjay.com/misc/sounds-1/beep-07a.wav` : 'https://www.soundjay.com/misc/sounds-1/beep-07a.wav'
    }));

    return {
      samples: samplesWithUrls,
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
    
    // For demo purposes, create mock audio URLs
    const samplesWithUrls = samples.map(s => ({ 
      ...s, 
      fileUrl: s.fileUrl ? `https://www.soundjay.com/misc/sounds-1/beep-07a.wav` : 'https://www.soundjay.com/misc/sounds-1/beep-07a.wav'
    }));

    // Generate suggestions based on search and existing tags
    const allTagsQuery = `
      SELECT DISTINCT unnest(tags) as tag 
      FROM samples 
      WHERE unnest(tags) ILIKE $1
      LIMIT 10
    `;
    const tagResults = await musicDB.rawQueryAll<{tag: string}>(allTagsQuery, `%${req.query}%`);
    const suggestions = tagResults.map(r => r.tag);

    return {
      samples: samplesWithUrls,
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
      throw APIError.notFound("Sample not found");
    }

    return {
      ...sample,
      fileUrl: sample.fileUrl ? `https://www.soundjay.com/misc/sounds-1/beep-07a.wav` : 'https://www.soundjay.com/misc/sounds-1/beep-07a.wav'
    };
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
        tags: ["kabza", "classic", "energetic", "soulful"]
      },
      kelvin_momo: {
        name: "Kelvin Momo",
        style: "Private School Amapiano",
        description: "Master of the sophisticated, jazz-influenced private school amapiano sound",
        tags: ["kelvin_momo", "private_school", "jazzy", "sophisticated", "mellow"]
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
      throw APIError.notFound("Artist not found");
    }
    
    // Get samples that match the artist's style tags
    const samples = await musicDB.queryAll<Sample>`
      SELECT * FROM samples 
      WHERE tags && ${artistInfo.tags}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    // For demo purposes, create mock audio URLs
    const samplesWithUrls = samples.map(s => ({ 
      ...s, 
      fileUrl: s.fileUrl ? `https://www.soundjay.com/misc/sounds-1/beep-07a.wav` : 'https://www.soundjay.com/misc/sounds-1/beep-07a.wav'
    }));

    return {
      samples: samplesWithUrls,
      artistInfo
    };
  }
);

export interface CreateSampleRequest {
  name: string;
  category: SampleCategory;
  genre: Genre;
  fileUrl: string;
  bpm?: number;
  keySignature?: string;
  durationSeconds?: number;
  tags?: string[];
}

export interface CreateSampleResponse {
  id: number;
  name: string;
  fileUrl: string;
}

// Creates a new sample (for admin/content management)
export const createSample = api<CreateSampleRequest, CreateSampleResponse>(
  { expose: true, method: "POST", path: "/samples" },
  async (req) => {
    const result = await musicDB.queryRow<{id: number, name: string, file_url: string}>`
      INSERT INTO samples (name, category, genre, file_url, bpm, key_signature, duration_seconds, tags)
      VALUES (${req.name}, ${req.category}, ${req.genre}, ${req.fileUrl}, ${req.bpm || null}, ${req.keySignature || null}, ${req.durationSeconds || null}, ${req.tags || []})
      RETURNING id, name, file_url
    `;

    if (!result) {
      throw APIError.internal("Failed to create sample");
    }

    return {
      id: result.id,
      name: result.name,
      fileUrl: `https://www.soundjay.com/misc/sounds-1/beep-07a.wav`
    };
  }
);

export interface GetSampleStatsResponse {
  totalSamples: number;
  samplesByCategory: Record<SampleCategory, number>;
  samplesByGenre: Record<Genre, number>;
  popularTags: Array<{tag: string, count: number}>;
}

// Gets statistics about the sample library
export const getSampleStats = api<void, GetSampleStatsResponse>(
  { expose: true, method: "GET", path: "/samples/stats" },
  async () => {
    // Get total count
    const totalResult = await musicDB.queryRow<{count: number}>`
      SELECT COUNT(*) as count FROM samples
    `;
    const totalSamples = totalResult?.count || 0;

    // Get counts by category
    const categoryResults = await musicDB.queryAll<{category: SampleCategory, count: number}>`
      SELECT category, COUNT(*) as count 
      FROM samples 
      GROUP BY category
    `;
    const samplesByCategory = categoryResults.reduce((acc, row) => {
      acc[row.category] = row.count;
      return acc;
    }, {} as Record<SampleCategory, number>);

    // Get counts by genre
    const genreResults = await musicDB.queryAll<{genre: Genre, count: number}>`
      SELECT genre, COUNT(*) as count 
      FROM samples 
      GROUP BY genre
    `;
    const samplesByGenre = genreResults.reduce((acc, row) => {
      acc[row.genre] = row.count;
      return acc;
    }, {} as Record<Genre, number>);

    // Get popular tags
    const tagResults = await musicDB.queryAll<{tag: string, count: number}>`
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM samples
      GROUP BY unnest(tags)
      ORDER BY count DESC
      LIMIT 20
    `;

    return {
      totalSamples,
      samplesByCategory,
      samplesByGenre,
      popularTags: tagResults
    };
  }
);
