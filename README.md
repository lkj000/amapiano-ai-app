# Amapiano AI

The ultimate AI-powered platform for creating, analyzing, and exploring amapiano music. Generate authentic South African amapiano tracks, analyze existing music, and discover the patterns that make this genre unique.

## Table of Contents

- [Features](#features)
- [Amapiano Genres](#amapiano-genres)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🎵 AI Music Generation & Transformation
- **Generate from Prompt**: Create complete amapiano tracks from text descriptions.
- **Amapianorize**: Transform any audio/video file into authentic amapiano style.
- **Remix from Source**: Create new tracks inspired by analyzed audio from TikTok, YouTube, or local files.
- **Loop Creation**: Generate specific loops and patterns like log drums, piano, bass, and percussion.
- **Style Support**: Full support for both Classic Amapiano and Private School Amapiano styles.
- **Customization**: Control BPM, key signature, mood, and duration.

### 🔍 Audio Analysis
- **Universal Input**: Analyze audio from **TikTok**, YouTube, direct URLs, or **local file uploads**.
- **Stem Separation**: Extract individual stems (drums, bass, piano, vocals, other).
- **Pattern Recognition**: Identify musical patterns, chord progressions, and drum patterns.
- **Music Theory**: Detect BPM, key signature, and other musical characteristics.

### 📚 Sample Library
- **Curated Collection**: Authentic amapiano samples and loops.
- **Artist Styles**: Samples in the style of legendary artists like Kabza De Small and Kelvin Momo.
- **Advanced Search**: Filter by genre, category, tags, BPM, and key.
- **Multiple Categories**: Log drums, piano, percussion, bass, vocals, saxophone, guitar, and synth.

### 🎼 Pattern Library
- **Comprehensive Database**: Chord progressions and drum patterns.
- **Genre-Specific**: Patterns for Classic and Private School Amapiano.
- **Complexity Levels**: Simple, intermediate, and advanced patterns.
- **Interactive Learning**: Visualize and play patterns to understand their structure.

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

## Project Structure

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
├── frontend/
│   ├── App.tsx                   # Main application component
│   ├── components/
│   └── pages/
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── APP_OVERVIEW.md
│   ├── PRD.md
│   └── PRP.md
└── README.md
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[App Overview](./docs/APP_OVERVIEW.md)**: Detailed explanation of the app, its features, and value proposition.
- **[Architecture](./docs/ARCHITECTURE.md)**: Overview of the system architecture and technology stack.
- **[API Reference](./docs/API.md)**: Detailed documentation for all API endpoints.
- **[Development Guide](./docs/DEVELOPMENT.md)**: Instructions for setting up the development environment and contributing.
- **[Product Requirements (PRD)](./docs/PRD.md)**: Detailed product requirements and specifications.
- **[Product Roadmap (PRP)](./docs/PRP.md)**: Strategic product roadmap and planning.

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
