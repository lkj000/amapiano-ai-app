# Development Guide

## Getting Started

### Prerequisites

- **Node.js 18 or later**: Required for modern JavaScript features and optimal performance
- **Encore CLI**: Automatically installed and managed by the project
- **Git**: For version control and collaboration

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd amapiano-ai
   ```

2. **Start the development server**:
   ```bash
   encore run
   ```

The application will be available at `http://localhost:4000` with:
- Automatic database setup and migrations
- Hot reloading for both frontend and backend
- Type-safe API client generation
- Built-in development tools and debugging

### Development Environment Features

- **Integrated Development**: Single command starts entire stack
- **Type Safety**: Full TypeScript coverage with automatic type generation
- **Hot Reloading**: Instant updates for code changes
- **Database Management**: Automatic migrations and seeding
- **Storage Simulation**: Local object storage for development
- **Error Handling**: Comprehensive error tracking and debugging

## Project Structure

```
amapiano-ai/
├── backend/                  # Encore.ts backend service
│   └── music/               # Music service with comprehensive functionality
│       ├── encore.service.ts     # Service definition and configuration
│       ├── db.ts                 # Database configuration and connection
│       ├── storage.ts            # Object storage bucket definitions
│       ├── types.ts              # Shared TypeScript type definitions
│       ├── generate.ts           # Music generation endpoints and logic
│       ├── analyze.ts            # Audio analysis and processing endpoints
│       ├── samples.ts            # Sample management and search endpoints
│       ├── patterns.ts           # Pattern management endpoints
│       └── migrations/           # Database schema migrations
│           ├── 1_create_tables.up.sql    # Core table definitions
│           └── 2_seed_data.up.sql        # Sample data and initial content
├── frontend/                # React frontend with modern architecture
│   ├── App.tsx                   # Main application component with routing
│   ├── components/               # Reusable UI components
│   │   ├── Header.tsx            # Navigation header with responsive design
│   │   ├── LoadingSpinner.tsx    # Consistent loading states
│   │   └── ErrorMessage.tsx      # Error handling and retry functionality
│   └── pages/                    # Page-level components
│       ├── HomePage.tsx          # Landing page with feature overview
│       ├── GeneratePage.tsx      # Music generation interface
│       ├── AnalyzePage.tsx       # Audio analysis and amapianorize interface
│       ├── SamplesPage.tsx       # Sample library browser with search
│       └── PatternsPage.tsx      # Pattern library with interactive playback
├── docs/                    # Comprehensive documentation
│   ├── API.md                    # Complete API reference with examples
│   ├── ARCHITECTURE.md           # System architecture and design decisions
│   ├── DEVELOPMENT.md            # This development guide
│   ├── APP_OVERVIEW.md           # Detailed app overview and value proposition
│   ├── PRD.md                    # Product requirements document
│   └── PRP.md                    # Product roadmap and planning
└── README.md                # Project overview and quick start guide
```

## Backend Development

### Adding New Endpoints

1. **Create endpoint file** in `backend/music/` with descriptive naming
2. **Define TypeScript interfaces** for request and response types
3. **Implement handler function** using Encore.ts `api` function
4. **Add database queries** if needed with proper error handling
5. **Test endpoint** using Encore's built-in testing capabilities

#### Example: Creating a New Endpoint

```typescript
import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";

interface CreatePlaylistRequest {
  name: string;
  description?: string;
  genre: "amapiano" | "private_school_amapiano";
  sampleIds: number[];
}

interface CreatePlaylistResponse {
  id: number;
  name: string;
  sampleCount: number;
  createdAt: Date;
}

// Creates a new playlist with samples
export const createPlaylist = api<CreatePlaylistRequest, CreatePlaylistResponse>(
  { expose: true, method: "POST", path: "/playlists" },
  async (req) => {
    // Validate input
    if (!req.name || req.name.trim().length === 0) {
      throw APIError.invalidArgument("Playlist name is required");
    }

    if (req.sampleIds.length === 0) {
      throw APIError.invalidArgument("At least one sample is required");
    }

    // Verify samples exist
    const samples = await musicDB.queryAll`
      SELECT id FROM samples WHERE id = ANY(${req.sampleIds})
    `;

    if (samples.length !== req.sampleIds.length) {
      throw APIError.invalidArgument("One or more samples not found");
    }

    // Create playlist
    const result = await musicDB.queryRow<{
      id: number;
      name: string;
      created_at: Date;
    }>`
      INSERT INTO playlists (name, description, genre, sample_ids)
      VALUES (${req.name}, ${req.description || null}, ${req.genre}, ${req.sampleIds})
      RETURNING id, name, created_at
    `;

    if (!result) {
      throw APIError.internal("Failed to create playlist");
    }

    return {
      id: result.id,
      name: result.name,
      sampleCount: req.sampleIds.length,
      createdAt: result.created_at
    };
  }
);
```

### Database Migrations

1. **Create migration file** in `backend/music/migrations/` with incremental numbering
2. **Use descriptive naming**: `3_add_playlists_table.up.sql`
3. **Write SQL DDL statements** with proper constraints and indexes
4. **Test migration** by restarting the development server

#### Example Migration

```sql
-- 3_add_playlists_table.up.sql
CREATE TABLE playlists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL CHECK (genre IN ('amapiano', 'private_school_amapiano')),
  sample_ids BIGINT[] NOT NULL,
  user_id TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_playlists_genre ON playlists(genre);
CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public) WHERE is_public = true;
CREATE INDEX idx_playlists_samples ON playlists USING GIN(sample_ids);

-- Full-text search index
CREATE INDEX idx_playlists_search ON playlists USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### Working with Object Storage

```typescript
import { audioFiles, generatedTracks, extractedStems } from "./storage";

// Upload file with metadata
const fileName = `playlist_${playlistId}_export.wav`;
const audioBuffer = await generatePlaylistAudio(sampleIds);
await generatedTracks.upload(fileName, audioBuffer);

// Get public URL for streaming
const publicUrl = generatedTracks.publicUrl(fileName);

// Check if file exists before processing
const exists = await audioFiles.exists(fileName);
if (!exists) {
  throw APIError.notFound("Audio file not found");
}

// Download file for processing
const buffer = await extractedStems.download(fileName);
const processedBuffer = await processAudioBuffer(buffer);

// Generate signed upload URL for client uploads
const uploadUrl = await audioFiles.signedUploadUrl(fileName, {
  ttl: 3600 // 1 hour expiration
});
```

### Error Handling Best Practices

```typescript
import { APIError } from "encore.dev/api";

// Use specific error types
throw APIError.notFound("Sample not found");
throw APIError.invalidArgument("BPM must be between 80 and 160");
throw APIError.alreadyExists("Playlist with this name already exists");
throw APIError.permissionDenied("Cannot modify public playlist");

// Include helpful details
throw APIError.invalidArgument("Invalid file format")
  .withDetails({
    supportedFormats: ["mp3", "wav", "flac"],
    receivedFormat: fileExtension
  });

// Handle database errors gracefully
try {
  const result = await musicDB.queryRow`...`;
  if (!result) {
    throw APIError.notFound("Resource not found");
  }
  return result;
} catch (error) {
  console.error("Database error:", error);
  if (error instanceof APIError) {
    throw error;
  }
  throw APIError.internal("Database operation failed");
}
```

## Frontend Development

### Adding New Pages

1. **Create page component** in `frontend/pages/` with descriptive naming
2. **Add route** in `App.tsx` with proper path structure
3. **Update navigation** in `Header.tsx` if needed
4. **Implement page logic** with React hooks and TanStack Query

#### Example: Creating a New Page

```typescript
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Music, Plus, Play, Download } from 'lucide-react';
import backend from '~backend/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function PlaylistsPage() {
  const { toast } = useToast();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);

  // Fetch playlists with caching
  const { data: playlists, isLoading, error, refetch } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => backend.music.listPlaylists({}),
  });

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: (data: any) => backend.music.createPlaylist(data),
    onSuccess: (data) => {
      toast({
        title: "Playlist Created!",
        description: `${data.name} created with ${data.sampleCount} samples.`,
      });
      setNewPlaylistName('');
      setSelectedSamples([]);
      refetch(); // Refresh the list
    },
    onError: (error) => {
      console.error('Playlist creation error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create playlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a playlist name.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSamples.length === 0) {
      toast({
        title: "Samples Required",
        description: "Please select at least one sample.",
        variant: "destructive",
      });
      return;
    }

    createPlaylistMutation.mutate({
      name: newPlaylistName,
      genre: 'amapiano',
      sampleIds: selectedSamples
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">My Playlists</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Create and manage your custom amapiano playlists with your favorite samples.
        </p>
      </div>

      {/* Create Playlist Form */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Create New Playlist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Input
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
            <Button
              onClick={handleCreatePlaylist}
              disabled={createPlaylistMutation.isPending}
              className="bg-yellow-400 hover:bg-yellow-500 text-black"
            >
              {createPlaylistMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists?.playlists.map((playlist) => (
          <Card key={playlist.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Music className="h-5 w-5 mr-2" />
                {playlist.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-white/70 text-sm">
                {playlist.sampleCount} samples • {playlist.genre}
              </p>
              <div className="flex space-x-2">
                <Button size="sm" className="bg-green-500 hover:bg-green-600 flex-1">
                  <Play className="h-3 w-3 mr-1" />
                  Play
                </Button>
                <Button size="sm" variant="outline" className="border-white/20 text-white">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Using the Backend Client

The frontend automatically gets a type-safe client for all backend endpoints:

```typescript
import backend from '~backend/client';

// All API calls are fully typed
const samples = await backend.music.listSamples({
  genre: 'amapiano',
  category: 'log_drum',
  limit: 10
});

// Generate track with source analysis
const track = await backend.music.generateTrack({
  prompt: "Soulful amapiano track",
  genre: "private_school_amapiano",
  bpm: 120,
  sourceAnalysisId: 12345 // Use analyzed track as inspiration
});

// Amapianorize existing track
const amapianorized = await backend.music.amapianorizeTrack({
  sourceAnalysisId: 12345,
  targetGenre: "amapiano",
  intensity: "moderate",
  preserveVocals: true
});

// Batch analysis
const batch = await backend.music.batchAnalyze({
  sources: [
    { sourceUrl: "https://youtube.com/watch?v=example", sourceType: "youtube" },
    { sourceUrl: "upload://file123", sourceType: "upload" }
  ],
  priority: "normal"
});
```

### State Management with TanStack Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch data with caching and background updates
const { data, isLoading, error } = useQuery({
  queryKey: ['samples', genre, category],
  queryFn: () => backend.music.listSamples({ genre, category }),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Mutations with optimistic updates
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: backend.music.createSample,
  onMutate: async (newSample) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['samples'] });
    
    // Snapshot previous value
    const previousSamples = queryClient.getQueryData(['samples']);
    
    // Optimistically update
    queryClient.setQueryData(['samples'], (old: any) => ({
      ...old,
      samples: [...old.samples, { ...newSample, id: Date.now() }]
    }));
    
    return { previousSamples };
  },
  onError: (err, newSample, context) => {
    // Rollback on error
    queryClient.setQueryData(['samples'], context?.previousSamples);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['samples'] });
  },
});
```

### Styling Guidelines

#### Tailwind CSS Best Practices

```typescript
// Use consistent spacing and colors
<Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
  <CardHeader className="pb-3">
    <CardTitle className="text-white text-lg">Title</CardTitle>
    <CardDescription className="text-white/70">Description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content with consistent spacing */}
  </CardContent>
</Card>

// Responsive design patterns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Responsive grid */}
</div>

// Interactive states
<Button className="bg-yellow-400 hover:bg-yellow-500 text-black transition-colors">
  Action
</Button>
```

#### Component Composition

```typescript
// Reusable component patterns
const SampleCard = ({ sample, onPlay, onDownload }) => (
  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-white text-lg">{sample.name}</CardTitle>
          <Badge className={getCategoryColor(sample.category)}>
            {sample.category.replace('_', ' ')}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button size="sm" onClick={() => onPlay(sample)} className="bg-green-500 hover:bg-green-600 flex-1">
          <Play className="h-3 w-3 mr-1" />
          Play
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDownload(sample)} className="border-white/20 text-white">
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </CardContent>
  </Card>
);
```

## Testing

### Backend Testing

Encore.ts provides comprehensive testing capabilities:

```typescript
import { describe, expect, test } from "vitest";
import { listSamples, createSample } from "./samples";

describe("samples", () => {
  test("list samples with filters", async () => {
    const result = await listSamples({
      genre: "amapiano",
      category: "log_drum",
      limit: 10
    });
    
    expect(result.samples).toBeDefined();
    expect(Array.isArray(result.samples)).toBe(true);
    expect(result.samples.length).toBeLessThanOrEqual(10);
    
    // Verify all samples match filters
    result.samples.forEach(sample => {
      expect(sample.genre).toBe("amapiano");
      expect(sample.category).toBe("log_drum");
    });
  });

  test("create sample with validation", async () => {
    const sampleData = {
      name: "Test Log Drum",
      category: "log_drum" as const,
      genre: "amapiano" as const,
      fileUrl: "test_sample.wav",
      bpm: 120,
      keySignature: "C",
      tags: ["test", "demo"]
    };

    const result = await createSample(sampleData);
    
    expect(result.id).toBeDefined();
    expect(result.name).toBe(sampleData.name);
    expect(result.fileUrl).toContain("test_sample.wav");
  });

  test("error handling for invalid input", async () => {
    await expect(createSample({
      name: "",
      category: "log_drum",
      genre: "amapiano",
      fileUrl: "test.wav"
    })).rejects.toThrow("Sample name is required");
  });
});
```

### Frontend Testing

Use React Testing Library for component testing:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
import SamplesPage from './SamplesPage';

// Mock the backend client
vi.mock('~backend/client', () => ({
  default: {
    music: {
      listSamples: vi.fn().mockResolvedValue({
        samples: [
          {
            id: 1,
            name: "Test Sample",
            category: "log_drum",
            genre: "amapiano",
            fileUrl: "test.wav"
          }
        ],
        total: 1
      })
    }
  }
}));

describe('SamplesPage', () => {
  const renderWithQuery = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  test('renders sample library', async () => {
    renderWithQuery(<SamplesPage />);
    
    expect(screen.getByText('Sample Library')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test Sample')).toBeInTheDocument();
    });
  });

  test('filters samples by genre', async () => {
    renderWithQuery(<SamplesPage />);
    
    const genreSelect = screen.getByRole('combobox', { name: /genre/i });
    fireEvent.click(genreSelect);
    
    const amapiano = screen.getByText('Classic Amapiano');
    fireEvent.click(amapiano);
    
    await waitFor(() => {
      expect(backend.music.listSamples).toHaveBeenCalledWith({
        genre: 'amapiano',
        category: undefined,
        limit: 50
      });
    });
  });
});
```

### Integration Testing

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { musicDB } from './db';

describe('Sample Management Integration', () => {
  beforeEach(async () => {
    // Clean up test data
    await musicDB.exec`DELETE FROM samples WHERE name LIKE 'Test%'`;
  });

  afterEach(async () => {
    // Clean up after tests
    await musicDB.exec`DELETE FROM samples WHERE name LIKE 'Test%'`;
  });

  test('complete sample workflow', async () => {
    // Create sample
    const createResult = await createSample({
      name: "Test Integration Sample",
      category: "log_drum",
      genre: "amapiano",
      fileUrl: "test_integration.wav",
      bpm: 120,
      tags: ["test", "integration"]
    });

    expect(createResult.id).toBeDefined();

    // List samples
    const listResult = await listSamples({
      genre: "amapiano",
      category: "log_drum"
    });

    const createdSample = listResult.samples.find(s => s.id === createResult.id);
    expect(createdSample).toBeDefined();
    expect(createdSample?.name).toBe("Test Integration Sample");

    // Search samples
    const searchResult = await searchSamples({
      query: "integration",
      genre: "amapiano"
    });

    expect(searchResult.samples.some(s => s.id === createResult.id)).toBe(true);
  });
});
```

## Code Style and Best Practices

### TypeScript Guidelines

```typescript
// Use strict TypeScript configuration
interface SampleCreateRequest {
  name: string;
  category: SampleCategory;
  genre: Genre;
  fileUrl: string;
  bpm?: number;
  keySignature?: string;
  durationSeconds?: number;
  tags?: string[];
}

// Use type imports for type-only imports
import type { Sample, SampleCategory, Genre } from './types';
import { api, APIError } from 'encore.dev/api';

// Avoid any type - use proper typing
const processSample = (sample: Sample): ProcessedSample => {
  // Implementation with full type safety
};

// Use const assertions for literal types
const SUPPORTED_FORMATS = ['mp3', 'wav', 'flac'] as const;
type SupportedFormat = typeof SUPPORTED_FORMATS[number];
```

### Naming Conventions

```typescript
// Files: kebab-case
sample-manager.ts
audio-processor.ts

// Components: PascalCase
SampleCard.tsx
AudioPlayer.tsx

// Functions and variables: camelCase
const listSamples = async () => {};
const selectedGenre = 'amapiano';

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav'];

// Types and Interfaces: PascalCase
interface SampleMetadata {}
type AudioFormat = 'mp3' | 'wav';
```

### Error Handling Patterns

```typescript
// Backend error handling
const handleDatabaseError = (error: unknown, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  
  if (error instanceof APIError) {
    throw error;
  }
  
  // Don't expose internal errors to clients
  throw APIError.internal(`Failed to ${operation}`);
};

// Frontend error handling
const { data, error } = useQuery({
  queryKey: ['samples'],
  queryFn: () => backend.music.listSamples({}),
  onError: (error) => {
    console.error('Failed to load samples:', error);
    toast({
      title: "Loading Failed",
      description: "Failed to load samples. Please try again.",
      variant: "destructive",
    });
  },
});
```

## Performance Optimization

### Backend Performance

```typescript
// Use database indexes effectively
const searchSamples = async (query: string, filters: SampleFilters) => {
  // Leverage full-text search index
  const samples = await musicDB.queryAll<Sample>`
    SELECT * FROM samples 
    WHERE to_tsvector('english', name || ' ' || array_to_string(tags, ' ')) @@ plainto_tsquery(${query})
    AND ($1::text IS NULL OR genre = $1)
    AND ($2::text IS NULL OR category = $2)
    ORDER BY ts_rank(to_tsvector('english', name || ' ' || array_to_string(tags, ' ')), plainto_tsquery(${query})) DESC
    LIMIT 50
  `;
  
  return samples;
};

// Optimize JSONB queries
const getPatternsByComplexity = async (complexity: string) => {
  return await musicDB.queryAll`
    SELECT * FROM patterns 
    WHERE pattern_data->>'complexity' = ${complexity}
    ORDER BY usage_count DESC
  `;
};

// Use connection pooling efficiently
const batchProcessSamples = async (sampleIds: number[]) => {
  // Process in batches to avoid overwhelming the database
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < sampleIds.length; i += batchSize) {
    const batch = sampleIds.slice(i, i + batchSize);
    const batchResults = await musicDB.queryAll`
      SELECT * FROM samples WHERE id = ANY(${batch})
    `;
    results.push(...batchResults);
  }
  
  return results;
};
```

### Frontend Performance

```typescript
// Use React.memo for expensive components
const SampleCard = React.memo(({ sample, onPlay, onDownload }) => {
  return (
    <Card className="bg-white/5 border-white/10">
      {/* Component content */}
    </Card>
  );
});

// Implement virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';

const SampleList = ({ samples }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SampleCard sample={samples[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={samples.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
};

// Optimize bundle size with lazy loading
const AnalyzePage = React.lazy(() => import('./pages/AnalyzePage'));
const GeneratePage = React.lazy(() => import('./pages/GeneratePage'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/analyze" element={<AnalyzePage />} />
    <Route path="/generate" element={<GeneratePage />} />
  </Routes>
</Suspense>
```

## Debugging and Troubleshooting

### Backend Debugging

```typescript
// Use structured logging
import log from "encore.dev/log";

export const analyzeAudio = api<AnalyzeAudioRequest, AnalyzeAudioResponse>(
  { expose: true, method: "POST", path: "/analyze/audio" },
  async (req) => {
    log.info("Starting audio analysis", {
      sourceType: req.sourceType,
      fileSize: req.fileSize,
      fileName: req.fileName
    });

    try {
      const result = await processAudio(req);
      
      log.info("Audio analysis completed", {
        analysisId: result.id,
        processingTime: result.processingTime,
        confidence: result.metadata.confidence
      });
      
      return result;
    } catch (error) {
      log.error("Audio analysis failed", {
        error: error.message,
        sourceUrl: req.sourceUrl,
        sourceType: req.sourceType
      });
      throw error;
    }
  }
);

// Database query debugging
const debugQuery = async (query: string, params: any[]) => {
  const startTime = Date.now();
  try {
    const result = await musicDB.rawQueryAll(query, ...params);
    const duration = Date.now() - startTime;
    
    log.info("Query executed", {
      query: query.substring(0, 100) + "...",
      duration,
      resultCount: result.length
    });
    
    return result;
  } catch (error) {
    log.error("Query failed", {
      query: query.substring(0, 100) + "...",
      error: error.message,
      params
    });
    throw error;
  }
};
```

### Frontend Debugging

```typescript
// Use React DevTools and TanStack Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* App content */}
      </Router>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

// Debug API calls
const { data, error, isLoading } = useQuery({
  queryKey: ['samples', filters],
  queryFn: async () => {
    console.log('Fetching samples with filters:', filters);
    const result = await backend.music.listSamples(filters);
    console.log('Samples fetched:', result);
    return result;
  },
  onError: (error) => {
    console.error('Sample fetch error:', error);
  }
});

// Performance monitoring
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      console.log(`${componentName} render time: ${endTime - startTime}ms`);
    };
  });
};
```

### Common Issues and Solutions

#### Database Connection Issues
```bash
# Check if migrations have run
encore db shell music
\dt

# Reset database if needed
encore db reset music
```

#### Type Generation Issues
```bash
# Regenerate types
encore run --watch

# Clear cache and restart
rm -rf node_modules/.cache
encore run
```

#### Build Issues
```bash
# Clear all caches
rm -rf node_modules
npm install
encore run
```

## Deployment

### Local Development
```bash
# Start development server
encore run

# Run with specific environment
encore run --env=development

# Run tests
encore test

# Check types
npx tsc --noEmit
```

### Production Deployment

Encore.ts handles deployment automatically when connected to Encore Cloud:

```bash
# Deploy to staging
git push origin main

# Deploy to production
git push origin production

# Check deployment status
encore app status

# View logs
encore logs
```

### Environment Configuration

```typescript
// Use environment-specific configuration
import { secret } from 'encore.dev/config';

const openAIKey = secret("OpenAIKey");
const databaseUrl = secret("DatabaseURL");

// Access in code
const apiKey = openAIKey(); // Returns the secret value
```

This comprehensive development guide provides everything needed to contribute effectively to the Amapiano AI project while maintaining high code quality and cultural authenticity.
