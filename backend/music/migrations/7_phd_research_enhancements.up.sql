-- Migration: PhD Research Enhancements
-- Description: Add tables for continuous learning, pattern recommendations, and DistriGen

-- Learning Examples Table
CREATE TABLE IF NOT EXISTS learning_examples (
  id SERIAL PRIMARY KEY,
  example_id VARCHAR(255) UNIQUE NOT NULL,
  generation_id VARCHAR(255),
  genre VARCHAR(50) NOT NULL,
  quality_score DECIMAL(3,2),
  cultural_score DECIMAL(3,2),
  user_feedback VARCHAR(20),
  expert_validation BOOLEAN DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_examples_genre ON learning_examples(genre);
CREATE INDEX idx_learning_examples_quality ON learning_examples(quality_score DESC);
CREATE INDEX idx_learning_examples_cultural ON learning_examples(cultural_score DESC);
CREATE INDEX idx_learning_examples_created_at ON learning_examples(created_at DESC);

-- Feedback Signals Table
CREATE TABLE IF NOT EXISTS feedback_signals (
  id SERIAL PRIMARY KEY,
  signal_id VARCHAR(255) UNIQUE NOT NULL,
  generation_id VARCHAR(255) NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  signal_value DECIMAL(3,2) NOT NULL,
  signal_data JSONB NOT NULL DEFAULT '{}',
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_signals_generation ON feedback_signals(generation_id);
CREATE INDEX idx_feedback_signals_type ON feedback_signals(signal_type);
CREATE INDEX idx_feedback_signals_created_at ON feedback_signals(created_at DESC);

-- Adaptation Sessions Table
CREATE TABLE IF NOT EXISTS adaptation_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  model_version VARCHAR(255) NOT NULL,
  adaptation_type VARCHAR(50) NOT NULL,
  training_duration_ms INTEGER,
  examples_used INTEGER,
  performance_improvement JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_adaptation_sessions_status ON adaptation_sessions(status);
CREATE INDEX idx_adaptation_sessions_started ON adaptation_sessions(started_at DESC);

-- DistriGen Statistics Table
CREATE TABLE IF NOT EXISTS distrigen_stats (
  id SERIAL PRIMARY KEY,
  generation_id VARCHAR(255) UNIQUE NOT NULL,
  num_workers INTEGER NOT NULL,
  total_latency_ms INTEGER NOT NULL,
  average_worker_latency_ms INTEGER NOT NULL,
  parallelization_gain DECIMAL(5,2) NOT NULL,
  overall_quality DECIMAL(3,2) NOT NULL,
  cultural_authenticity DECIMAL(3,2) NOT NULL,
  stem_quality_scores JSONB NOT NULL DEFAULT '{}',
  worker_stats JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distrigen_stats_created ON distrigen_stats(created_at DESC);
CREATE INDEX idx_distrigen_stats_quality ON distrigen_stats(overall_quality DESC);

-- Pattern Recommendations Tracking Table
CREATE TABLE IF NOT EXISTS pattern_recommendations (
  id SERIAL PRIMARY KEY,
  recommendation_id VARCHAR(255) UNIQUE NOT NULL,
  pattern_id INTEGER NOT NULL REFERENCES patterns(id),
  user_context JSONB NOT NULL DEFAULT '{}',
  relevance_score DECIMAL(3,2) NOT NULL,
  reasoning JSONB NOT NULL DEFAULT '[]',
  accepted BOOLEAN,
  feedback_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_recommendations_pattern ON pattern_recommendations(pattern_id);
CREATE INDEX idx_pattern_recommendations_score ON pattern_recommendations(relevance_score DESC);
CREATE INDEX idx_pattern_recommendations_accepted ON pattern_recommendations(accepted);
CREATE INDEX idx_pattern_recommendations_created ON pattern_recommendations(created_at DESC);

-- Quality Monitoring Events Table
CREATE TABLE IF NOT EXISTS quality_monitoring_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  generation_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  quality_metrics JSONB NOT NULL DEFAULT '{}',
  cultural_metrics JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  threshold_violations JSONB NOT NULL DEFAULT '[]',
  corrective_actions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quality_monitoring_generation ON quality_monitoring_events(generation_id);
CREATE INDEX idx_quality_monitoring_type ON quality_monitoring_events(event_type);
CREATE INDEX idx_quality_monitoring_created ON quality_monitoring_events(created_at DESC);

-- Model Performance Tracking Table
CREATE TABLE IF NOT EXISTS model_performance_tracking (
  id SERIAL PRIMARY KEY,
  tracking_id VARCHAR(255) UNIQUE NOT NULL,
  model_version VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  deployment_status VARCHAR(50) DEFAULT 'testing',
  evaluation_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_model_performance_version ON model_performance_tracking(model_version);
CREATE INDEX idx_model_performance_type ON model_performance_tracking(model_type);
CREATE INDEX idx_model_performance_date ON model_performance_tracking(evaluation_date DESC);

-- Research Insights Table (for storing ML/AI insights and discoveries)
CREATE TABLE IF NOT EXISTS research_insights (
  id SERIAL PRIMARY KEY,
  insight_id VARCHAR(255) UNIQUE NOT NULL,
  insight_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  supporting_data JSONB NOT NULL DEFAULT '{}',
  confidence_score DECIMAL(3,2),
  actionable BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_research_insights_type ON research_insights(insight_type);
CREATE INDEX idx_research_insights_actionable ON research_insights(actionable);
CREATE INDEX idx_research_insights_created ON research_insights(created_at DESC);

-- Collaborative Research Sessions Table
CREATE TABLE IF NOT EXISTS collaborative_research_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  session_name TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]',
  research_focus TEXT,
  shared_experiments JSONB NOT NULL DEFAULT '[]',
  shared_insights JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collab_research_sessions_status ON collaborative_research_sessions(status);
CREATE INDEX idx_collab_research_sessions_created ON collaborative_research_sessions(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE learning_examples IS 'Stores training examples collected from user generations for continuous learning';
COMMENT ON TABLE feedback_signals IS 'Tracks various feedback signals (user, expert, objective) for model improvement';
COMMENT ON TABLE adaptation_sessions IS 'Records model adaptation/retraining sessions with performance metrics';
COMMENT ON TABLE distrigen_stats IS 'Tracks distributed generation performance and parallelization gains';
COMMENT ON TABLE pattern_recommendations IS 'Logs pattern recommendations with relevance scores and user feedback';
COMMENT ON TABLE quality_monitoring_events IS 'Real-time quality monitoring events and threshold violations';
COMMENT ON TABLE model_performance_tracking IS 'Tracks performance of different model versions over time';
COMMENT ON TABLE research_insights IS 'Stores actionable insights discovered through ML/AI analysis';
COMMENT ON TABLE collaborative_research_sessions IS 'Manages collaborative research sessions between researchers';
