-- Educational content table
CREATE TABLE IF NOT EXISTS educational_content (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'tutorial' CHECK (type IN ('tutorial', 'lesson', 'tip', 'cultural_insight', 'technique')),
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('production', 'cultural_history', 'music_theory', 'mixing', 'arrangement')),
  content TEXT NOT NULL,
  audio_examples JSONB,
  video_url VARCHAR(500),
  tags JSONB NOT NULL DEFAULT '[]',
  estimated_time_minutes INTEGER NOT NULL DEFAULT 10,
  prerequisites JSONB DEFAULT '[]',
  learning_objectives JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_educational_content_type ON educational_content (type);
CREATE INDEX IF NOT EXISTS idx_educational_content_difficulty ON educational_content (difficulty);
CREATE INDEX IF NOT EXISTS idx_educational_content_category ON educational_content (category);
CREATE INDEX IF NOT EXISTS idx_educational_content_created ON educational_content (created_at);

-- Cultural insights table
CREATE TABLE IF NOT EXISTS cultural_insights (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  cultural_context TEXT NOT NULL,
  musical_elements JSONB NOT NULL DEFAULT '[]',
  historical_background TEXT NOT NULL,
  modern_relevance TEXT NOT NULL,
  audio_examples JSONB DEFAULT '[]',
  related_genres JSONB NOT NULL DEFAULT '[]',
  key_figures JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_cultural_insights_created ON cultural_insights (created_at);

-- Learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  total_lessons INTEGER NOT NULL DEFAULT 0,
  estimated_hours INTEGER NOT NULL DEFAULT 1,
  content_ids JSONB NOT NULL DEFAULT '[]',
  prerequisites JSONB DEFAULT '[]',
  outcomes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_learning_paths_difficulty ON learning_paths (difficulty);
CREATE INDEX IF NOT EXISTS idx_learning_paths_created ON learning_paths (created_at);

-- Interactive tutorials table
CREATE TABLE IF NOT EXISTS interactive_tutorials (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category VARCHAR(100) NOT NULL,
  estimated_time INTEGER NOT NULL DEFAULT 10,
  completion_rate FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_interactive_tutorials_difficulty ON interactive_tutorials (difficulty);
CREATE INDEX IF NOT EXISTS idx_interactive_tutorials_category ON interactive_tutorials (category);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  completed_tutorials JSONB DEFAULT '[]',
  completed_lessons JSONB DEFAULT '[]',
  current_learning_paths JSONB DEFAULT '[]',
  skill_levels JSONB DEFAULT '{}',
  total_time_spent INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_activity ON user_progress (last_activity);

-- Tutorial completion tracking
CREATE TABLE IF NOT EXISTS tutorial_completions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tutorial_id INTEGER NOT NULL,
  tutorial_type VARCHAR(50) NOT NULL CHECK (tutorial_type IN ('educational_content', 'interactive_tutorial', 'cultural_insight')),
  completed_at TIMESTAMP DEFAULT NOW(),
  time_spent INTEGER DEFAULT 0,
  score FLOAT DEFAULT NULL,
  feedback TEXT,
  UNIQUE (user_id, tutorial_id, tutorial_type)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_user ON tutorial_completions (user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_tutorial ON tutorial_completions (tutorial_id, tutorial_type);
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_completed ON tutorial_completions (completed_at);

-- Learning analytics
CREATE TABLE IF NOT EXISTS learning_analytics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('tutorial_start', 'tutorial_complete', 'lesson_start', 'lesson_complete', 'quiz_attempt', 'skill_assessment')),
  content_id INTEGER,
  content_type VARCHAR(100),
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_learning_analytics_user ON learning_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_event ON learning_analytics (event_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_time ON learning_analytics (timestamp);

-- Quiz and assessment system
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_id INTEGER,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  questions JSONB NOT NULL DEFAULT '[]',
  passing_score FLOAT DEFAULT 70.0,
  time_limit_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_quizzes_content ON quizzes (content_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes (difficulty);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  quiz_id INTEGER NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score FLOAT NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts (completed_at);

-- Content ratings and feedback
CREATE TABLE IF NOT EXISTS content_feedback (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content_id INTEGER NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('educational_content', 'cultural_insight', 'learning_path', 'interactive_tutorial')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, content_id, content_type)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_content_feedback_content ON content_feedback (content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_feedback_rating ON content_feedback (rating);
CREATE INDEX IF NOT EXISTS idx_content_feedback_created ON content_feedback (created_at);

-- Skill assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  skill_category VARCHAR(50) NOT NULL CHECK (skill_category IN ('production', 'cultural_knowledge', 'music_theory', 'mixing', 'arrangement')),
  assessment_data JSONB NOT NULL DEFAULT '{}',
  skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  confidence_score FLOAT NOT NULL DEFAULT 0,
  areas_for_improvement JSONB DEFAULT '[]',
  recommended_content JSONB DEFAULT '[]',
  assessed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_skill_assessments_user ON skill_assessments (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_category ON skill_assessments (skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_level ON skill_assessments (skill_level);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_assessed ON skill_assessments (assessed_at);