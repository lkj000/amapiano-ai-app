# Amapiano AI

The ultimate AI-powered platform for creating, analyzing, and exploring amapiano music. Generate authentic South African amapiano tracks, analyze existing music, and discover the patterns that make this genre unique.

## Features

### 🎵 AI Music Generation
- Generate complete amapiano tracks from text prompts
- Create specific loops and patterns (log drums, piano, bass, percussion)
- Support for both Classic Amapiano and Private School Amapiano styles
- Customizable parameters: BPM, key signature, mood, duration

### 🔍 Audio Analysis
- Analyze YouTube videos and audio files
- Extract individual stems (drums, bass, piano, vocals, other)
- Identify musical patterns and structures
- Detect chord progressions, drum patterns, and basslines

### 📚 Sample Library
- Curated collection of authentic amapiano samples
- Samples in the style of legendary artists (Kabza De Small, Kelvin Momo, Babalwa M)
- Advanced search and filtering by genre, category, and tags
- Multiple sample categories: log drums, piano, percussion, bass, vocals, saxophone, guitar, synth

### 🎼 Pattern Library
- Comprehensive collection of chord progressions and drum patterns
- Genre-specific patterns for Classic and Private School Amapiano
- Complexity levels: simple, intermediate, advanced
- Interactive pattern visualization and playback

## Amapiano Genres

### Classic Amapiano
Traditional amapiano with signature log drums and soulful piano melodies. Characterized by:
- Log drum basslines
- Soulful piano melodies
- Percussive elements
- Kwaito influences
- Key artists: Kabza De Small, DJ Maphorisa, Focalistic

### Private School Amapiano
Sophisticated, jazz-influenced amapiano with live instrumentation. Features:
- Jazz harmonies and complex chords
- Live instruments (saxophone, guitar)
- Refined, mellow sound
- "Human feel" over heavy log drums
- Key artists: Kelvin Momo, Babalwa M, Mellow & Sleazy

## Technology Stack

### Backend (Encore.ts)
- **Framework**: Encore.ts with TypeScript
- **Database**: PostgreSQL with SQL migrations
- **Storage**: Object storage buckets for audio files
- **API**: RESTful endpoints with type-safe schemas

### Frontend (React)
- **Framework**: React with TypeScript
- **Routing**: React Router
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ 
- Encore CLI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd amapiano-ai
```

2. Install dependencies (automatically handled by Leap)

3. Start the development server:
```bash
encore run
```

The application will be available at `http://localhost:4000`

## API Endpoints

### Music Generation
- `POST /generate/track` - Generate a complete amapiano track
- `POST /generate/loop` - Generate specific loops and patterns

### Audio Analysis
- `POST /analyze/audio` - Analyze audio from URLs or uploads
- `POST /analyze/patterns` - Extract amapiano-specific patterns

### Sample Management
- `GET /samples` - List available samples with filtering
- `GET /samples/search` - Search samples by query
- `GET /samples/:id` - Get specific sample details
- `GET /samples/artist/:artist` - Get samples by artist style

### Pattern Management
- `GET /patterns` - List musical patterns
- `GET /patterns/chords` - Get chord progressions
- `GET /patterns/drums` - Get drum patterns

## Database Schema

### Core Tables
- **tracks** - Music track metadata
- **samples** - Audio sample library
- **patterns** - Musical patterns and progressions
- **generated_tracks** - AI-generated music tracks
- **audio_analysis** - Analysis results from processed audio

### Sample Categories
- Log Drum
- Piano
- Percussion
- Bass
- Vocal
- Saxophone
- Guitar
- Synth

### Pattern Categories
- Drum Patterns
- Bass Patterns
- Chord Progressions
- Melodies

## File Structure

```
amapiano-ai/
├── backend/
│   └── music/
│       ├── encore.service.ts     # Service definition
│       ├── db.ts                 # Database configuration
│       ├── storage.ts            # Object storage buckets
│       ├── types.ts              # TypeScript type definitions
│       ├── generate.ts           # Music generation endpoints
│       ├── analyze.ts            # Audio analysis endpoints
│       ├── samples.ts            # Sample management endpoints
│       ├── patterns.ts           # Pattern management endpoints
│       └── migrations/           # Database migrations
│           └── 1_create_tables.up.sql
├── frontend/
│   ├── App.tsx                   # Main application component
│   ├── components/
│   │   └── Header.tsx            # Navigation header
│   └── pages/
│       ├── HomePage.tsx          # Landing page
│       ├── GeneratePage.tsx      # Music generation interface
│       ├── AnalyzePage.tsx       # Audio analysis interface
│       ├── SamplesPage.tsx       # Sample library browser
│       └── PatternsPage.tsx      # Pattern library browser
└── README.md
```

## Usage Examples

### Generate a Track
```typescript
const track = await backend.music.generateTrack({
  prompt: "A soulful amapiano track with jazzy piano chords and deep log drums",
  genre: "private_school_amapiano",
  mood: "mellow",
  bpm: 115,
  keySignature: "Am"
});
```

### Analyze Audio
```typescript
const analysis = await backend.music.analyzeAudio({
  sourceUrl: "https://youtube.com/watch?v=...",
  sourceType: "youtube"
});
```

### Search Samples
```typescript
const samples = await backend.music.searchSamples({
  query: "log drum",
  genre: "amapiano",
  category: "log_drum"
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by the rich musical heritage of South African amapiano
- Special recognition to pioneering artists like Kabza De Small, Kelvin Momo, and the entire amapiano community
- Built with modern web technologies for the next generation of music creators
