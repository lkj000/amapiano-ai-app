import { api, APIError, StreamInOut } from "encore.dev/api";
import { Topic, Subscription } from "encore.dev/pubsub";
import { musicDB } from "./db";
import log from "encore.dev/log";
import type { DawChange, ProjectState, CollaboratorInfo } from "./types";

// Real-time collaboration events
export interface CollaborationEvent {
  type: 'join' | 'leave' | 'change' | 'cursor' | 'chat' | 'sync_request';
  sessionId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  data?: any;
}

export interface DawChangeEvent extends CollaborationEvent {
  type: 'change';
  data: DawChange;
}

export interface CursorEvent extends CollaborationEvent {
  type: 'cursor';
  data: {
    x: number;
    y: number;
    tool: string;
    track?: number;
    time?: number;
  };
}

export interface ChatEvent extends CollaborationEvent {
  type: 'chat';
  data: {
    message: string;
    timestamp: number;
    replyTo?: string;
  };
}

export interface SyncRequestEvent extends CollaborationEvent {
  type: 'sync_request';
  data: {
    requestedState: 'full' | 'partial';
    lastKnownVersion: number;
  };
}

// Pub/Sub topics for real-time events
export const collaborationEventTopic = new Topic<CollaborationEvent>("collaboration-events", {
  deliveryGuarantee: "at-least-once",
});

export const dawChangeTopic = new Topic<DawChangeEvent>("daw-changes", {
  deliveryGuarantee: "at-least-once",
});

// Active collaboration sessions
const activeSessions = new Map<string, {
  projectId: number;
  streams: Set<StreamInOut<CollaborationEvent, CollaborationEvent>>;
  collaborators: Map<string, CollaboratorInfo>;
  lastActivity: Date;
  currentState: ProjectState;
  version: number;
}>();

// Session cleanup interval
setInterval(() => {
  const now = new Date();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [sessionId, session] of activeSessions) {
    if (now.getTime() - session.lastActivity.getTime() > timeout) {
      log.info("Cleaning up inactive session", { sessionId });
      
      // Notify remaining collaborators
      session.streams.forEach(stream => {
        stream.send({
          type: 'leave',
          sessionId,
          userId: 'system',
          userName: 'System',
          timestamp: now,
          data: { reason: 'timeout' }
        });
      });
      
      activeSessions.delete(sessionId);
    }
  }
}, 60000); // Check every minute

// Subscribe to collaboration events for persistence
new Subscription(collaborationEventTopic, "persist-collaboration-events", {
  handler: async (event: CollaborationEvent) => {
    try {
      // Store important events in database for replay/history
      if (event.type === 'change' || event.type === 'chat') {
        await musicDB.exec`
          INSERT INTO collaboration_events (
            session_id,
            user_id,
            user_name,
            event_type,
            event_data,
            created_at
          ) VALUES (
            ${event.sessionId},
            ${event.userId},
            ${event.userName},
            ${event.type},
            ${JSON.stringify(event.data)},
            ${event.timestamp}
          )
        `;
      }
      
      log.info("Collaboration event persisted", { 
        type: event.type, 
        sessionId: event.sessionId 
      });
      
    } catch (error) {
      log.error("Failed to persist collaboration event", { 
        error: (error as Error).message,
        event 
      });
    }
  }
});

// Live collaboration stream endpoint - TODO: Fix streaming implementation
export const liveCollaboration = api(
  { 
    expose: true, 
    method: "POST", 
    path: "/collaboration/:projectId/live" 
  },
  async ({ projectId }: { projectId: number }) => {
    try {
      // Verify project exists and user has access
      const project = await musicDB.queryRow<{
        id: number;
        name: string;
        current_state: any;
        version: number;
      }>`
        SELECT id, name, current_state, version 
        FROM projects 
        WHERE id = ${projectId}
      `;

      if (!project) {
        throw APIError.notFound("Project not found");
      }

      // Return session info for now - streaming will be implemented later
      return {
        sessionId: `project_${projectId}_${Date.now()}`,
        projectId,
        projectName: project.name,
        version: project.version || 0,
        currentState: project.current_state || {},
        message: "Live collaboration endpoint - streaming implementation pending"
      };

    } catch (error) {
      log.error("Collaboration connection error", { 
        error: (error as Error).message,
        projectId 
      });
      
      throw APIError.internal("Failed to connect to collaboration session");
    }
  }
);

async function handleJoinEvent(
  event: CollaborationEvent, 
  session: any, 
  stream: StreamInOut<CollaborationEvent, CollaborationEvent>
) {
  log.info("User joined collaboration", { 
    userId: event.userId, 
    userName: event.userName,
    sessionId: event.sessionId 
  });

  // Send current state to new collaborator
  stream.send({
    type: 'sync_response' as any,
    sessionId: event.sessionId,
    userId: 'system',
    userName: 'System',
    timestamp: new Date(),
    data: {
      currentState: session.currentState,
      version: session.version,
      collaborators: Array.from(session.collaborators.values())
    }
  });

  // Update session version
  session.version++;
}

async function handleDawChange(event: DawChangeEvent, session: any) {
  log.info("Processing DAW change", { 
    changeType: event.data.type,
    sessionId: event.sessionId,
    userId: event.userId 
  });

  // Apply change to session state
  applyDawChangeToState(event.data, session.currentState);
  session.version++;

  // Persist critical changes to database
  if (shouldPersistChange(event.data)) {
    await musicDB.exec`
      UPDATE projects 
      SET 
        current_state = ${JSON.stringify(session.currentState)},
        version = ${session.version},
        updated_at = NOW()
      WHERE id = ${session.projectId}
    `;
  }

  // Publish to topic for processing
  await dawChangeTopic.publish(event);
}

async function handleCursorUpdate(event: CursorEvent, session: any) {
  // Update collaborator cursor position
  const collaborator = session.collaborators.get(event.userId);
  if (collaborator) {
    collaborator.cursor = event.data;
  }
}

async function handleChatMessage(event: ChatEvent, session: any) {
  log.info("Chat message received", { 
    userId: event.userId,
    sessionId: event.sessionId,
    messageLength: event.data.message.length 
  });

  // Store chat message in database
  await musicDB.exec`
    INSERT INTO collaboration_chat (
      session_id,
      user_id,
      user_name,
      message,
      reply_to,
      created_at
    ) VALUES (
      ${event.sessionId},
      ${event.userId},
      ${event.userName},
      ${event.data.message},
      ${event.data.replyTo || null},
      ${event.timestamp}
    )
  `;
}

async function handleSyncRequest(
  event: SyncRequestEvent, 
  session: any, 
  stream: StreamInOut<CollaborationEvent, CollaborationEvent>
) {
  log.info("Sync request received", { 
    userId: event.userId,
    requestedState: event.data.requestedState,
    lastKnownVersion: event.data.lastKnownVersion 
  });

  // Send current state
  stream.send({
    type: 'sync_response' as any,
    sessionId: event.sessionId,
    userId: 'system',
    userName: 'System',
    timestamp: new Date(),
    data: {
      currentState: session.currentState,
      version: session.version,
      collaborators: Array.from(session.collaborators.values()),
      changes: event.data.requestedState === 'partial' 
        ? await getChangesSinceVersion(session.projectId, event.data.lastKnownVersion)
        : []
    }
  });
}

async function handleLeaveEvent(event: CollaborationEvent, session: any) {
  log.info("User left collaboration", { 
    userId: event.userId,
    sessionId: event.sessionId 
  });

  session.collaborators.delete(event.userId);
}

function applyDawChangeToState(change: DawChange, state: ProjectState) {
  // Apply DAW changes to the current project state
  switch (change.type) {
    case 'track_add':
      if (!state.tracks) state.tracks = [];
      state.tracks.push(change.data);
      break;
      
    case 'track_update':
      if (state.tracks && change.trackId !== undefined) {
        const trackIndex = state.tracks.findIndex(t => t.id === change.trackId);
        if (trackIndex !== -1) {
          state.tracks[trackIndex] = { ...state.tracks[trackIndex], ...change.data };
        }
      }
      break;
      
    case 'track_delete':
      if (state.tracks && change.trackId !== undefined) {
        state.tracks = state.tracks.filter(t => t.id !== change.trackId);
      }
      break;
      
    case 'pattern_add':
      if (!state.patterns) state.patterns = [];
      state.patterns.push(change.data);
      break;
      
    case 'automation_add':
      if (!state.automation) state.automation = [];
      state.automation.push(change.data);
      break;
      
    case 'tempo_change':
      state.tempo = change.data.bpm;
      break;
      
    case 'time_signature_change':
      state.timeSignature = change.data;
      break;
  }
}

function shouldPersistChange(change: DawChange): boolean {
  // Determine which changes should be persisted immediately
  const persistentChangeTypes = [
    'track_add', 'track_delete', 'pattern_add', 'pattern_delete',
    'tempo_change', 'time_signature_change', 'project_save'
  ];
  
  return change.type ? persistentChangeTypes.includes(change.type) : false;
}

async function getChangesSinceVersion(projectId: number, version: number): Promise<any[]> {
  // Get changes since a specific version for partial sync
  const sessionPattern = `project_${projectId}_%`;
  const changes = await musicDB.queryAll<{
    event_data: string;
    created_at: Date;
  }>`
    SELECT event_data, created_at
    FROM collaboration_events
    WHERE session_id LIKE ${sessionPattern}
      AND event_type = 'change'
      AND created_at > (
        SELECT created_at 
        FROM project_versions 
        WHERE project_id = ${projectId} AND version = ${version}
      )
    ORDER BY created_at ASC
  `;

  return changes.map(change => ({
    ...JSON.parse(change.event_data),
    timestamp: change.created_at
  }));
}

// Get active collaborators for a project
export const getActiveCollaborators = api(
  { expose: true, method: "GET", path: "/collaboration/:projectId/active" },
  async ({ projectId }: { projectId: number }) => {
    const activeCollaborators: CollaboratorInfo[] = [];
    
    for (const [sessionId, session] of activeSessions) {
      if (session.projectId === projectId) {
        activeCollaborators.push(...Array.from(session.collaborators.values()));
      }
    }
    
    log.info("Retrieved active collaborators", { 
      projectId, 
      count: activeCollaborators.length 
    });
    
    return {
      projectId,
      collaborators: activeCollaborators,
      count: activeCollaborators.length
    };
  }
);

// Project version history for synchronization
export const getProjectVersionHistory = api(
  { expose: true, method: "GET", path: "/collaboration/:projectId/versions" },
  async ({ projectId }: { projectId: number }) => {
    try {
      const versions = await musicDB.queryAll<{
        version: number;
        state_snapshot: string;
        created_at: Date;
        created_by: string;
      }>`
        SELECT version, state_snapshot, created_at, created_by
        FROM project_versions
        WHERE project_id = ${projectId}
        ORDER BY version DESC
        LIMIT 50
      `;

      return {
        projectId,
        versions: versions.map(v => ({
          version: v.version,
          stateSnapshot: JSON.parse(v.state_snapshot),
          createdAt: v.created_at,
          createdBy: v.created_by
        }))
      };

    } catch (error) {
      log.error("Failed to get project version history", { 
        error: (error as Error).message,
        projectId 
      });
      throw APIError.internal("Failed to get version history");
    }
  }
);

// Create a project snapshot/version
export const createProjectSnapshot = api(
  { expose: true, method: "POST", path: "/collaboration/:projectId/snapshot" },
  async ({ 
    projectId, 
    description, 
    createdBy 
  }: { 
    projectId: number; 
    description?: string;
    createdBy: string;
  }) => {
    try {
      // Get current project state
      const project = await musicDB.queryRow<{
        current_state: string;
        version: number;
      }>`
        SELECT current_state, version
        FROM projects
        WHERE id = ${projectId}
      `;

      if (!project) {
        throw APIError.notFound("Project not found");
      }

      const newVersion = project.version + 1;

      // Create version snapshot
      await musicDB.exec`
        INSERT INTO project_versions (
          project_id,
          version,
          state_snapshot,
          description,
          created_by,
          created_at
        ) VALUES (
          ${projectId},
          ${newVersion},
          ${project.current_state},
          ${description || 'Manual snapshot'},
          ${createdBy},
          NOW()
        )
      `;

      // Update project version
      await musicDB.exec`
        UPDATE projects
        SET version = ${newVersion}
        WHERE id = ${projectId}
      `;

      log.info("Project snapshot created", { 
        projectId, 
        version: newVersion,
        createdBy 
      });

      return {
        projectId,
        version: newVersion,
        description: description || 'Manual snapshot',
        createdAt: new Date()
      };

    } catch (error) {
      log.error("Failed to create project snapshot", { 
        error: (error as Error).message,
        projectId 
      });
      throw APIError.internal("Failed to create snapshot");
    }
  }
);

// Get collaboration statistics
export const getCollaborationStats = api(
  { expose: true, method: "GET", path: "/collaboration/:projectId/stats" },
  async ({ projectId }: { projectId: number }) => {
    try {
      // Get session from active sessions
      let activeSession = null;
      for (const [sessionId, session] of activeSessions) {
        if (session.projectId === projectId) {
          activeSession = session;
          break;
        }
      }

      // Get historical stats
      const stats = await musicDB.queryRow<{
        total_events: number;
        total_chat_messages: number;
        unique_collaborators: number;
        last_activity: Date;
      }>`
        SELECT 
          COUNT(DISTINCT CASE WHEN event_type = 'change' THEN id END) as total_events,
          COUNT(DISTINCT CASE WHEN event_type = 'chat' THEN id END) as total_chat_messages,
          COUNT(DISTINCT user_id) as unique_collaborators,
          MAX(created_at) as last_activity
        FROM collaboration_events
        WHERE session_id LIKE ${`project_${projectId}_%`}
      `;

      return {
        projectId,
        activeCollaborators: activeSession ? activeSession.collaborators.size : 0,
        totalEvents: stats?.total_events || 0,
        totalChatMessages: stats?.total_chat_messages || 0,
        uniqueCollaborators: stats?.unique_collaborators || 0,
        lastActivity: stats?.last_activity,
        isActiveSession: !!activeSession,
        currentVersion: activeSession?.version || 0
      };

    } catch (error) {
      log.error("Failed to get collaboration stats", { 
        error: (error as Error).message,
        projectId 
      });
      throw APIError.internal("Failed to get collaboration stats");
    }
  }
);