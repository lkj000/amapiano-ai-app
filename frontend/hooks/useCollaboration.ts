import { useState, useCallback, useRef, useEffect } from 'react';
import backend from '~backend/client';
import type { DawChange, DawChangeAction } from '~backend/music/types';
import { toast } from 'sonner';

// Generate a unique ID for this client session
const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useCollaboration = (
  projectId: number | undefined,
  onReceiveChange: (change: DawChangeAction) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const streamRef = useRef<Awaited<ReturnType<typeof backend.music.collaborationSession>> | null>(null);

  const connect = useCallback(async () => {
    if (!projectId || streamRef.current) return;

    try {
      const stream = await backend.music.collaborationSession({ projectId });
      streamRef.current = stream;
      setIsConnected(true);
      toast.success("Collaboration session started!");

      // Listen for incoming changes
      (async () => {
        if (!streamRef.current) return;
        try {
          for await (const change of streamRef.current) {
            if (change.senderId !== clientId) {
              onReceiveChange(change.action);
            }
          }
        } catch (err) {
          console.error("Collaboration stream error:", err);
          toast.error("Collaboration session disconnected.");
          setIsConnected(false);
          streamRef.current = null;
        }
      })();
    } catch (err) {
      console.error("Failed to connect to collaboration session:", err);
      const errorMessage = (err instanceof Error && err.message) 
        ? `Failed to start collaboration: ${err.message}`
        : "Failed to start collaboration session.";
      toast.error(errorMessage);
    }
  }, [projectId, onReceiveChange]);

  const disconnect = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
      setIsConnected(false);
      toast.info("Collaboration session ended.");
    }
  }, []);

  const sendChange = useCallback(async (action: DawChangeAction) => {
    if (streamRef.current && isConnected) {
      try {
        const change: DawChange = { action, senderId: clientId };
        await streamRef.current.send(change);
      } catch (err) {
        console.error("Failed to send change:", err);
        toast.error("Failed to send change. Reconnecting...");
        disconnect();
        connect();
      }
    }
  }, [isConnected, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, connect, disconnect, sendChange };
};
