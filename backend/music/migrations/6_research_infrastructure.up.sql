-- Research Infrastructure Tables
-- Support for doctoral thesis experiments, metrics collection, and analysis

-- Research experiments tracking
CREATE TABLE IF NOT EXISTS research_experiments (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(255) UNIQUE NOT NULL,
  experiment_name VARCHAR(500) NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  
  -- Metrics
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  cultural_metrics JSONB NOT NULL DEFAULT '{}',
  quality_metrics JSONB NOT NULL DEFAULT '{}',
  baseline_comparison JSONB,
  
  -- Research metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ablation study results
CREATE TABLE IF NOT EXISTS ablation_studies (
  id SERIAL PRIMARY KEY,
  study_id VARCHAR(255) UNIQUE NOT NULL,
  study_name VARCHAR(500) NOT NULL,
  base_experiment_id VARCHAR(255) REFERENCES research_experiments(experiment_id),
  
  -- Configuration variations
  disabled_features TEXT[] DEFAULT '{}',
  enabled_features TEXT[] DEFAULT '{}',
  
  -- Results
  performance_delta JSONB NOT NULL DEFAULT '{}',
  quality_delta JSONB NOT NULL DEFAULT '{}',
  cultural_delta JSONB NOT NULL DEFAULT '{}',
  
  -- Analysis
  feature_importance JSONB,
  conclusions TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cultural validation sessions (expert panel)
CREATE TABLE IF NOT EXISTS cultural_validation_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  experiment_id VARCHAR(255) REFERENCES research_experiments(experiment_id),
  
  -- Expert panel
  expert_id VARCHAR(255) NOT NULL,
  expert_name VARCHAR(255) NOT NULL,
  expert_specialization VARCHAR(100),
  
  -- Validation scores (0-10 scale)
  log_drum_authenticity DECIMAL(3,2),
  piano_voicing_accuracy DECIMAL(3,2),
  harmonic_sophistication DECIMAL(3,2),
  overall_cultural_authenticity DECIMAL(3,2),
  production_quality DECIMAL(3,2),
  
  -- Feedback
  comments TEXT,
  recommendations TEXT,
  
  -- Session metadata
  validation_duration_seconds INTEGER,
  validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance benchmarks
CREATE TABLE IF NOT EXISTS performance_benchmarks (
  id SERIAL PRIMARY KEY,
  benchmark_id VARCHAR(255) UNIQUE NOT NULL,
  system_name VARCHAR(255) NOT NULL,
  
  -- Configuration
  hardware_config JSONB NOT NULL DEFAULT '{}',
  software_config JSONB NOT NULL DEFAULT '{}',
  
  -- Performance metrics
  latency_ms INTEGER NOT NULL,
  throughput_ops_per_sec DECIMAL(10,2),
  cost_per_operation DECIMAL(10,6),
  
  -- Resource usage
  cpu_usage_percent DECIMAL(5,2),
  memory_usage_mb DECIMAL(10,2),
  gpu_usage_percent DECIMAL(5,2),
  
  -- Quality metrics
  quality_score DECIMAL(3,2),
  cultural_score DECIMAL(3,2),
  
  -- Efficiency calculation
  efficiency_score DECIMAL(10,6), -- Quality / (Latency × Cost)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAQ quantization experiments
CREATE TABLE IF NOT EXISTS caq_experiments (
  id SERIAL PRIMARY KEY,
  experiment_id VARCHAR(255) UNIQUE NOT NULL,
  genre VARCHAR(50) NOT NULL,
  
  -- Quantization configuration
  precision_bits INTEGER NOT NULL CHECK (precision_bits IN (4, 8, 16, 32)),
  cultural_weight DECIMAL(3,2) NOT NULL,
  adaptive_bins BOOLEAN DEFAULT false,
  
  -- Results
  compression_ratio DECIMAL(5,2) NOT NULL,
  cultural_preservation DECIMAL(3,2) NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  
  -- Detailed metrics
  original_size_bytes BIGINT NOT NULL,
  compressed_size_bytes BIGINT NOT NULL,
  cultural_elements_detected INTEGER,
  cultural_elements_preserved INTEGER,
  
  -- Comparison to naive quantization
  naive_compression_ratio DECIMAL(5,2),
  naive_cultural_preservation DECIMAL(3,2),
  improvement_percentage DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern cache performance tracking
CREATE TABLE IF NOT EXISTS pattern_cache_metrics (
  id SERIAL PRIMARY KEY,
  metric_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Cache statistics
  total_patterns INTEGER NOT NULL,
  cache_hits INTEGER NOT NULL,
  cache_misses INTEGER NOT NULL,
  hit_rate DECIMAL(5,4) NOT NULL,
  
  -- Performance
  avg_generation_time_ms DECIMAL(10,2),
  avg_cache_retrieval_time_ms DECIMAL(10,2),
  total_size_mb DECIMAL(10,2),
  computational_savings_percent DECIMAL(5,2),
  
  -- Configuration
  max_cache_size INTEGER,
  max_cache_size_mb INTEGER,
  
  -- Timestamp
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research publications tracking
CREATE TABLE IF NOT EXISTS research_publications (
  id SERIAL PRIMARY KEY,
  publication_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(1000) NOT NULL,
  publication_type VARCHAR(50) NOT NULL, -- 'conference', 'journal', 'workshop'
  
  -- Related experiments
  experiment_ids TEXT[] DEFAULT '{}',
  
  -- Publication details
  authors TEXT[] NOT NULL,
  venue VARCHAR(500),
  publication_date DATE,
  doi VARCHAR(255),
  url TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'under_review', 'accepted', 'published'
  
  -- Abstract and keywords
  abstract TEXT,
  keywords TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_research_experiments_name ON research_experiments(experiment_name);
CREATE INDEX idx_research_experiments_created ON research_experiments(created_at DESC);
CREATE INDEX idx_research_experiments_status ON research_experiments(status);
CREATE INDEX idx_ablation_studies_base ON ablation_studies(base_experiment_id);
CREATE INDEX idx_cultural_validation_experiment ON cultural_validation_sessions(experiment_id);
CREATE INDEX idx_cultural_validation_expert ON cultural_validation_sessions(expert_id);
CREATE INDEX idx_performance_benchmarks_system ON performance_benchmarks(system_name);
CREATE INDEX idx_performance_benchmarks_efficiency ON performance_benchmarks(efficiency_score DESC);
CREATE INDEX idx_caq_experiments_genre ON caq_experiments(genre);
CREATE INDEX idx_caq_experiments_compression ON caq_experiments(compression_ratio DESC);
CREATE INDEX idx_pattern_cache_hit_rate ON pattern_cache_metrics(hit_rate DESC);
CREATE INDEX idx_publications_status ON research_publications(status);
CREATE INDEX idx_publications_date ON research_publications(publication_date DESC);

-- GIN indexes for JSONB columns
CREATE INDEX idx_research_experiments_config ON research_experiments USING GIN (configuration);
CREATE INDEX idx_research_experiments_tags ON research_experiments USING GIN (tags);
CREATE INDEX idx_performance_benchmarks_hardware ON performance_benchmarks USING GIN (hardware_config);

-- Comments for documentation
COMMENT ON TABLE research_experiments IS 'Doctoral research experiment tracking with comprehensive metrics';
COMMENT ON TABLE ablation_studies IS 'Systematic ablation study results for feature importance analysis';
COMMENT ON TABLE cultural_validation_sessions IS 'Expert panel validation sessions for cultural authenticity';
COMMENT ON TABLE performance_benchmarks IS 'System performance benchmarks for comparative analysis';
COMMENT ON TABLE caq_experiments IS 'Culturally-Aware Quantization experiment results';
COMMENT ON TABLE pattern_cache_metrics IS 'Pattern Sparse Cache performance tracking';
COMMENT ON TABLE research_publications IS 'Academic publications tracking';
