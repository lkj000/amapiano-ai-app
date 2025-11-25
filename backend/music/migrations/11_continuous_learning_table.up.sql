-- Create continuous learning sessions table

CREATE TABLE IF NOT EXISTS continuous_learning_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  patterns_learned INTEGER DEFAULT 0,
  improvement_score DOUBLE PRECISION DEFAULT 0.0,
  genre TEXT,
  session_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_user ON continuous_learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_started ON continuous_learning_sessions(started_at);
