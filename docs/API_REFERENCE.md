# Amapiano AI DAW - API Reference

## Table of Contents

- [Health & Monitoring](#health--monitoring)
- [Samples API](#samples-api)
- [Patterns API](#patterns-api)
- [Music Generation API](#music-generation-api)
- [Error Handling](#error-handling)

---

## Health & Monitoring

### GET /health

Health check endpoint for monitoring service status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T04:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 15
    },
    "storage": {
      "status": "ok"
    }
  }
}
```

**Status Values:**
- `healthy` - All systems operational
- `degraded` - Some issues but service available
- `unhealthy` - Critical issues

### GET /ready

Readiness probe for orchestration platforms.

**Response:**
```json
{
  "ready": true
}
```

---

## Samples API

### GET /samples

List all audio samples with optional filtering.

**Query Parameters:**
- `genre` (string, optional) - Filter by genre: `amapiano`, `private_school_amapiano`, `bacardi`, `sgija`
- `category` (string, optional) - Filter by category: `log_drum`, `piano`, `percussion`, `bass`, `vocal`, `saxophone`, `guitar`, `synth`
- `bpm` (number, optional) - Filter by BPM (±5 tolerance)
- `keySignature` (string, optional) - Filter by key signature (e.g., "C", "Dm", "F#")
- `tags` (string[], optional) - Filter by tags
- `limit` (number, optional) - Maximum results to return (default: 50)
- `offset` (number, optional) - Number of results to skip (default: 0)

**Response:**
```json
{
  "samples": [
    {
      "id": 1,
      "name": "Deep Log Drum Loop",
      "category": "log_drum",
      "genre": "amapiano",
      "fileUrl": "https://storage.../samples/log_drum_deep_120.wav",
      "bpm": 120,
      "keySignature": "C",
      "durationSeconds": 4,
      "tags": ["deep", "groovy", "classic"],
      "createdAt": "2025-08-24T20:23:52.001Z"
    }
  ],
  "total": 29,
  "categories": {
    "log_drum": 6,
    "piano": 6,
    "percussion": 4,
    "bass": 3,
    "vocal": 3,
    "saxophone": 2,
    "guitar": 2,
    "synth": 3
  }
}
```

### GET /samples/:id

Get a specific sample by ID.

**Path Parameters:**
- `id` (number, required) - Sample ID

**Response:**
```json
{
  "id": 1,
  "name": "Deep Log Drum Loop",
  "category": "log_drum",
  "genre": "amapiano",
  "fileUrl": "https://storage.../samples/log_drum_deep_120.wav",
  "bpm": 120,
  "keySignature": "C",
  "durationSeconds": 4,
  "tags": ["deep", "groovy", "classic"],
  "createdAt": "2025-08-24T20:23:52.001Z"
}
```

### POST /samples/upload

Upload a custom sample.

**Request Body:**
```json
{
  "name": "My Custom Sample",
  "category": "log_drum",
  "genre": "amapiano",
  "audioData": "base64_encoded_audio_data",
  "bpm": 120,
  "keySignature": "C",
  "tags": ["custom", "unique"],
  "culturalSignificance": "Traditional South African rhythm",
  "description": "A unique take on the log drum sound"
}
```

**Response:**
```json
{
  "id": 30,
  "name": "My Custom Sample",
  "fileUrl": "https://storage.../samples/log_drum/my_custom_sample_1234567890.wav",
  "category": "log_drum"
}
```

### DELETE /samples/:id

Delete a sample.

**Path Parameters:**
- `id` (number, required) - Sample ID

**Response:**
```json
{
  "success": true
}
```

### GET /samples/search/cultural

Search samples by cultural context.

**Query Parameters:**
- `query` (string, required) - Search query (e.g., "traditional log drum", "gospel piano")

**Response:**
```json
{
  "samples": [...]
}
```

---

## Patterns API

### GET /patterns

List all musical patterns with optional filtering.

**Query Parameters:**
- `genre` (string, optional) - Filter by genre
- `category` (string, optional) - Filter by category: `drum_pattern`, `bass_pattern`, `chord_progression`, `melody`, `percussion_pattern`, `arpeggio`
- `bpm` (number, optional) - Filter by BPM (±5 tolerance)
- `keySignature` (string, optional) - Filter by key signature
- `complexity` (string, optional) - Filter by complexity level
- `limit` (number, optional) - Maximum results (default: 50)
- `offset` (number, optional) - Skip results (default: 0)

**Response:**
```json
{
  "patterns": [
    {
      "id": 1,
      "name": "Classic Amapiano",
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
      "createdAt": "2025-08-24T20:23:52.001Z"
    }
  ],
  "total": 13,
  "categories": {
    "chord_progression": 6,
    "drum_pattern": 3,
    "bass_pattern": 2,
    "melody": 2
  }
}
```

### GET /patterns/:id

Get a specific pattern by ID.

**Path Parameters:**
- `id` (number, required) - Pattern ID

**Response:**
```json
{
  "id": 1,
  "name": "Classic Amapiano",
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
  "createdAt": "2025-08-24T20:23:52.001Z"
}
```

### GET /patterns/recommendations

Get recommended patterns based on current project context.

**Query Parameters:**
- `genre` (string, required) - Project genre
- `bpm` (number, optional) - Project BPM
- `keySignature` (string, optional) - Project key
- `currentPatterns` (number[], optional) - Already used pattern IDs to exclude

**Response:**
```json
{
  "patterns": [
    {
      "id": 2,
      "name": "Kabza Style",
      "category": "chord_progression",
      "genre": "amapiano",
      "patternData": {
        "chords": ["Cm", "Fm", "G", "Cm"],
        "progression": "i-iv-V-i",
        "style": "energetic"
      },
      "bpm": 118,
      "keySignature": "Cm",
      "bars": 4
    }
  ]
}
```

---

## Music Generation API

### POST /generate

Generate a complete amapiano track using AI.

**Request Body:**
```json
{
  "prompt": "Create a soulful private school amapiano track with jazzy piano chords",
  "genre": "private_school_amapiano",
  "mood": "soulful",
  "bpm": 115,
  "keySignature": "Dm",
  "duration": 180
}
```

**Response:**
```json
{
  "id": 1,
  "prompt": "Create a soulful private school amapiano track...",
  "genre": "private_school_amapiano",
  "mood": "soulful",
  "bpm": 115,
  "keySignature": "Dm",
  "fileUrl": "https://storage.../tracks/generated_track_1234567890.wav",
  "status": "completed",
  "createdAt": "2025-10-25T04:00:00Z"
}
```

### POST /analyze

Analyze an uploaded audio file for cultural authenticity and musical characteristics.

**Request Body:**
```json
{
  "audioData": "base64_encoded_audio_data",
  "genre": "amapiano"
}
```

**Response:**
```json
{
  "id": 1,
  "genre": "amapiano",
  "detectedBpm": 118,
  "detectedKey": "Cm",
  "culturalScore": 85,
  "analysis": {
    "tempo": 118,
    "key": "Cm",
    "energy": 0.75,
    "danceability": 0.85,
    "culturalElements": [
      "Log drum pattern detected",
      "Gospel-influenced chord progression",
      "Traditional South African rhythm"
    ]
  },
  "createdAt": "2025-10-25T04:00:00Z"
}
```

---

## Error Handling

All API endpoints follow standard HTTP status codes and return errors in the following format:

```json
{
  "code": "invalid_argument",
  "message": "Genre must be one of: amapiano, private_school_amapiano, bacardi, sgija",
  "details": {
    "field": "genre"
  }
}
```

### Common Error Codes

- `invalid_argument` (400) - Invalid request parameters
- `not_found` (404) - Resource not found
- `already_exists` (409) - Resource already exists
- `internal` (500) - Internal server error
- `unavailable` (503) - Service temporarily unavailable

### Rate Limiting

API endpoints are rate-limited to:
- **100 requests per minute** for read operations (GET)
- **20 requests per minute** for write operations (POST, PUT, DELETE)

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635177600
```

---

## Authentication

Currently, all endpoints are publicly accessible. Authentication will be added in a future version.

---

## Versioning

The API is currently at version **1.0.0**. Version information is included in the `/health` endpoint response.

Future versions will be accessible via path prefix:
- `/v1/samples`
- `/v2/samples`

---

## WebSocket Support

Real-time collaboration features use WebSocket connections:

**Endpoint:** `wss://your-domain.com/ws/collaboration/:sessionId`

**Events:**
- `cursor_move` - User cursor position update
- `track_update` - Track state change
- `user_join` - User joined session
- `user_leave` - User left session

---

## Best Practices

1. **Use pagination** - Always set `limit` and `offset` for large result sets
2. **Filter early** - Apply filters to reduce data transfer
3. **Cache responses** - Sample and pattern data rarely changes
4. **Handle errors gracefully** - Always check error responses
5. **Respect rate limits** - Implement exponential backoff for retries

---

## Support

For API support, questions, or feature requests:
- Documentation: `/docs`
- Health Status: `/health`
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
