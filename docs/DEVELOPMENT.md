# Development Guide

## Getting Started

### Prerequisites

- Node.js 18 or later
- Encore CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd amapiano-ai
   ```

2. **Install Encore CLI** (if not already installed)
   ```bash
   curl -L https://encore.dev/install.sh | bash
   ```

3. **Start the development server**
   ```bash
   encore run
   ```

The application will be available at `http://localhost:4000`

## Project Structure

```
amapiano-ai/
├── backend/                  # Backend service
│   └── music/               # Music service
│       ├── encore.service.ts
│       ├── *.ts            # API endpoints
│       └── migrations/     # Database migrations
├── frontend/               # React frontend
│   ├── App.tsx
│   ├── components/
│   └── pages/
├── docs/                   # Documentation
└── README.md
```

## Backend Development

### Adding New Endpoints

1. **Create endpoint file** in `backend/music/`
2. **Define types** in `types.ts` or endpoint file
3. **Implement handler** using Encore.ts `api` function
4. **Add database queries** if needed
5. **Test endpoint** using Encore's built-in testing

Example endpoint:
```typescript
import { api } from "encore.dev/api";

interface CreateSampleRequest {
  name: string;
  category: SampleCategory;
  fileUrl: string;
}

interface CreateSampleResponse {
  id: number;
  name: string;
}

// Creates a new sample
export const createSample = api<CreateSampleRequest, CreateSampleResponse>(
  { expose: true, method: "POST", path: "/samples" },
  async (req) => {
    const result = await musicDB.queryRow`
      INSERT INTO samples (name, category, file_url)
      VALUES (${req.name}, ${req.category}, ${req.fileUrl})
      RETURNING id, name
    `;
    return result!;
  }
);
```

### Database Migrations

1. **Create migration file** in `backend/music/migrations/`
2. **Use incremental numbering**: `2_add_new_table.up.sql`
3. **Write SQL DDL statements**
4. **Test migration** by restarting the service

Example migration:
```sql
-- 2_add_user_favorites.up.sql
CREATE TABLE user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  sample_id BIGINT REFERENCES samples(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
```

### Working with Object Storage

```typescript
import { audioFiles } from "./storage";

// Upload file
await audioFiles.upload("filename.wav", buffer);

// Get public URL
const url = audioFiles.publicUrl("filename.wav");

// Check if file exists
const exists = await audioFiles.exists("filename.wav");

// Download file
const buffer = await audioFiles.download("filename.wav");
```

## Frontend Development

### Adding New Pages

1. **Create page component** in `frontend/pages/`
2. **Add route** in `App.tsx`
3. **Update navigation** in `Header.tsx`
4. **Implement page logic** with React hooks

Example page:
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';

export default function NewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['samples'],
    queryFn: () => backend.music.listSamples({}),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>New Page</h1>
      {/* Page content */}
    </div>
  );
}
```

### Using the Backend Client

The frontend automatically gets a type-safe client for the backend:

```typescript
import backend from '~backend/client';

// Call API endpoints
const samples = await backend.music.listSamples({
  genre: 'amapiano',
  limit: 10
});

// All parameters and responses are fully typed
const track = await backend.music.generateTrack({
  prompt: "Soulful amapiano track",
  genre: "private_school_amapiano",
  bpm: 120
});
```

### Styling Guidelines

- **Use Tailwind CSS** for all styling
- **Follow responsive design** principles
- **Use shadcn/ui components** when available
- **Maintain consistent spacing** with Tailwind's scale

Example component styling:
```typescript
<Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
  <CardHeader>
    <CardTitle className="text-white">Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>
```

## Testing

### Backend Testing

Encore.ts provides built-in testing capabilities:

```typescript
import { describe, expect, test } from "vitest";
import { listSamples } from "./samples";

describe("samples", () => {
  test("list samples", async () => {
    const result = await listSamples({});
    expect(result.samples).toBeDefined();
    expect(Array.isArray(result.samples)).toBe(true);
  });
});
```

### Frontend Testing

Use Vitest for frontend testing:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import HomePage from './HomePage';

describe('HomePage', () => {
  test('renders welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText('Amapiano AI')).toBeInTheDocument();
  });
});
```

## Code Style

### TypeScript Guidelines

- **Use strict TypeScript** configuration
- **Define interfaces** for all data structures
- **Use type imports** when importing types only
- **Avoid `any` type** - use proper typing

### Naming Conventions

- **Files**: kebab-case (`sample-manager.ts`)
- **Components**: PascalCase (`SampleCard.tsx`)
- **Functions**: camelCase (`listSamples`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_SAMPLES`)
- **Types/Interfaces**: PascalCase (`SampleCategory`)

### Code Organization

- **Keep files small** and focused
- **Extract reusable logic** into separate modules
- **Use barrel exports** for clean imports
- **Group related functionality** together

## Debugging

### Backend Debugging

1. **Use console.log** for simple debugging
2. **Check Encore logs** in the terminal
3. **Use database queries** to verify data
4. **Test endpoints** with curl or Postman

### Frontend Debugging

1. **Use React DevTools** for component inspection
2. **Use TanStack Query DevTools** for cache inspection
3. **Check browser console** for errors
4. **Use network tab** to inspect API calls

## Performance Tips

### Backend Performance

- **Use database indexes** for frequently queried columns
- **Limit query results** with pagination
- **Use JSONB efficiently** for metadata
- **Optimize file uploads** with streaming

### Frontend Performance

- **Use React.memo** for expensive components
- **Implement virtual scrolling** for large lists
- **Lazy load images** and audio files
- **Optimize bundle size** with code splitting

## Common Patterns

### Error Handling

Backend:
```typescript
import { APIError } from "encore.dev/api";

if (!sample) {
  throw APIError.notFound("Sample not found");
}
```

Frontend:
```typescript
const mutation = useMutation({
  mutationFn: backend.music.generateTrack,
  onError: (error) => {
    console.error('Generation error:', error);
    toast({
      title: "Error",
      description: "Failed to generate track",
      variant: "destructive",
    });
  },
});
```

### Loading States

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['samples'],
  queryFn: () => backend.music.listSamples({}),
});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <SampleList samples={data.samples} />;
```

### Form Handling

```typescript
const [form, setForm] = useState({
  name: '',
  category: 'log_drum' as const,
});

const handleSubmit = () => {
  mutation.mutate(form);
};
```

## Deployment

### Local Development

```bash
# Start development server
encore run

# Run with specific environment
encore run --env=development
```

### Production Deployment

Encore.ts handles deployment automatically when connected to Encore Cloud:

```bash
# Deploy to staging
git push origin main

# Deploy to production
git push origin production
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check if migrations have run
   - Verify database configuration

2. **Type errors in frontend**
   - Regenerate backend client types
   - Check import paths

3. **Audio file upload issues**
   - Verify bucket configuration
   - Check file size limits

4. **Build errors**
   - Clear node_modules and reinstall
   - Check TypeScript configuration

### Getting Help

- Check Encore.ts documentation
- Review error logs in terminal
- Use TypeScript compiler for type checking
- Test API endpoints individually

This development guide should help you get started with contributing to the Amapiano AI project. For specific questions, refer to the API documentation or architecture guide.
