import { useState, useCallback, useRef, useEffect } from 'react';
import backend from '~backend/client';
import { toast } from 'sonner';

// Generate a unique ID for this client session
const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const userName = `User_${Math.random().toString(36).substr(2, 6)}`;

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'change' | 'cursor' | 'chat' | 'sync_request' | 'sync_response' | 'error';
  sessionId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  data?: any;
}

export interface DawChangeEvent extends CollaborationEvent {
  type: 'change';
  data: {
    type: string;
    trackId?: number;
    data: any;
    timestamp: number;
  };
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

export interface ChatMessage {
  id: string;
  message: string;
  userName: string;
  timestamp: Date;
  replyTo?: string;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  joinedAt: Date;
  isActive: boolean;
  cursor: {
    x: number;
    y: number;
    tool: string;
  };
  role: 'owner' | 'collaborator' | 'viewer';
}

export const useRealtimeCollaboration = (
  projectId: number | undefined,
  onReceiveChange?: (change: any) => void,
  onReceiveCursor?: (cursor: CursorEvent) => void,
  onReceiveChat?: (message: ChatMessage) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const streamRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(async () => {
    if (!projectId || streamRef.current) return;

    try {
      setConnectionError(null);
      
      const session = await backend.music.liveCollaboration({ projectId });
      streamRef.current = session;
      sessionIdRef.current = (session as any)?.sessionId || `project_${projectId}_${Date.now()}`;
      
      setIsConnected(true);
      setReconnectAttempts(0);
      toast.success("Connected to live collaboration!");

      // Note: Real streaming implementation would go here
      // For now, we have a basic session setup

      // Listen for incoming events
      (async () => {
        if (!streamRef.current) return;
        
        try {
          for await (const event of streamRef.current) {
            await handleIncomingEvent(event);
          }
        } catch (err) {
          console.error("Collaboration stream error:", err);
          handleConnectionError(err);
        }
      })();

    } catch (err) {
      console.error("Failed to connect to collaboration session:", err);
      handleConnectionError(err);
    }
  }, [projectId]);

  const handleIncomingEvent = useCallback(async (event: CollaborationEvent) => {
    // Don't process our own events
    if (event.userId === clientId) return;

    switch (event.type) {
      case 'join':
        setCollaborators(prev => {
          const exists = prev.find(c => c.id === event.userId);
          if (exists) return prev;
          
          const newCollaborator: CollaboratorInfo = {
            id: event.userId,
            name: event.userName,
            joinedAt: event.timestamp,
            isActive: true,
            cursor: { x: 0, y: 0, tool: 'select' },
            role: 'collaborator'
          };
          
          toast.info(`${event.userName} joined the session`);
          return [...prev, newCollaborator];
        });
        break;

      case 'leave':
        setCollaborators(prev => {
          const updated = prev.filter(c => c.id !== event.userId);
          toast.info(`${event.userName} left the session`);
          return updated;
        });
        break;

      case 'change':
        if (onReceiveChange) {
          onReceiveChange((event as DawChangeEvent).data);
        }
        break;

      case 'cursor':
        const cursorEvent = event as CursorEvent;
        if (onReceiveCursor) {
          onReceiveCursor(cursorEvent);
        }
        
        setCollaborators(prev => prev.map(c => 
          c.id === event.userId 
            ? { ...c, cursor: cursorEvent.data }
            : c
        ));
        break;

      case 'chat':
        const chatMessage: ChatMessage = {
          id: `${event.userId}_${event.timestamp.getTime()}`,
          message: event.data.message,
          userName: event.userName,
          timestamp: event.timestamp,
          replyTo: event.data.replyTo
        };
        
        setChatMessages(prev => [...prev, chatMessage]);
        if (onReceiveChat) {
          onReceiveChat(chatMessage);
        }
        break;

      case 'sync_response':
        // Handle full state sync
        if (event.data.currentState && onReceiveChange) {
          onReceiveChange({
            type: 'full_sync',
            data: event.data.currentState
          });
        }
        
        if (event.data.collaborators) {
          setCollaborators(event.data.collaborators);
        }
        break;

      case 'error':
        console.error("Collaboration error:", event.data);
        toast.error(event.data.error || "Collaboration error occurred");
        break;
    }
  }, [onReceiveChange, onReceiveCursor, onReceiveChat]);

  const handleConnectionError = useCallback((error: any) => {
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    setConnectionError(errorMessage);
    setIsConnected(false);
    streamRef.current = null;
    
    // Attempt to reconnect with exponential backoff
    if (reconnectAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        toast.info("Attempting to reconnect...");
        connect();
      }, delay);
    } else {
      toast.error("Failed to reconnect to collaboration session");
    }
  }, [reconnectAttempts, connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (streamRef.current && sessionIdRef.current) {
      // Send leave event before closing
      streamRef.current.send({
        type: 'leave',
        sessionId: sessionIdRef.current,
        userId: clientId,
        userName: userName,
        timestamp: new Date(),
        data: { reason: 'manual_disconnect' }
      }).catch(() => {}); // Ignore errors when disconnecting

      streamRef.current.close();
      streamRef.current = null;
      sessionIdRef.current = null;
    }

    setIsConnected(false);
    setCollaborators([]);
    setConnectionError(null);
    setReconnectAttempts(0);
    
    toast.info("Disconnected from collaboration session");
  }, []);

  const sendChange = useCallback(async (change: any) => {
    if (!streamRef.current || !sessionIdRef.current || !isConnected) return;

    try {
      await streamRef.current.send({
        type: 'change',
        sessionId: sessionIdRef.current,
        userId: clientId,
        userName: userName,
        timestamp: new Date(),
        data: change
      });
    } catch (err) {
      console.error("Failed to send change:", err);
      handleConnectionError(err);
    }
  }, [isConnected, handleConnectionError]);

  const sendCursor = useCallback(async (cursor: { x: number; y: number; tool: string; track?: number; time?: number }) => {
    if (!streamRef.current || !sessionIdRef.current || !isConnected) return;

    try {
      await streamRef.current.send({
        type: 'cursor',
        sessionId: sessionIdRef.current,
        userId: clientId,
        userName: userName,
        timestamp: new Date(),
        data: cursor
      });
    } catch (err) {
      console.error("Failed to send cursor update:", err);
    }
  }, [isConnected]);

  const sendChatMessage = useCallback(async (message: string, replyTo?: string) => {
    if (!streamRef.current || !sessionIdRef.current || !isConnected) return;

    try {
      await streamRef.current.send({
        type: 'chat',
        sessionId: sessionIdRef.current,
        userId: clientId,
        userName: userName,
        timestamp: new Date(),
        data: { message, replyTo }
      });

      // Add to local chat immediately for better UX
      const chatMessage: ChatMessage = {
        id: `${clientId}_${Date.now()}`,
        message,
        userName: userName,
        timestamp: new Date(),
        replyTo
      };
      
      setChatMessages(prev => [...prev, chatMessage]);
    } catch (err) {
      console.error("Failed to send chat message:", err);
      toast.error("Failed to send message");
    }
  }, [isConnected]);

  const requestSync = useCallback(async (requestedState: 'full' | 'partial' = 'full', lastKnownVersion = 0) => {
    if (!streamRef.current || !sessionIdRef.current || !isConnected) return;

    try {
      await streamRef.current.send({
        type: 'sync_request',
        sessionId: sessionIdRef.current,
        userId: clientId,
        userName: userName,
        timestamp: new Date(),
        data: { requestedState, lastKnownVersion }
      });
    } catch (err) {
      console.error("Failed to request sync:", err);
    }
  }, [isConnected]);

  // Auto-connect when projectId changes
  useEffect(() => {
    if (projectId) {
      connect();
    } else {
      disconnect();
    }
  }, [projectId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-reconnect on connection loss
  useEffect(() => {
    if (!isConnected && projectId && reconnectAttempts > 0 && reconnectAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isConnected, projectId, reconnectAttempts, connect]);

  return {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempts,
    
    // Collaboration data
    collaborators,
    chatMessages,
    
    // Actions
    connect,
    disconnect,
    sendChange,
    sendCursor,
    sendChatMessage,
    requestSync,
    
    // Utility
    clientId,
    userName,
    sessionId: sessionIdRef.current
  };
};