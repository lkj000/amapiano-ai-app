CREATE TABLE smart_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  category TEXT NOT NULL CHECK (category IN ('genre_specific', 'functional', 'experimental')),
  signal_chain JSONB NOT NULL,
  preset_parameters JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  target_framework TEXT NOT NULL DEFAULT 'WebAudio',
  verified BOOLEAN NOT NULL DEFAULT false,
  downloads INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2) DEFAULT 0,
  cultural_context TEXT,
  use_case TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE generated_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('effect', 'instrument', 'utility')),
  format TEXT NOT NULL CHECK (format IN ('JUCE', 'WebAudio', 'Native')),
  source_code TEXT NOT NULL,
  source_template_id TEXT REFERENCES smart_templates(id),
  customizations JSONB,
  version TEXT NOT NULL DEFAULT '1.0.0',
  parameters JSONB NOT NULL,
  signal_chain JSONB NOT NULL,
  metadata JSONB NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plugin_genealogy (
  plugin_id TEXT PRIMARY KEY REFERENCES generated_plugins(id),
  base_template TEXT REFERENCES smart_templates(id),
  customizations JSONB,
  derived_from TEXT[],
  user_modifications JSONB[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE template_analytics (
  template_id TEXT PRIMARY KEY REFERENCES smart_templates(id),
  total_generations INTEGER NOT NULL DEFAULT 0,
  customization_rate NUMERIC(5, 2) DEFAULT 0,
  average_rating NUMERIC(3, 2) DEFAULT 0,
  popular_customizations JSONB DEFAULT '[]',
  combined_with JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plugin_usage_events (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT REFERENCES generated_plugins(id),
  template_id TEXT REFERENCES smart_templates(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('generate', 'customize', 'download', 'rate', 'use')),
  event_data JSONB,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON smart_templates(category);
CREATE INDEX idx_templates_genre ON smart_templates(genre);
CREATE INDEX idx_templates_verified ON smart_templates(verified);
CREATE INDEX idx_templates_rating ON smart_templates(rating DESC);
CREATE INDEX idx_plugins_template ON generated_plugins(source_template_id);
CREATE INDEX idx_plugins_user ON generated_plugins(user_id);
CREATE INDEX idx_usage_events_template ON plugin_usage_events(template_id);
CREATE INDEX idx_usage_events_plugin ON plugin_usage_events(plugin_id);
CREATE INDEX idx_usage_events_created ON plugin_usage_events(created_at);
