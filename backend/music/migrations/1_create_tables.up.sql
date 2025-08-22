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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audio_analysis (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'upload', 'url', 'tiktok')),
  analysis_data JSONB NOT NULL,
  extracted_stems JSONB,
  detected_patterns JSONB,
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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracks_genre ON tracks(genre);
CREATE INDEX idx_samples_category ON samples(category);
CREATE INDEX idx_samples_genre ON samples(genre);
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_genre ON patterns(genre);
CREATE INDEX idx_generated_tracks_genre ON generated_tracks(genre);
