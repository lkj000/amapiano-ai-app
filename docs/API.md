# Amapiano AI API Documentation

## Overview

The Amapiano AI API provides comprehensive endpoints for generating music, analyzing audio, managing samples and patterns, and handling DAW projects. All endpoints return JSON responses, use standard HTTP status codes, and maintain full type safety through TypeScript.

## Base URL

```
http://localhost:4000
```

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible for demonstration purposes.

## API Endpoints

### Music Generation

#### Generate Track

Generate a complete amapiano track from a text prompt with advanced customization options.

```http
POST /generate/track
```

**Request Body:**
```json
{
  "prompt": "A soulful private school amapiano track with jazzy piano chords and deep log drums",
  "genre": "amapiano" | "private_school_amapiano",
  "mood": "chill" | "energetic" | "soulful" | "groovy" | "mellow" | "uplifting" | "deep" | "jazzy",
  "bpm": 120,
  "keySignature": "C",
  "duration": 180,
  "sourceAnalysisId": 12345,
  "advancedOptions": {
    "arrangement": "minimal" | "standard" | "complex",
    "instrumentation": ["piano", "log_drum", "bass", "saxophone"],
    "mixingStyle": "raw" | "polished" | "vintage",
    "energyLevel": "low" | "medium" | "high",
    "culturalAuthenticity": "traditional" | "modern" | "fusion"
  }
}
```

**Response:**
```json
{
  "id": 123456,
  "audioUrl": "https://storage.example.com/generated_123456.wav",
  "stems": {
    "drums": "https://storage.example.com/stems/123456_drums.wav",
    "bass": "https://storage.example.com/stems/123456_bass.wav",
    "piano": "https://storage.example.com/stems/123456_piano.wav",
    "other": "https://storage.example.com/stems/123456_other.wav"
  },
  "metadata": {
    "bpm": 120,
    "keySignature": "C",
    "duration": 180,
    "arrangement": "standard",
    "instrumentation": ["piano", "log_drum", "bass", "saxophone"],
    "qualityScore": 0.92
  },
  "processingTime": 1250,
  "generationDetails": {
    "promptAnalysis": "energy: energetic, upbeat; mood: soulful, emotional; instruments: piano, saxophone",
    "styleCharacteristics": ["Jazz-influenced harmonies", "Sophisticated chord progressions", "Emotional depth"],
    "technicalSpecs": {
      "sampleRate": 44100,
      "bitDepth": 24,
      "format": "WAV"
    }
  }
}
```

#### Generate Loop

Generate specific amapiano loops and patterns with professional quality.

```http
POST /generate/loop
```

**Request Body:**
```json
{
  "category": "log_drum" | "piano" | "percussion" | "bass",
  "genre": "amapiano" | "private_school_amapiano",
  "bpm": 120,
  "bars": 4,
  "keySignature": "C",
  "complexity": "simple" | "intermediate" | "advanced",
  "style": "classic"
}
```

**Response:**
```json
{
  "id": 789012,
  "audioUrl": "https://storage.example.com/loop_log_drum_789012.wav",
  "metadata": {
    "category": "log_drum",
    "bpm": 120,
    "bars": 4,
    "keySignature": "C",
    "complexity": "intermediate",
    "style": "classic",
    "qualityScore": 0.89
  },
  "processingTime": 850,
  "loopDetails": {
    "pattern": "x-x-.-x-x-.-x-.-",
    "characteristics": ["Deep resonance", "Rhythmic foundation", "Traditional", "Soulful"],
    "technicalSpecs": {
      "sampleRate": 44100,
      "bitDepth": 24,
      "format": "WAV"
    }
  }
}
```

#### Get Generation History

Get a list of previously generated tracks with advanced filtering.

```http
GET /generate/history?limit=20&genre=amapiano&sortBy=quality&filterBy.hasSourceAnalysis=true
```

**Query Parameters:**
- `limit` (optional): Number of results to return (default 50, max 100)
- `genre` (optional): Filter by genre
- `sortBy` (optional): Sort by "date", "quality", or "duration"
- `sortOrder` (optional): "asc" or "desc" (default "desc")
- `filterBy.hasSourceAnalysis` (optional): Filter tracks with source analysis
- `filterBy.minQuality` (optional): Minimum quality score (0.0-1.0)
- `filterBy.transformationType` (optional): "original", "remix", "amapianorize"

**Response:**
```json
{
  "tracks": [
    {
      "id": 123456,
      "prompt": "A soulful amapiano track...",
      "genre": "amapiano",
      "mood": "soulful",
      "bpm": 120,
      "keySignature": "C",
      "fileUrl": "generated_123456.wav",
      "qualityRating": 0.92,
      "processingTime": 1250,
      "transformationType": "original",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalCount": 150,
  "averageQuality": 0.87,
  "statistics": {
    "totalGenerations": 150,
    "averageProcessingTime": 1180,
    "genreDistribution": {
      "amapiano": 90,
      "private_school_amapiano": 60
    }
  }
}
```

#### Get Generation Statistics

Get comprehensive statistics about generated content.

```http
GET /generate/stats
```

**Response:**
```json
{
  "totalGenerations": 1234,
  "generationsByGenre": {
    "amapiano": 800,
    "private_school_amapiano": 434
  },
  "generationsByMood": {
    "chill": 500,
    "energetic": 300,
    "soulful": 250
  },
  "averageBpm": 118,
  "popularKeySignatures": [
    { "key": "C", "count": 200 },
    { "key": "Am", "count": 150 },
    { "key": "F#m", "count": 120 }
  ],
  "qualityDistribution": {
    "high": 450,
    "medium": 650,
    "low": 134
  },
  "processingStats": {
    "averageTime": 1150,
    "fastestTime": 450,
    "slowestTime": 3200
  },
  "trendsOverTime": [
    {
      "date": "2024-01-15",
      "count": 25,
      "averageQuality": 0.89
    }
  ]
}
```

### Enhanced Audio Analysis

#### Get Upload URL

Generates a signed URL for securely uploading audio/video files up to 500MB.

```http
POST /analyze/upload-url
```

**Request Body:**
```json
{
  "fileName": "my-track.mp4",
  "fileSize": 157286400,
  "fileType": "video/mp4"
}
```

**Response:**
```json
{
  "uploadUrl": "https://storage.example.com/signed-url...",
  "fileId": "upload_1672531200000_abcdef123",
  "maxFileSize": 524288000,
  "supportedFormats": [
    "wav", "flac", "aiff", "mp3", "m4a", "aac", "ogg", "wma",
    "mp4", "avi", "mov", "mkv", "webm", "3gp", "flv", "wmv", "mts", "mxf"
  ],
  "estimatedProcessingTime": 120
}
```

#### Analyze Audio

Analyze audio from various sources with professional-grade processing.

```http
POST /analyze/audio
```

**Request Body:**
```json
{
  "sourceUrl": "https://www.youtube.com/watch?v=example",
  "sourceType": "youtube" | "upload" | "url" | "tiktok" | "microphone",
  "fileName": "my-track.mp4",
  "fileSize": 157286400
}
```

**Response:**
```json
{
  "id": 345678,
  "stems": {
    "drums": "https://storage.example.com/analysis_345678_drums.wav",
    "bass": "https://storage.example.com/analysis_345678_bass.wav",
    "piano": "https://storage.example.com/analysis_345678_piano.wav",
    "vocals": "https://storage.example.com/analysis_345678_vocals.wav",
    "other": "https://storage.example.com/analysis_345678_other.wav"
  },
  "patterns": [
    {
      "type": "drum_pattern",
      "confidence": 0.96,
      "data": {
        "pattern": "kick-snare-kick-snare",
        "velocity": [100, 80, 100, 80],
        "logDrum": {
          "notes": ["C1", "C1", "rest", "C1"],
          "timing": [0, 0.5, 1, 1.5],
          "swing": 0.08,
          "accent": [true, false, false, true]
        },
        "complexity": "intermediate",
        "groove": "deep"
      },
      "timeRange": { "start": 0, "end": 4 }
    },
    {
      "type": "chord_progression",
      "confidence": 0.94,
      "data": {
        "chords": ["Cmaj7", "Fmaj7", "G7", "Am7"],
        "progression": "I-IV-V-vi",
        "voicing": "jazz",
        "inversions": ["root", "first", "root", "second"],
        "quality": "sophisticated",
        "tension": ["maj7", "maj7", "dom7", "min7"]
      },
      "timeRange": { "start": 0, "end": 8 }
    }
  ],
  "metadata": {
    "bpm": 120,
    "keySignature": "C",
    "genre": "private_school_amapiano",
    "duration": 180,
    "originalFileName": "my-track.mp4",
    "fileType": "video",
    "confidence": 0.92,
    "quality": "high",
    "sampleRate": 44100,
    "bitDepth": 24
  },
  "processingTime": 2150
}
```

#### Amapianorize Track

Transform an analyzed track into authentic amapiano style.

```http
POST /analyze/amapianorize
```

**Request Body:**
```json
{
  "sourceAnalysisId": 12345,
  "targetGenre": "private_school_amapiano",
  "intensity": "moderate",
  "preserveVocals": true,
  "customPrompt": "Add more jazzy saxophone elements",
  "additionalOptions": {
    "preserveMelody": true,
    "addInstruments": ["saxophone", "guitar"],
    "removeInstruments": ["synth"],
    "tempoAdjustment": "auto"
  }
}
```

**Response:**
```json
{
  "id": 67890,
  "originalTrackId": 12345,
  "amapianorizedTrackUrl": "https://storage.example.com/amapianorized_67890.wav",
  "stems": {
    "drums": "https://storage.example.com/amapianorized_67890_drums.wav",
    "bass": "https://storage.example.com/amapianorized_67890_bass.wav",
    "piano": "https://storage.example.com/amapianorized_67890_piano.wav",
    "vocals": "https://storage.example.com/amapianorized_67890_vocals.wav",
    "other": "https://storage.example.com/amapianorized_67890_other.wav"
  },
  "metadata": {
    "bpm": 115,
    "keySignature": "F#m",
    "genre": "private_school_amapiano",
    "duration": 180,
    "intensity": "moderate",
    "originalFileName": "my-track.mp4",
    "transformationDetails": {
      "elementsAdded": ["Jazz harmonies", "Sophisticated chord progressions", "Live saxophone"],
      "elementsModified": ["Drum patterns", "Bass arrangement", "Harmonic structure"],
      "elementsPreserved": ["Original vocals", "Main melody"]
    }
  },
  "processingTime": 3200
}
```

#### Extract Patterns

Extract specific amapiano patterns from audio with detailed analysis.

```http
POST /analyze/patterns
```

**Request Body:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "genre": "amapiano" | "private_school_amapiano",
  "analysisDepth": "basic" | "detailed" | "comprehensive"
}
```

**Response:**
```json
{
  "patterns": [
    {
      "type": "chord_progression",
      "confidence": 0.93,
      "data": {
        "chords": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
        "voicing": "jazz",
        "style": "sophisticated",
        "inversions": ["root", "first", "second", "root"],
        "rhythm": "whole-half",
        "function": ["tonic", "relative-minor", "subdominant", "dominant"]
      },
      "timeRange": { "start": 0, "end": 8 }
    }
  ],
  "suggestions": {
    "logDrumPattern": {
      "pattern": "C1-C1-rest-C1",
      "swing": 0.05,
      "velocity": [100, 85, 0, 90],
      "character": "subtle",
      "placement": "foundational"
    },
    "pianoChords": {
      "progression": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
      "style": "jazzy",
      "voicing": "extended",
      "rhythm": "sustained",
      "dynamics": "medium"
    },
    "arrangement": {
      "intro": "8 bars - minimal elements",
      "verse": "16 bars - full arrangement",
      "chorus": "16 bars - enhanced energy",
      "bridge": "8 bars - breakdown",
      "outro": "8 bars - fade elements",
      "structure": "intro-verse-chorus-verse-chorus-bridge-chorus-outro"
    }
  },
  "analysisQuality": {
    "confidence": 0.91,
    "completeness": 0.95,
    "accuracy": 0.92
  }
}
```

#### Get Analysis History

Get a list of previously analyzed tracks with enhanced filtering.

```http
GET /analyze/history?limit=20&sourceType=youtube&sortBy=quality&genre=private_school_amapiano
```

**Query Parameters:**
- `limit` (optional): Number of results to return (default 50)
- `sourceType` (optional): Filter by source type
- `genre` (optional): Filter by detected genre
- `sortBy` (optional): Sort by "date", "quality", or "duration"
- `sortOrder` (optional): "asc" or "desc"

**Response:**
```json
{
  "analyses": [
    {
      "id": 345678,
      "sourceUrl": "https://www.youtube.com/watch?v=example",
      "sourceType": "youtube",
      "metadata": {
        "bpm": 120,
        "keySignature": "C",
        "genre": "private_school_amapiano",
        "duration": 180,
        "originalFileName": "track.mp4",
        "fileType": "video",
        "confidence": 0.92,
        "quality": "high"
      },
      "processingTime": 2150,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalCount": 75,
  "averageQuality": 0.88
}
```

#### Batch Analysis

Process multiple audio sources simultaneously.

```http
POST /analyze/batch
```

**Request Body:**
```json
{
  "sources": [
    {
      "sourceUrl": "https://www.youtube.com/watch?v=example1",
      "sourceType": "youtube"
    },
    {
      "sourceUrl": "upload://file123",
      "sourceType": "upload",
      "fileName": "track.mp3",
      "fileSize": 5242880
    }
  ],
  "priority": "low" | "normal" | "high"
}
```

**Response:**
```json
{
  "batchId": "batch_1672531200000_abcdef123",
  "estimatedCompletionTime": 300,
  "queuePosition": 2,
  "sources": [
    {
      "sourceUrl": "https://www.youtube.com/watch?v=example1",
      "status": "queued"
    },
    {
      "sourceUrl": "upload://file123",
      "status": "queued"
    }
  ]
}
```

#### Get Batch Status

Check the status of a batch analysis operation.

```http
GET /analyze/batch/:batchId
```

**Response:**
```json
{
  "batchId": "batch_1672531200000_abcdef123",
  "status": "processing",
  "progress": 60,
  "completedSources": 3,
  "totalSources": 5,
  "results": [
    {
      "sourceUrl": "https://www.youtube.com/watch?v=example1",
      "status": "completed",
      "analysisId": 345678
    },
    {
      "sourceUrl": "upload://file123",
      "status": "processing"
    }
  ],
  "estimatedTimeRemaining": 120
}
```

### Sample Management

#### List Samples

List available amapiano samples with comprehensive filtering.

```http
GET /samples?genre=amapiano&category=log_drum&tags=deep,groovy&limit=50
```

**Query Parameters:**
- `genre` (optional): `amapiano` | `private_school_amapiano`
- `category` (optional): `log_drum` | `piano` | `percussion` | `bass` | `vocal` | `saxophone` | `guitar` | `synth`
- `tags` (optional): Array of tag strings
- `limit` (optional): Number of results to return

**Response:**
```json
{
  "samples": [
    {
      "id": 1,
      "name": "Deep Log Drum Loop",
      "category": "log_drum",
      "genre": "amapiano",
      "fileUrl": "https://storage.example.com/sample_1.wav",
      "bpm": 120,
      "keySignature": "C",
      "durationSeconds": 4.5,
      "tags": ["deep", "groovy", "classic"],
      "qualityRating": 4.8,
      "downloadCount": 1250,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Search Samples

Search samples by name, tags, or characteristics with intelligent suggestions.

```http
GET /samples/search?query=log%20drum&genre=amapiano&category=log_drum
```

**Query Parameters:**
- `query` (required): Search query string
- `genre` (optional): Filter by genre
- `category` (optional): Filter by category

**Response:**
```json
{
  "samples": [
    {
      "id": 1,
      "name": "Deep Log Drum Loop",
      "category": "log_drum",
      "genre": "amapiano",
      "fileUrl": "https://storage.example.com/sample_1.wav",
      "bpm": 120,
      "keySignature": "C",
      "durationSeconds": 4.5,
      "tags": ["deep", "groovy", "classic"],
      "qualityRating": 4.8,
      "downloadCount": 1250,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "suggestions": [
    "log drum deep",
    "log drum classic",
    "deep groovy"
  ]
}
```

#### Get Sample by ID

Retrieve a specific sample with complete metadata.

```http
GET /samples/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "Deep Log Drum Loop",
  "category": "log_drum",
  "genre": "amapiano",
  "fileUrl": "https://storage.example.com/sample_1.wav",
  "bpm": 120,
  "keySignature": "C",
  "durationSeconds": 4.5,
  "tags": ["deep", "groovy", "classic"],
  "qualityRating": 4.8,
  "downloadCount": 1250,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Get Samples by Artist

Get samples in the style of specific amapiano artists.

```http
GET /samples/artist/:artist
```

**Path Parameters:**
- `artist`: `kabza_da_small` | `kelvin_momo` | `babalwa_m`

**Response:**
```json
{
  "samples": [
    {
      "id": 1,
      "name": "Kabza Style Log Drum",
      "category": "log_drum",
      "genre": "amapiano",
      "fileUrl": "https://storage.example.com/sample_1.wav",
      "bpm": 118,
      "keySignature": "F#m",
      "durationSeconds": 8.0,
      "tags": ["classic", "energetic", "kabza"],
      "qualityRating": 4.9,
      "downloadCount": 2100,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "artistInfo": {
    "name": "Kabza De Small",
    "style": "Classic Amapiano",
    "description": "Known for pioneering the amapiano sound with signature log drums and soulful piano melodies"
  }
}
```

#### Create Sample

Create a new sample (for admin/content management).

```http
POST /samples
```

**Request Body:**
```json
{
  "name": "New Sample",
  "category": "log_drum",
  "genre": "amapiano",
  "fileUrl": "samples/new_sample.wav",
  "bpm": 120,
  "keySignature": "C",
  "durationSeconds": 4.0,
  "tags": ["new", "test"]
}
```

**Response:**
```json
{
  "id": 123,
  "name": "New Sample",
  "fileUrl": "https://storage.example.com/samples/new_sample.wav"
}
```

#### Get Sample Statistics

Get comprehensive statistics about the sample library.

```http
GET /samples/stats
```

**Response:**
```json
{
  "totalSamples": 5432,
  "samplesByCategory": {
    "log_drum": 500,
    "piano": 800,
    "percussion": 650,
    "bass": 400,
    "vocal": 300,
    "saxophone": 250,
    "guitar": 200,
    "synth": 332
  },
  "samplesByGenre": {
    "amapiano": 3000,
    "private_school_amapiano": 2432
  },
  "popularTags": [
    { "tag": "deep", "count": 400 },
    { "tag": "jazzy", "count": 350 },
    { "tag": "soulful", "count": 320 }
  ]
}
```

### Pattern Management

#### List Patterns

List available amapiano patterns and progressions with filtering.

```http
GET /patterns?genre=amapiano&category=chord_progression&bpm=120&keySignature=C
```

**Query Parameters:**
- `genre` (optional): Filter by genre
- `category` (optional): Filter by pattern category
- `bpm` (optional): BPM range (±10)
- `keySignature` (optional): Filter by key signature

**Response:**
```json
{
  "patterns": [
    {
      "id": 1,
      "name": "Classic Amapiano Progression",
      "category": "chord_progression",
      "genre": "amapiano",
      "patternData": {
        "chords": ["C", "Am", "F", "G"],
        "progression": "I-vi-IV-V",
        "style": "soulful"
      },
      "bpm": 120,
      "keySignature": "C",
      "bars": 4,
      "complexity": "simple",
      "usageCount": 150,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Chord Progressions

Get chord progressions specific to amapiano styles with complexity filtering.

```http
GET /patterns/chords?genre=private_school_amapiano&complexity=advanced
```

**Query Parameters:**
- `genre` (required): Target amapiano genre
- `complexity` (optional): Filter by complexity level

**Response:**
```json
{
  "progressions": [
    {
      "id": 1,
      "name": "Private School Classic",
      "chords": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
      "romanNumerals": ["Imaj9", "vim7", "IVmaj7", "V7sus4"],
      "complexity": "advanced",
      "style": "jazzy"
    }
  ]
}
```

#### Get Drum Patterns

Get drum patterns specific to amapiano with style filtering.

```http
GET /patterns/drums?genre=amapiano&style=classic
```

**Query Parameters:**
- `genre` (required): Target amapiano genre
- `style` (optional): Filter by drum style

**Response:**
```json
{
  "patterns": [
    {
      "id": 1,
      "name": "Classic Log Drum",
      "logDrum": "x-x-.-x-x-.-x-.-",
      "kick": "x...x...x...x...",
      "snare": "....x.......x...",
      "hiHat": "x.x.x.x.x.x.x.x.",
      "style": "classic"
    }
  ]
}
```

### DAW & Project Management

#### Save Project

Save the current state of a DAW project.

```http
POST /daw/projects
```

**Request Body:**
```json
{
  "name": "My Amapiano Banger",
  "projectData": {
    "bpm": 118,
    "keySignature": "F#m",
    "tracks": [
      { "type": "midi", "instrument": "log_drum_synth", "notes": [...] },
      { "type": "audio", "sampleId": 123, "startTime": 4.0 }
    ],
    "mixer": { "masterVolume": -2.5, "trackVolumes": [-6.0, -4.5] }
  }
}
```

**Response:**
```json
{
  "projectId": "proj_abc123",
  "name": "My Amapiano Banger",
  "lastSaved": "2024-01-01T12:00:00Z",
  "version": 1
}
```

#### Load Project

Load a previously saved DAW project.

```http
GET /daw/projects/:projectId
```

**Response:**
```json
{
  "projectId": "proj_abc123",
  "name": "My Amapiano Banger",
  "projectData": { ... },
  "lastSaved": "2024-01-01T12:00:00Z",
  "version": 1
}
```

## Error Responses

All endpoints return standard HTTP status codes with detailed error information:

### Success Codes
- `200` - Success
- `201` - Created

### Client Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (already exists)
- `412` - Precondition Failed
- `413` - Payload Too Large
- `429` - Too Many Requests

### Server Error Codes
- `500` - Internal Server Error
- `501` - Not Implemented
- `503` - Service Unavailable

### Error Response Format

```json
{
  "code": "invalid_argument",
  "message": "Invalid genre specified",
  "details": {
    "field": "genre",
    "allowedValues": ["amapiano", "private_school_amapiano"]
  }
}
```

### Common Error Codes
- `invalid_argument` - Invalid request parameters
- `not_found` - Resource not found
- `already_exists` - Resource already exists
- `permission_denied` - Access denied
- `resource_exhausted` - Rate limit exceeded
- `failed_precondition` - Precondition not met
- `internal` - Internal server error
- `unavailable` - Service temporarily unavailable

## Rate Limiting

Currently, no rate limiting is implemented for demonstration purposes. In production:
- **Standard endpoints**: 100 requests per minute per IP
- **Generation endpoints**: 10 requests per minute per IP
- **Upload endpoints**: 5 requests per minute per IP
- **Batch operations**: 2 requests per minute per IP

## Data Types and Schemas

### Genres
- `amapiano` - Classic amapiano style with traditional elements
- `private_school_amapiano` - Sophisticated, jazz-influenced style

### Sample Categories
- `log_drum` - Signature amapiano log drum sounds
- `piano` - Piano melodies and chord progressions
- `percussion` - Percussive elements and rhythmic patterns
- `bass` - Bass lines and sub-bass elements
- `vocal` - Vocal samples, chops, and harmonies
- `saxophone` - Saxophone melodies and solos
- `guitar` - Guitar elements and chord work
- `synth` - Synthesizer sounds and textures

### Pattern Categories
- `drum_pattern` - Drum and percussion patterns
- `bass_pattern` - Bass line patterns and progressions
- `chord_progression` - Chord progressions and harmonic structures
- `melody` - Melodic patterns and motifs

### Moods
- `chill` - Relaxed, laid-back atmosphere
- `energetic` - High-energy, danceable vibe
- `soulful` - Deep, emotional expression
- `groovy` - Rhythmic, groove-focused feel
- `mellow` - Soft, gentle ambiance
- `uplifting` - Positive, inspiring energy
- `deep` - Deep house influenced atmosphere
- `jazzy` - Jazz-influenced harmonies and sophistication

### Quality Levels
- `low` - Basic quality (0.0-0.6)
- `medium` - Good quality (0.6-0.8)
- `high` - Excellent quality (0.8-1.0)

### File Format Support

#### Audio Formats
- **High-Quality**: WAV, FLAC, AIFF (up to 24-bit/96kHz)
- **Compressed**: MP3, M4A, AAC, OGG, WMA

#### Video Formats
- **Standard**: MP4, AVI, MOV, MKV, WebM
- **Extended**: 3GP, FLV, WMV, MTS, MXF

#### Output Formats
- **Audio**: WAV (44.1kHz, 24-bit)
- **Patterns**: MIDI files
- **Metadata**: JSON with comprehensive information

## SDK and Integration

### TypeScript Client

The API provides full TypeScript support with auto-generated types:

```typescript
import backend from '~backend/client';

// Generate a track
const track = await backend.music.generateTrack({
  prompt: "Soulful amapiano with jazz influences",
  genre: "private_school_amapiano",
  bpm: 115
});

// Analyze audio
const analysis = await backend.music.analyzeAudio({
  sourceUrl: "https://youtube.com/watch?v=example",
  sourceType: "youtube"
});
```

### Error Handling

```typescript
try {
  const result = await backend.music.generateTrack(request);
} catch (error) {
  if (error.code === 'invalid_argument') {
    console.error('Invalid parameters:', error.details);
  } else if (error.code === 'resource_exhausted') {
    console.error('Rate limit exceeded');
  }
}
```

This comprehensive API documentation provides complete coverage of all endpoints, parameters, responses, and integration patterns for the Amapiano AI platform.
