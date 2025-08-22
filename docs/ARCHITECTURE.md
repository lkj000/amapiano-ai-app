# Amapiano AI Architecture

## Overview

Amapiano AI is built using a modern full-stack architecture with Encore.ts for the backend and React for the frontend. The application is designed to be scalable, maintainable, and type-safe throughout.

## Technology Stack

### Backend
- **Framework**: Encore.ts with TypeScript
- **Database**: PostgreSQL with SQL migrations
- **Storage**: Object storage buckets for audio files
- **API**: RESTful endpoints with type-safe schemas

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Icons**: Lucide React

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Encore.ts)   │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Object Storage  │
                       │ (Audio Files)   │
                       └─────────────────┘
```

## Backend Architecture

### Service Structure

The backend is organized as a single Encore.ts service called `music` that handles all music-related functionality:

```
backend/music/
├── encore.service.ts     # Service definition
├── db.ts                 # Database configuration
├── storage.ts            # Object storage buckets
├── types.ts              # Shared TypeScript types
├── generate.ts           # Music generation endpoints
├── analyze.ts            # Audio analysis endpoints
├── samples.ts            # Sample management endpoints
├── patterns.ts           # Pattern management endpoints
└── migrations/           # Database schema migrations
    └── 1_create_tables.up.sql
```

### Database Design

The database uses PostgreSQL with the following main tables:

#### Core Tables
- **tracks** - Music track metadata
- **samples** - Audio sample library with categories and tags
- **patterns** - Musical patterns and progressions
- **generated_tracks** - AI-generated music tracks
- **audio_analysis** - Analysis results from processed audio

#### Key Features
- JSONB columns for flexible metadata storage
- Check constraints for data validation
- Indexes for performance optimization
- Array support for tags

### Storage Architecture

Three object storage buckets handle different types of audio files:

- **audio-files** - Original uploaded audio files
- **generated-tracks** - AI-generated music and loops
- **extracted-stems** - Separated audio stems from analysis

All buckets are configured as public for direct access to audio files.

### API Design

The API follows RESTful principles with type-safe endpoints:

- **Type Safety**: All endpoints use TypeScript interfaces for request/response
- **Validation**: Encore.ts provides automatic validation
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Documentation**: Self-documenting through TypeScript types

## Frontend Architecture

### Component Structure

```
frontend/
├── App.tsx                   # Main application component
├── components/
│   └── Header.tsx            # Navigation header
└── pages/
    ├── HomePage.tsx          # Landing page
    ├── GeneratePage.tsx      # Music generation interface
    ├── AnalyzePage.tsx       # Audio analysis interface
    ├── SamplesPage.tsx       # Sample library browser
    └── PatternsPage.tsx      # Pattern library browser
```

### State Management

- **TanStack Query**: Handles server state, caching, and synchronization
- **React State**: Local component state for UI interactions
- **URL State**: Router state for navigation and deep linking

### UI Architecture

- **Design System**: shadcn/ui components for consistency
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: ARIA labels and keyboard navigation
- **Dark Theme**: Consistent dark theme throughout the application

## Data Flow

### Music Generation Flow

1. User inputs prompt and parameters in frontend
2. Frontend sends request to `/generate/track` endpoint
3. Backend processes request and generates mock audio data
4. Audio files are uploaded to object storage
5. Metadata is stored in database
6. Response includes public URLs for audio files
7. Frontend displays results with playback controls

### Audio Analysis Flow

1. User provides YouTube URL or uploads file
2. Frontend sends request to `/analyze/audio` endpoint
3. Backend processes audio (currently mocked)
4. Stems are extracted and uploaded to storage
5. Patterns are detected and stored
6. Analysis results are returned to frontend
7. Frontend displays stems and patterns

### Sample Discovery Flow

1. User searches or filters samples
2. Frontend queries `/samples` or `/samples/search` endpoints
3. Backend queries database with filters
4. Results are returned with pagination
5. Frontend displays samples in grid layout
6. Users can play samples directly from storage URLs

## Security Considerations

### Current State
- No authentication required (development phase)
- All endpoints are publicly accessible
- Object storage buckets are public

### Future Enhancements
- User authentication and authorization
- Rate limiting for API endpoints
- Secure file upload validation
- Content moderation for user uploads

## Performance Optimizations

### Backend
- Database indexes on frequently queried columns
- JSONB for flexible metadata without joins
- Object storage for large audio files
- Efficient SQL queries with proper filtering

### Frontend
- React Query for intelligent caching
- Lazy loading of audio files
- Optimized bundle splitting with Vite
- Responsive images and assets

## Scalability Considerations

### Horizontal Scaling
- Stateless backend services
- Database connection pooling
- CDN for static assets and audio files
- Load balancing for multiple instances

### Vertical Scaling
- Database optimization and indexing
- Caching strategies for frequently accessed data
- Audio processing optimization
- Memory management for large files

## Development Workflow

### Local Development
1. Start Encore.ts backend: `encore run`
2. Frontend automatically served by Encore
3. Database migrations run automatically
4. Hot reloading for both frontend and backend

### Type Safety
- Shared types between frontend and backend
- Automatic API client generation
- Compile-time error checking
- IDE support with full IntelliSense

## Monitoring and Observability

### Built-in Features
- Encore.ts provides automatic metrics and tracing
- Database query monitoring
- API endpoint performance tracking
- Error logging and alerting

### Future Enhancements
- Custom business metrics
- User analytics and behavior tracking
- Audio processing performance monitoring
- Storage usage and optimization tracking

## Deployment Architecture

### Production Considerations
- Container-based deployment
- Environment-specific configuration
- Database backup and recovery
- CDN for global audio file distribution
- SSL/TLS encryption for all endpoints

This architecture provides a solid foundation for the Amapiano AI application while maintaining flexibility for future enhancements and scaling requirements.
