-- Educational content table
CREATE TABLE IF NOT EXISTS educational_content (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type ENUM('tutorial', 'lesson', 'tip', 'cultural_insight', 'technique') NOT NULL DEFAULT 'tutorial',
  difficulty ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL DEFAULT 'beginner',
  category ENUM('production', 'cultural_history', 'music_theory', 'mixing', 'arrangement') NOT NULL,
  content TEXT NOT NULL,
  audio_examples JSON,
  video_url VARCHAR(500),
  tags JSON NOT NULL DEFAULT '[]',
  estimated_time_minutes INTEGER NOT NULL DEFAULT 10,
  prerequisites JSON DEFAULT '[]',
  learning_objectives JSON NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_educational_content_type (type),
  INDEX idx_educational_content_difficulty (difficulty),
  INDEX idx_educational_content_category (category),
  INDEX idx_educational_content_created (created_at)
);

-- Cultural insights table
CREATE TABLE IF NOT EXISTS cultural_insights (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  cultural_context TEXT NOT NULL,
  musical_elements JSON NOT NULL DEFAULT '[]',
  historical_background TEXT NOT NULL,
  modern_relevance TEXT NOT NULL,
  audio_examples JSON DEFAULT '[]',
  related_genres JSON NOT NULL DEFAULT '[]',
  key_figures JSON NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_cultural_insights_created (created_at)
);

-- Learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  total_lessons INTEGER NOT NULL DEFAULT 0,
  estimated_hours INTEGER NOT NULL DEFAULT 1,
  content_ids JSON NOT NULL DEFAULT '[]',
  prerequisites JSON DEFAULT '[]',
  outcomes JSON NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_learning_paths_difficulty (difficulty),
  INDEX idx_learning_paths_created (created_at)
);

-- Interactive tutorials table
CREATE TABLE IF NOT EXISTS interactive_tutorials (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  steps JSON NOT NULL DEFAULT '[]',
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  category VARCHAR(100) NOT NULL,
  estimated_time INTEGER NOT NULL DEFAULT 10,
  completion_rate FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_interactive_tutorials_difficulty (difficulty),
  INDEX idx_interactive_tutorials_category (category)
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  completed_tutorials JSON DEFAULT '[]',
  completed_lessons JSON DEFAULT '[]',
  current_learning_paths JSON DEFAULT '[]',
  skill_levels JSON DEFAULT '{}',
  total_time_spent INTEGER DEFAULT 0,
  achievements JSON DEFAULT '[]',
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY uk_user_progress (user_id),
  INDEX idx_user_progress_user (user_id),
  INDEX idx_user_progress_activity (last_activity)
);

-- Tutorial completion tracking
CREATE TABLE IF NOT EXISTS tutorial_completions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tutorial_id INTEGER NOT NULL,
  tutorial_type ENUM('educational_content', 'interactive_tutorial', 'cultural_insight') NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  time_spent INTEGER DEFAULT 0,
  score FLOAT DEFAULT NULL,
  feedback TEXT,
  UNIQUE KEY uk_user_tutorial_completion (user_id, tutorial_id, tutorial_type),
  INDEX idx_tutorial_completions_user (user_id),
  INDEX idx_tutorial_completions_tutorial (tutorial_id, tutorial_type),
  INDEX idx_tutorial_completions_completed (completed_at)
);

-- Learning analytics
CREATE TABLE IF NOT EXISTS learning_analytics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type ENUM('tutorial_start', 'tutorial_complete', 'lesson_start', 'lesson_complete', 'quiz_attempt', 'skill_assessment') NOT NULL,
  content_id INTEGER,
  content_type VARCHAR(100),
  event_data JSON DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_learning_analytics_user (user_id),
  INDEX idx_learning_analytics_event (event_type),
  INDEX idx_learning_analytics_time (timestamp)
);

-- Quiz and assessment system
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_id INTEGER,
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  questions JSON NOT NULL DEFAULT '[]',
  passing_score FLOAT DEFAULT 70.0,
  time_limit_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_quizzes_content (content_id),
  INDEX idx_quizzes_difficulty (difficulty)
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  quiz_id INTEGER NOT NULL,
  answers JSON NOT NULL DEFAULT '{}',
  score FLOAT NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_quiz_attempts_user (user_id),
  INDEX idx_quiz_attempts_quiz (quiz_id),
  INDEX idx_quiz_attempts_completed (completed_at)
);

-- Content ratings and feedback
CREATE TABLE IF NOT EXISTS content_feedback (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content_id INTEGER NOT NULL,
  content_type ENUM('educational_content', 'cultural_insight', 'learning_path', 'interactive_tutorial') NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY uk_user_content_feedback (user_id, content_id, content_type),
  INDEX idx_content_feedback_content (content_id, content_type),
  INDEX idx_content_feedback_rating (rating),
  INDEX idx_content_feedback_created (created_at)
);

-- Skill assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  skill_category ENUM('production', 'cultural_knowledge', 'music_theory', 'mixing', 'arrangement') NOT NULL,
  assessment_data JSON NOT NULL DEFAULT '{}',
  skill_level ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL,
  confidence_score FLOAT NOT NULL DEFAULT 0,
  areas_for_improvement JSON DEFAULT '[]',
  recommended_content JSON DEFAULT '[]',
  assessed_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_skill_assessments_user (user_id),
  INDEX idx_skill_assessments_category (skill_category),
  INDEX idx_skill_assessments_level (skill_level),
  INDEX idx_skill_assessments_assessed (assessed_at)
);