# Amapiano AI API Documentation

## Overview

The Amapiano AI API provides endpoints for generating music, analyzing audio, and managing samples and patterns. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
http://localhost:4000
```

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Endpoints

### Music Generation

#### Generate Track

Generate a complete amapiano track from a text prompt.

```http
POST /generate/track
```

**Request Body:**
```json
{
  "prompt": "A soulful amapiano track with jazzy piano chords and deep log drums",
  "genre": "amapiano" | "private_school_amapiano",
  "mood": "chill" | "energetic" | "soulful" | "groovy" | "mellow" | "uplifting" | "deep" | "jazzy",
  "bpm": 120,
  "keySignature": "C",
  "duration": 180,
  "sourceAnalysisId": 12345
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
    "duration": 180
  }
}
```

#### Generate Loop

Generate specific amapiano loops and patterns.

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
  "keySignature": "C"
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
    "keySignature": "C"
  }
}
```

#### Get Generation History

Get a list of previously generated tracks.

```http
GET /generate/history?limit=20&genre=amapiano
```

**Query Parameters:**
- `limit` (optional): Number of results to return (default 50)
- `genre` (optional): Filter by genre

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
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Generation Statistics

Get statistics about generated content.

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
    "energetic": 300
  },
  "averageBpm": 118,
  "popularKeySignatures": [
    { "key": "C", "count": 200 },
    { "key": "Am", "count": 150 }
  ]
}
```

### Audio Analysis

#### Get Upload URL
Generates a signed URL for securely uploading audio/video files.

```http
POST /analyze/upload-url
```

**Request Body:**
```json
{
  "fileName": "my-track.mp4",
  "fileSize": 15728640,
  "fileType": "video/mp4"
}
```

**Response:**
```json
{
  "uploadUrl": "https://storage.example.com/signed-url...",
  "fileId": "upload_1672531200000_abcdef123",
  "maxFileSize": 104857600,
  "supportedFormats": ["mp3", "wav", "mp4", "mov", "..."]
}
```

#### Analyze Audio

Analyze audio from various sources to extract stems and patterns.

```http
POST /analyze/audio
```

**Request Body:**
```json
{
  "sourceUrl": "https://www.youtube.com/watch?v=example",
  "sourceType": "youtube" | "upload" | "url" | "tiktok",
  "fileName": "my-track.mp4",
  "fileSize": 15728640
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
      "confidence": 0.95,
      "data": {
        "pattern": "kick-snare-kick-snare",
        "velocity": [100, 80, 100, 80]
      },
      "timeRange": {
        "start": 0,
        "end": 4
      }
    }
  ],
  "metadata": {
    "bpm": 120,
    "keySignature": "C",
    "genre": "amapiano",
    "duration": 180,
    "originalFileName": "my-track.mp4",
    "fileType": "video"
  }
}
```

#### Amapianorize Track
Transforms an analyzed track into amapiano style.

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
  "customPrompt": "Add more jazzy saxophone"
}
```

**Response:**
```json
{
  "id": 67890,
  "originalTrackId": 12345,
  "amapianorizedTrackUrl": "https://storage.example.com/amapianorized_67890.wav",
  "stems": { "...": "..." },
  "metadata": { "bpm": 115, "keySignature": "F#m", "genre": "private_school_amapiano", "..." }
}
```

#### Extract Patterns

Extract specific amapiano patterns from audio.

```http
POST /analyze/patterns
```

**Request Body:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "genre": "amapiano" | "private_school_amapiano"
}
```

**Response:**
```json
{
  "patterns": [
    {
      "type": "chord_progression",
      "confidence": 0.91,
      "data": {
        "chords": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
        "voicing": "jazz",
        "style": "sophisticated"
      },
      "timeRange": {
        "start": 0,
        "end": 8
      }
    }
  ],
  "suggestions": {
    "logDrumPattern": {
      "pattern": "C1-C1-rest-C1",
      "swing": 0.1,
      "velocity": [100, 85, 0, 90]
    },
    "pianoChords": {
      "progression": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
      "style": "jazzy"
    }
  }
}
```

#### Get Analysis History

Get a list of previously analyzed tracks.

```http
GET /analyze/history?limit=20&sourceType=youtube
```

**Query Parameters:**
- `limit` (optional): Number of results to return (default 50)
- `sourceType` (optional): Filter by source type

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
        "genre": "amapiano",
        "duration": 180
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Sample Management

#### List Samples

List available amapiano samples with optional filtering.

```http
GET /samples?genre=amapiano&category=log_drum&limit=50
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
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
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

#### Search Samples

Search samples by name, tags, or characteristics.

```http
GET /samples/search?query=log%20drum&genre=amapiano
```

**Query Parameters:**
- `query` (required): Search query string
- `genre` (optional): `amapiano` | `private_school_amapiano`
- `category` (optional): Sample category

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
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "suggestions": [
    "log drum deep",
    "log drum classic"
  ]
}
```

#### Get Sample Statistics

Get statistics about the sample library.

```http
GET /samples/stats
```

**Response:**
```json
{
  "totalSamples": 5432,
  "samplesByCategory": {
    "log_drum": 500,
    "piano": 800
  },
  "samplesByGenre": {
    "amapiano": 3000,
    "private_school_amapiano": 2432
  },
  "popularTags": [
    { "tag": "deep", "count": 400 },
    { "tag": "jazzy", "count": 350 }
  ]
}
```

#### Get Sample

Retrieve a specific sample by ID.

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
      "bpm": 120,
      "keySignature": "C",
      "durationSeconds": 4.5,
      "tags": ["classic", "energetic", "kabza"],
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

### Pattern Management

#### List Patterns

List available amapiano patterns and progressions.

```http
GET /patterns?genre=amapiano&category=chord_progression
```

**Query Parameters:**
- `genre` (optional): `amapiano` | `private_school_amapiano`
- `category` (optional): `drum_pattern` | `bass_pattern` | `chord_progression` | `melody`
- `bpm` (optional): BPM range (±10)
- `keySignature` (optional): Key signature

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
        "progression": "I-vi-IV-V"
      },
      "bpm": 120,
      "keySignature": "C",
      "bars": 4,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Chord Progressions

Get chord progressions specific to amapiano styles.

```http
GET /patterns/chords?genre=private_school_amapiano&complexity=intermediate
```

**Query Parameters:**
- `genre` (required): `amapiano` | `private_school_amapiano`
- `complexity` (optional): `simple` | `intermediate` | `advanced`

**Response:**
```json
{
  "progressions": [
    {
      "id": 1,
      "name": "Private School Classic",
      "chords": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"],
      "romanNumerals": ["Imaj9", "vim7", "IVmaj7", "V7sus4"],
      "complexity": "intermediate",
      "style": "jazzy"
    }
  ]
}
```

#### Get Drum Patterns

Get drum patterns specific to amapiano.

```http
GET /patterns/drums?genre=amapiano&style=classic
```

**Query Parameters:**
- `genre` (required): `amapiano` | `private_school_amapiano`
- `style` (optional): `classic` | `modern` | `minimal`

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

## Error Responses

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a message:

```json
{
  "error": "Invalid genre specified",
  "code": "invalid_argument"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

## Data Types

### Genres
- `amapiano` - Classic amapiano style
- `private_school_amapiano` - Sophisticated, jazz-influenced style

### Sample Categories
- `log_drum` - Signature amapiano log drum sounds
- `piano` - Piano melodies and chords
- `percussion` - Percussive elements and rhythms
- `bass` - Bass lines and sub-bass
- `vocal` - Vocal samples and chops
- `saxophone` - Saxophone melodies (common in private school)
- `guitar` - Guitar elements
- `synth` - Synthesizer sounds

### Pattern Categories
- `drum_pattern` - Drum and percussion patterns
- `bass_pattern` - Bass line patterns
- `chord_progression` - Chord progressions and harmonies
- `melody` - Melodic patterns

### Moods
- `chill` - Relaxed, laid-back vibe
- `energetic` - High-energy, danceable
- `soulful` - Deep, emotional feel
- `groovy` - Rhythmic, groove-focused
- `mellow` - Soft, gentle atmosphere
- `uplifting` - Positive, inspiring
- `deep` - Deep house influenced
- `jazzy` - Jazz-influenced harmonies
