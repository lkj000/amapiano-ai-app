-- Real-time collaboration events table
CREATE TABLE IF NOT EXISTS collaboration_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_collaboration_events_session ON collaboration_events (session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_user ON collaboration_events (user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_type ON collaboration_events (event_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_time ON collaboration_events (created_at);

-- Chat messages for collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_chat (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reply_to VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_collaboration_chat_session ON collaboration_chat (session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_chat_user ON collaboration_chat (user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_chat_time ON collaboration_chat (created_at);

-- Project versions for version control and synchronization
CREATE TABLE IF NOT EXISTS project_versions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  state_snapshot JSONB NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (project_id, version)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_project_versions_project ON project_versions (project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_version ON project_versions (version);
CREATE INDEX IF NOT EXISTS idx_project_versions_time ON project_versions (created_at);

-- Projects table updates (add current_state and version columns if they don't exist)
ALTER TABLE daw_projects 
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
  max_collaborators INTEGER DEFAULT 10
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project ON collaboration_sessions (project_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions (is_active);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_activity ON collaboration_sessions (last_activity);

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
  UNIQUE (session_id, user_id)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_session ON collaboration_presence (session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_user ON collaboration_presence (user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_active ON collaboration_presence (is_active);

-- Project sharing permissions
CREATE TABLE IF NOT EXISTS project_permissions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'write', 'admin')),
  granted_by VARCHAR(255) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (project_id, user_id)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_project_permissions_project ON project_permissions (project_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_user ON project_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_level ON project_permissions (permission_level);

-- Real-time sync cursors for conflict resolution
CREATE TABLE IF NOT EXISTS sync_cursors (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  operation_id VARCHAR(255) NOT NULL,
  sequence_number BIGINT NOT NULL,
  vector_clock JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (project_id, user_id, operation_id)
);

-- Create indexes separately for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_sync_cursors_project ON sync_cursors (project_id);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_sequence ON sync_cursors (sequence_number);