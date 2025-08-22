# Amapiano AI Architecture

## Overview

Amapiano AI is built using a modern, scalable full-stack architecture with Encore.ts for the backend and React for the frontend. The system is designed for high performance, maintainability, and cultural authenticity while supporting advanced AI music generation and analysis capabilities.

## Technology Stack

### Backend Infrastructure
- **Framework**: Encore.ts with TypeScript for type-safe backend development
- **Database**: PostgreSQL with advanced indexing and JSONB support
- **Storage**: Object storage buckets with CDN distribution for audio files
- **API**: RESTful endpoints with comprehensive type safety and validation
- **Infrastructure**: Built-in support for databases, storage, caching, and deployment

### Frontend Technology
- **Framework**: React 18 with TypeScript for modern, type-safe development
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS v4 for responsive, modern design systems
- **UI Components**: shadcn/ui for consistent, accessible component library
- **State Management**: TanStack Query for intelligent server state management
- **Routing**: React Router v6 for client-side navigation and deep linking
- **Icons**: Lucide React for consistent, scalable iconography

### Development & Quality
- **Type Safety**: Full TypeScript coverage from database to UI components
- **Testing**: Vitest for comprehensive frontend and backend testing
- **Code Quality**: ESLint and Prettier for consistent code standards
- **Version Control**: Git with conventional commits and semantic versioning

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Encore.ts)   │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • React 18      │    │ • TypeScript    │    │ • JSONB Support │
│ • TypeScript    │    │ • Type Safety   │    │ • Advanced      │
│ • Tailwind CSS  │    │ • Auto APIs     │    │   Indexing      │
│ • TanStack      │    │ • Validation    │    │ • Full-text     │
│   Query         │    │ • Error         │    │   Search        │
│ • Vite          │    │   Handling      │    │ • Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Object Storage  │
                       │                 │
                       │ • Audio Files   │
                       │ • Generated     │
                       │   Tracks        │
                       │ • Extracted     │
                       │   Stems         │
                       │ • CDN           │
                       │   Distribution  │
                       └─────────────────┘
```

## Backend Architecture

### Service Structure

The backend is organized as a comprehensive Encore.ts service called `music` that handles all music-related functionality with clear separation of concerns:

```
backend/music/
├── encore.service.ts     # Service definition and configuration
├── db.ts                 # Database configuration and connection
├── storage.ts            # Object storage bucket definitions
├── types.ts              # Shared TypeScript type definitions
├── generate.ts           # Music generation endpoints and logic
├── analyze.ts            # Audio analysis and processing endpoints
├── samples.ts            # Sample management and search endpoints
├── patterns.ts           # Pattern library and management endpoints
└── migrations/           # Database schema migrations
    ├── 1_create_tables.up.sql    # Core table definitions
    └── 2_seed_data.up.sql        # Sample data and initial content
```

### Database Design

The database uses PostgreSQL with advanced features for optimal performance and flexibility:

#### Core Tables
- **tracks** - Music track metadata with genre classification
- **samples** - Audio sample library with comprehensive tagging
- **patterns** - Musical patterns and progressions with complexity ratings
- **generated_tracks** - AI-generated music tracks with source tracking
- **audio_analysis** - Analysis results with confidence scoring

#### Advanced Tables
- **batch_analysis** - Batch processing operations with priority queuing
- **user_favorites** - User preference tracking and personalization
- **usage_analytics** - Comprehensive usage tracking and insights

#### Key Database Features
- **JSONB columns** for flexible metadata storage without schema rigidity
- **Check constraints** for data validation and integrity
- **Advanced indexes** including GIN indexes for array and full-text search
- **Full-text search** capabilities for samples and patterns
- **Performance optimization** with strategic indexing and query optimization

### Storage Architecture

Three specialized object storage buckets handle different types of audio content:

- **audio-files** - Original uploaded audio files with secure access
- **generated-tracks** - AI-generated music and loops with public access
- **extracted-stems** - Separated audio stems from analysis with organized structure

All buckets are configured with:
- **Public access** for direct audio streaming
- **CDN integration** for global distribution
- **Versioning support** for content management
- **Secure upload URLs** for file uploads

### API Design Philosophy

The API follows RESTful principles with enhanced type safety and developer experience:

- **Type Safety**: All endpoints use comprehensive TypeScript interfaces
- **Automatic Validation**: Encore.ts provides built-in request/response validation
- **Consistent Error Handling**: Standardized error responses with detailed information
- **Self-Documenting**: TypeScript types serve as living documentation
- **Performance Optimized**: Efficient queries and caching strategies

## Frontend Architecture

### Component Structure

```
frontend/
├── App.tsx                   # Main application component with routing
├── components/               # Reusable UI components
│   ├── Header.tsx            # Navigation header with responsive design
│   ├── LoadingSpinner.tsx    # Consistent loading states
│   └── ErrorMessage.tsx      # Error handling and retry functionality
└── pages/                    # Page-level components
    ├── HomePage.tsx          # Landing page with feature overview
    ├── GeneratePage.tsx      # Music generation interface
    ├── AnalyzePage.tsx       # Audio analysis and amapianorize interface
    ├── SamplesPage.tsx       # Sample library browser with search
    └── PatternsPage.tsx      # Pattern library with interactive playback
```

### State Management Strategy

- **TanStack Query**: Intelligent server state management with caching, background updates, and optimistic updates
- **React State**: Local component state for UI interactions and form management
- **URL State**: Router state for navigation, deep linking, and shareable URLs
- **Context API**: Global state for user preferences and application settings

### UI Architecture Principles

- **Design System**: shadcn/ui components for consistency and accessibility
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Dark Theme**: Consistent dark theme throughout the application
- **Performance**: Optimized rendering with React.memo and lazy loading

## Data Flow Architecture

### Music Generation Flow

1. **User Input**: User provides prompt and parameters in the frontend interface
2. **Validation**: Frontend validates input and provides immediate feedback
3. **API Request**: Request sent to `/generate/track` endpoint with type safety
4. **Processing**: Backend processes request with AI generation (currently mocked)
5. **Storage**: Generated audio files uploaded to object storage with metadata
6. **Database**: Track metadata and generation details stored in PostgreSQL
7. **Response**: Public URLs and metadata returned to frontend
8. **UI Update**: Frontend displays results with playback controls and download options

### Audio Analysis Flow

1. **Source Input**: User provides YouTube URL, TikTok URL, or uploads file
2. **Upload Handling**: Secure upload URLs generated for file uploads
3. **Analysis Request**: Request sent to `/analyze/audio` endpoint
4. **Processing**: Backend analyzes audio with stem separation and pattern detection
5. **Stem Storage**: Extracted stems uploaded to dedicated storage bucket
6. **Pattern Detection**: Musical patterns identified and stored with confidence scores
7. **Database Storage**: Analysis results stored with comprehensive metadata
8. **Response**: Stems, patterns, and analysis data returned to frontend
9. **UI Display**: Results displayed with interactive playback and educational content

### Sample Discovery Flow

1. **Search/Filter**: User searches or filters samples using advanced criteria
2. **Query Processing**: Frontend queries `/samples` or `/samples/search` endpoints
3. **Database Query**: Backend executes optimized queries with full-text search
4. **Result Processing**: Results returned with pagination and metadata
5. **UI Rendering**: Frontend displays samples in responsive grid layout
6. **Audio Playback**: Users can preview samples directly from storage URLs
7. **Download**: Secure download functionality with usage tracking

## Security Architecture

### Current Security Model
- **Public API**: All endpoints publicly accessible for demonstration
- **Input Validation**: Comprehensive validation on all user inputs
- **File Upload Security**: Signed URLs and file type validation
- **Error Handling**: Secure error messages without sensitive information exposure

### Production Security Enhancements
- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control for different user types
- **Rate Limiting**: Intelligent rate limiting based on user type and endpoint
- **Content Moderation**: Automated content scanning for uploaded files
- **Data Encryption**: End-to-end encryption for sensitive user data

## Performance Optimization

### Backend Performance
- **Database Optimization**: Strategic indexing on frequently queried columns
- **Query Efficiency**: Optimized SQL queries with proper joins and filtering
- **JSONB Usage**: Efficient metadata storage without complex joins
- **Caching Strategy**: Intelligent caching for frequently accessed data
- **Connection Pooling**: Optimized database connection management

### Frontend Performance
- **Intelligent Caching**: TanStack Query provides sophisticated caching strategies
- **Lazy Loading**: Audio files and large components loaded on demand
- **Bundle Optimization**: Vite provides optimized bundle splitting and tree shaking
- **Image Optimization**: Responsive images with proper sizing and formats
- **Code Splitting**: Route-based code splitting for faster initial loads

### Storage Performance
- **CDN Distribution**: Global content delivery for audio files
- **Compression**: Optimized audio compression without quality loss
- **Parallel Processing**: Concurrent upload and download operations
- **Caching Headers**: Proper cache headers for static assets

## Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: Backend services designed for horizontal scaling
- **Load Balancing**: Support for multiple backend instances
- **Database Scaling**: Read replicas and connection pooling
- **Storage Scaling**: Object storage with unlimited capacity
- **CDN Scaling**: Global distribution for audio content

### Vertical Scaling
- **Resource Optimization**: Efficient memory and CPU usage
- **Database Performance**: Query optimization and indexing strategies
- **Caching Layers**: Multiple levels of caching for performance
- **Background Processing**: Asynchronous processing for heavy operations

### Microservices Evolution
- **Service Separation**: Clear boundaries for future service extraction
- **API Gateway**: Centralized API management and routing
- **Event-Driven Architecture**: Pub/sub patterns for service communication
- **Data Consistency**: Eventual consistency patterns for distributed data

## Development Workflow

### Local Development Environment
1. **Single Command Start**: `encore run` starts entire development environment
2. **Hot Reloading**: Automatic reloading for both frontend and backend changes
3. **Type Generation**: Automatic API client generation with full type safety
4. **Database Management**: Automatic migrations and schema management
5. **Storage Simulation**: Local object storage for development

### Type Safety Workflow
- **Shared Types**: Common types defined in backend and used in frontend
- **Automatic Generation**: API client automatically generated from backend types
- **Compile-Time Checking**: Full TypeScript checking across the entire stack
- **IDE Support**: Complete IntelliSense and error checking in development

### Testing Strategy
- **Unit Testing**: Comprehensive unit tests for business logic
- **Integration Testing**: API endpoint testing with real database
- **Frontend Testing**: Component testing with React Testing Library
- **End-to-End Testing**: Full user workflow testing with Playwright

## Monitoring and Observability

### Built-in Monitoring
- **Encore.ts Metrics**: Automatic API performance and error tracking
- **Database Monitoring**: Query performance and connection tracking
- **Storage Metrics**: Upload/download performance and usage statistics
- **Error Tracking**: Comprehensive error logging and alerting

### Production Monitoring
- **Application Performance**: Response times and throughput monitoring
- **User Analytics**: User behavior and feature usage tracking
- **Business Metrics**: Generation success rates and user engagement
- **Infrastructure Health**: Server performance and resource utilization

### Alerting and Debugging
- **Real-time Alerts**: Immediate notification of critical issues
- **Log Aggregation**: Centralized logging for debugging and analysis
- **Performance Profiling**: Detailed performance analysis tools
- **User Session Tracking**: Complete user journey tracking for support

## Deployment Architecture

### Development Deployment
- **Local Development**: Complete local environment with `encore run`
- **Preview Deployments**: Automatic preview deployments for pull requests
- **Staging Environment**: Full staging environment for testing
- **Database Migrations**: Automatic migration management

### Production Deployment
- **Container-Based**: Docker containers for consistent deployment
- **Blue-Green Deployment**: Zero-downtime deployment strategy
- **Database Backup**: Automated backup and recovery procedures
- **CDN Configuration**: Global content delivery network setup
- **SSL/TLS**: End-to-end encryption for all communications

### Infrastructure as Code
- **Encore.ts Infrastructure**: Automatic infrastructure provisioning
- **Environment Configuration**: Environment-specific configuration management
- **Secrets Management**: Secure handling of API keys and sensitive data
- **Monitoring Setup**: Automatic monitoring and alerting configuration

## Cultural and Educational Architecture

### Cultural Authenticity
- **Artist Collaboration**: Integration with South African artists and producers
- **Cultural Validation**: Review processes for cultural accuracy
- **Educational Content**: Comprehensive learning materials about amapiano
- **Community Integration**: Features for community feedback and contribution

### Educational Framework
- **Progressive Learning**: Structured learning paths for different skill levels
- **Interactive Examples**: Hands-on examples with real amapiano content
- **Cultural Context**: Historical and cultural background for musical elements
- **Practice Tools**: Interactive tools for learning amapiano production

This comprehensive architecture provides a solid foundation for the Amapiano AI platform while maintaining flexibility for future enhancements and scaling requirements. The design prioritizes performance, maintainability, cultural authenticity, and educational value.
