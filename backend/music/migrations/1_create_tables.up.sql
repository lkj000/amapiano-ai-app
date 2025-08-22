-- Set the default text search configuration for this transaction.
-- This allows using the IMMUTABLE one-argument version of to_tsvector in indexes.
SET default_text_search_config = 'pg_catalog.english';

CREATE TABLE tracks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT NOT NULL CHECK (genre IN ('amapiano', 'private_school_amapiano')),
  bpm INTEGER,
  key_signature TEXT,
  duration_seconds INTEGER,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE samples (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('log_drum', 'piano', 'percussion', 'bass', 'vocal', 'saxophone', 'guitar', 'synth')),
  genre TEXT NOT NULL CHECK (genre IN ('amapiano', 'private_school_amapiano')),
  file_url TEXT NOT NULL,
  bpm INTEGER,
  key_signature TEXT,
  duration_seconds DOUBLE PRECISION,
  tags TEXT[],
  quality_rating DOUBLE PRECISION DEFAULT 0.0,
  download_count INTEGER DEFAULT 0,
  cultural_authenticity_score DOUBLE PRECISION,
  musical_complexity TEXT CHECK (musical_complexity IN ('simple', 'intermediate', 'advanced', 'expert')),
  energy_level DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patterns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('drum_pattern', 'bass_pattern', 'chord_progression', 'melody')),
  genre TEXT NOT NULL CHECK (genre IN ('amapiano', 'private_school_amapiano')),
  pattern_data JSONB NOT NULL,
  bpm INTEGER,
  key_signature TEXT,
  bars INTEGER DEFAULT 4,
  complexity TEXT CHECK (complexity IN ('simple', 'intermediate', 'advanced', 'expert')),
  cultural_authenticity_score DOUBLE PRECISION,
  educational_content JSONB,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audio_analysis (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'upload', 'url', 'tiktok')),
  analysis_data JSONB NOT NULL,
  extracted_stems JSONB,
  detected_patterns JSONB,
  processing_time_ms INTEGER,
  quality_score DOUBLE PRECISION,
  cultural_authenticity_score DOUBLE PRECISION,
  musical_complexity TEXT CHECK (musical_complexity IN ('simple', 'intermediate', 'advanced', 'expert')),
  energy_level DOUBLE PRECISION,
  danceability DOUBLE PRECISION,
  enhanced_processing BOOLEAN DEFAULT FALSE,
  educational_insights JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE generated_tracks (
  id BIGSERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  genre TEXT NOT NULL CHECK (genre IN ('amapiano', 'private_school_amapiano')),
  mood TEXT,
  bpm INTEGER,
  key_signature TEXT,
  file_url TEXT,
  stems_data JSONB,
  source_analysis_id BIGINT REFERENCES audio_analysis(id),
  processing_time_ms INTEGER,
  transformation_type TEXT,
  transformation_intensity TEXT CHECK (transformation_intensity IN ('subtle', 'moderate', 'heavy', 'extreme')),
  quality_rating DOUBLE PRECISION DEFAULT 0.0,
  cultural_authenticity_score DOUBLE PRECISION,
  musical_complexity TEXT CHECK (musical_complexity IN ('simple', 'intermediate', 'advanced', 'expert')),
  energy_level DOUBLE PRECISION,
  danceability DOUBLE PRECISION,
  quality_tier TEXT CHECK (quality_tier IN ('standard', 'professional', 'studio')),
  enhanced_generation BOOLEAN DEFAULT FALSE,
  educational_insights JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE batch_analysis (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT UNIQUE NOT NULL,
  sources JSONB NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  estimated_completion_time INTEGER,
  actual_completion_time INTEGER,
  enhanced_processing BOOLEAN DEFAULT FALSE,
  cultural_analysis BOOLEAN DEFAULT FALSE,
  quality_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('sample', 'pattern', 'track', 'analysis')),
  item_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id TEXT,
  session_id TEXT,
  quality_metrics JSONB,
  cultural_context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quality_assessments (
  id BIGSERIAL PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('track', 'sample', 'pattern', 'analysis')),
  item_id BIGINT NOT NULL,
  quality_score DOUBLE PRECISION NOT NULL,
  cultural_authenticity DOUBLE PRECISION,
  technical_quality DOUBLE PRECISION,
  musical_coherence DOUBLE PRECISION,
  assessment_method TEXT NOT NULL,
  assessor_type TEXT CHECK (assessor_type IN ('ai', 'expert', 'community')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cultural_validation (
  id BIGSERIAL PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('track', 'sample', 'pattern')),
  item_id BIGINT NOT NULL,
  authenticity_score DOUBLE PRECISION NOT NULL,
  cultural_elements JSONB,
  validation_notes TEXT,
  validator_id TEXT,
  validation_status TEXT CHECK (validation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced indexes for performance
CREATE INDEX idx_tracks_genre ON tracks(genre);
CREATE INDEX idx_tracks_bpm ON tracks(bpm);
CREATE INDEX idx_samples_category ON samples(category);
CREATE INDEX idx_samples_genre ON samples(genre);
CREATE INDEX idx_samples_tags ON samples USING GIN(tags);
CREATE INDEX idx_samples_quality ON samples(quality_rating DESC);
CREATE INDEX idx_samples_cultural ON samples(cultural_authenticity_score DESC);
CREATE INDEX idx_samples_complexity ON samples(musical_complexity);
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_genre ON patterns(genre);
CREATE INDEX idx_patterns_complexity ON patterns(complexity);
CREATE INDEX idx_patterns_cultural ON patterns(cultural_authenticity_score DESC);
CREATE INDEX idx_audio_analysis_source_type ON audio_analysis(source_type);
CREATE INDEX idx_audio_analysis_quality ON audio_analysis(quality_score DESC);
CREATE INDEX idx_audio_analysis_cultural ON audio_analysis(cultural_authenticity_score DESC);
CREATE INDEX idx_audio_analysis_complexity ON audio_analysis(musical_complexity);
CREATE INDEX idx_generated_tracks_genre ON generated_tracks(genre);
CREATE INDEX idx_generated_tracks_source ON generated_tracks(source_analysis_id);
CREATE INDEX idx_generated_tracks_quality ON generated_tracks(quality_rating DESC);
CREATE INDEX idx_generated_tracks_cultural ON generated_tracks(cultural_authenticity_score DESC);
CREATE INDEX idx_generated_tracks_complexity ON generated_tracks(musical_complexity);
CREATE INDEX idx_generated_tracks_tier ON generated_tracks(quality_tier);
CREATE INDEX idx_batch_analysis_status ON batch_analysis(status);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_usage_analytics_event ON usage_analytics(event_type);
CREATE INDEX idx_usage_analytics_time ON usage_analytics(created_at);
CREATE INDEX idx_quality_assessments_item ON quality_assessments(item_type, item_id);
CREATE INDEX idx_quality_assessments_score ON quality_assessments(quality_score DESC);
CREATE INDEX idx_cultural_validation_item ON cultural_validation(item_type, item_id);
CREATE INDEX idx_cultural_validation_status ON cultural_validation(validation_status);

-- Full-text search indexes
CREATE INDEX idx_samples_search ON samples USING GIN(to_tsvector(name || ' ' || COALESCE(array_to_string(tags, ' '), '')));
CREATE INDEX idx_patterns_search ON patterns USING GIN(to_tsvector(name));
CREATE INDEX idx_tracks_search ON tracks USING GIN(to_tsvector(title || ' ' || COALESCE(artist, '')));
