-- Plugin Registry Tables

-- Main plugin registry
CREATE TABLE IF NOT EXISTS plugin_registry (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'instrument', 'effect', 'midi_effect', 'analyzer'
  format VARCHAR(50) NOT NULL, -- 'javascript', 'wasm', 'native'
  category VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]',
  cultural_context JSONB DEFAULT '{}',
  
  -- Distribution
  download_url TEXT NOT NULL,
  source_code TEXT,
  
  -- Licensing
  license VARCHAR(50) NOT NULL, -- 'free', 'commercial', 'open_source'
  price DECIMAL(10, 2) DEFAULT 0,
  
  -- Documentation
  website TEXT,
  documentation TEXT,
  
  -- Verification and featuring
  verified BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  
  -- Statistics
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(plugin_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plugin_type ON plugin_registry(type);
CREATE INDEX IF NOT EXISTS idx_plugin_category ON plugin_registry(category);
CREATE INDEX IF NOT EXISTS idx_plugin_format ON plugin_registry(format);
CREATE INDEX IF NOT EXISTS idx_plugin_license ON plugin_registry(license);
CREATE INDEX IF NOT EXISTS idx_plugin_verified ON plugin_registry(verified);
CREATE INDEX IF NOT EXISTS idx_plugin_featured ON plugin_registry(featured);
CREATE INDEX IF NOT EXISTS idx_plugin_tags ON plugin_registry USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_plugin_downloads ON plugin_registry(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_rating ON plugin_registry(rating DESC);

-- Plugin reviews (detailed user reviews)
CREATE TABLE IF NOT EXISTS plugin_reviews (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(plugin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_plugin ON plugin_reviews(plugin_id);
CREATE INDEX IF NOT EXISTS idx_review_rating ON plugin_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_review_helpful ON plugin_reviews(helpful_count DESC);

-- User plugin installations (track which users have installed which plugins)
CREATE TABLE IF NOT EXISTS user_plugin_installations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  plugin_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  installed_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  UNIQUE(user_id, plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_installation_user ON user_plugin_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_installation_plugin ON user_plugin_installations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_installation_last_used ON user_plugin_installations(last_used DESC);

-- Plugin presets (shared presets from users)
CREATE TABLE IF NOT EXISTS plugin_presets (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(255) NOT NULL,
  preset_name VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  description TEXT,
  parameters JSONB NOT NULL,
  cultural_context TEXT,
  tags JSONB DEFAULT '[]',
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preset_plugin ON plugin_presets(plugin_id);
CREATE INDEX IF NOT EXISTS idx_preset_downloads ON plugin_presets(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_preset_likes ON plugin_presets(likes DESC);
CREATE INDEX IF NOT EXISTS idx_preset_tags ON plugin_presets USING GIN(tags);

-- Plugin compatibility (track compatibility with DAW versions, OS, etc.)
CREATE TABLE IF NOT EXISTS plugin_compatibility (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  daw_version VARCHAR(50),
  os_platform VARCHAR(50), -- 'windows', 'mac', 'linux', 'web'
  browser VARCHAR(50), -- For web plugins
  min_browser_version VARCHAR(50),
  tested BOOLEAN DEFAULT FALSE,
  works BOOLEAN DEFAULT TRUE,
  issues TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compat_plugin ON plugin_compatibility(plugin_id);
CREATE INDEX IF NOT EXISTS idx_compat_platform ON plugin_compatibility(os_platform);

-- Plugin dependencies (for plugins that depend on other plugins)
CREATE TABLE IF NOT EXISTS plugin_dependencies (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(255) NOT NULL,
  depends_on_plugin_id VARCHAR(255) NOT NULL,
  min_version VARCHAR(50),
  required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dep_plugin ON plugin_dependencies(plugin_id);
CREATE INDEX IF NOT EXISTS idx_dep_depends_on ON plugin_dependencies(depends_on_plugin_id);

-- Seed some initial plugins
INSERT INTO plugin_registry (plugin_id, name, version, author, description, type, format, category, tags, cultural_context, download_url, license, verified, featured) VALUES
('amapiano-log-drum-v1', 'Amapiano Log Drum', '1.0.0', 'Amapiano AI Team', 'Authentic log drum synthesizer capturing the deep, resonant sound that defines amapiano music', 'instrument', 'javascript', 'log_drum', '["amapiano", "percussion", "traditional", "log drum"]', '{"genre": "amapiano", "culturalSignificance": "The log drum is the foundational sound of amapiano"}', '/plugins/LogDrumSynth.js', 'free', true, true),
('amapiano-eq-v1', 'Amapiano EQ', '1.0.0', 'Amapiano AI Team', 'Culturally-aware equalizer with presets optimized for authentic amapiano sound', 'effect', 'javascript', 'eq', '["eq", "mixing", "amapiano", "cultural"]', '{"genre": "universal", "culturalSignificance": "Designed with frequency curves for amapiano elements"}', '/plugins/AmapianoEQ.js', 'free', true, true)
ON CONFLICT (plugin_id, version) DO NOTHING;
