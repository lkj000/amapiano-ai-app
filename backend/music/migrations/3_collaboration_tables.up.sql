-- Collaboration system tables
CREATE TABLE collaborations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('track', 'sample_pack', 'remix_challenge')),
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  max_collaborators INTEGER DEFAULT 10,
  invite_code TEXT UNIQUE NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collaboration_members (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES collaborations(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('owner', 'admin', 'contributor', 'viewer')),
  permissions TEXT[] DEFAULT ARRAY['view', 'comment'],
  joined_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(collaboration_id, user_name)
);

CREATE TABLE collaboration_content (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES collaborations(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('track', 'sample', 'pattern', 'idea')),
  content_id BIGINT,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  metadata JSONB,
  user_name TEXT,
  shared_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collaboration_feed (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES collaborations(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('content_shared', 'comment_added', 'collaboration_joined', 'remix_created')),
  content_id BIGINT,
  user_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collaboration_comments (
  id BIGSERIAL PRIMARY KEY,
  feed_item_id BIGINT REFERENCES collaboration_feed(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  timestamp INTEGER, -- For audio comments (seconds)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collaboration_likes (
  id BIGSERIAL PRIMARY KEY,
  feed_item_id BIGINT REFERENCES collaboration_feed(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(feed_item_id, user_name)
);

-- Remix challenges
CREATE TABLE remix_challenges (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  source_track_id BIGINT REFERENCES generated_tracks(id),
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  prizes TEXT[],
  rules TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE remix_submissions (
  id BIGSERIAL PRIMARY KEY,
  challenge_id BIGINT REFERENCES remix_challenges(id) ON DELETE CASCADE,
  track_id BIGINT REFERENCES generated_tracks(id),
  user_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  votes INTEGER DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Social features
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB,
  preferences JSONB,
  stats JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_follows (
  id BIGSERIAL PRIMARY KEY,
  follower_name TEXT NOT NULL,
  following_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_name, following_name)
);

CREATE TABLE user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_data JSONB,
  earned_at TIMESTAMP DEFAULT NOW()
);

-- Cultural validation
CREATE TABLE cultural_validations (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('track', 'sample', 'pattern')),
  content_id BIGINT NOT NULL,
  validator_name TEXT,
  authenticity_score DOUBLE PRECISION NOT NULL,
  cultural_elements JSONB,
  recommendations JSONB,
  expert_notes TEXT,
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cultural_experts (
  id BIGSERIAL PRIMARY KEY,
  expert_name TEXT UNIQUE NOT NULL,
  credentials TEXT,
  specialization TEXT[],
  bio TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance and analytics
CREATE TABLE performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE error_logs (
  id BIGSERIAL PRIMARY KEY,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_name TEXT,
  request_id TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_collaborations_invite_code ON collaborations(invite_code);
CREATE INDEX idx_collaborations_public ON collaborations(is_public, is_active);
CREATE INDEX idx_collaboration_members_collab ON collaboration_members(collaboration_id);
CREATE INDEX idx_collaboration_members_user ON collaboration_members(user_name);
CREATE INDEX idx_collaboration_content_collab ON collaboration_content(collaboration_id);
CREATE INDEX idx_collaboration_feed_collab ON collaboration_feed(collaboration_id);
CREATE INDEX idx_collaboration_feed_created ON collaboration_feed(created_at DESC);
CREATE INDEX idx_collaboration_comments_feed ON collaboration_comments(feed_item_id);
CREATE INDEX idx_collaboration_likes_feed ON collaboration_likes(feed_item_id);
CREATE INDEX idx_remix_challenges_active ON remix_challenges(is_active, end_date);
CREATE INDEX idx_remix_submissions_challenge ON remix_submissions(challenge_id);
CREATE INDEX idx_user_profiles_name ON user_profiles(user_name);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_name);
CREATE INDEX idx_user_follows_following ON user_follows(following_name);
CREATE INDEX idx_cultural_validations_content ON cultural_validations(content_type, content_id);
CREATE INDEX idx_cultural_validations_status ON cultural_validations(validation_status);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type, metric_name);
CREATE INDEX idx_performance_metrics_time ON performance_metrics(recorded_at);
CREATE INDEX idx_error_logs_code ON error_logs(error_code);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_time ON error_logs(created_at);
