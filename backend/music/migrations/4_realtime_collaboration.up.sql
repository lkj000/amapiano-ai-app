-- Real-time collaboration events table
CREATE TABLE IF NOT EXISTS collaboration_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_collaboration_events_session (session_id),
  INDEX idx_collaboration_events_user (user_id),
  INDEX idx_collaboration_events_type (event_type),
  INDEX idx_collaboration_events_time (created_at)
);

-- Chat messages for collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_chat (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reply_to VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_collaboration_chat_session (session_id),
  INDEX idx_collaboration_chat_user (user_id),
  INDEX idx_collaboration_chat_time (created_at)
);

-- Project versions for version control and synchronization
CREATE TABLE IF NOT EXISTS project_versions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  state_snapshot JSONB NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY uk_project_version (project_id, version),
  INDEX idx_project_versions_project (project_id),
  INDEX idx_project_versions_version (version),
  INDEX idx_project_versions_time (created_at)
);

-- Projects table updates (add current_state and version columns if they don't exist)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS current_state JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;

-- Collaboration sessions metadata
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  project_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  max_collaborators INTEGER DEFAULT 10,
  INDEX idx_collaboration_sessions_project (project_id),
  INDEX idx_collaboration_sessions_active (is_active),
  INDEX idx_collaboration_sessions_activity (last_activity)
);

-- User presence in collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_presence (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  cursor_x FLOAT DEFAULT 0,
  cursor_y FLOAT DEFAULT 0,
  current_tool VARCHAR(50) DEFAULT 'select',
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uk_session_user (session_id, user_id),
  INDEX idx_collaboration_presence_session (session_id),
  INDEX idx_collaboration_presence_user (user_id),
  INDEX idx_collaboration_presence_active (is_active)
);

-- Project sharing permissions
CREATE TABLE IF NOT EXISTS project_permissions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_level ENUM('read', 'write', 'admin') NOT NULL DEFAULT 'read',
  granted_by VARCHAR(255) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY uk_project_user_permission (project_id, user_id),
  INDEX idx_project_permissions_project (project_id),
  INDEX idx_project_permissions_user (user_id),
  INDEX idx_project_permissions_level (permission_level)
);

-- Real-time sync cursors for conflict resolution
CREATE TABLE IF NOT EXISTS sync_cursors (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  operation_id VARCHAR(255) NOT NULL,
  sequence_number BIGINT NOT NULL,
  vector_clock JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY uk_project_user_operation (project_id, user_id, operation_id),
  INDEX idx_sync_cursors_project (project_id),
  INDEX idx_sync_cursors_sequence (sequence_number)
);