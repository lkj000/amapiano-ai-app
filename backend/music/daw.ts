import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import type { DawProject, DawProjectData, DawTrack, MidiNote } from "./types";
import { dawCache, generateDawProjectCacheKey } from "./cache";
import { errorHandler } from "./error-handler";
import log from "encore.dev/log";
import { AIService } from "./ai-service";

const aiService = new AIService();

export interface ListProjectsResponse {
  projects: {
    id: number;
    name: string;
    updatedAt: Date;
  }[];
}

// Lists all saved DAW projects.
export const listProjects = api<void, ListProjectsResponse>(
  { expose: true, method: "GET", path: "/daw/projects" },
  async () => {
    try {
      const projectsData = await musicDB.queryAll<{ id: number; name: string; updated_at: Date }>`
        SELECT id, name, updated_at FROM daw_projects ORDER BY updated_at DESC
      `;
      
      const projects = projectsData.map(p => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updated_at
      }));
      
      return { projects };
    } catch (error) {
      const apiError = errorHandler.handleError(error, { operation: 'listProjects' });
      throw apiError;
    }
  }
);

export interface LoadProjectRequest {
  projectId: number;
}

// Loads a DAW project.
export const loadProject = api<LoadProjectRequest, DawProject>(
  { expose: true, method: "GET", path: "/daw/projects/:projectId" },
  async ({ projectId }) => {
    try {
      const cacheKey = generateDawProjectCacheKey(projectId);
      const cachedProject = await dawCache.get(cacheKey);
      if (cachedProject) {
        log.info("Returning cached DAW project", { projectId, cacheKey });
        return cachedProject;
      }

      const result = await musicDB.queryRow<{
        id: number;
        name: string;
        project_data: any;
        version: number;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT id, name, project_data, version, created_at, updated_at FROM daw_projects WHERE id = ${projectId}
      `;

      if (!result) {
        throw APIError.notFound("Project not found.");
      }

      const projectDataRaw = typeof result.project_data === 'string' ? JSON.parse(result.project_data) : result.project_data;

      // Validate and provide defaults for project data to prevent crashes from old/malformed data
      const validatedProjectData: DawProjectData = {
        bpm: projectDataRaw.bpm || 120,
        keySignature: projectDataRaw.keySignature || 'F#m',
        masterVolume: projectDataRaw.masterVolume ?? 0.8,
        tracks: (projectDataRaw.tracks || []).map((track: any) => ({
          id: track.id || `track_${Date.now()}`,
          type: track.type || 'midi',
          name: track.name || 'Untitled Track',
          instrument: track.instrument,
          clips: (track.clips || []).map((clip: any) => ({
            id: clip.id || `clip_${Date.now()}`,
            name: clip.name || 'Untitled Clip',
            startTime: clip.startTime ?? 0,
            duration: clip.duration ?? 4,
            notes: clip.notes || [],
            audioUrl: clip.audioUrl,
            waveform: clip.waveform,
            isReversed: clip.isReversed ?? false,
          })),
          mixer: {
            volume: track.mixer?.volume ?? 0.8,
            pan: track.mixer?.pan ?? 0,
            isMuted: track.mixer?.isMuted ?? false,
            isSolo: track.mixer?.isSolo ?? false,
            effects: track.mixer?.effects || [],
          },
          isArmed: track.isArmed ?? false,
          color: track.color || 'bg-gray-500',
          automation: track.automation || [],
        })),
      };

      const project: DawProject = {
        id: result.id,
        name: result.name,
        projectData: validatedProjectData,
        version: result.version,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };

      await dawCache.set(cacheKey, project);
      log.info("DAW project loaded and cached", { projectId, cacheKey });

      return project;
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'loadProject',
        metadata: { projectId }
      });
      throw apiError;
    }
  }
);

export interface SaveProjectRequest {
  name: string;
  projectData: DawProjectData;
  projectId?: number;
}

export interface SaveProjectResponse {
  projectId: number;
  name: string;
  lastSaved: Date;
  version: number;
}

// Saves or updates a DAW project.
export const saveProject = api<SaveProjectRequest, SaveProjectResponse>(
  { expose: true, method: "POST", path: "/daw/projects" },
  async (req) => {
    try {
      if (!req.name || req.name.trim().length === 0) {
        throw APIError.invalidArgument("Project name is required.");
      }

      if (!req.projectData) {
        throw APIError.invalidArgument("Project data is required.");
      }

      if (req.projectId) {
        // Update existing project
        const result = await musicDB.queryRow<{ id: number; name: string; updated_at: Date; version: number }>`
          UPDATE daw_projects
          SET name = ${req.name}, project_data = ${JSON.stringify(req.projectData)}, updated_at = NOW(), version = version + 1
          WHERE id = ${req.projectId}
          RETURNING id, name, updated_at, version
        `;
        if (!result) {
          throw APIError.notFound("Project not found or you don't have permission to update it.");
        }

        // Invalidate cache
        await dawCache.delete(generateDawProjectCacheKey(req.projectId));
        log.info("DAW project updated and cache invalidated", { projectId: req.projectId });

        return {
          projectId: result.id,
          name: result.name,
          lastSaved: result.updated_at,
          version: result.version,
        };
      } else {
        // Create new project
        const result = await musicDB.queryRow<{ id: number; name: string; created_at: Date; version: number }>`
          INSERT INTO daw_projects (name, project_data)
          VALUES (${req.name}, ${JSON.stringify(req.projectData)})
          RETURNING id, name, created_at, version
        `;
        if (!result) {
          throw APIError.internal("Failed to save new project.");
        }
        log.info("New DAW project created", { projectId: result.id, name: result.name });
        return {
          projectId: result.id,
          name: result.name,
          lastSaved: result.created_at,
          version: result.version,
        };
      }
    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'saveProject',
        metadata: { projectId: req.projectId, name: req.name }
      });
      throw apiError;
    }
  }
);

export interface GenerateDawElementRequest {
  projectId?: number;
  prompt: string;
  trackType: 'midi' | 'audio';
  instrument?: string;
}

export interface GenerateDawElementResponse {
  newTrack: DawTrack;
}

// Generates a new track or clip for the DAW using AI.
export const generateDawElement = api<GenerateDawElementRequest, GenerateDawElementResponse>(
  { expose: true, method: "POST", path: "/daw/ai-generate" },
  async (req) => {
    try {
      if (!req.prompt) {
        throw APIError.invalidArgument("A prompt is required to generate a DAW element.");
      }

      const { notes, duration } = await aiService.generateMidiPattern(req.prompt);

      const lowerPrompt = req.prompt.toLowerCase();
      let name = "AI Generated Track";
      let instrument = "Amapiano Piano";
      let color = "bg-purple-500";
      let type: 'midi' | 'audio' = 'midi';

      if (lowerPrompt.includes("log drum")) {
        name = "AI Log Drum";
        instrument = "Signature Log Drum";
        color = "bg-red-500";
      } else if (lowerPrompt.includes("piano") || lowerPrompt.includes("chords")) {
        name = "AI Piano Chords";
        instrument = "Amapiano Piano";
        color = "bg-blue-500";
      } else if (lowerPrompt.includes("percussion") || lowerPrompt.includes("shaker")) {
        name = "AI Percussion";
        instrument = "Shaker Groove Engine";
        color = "bg-green-500";
      } else if (lowerPrompt.includes("sax")) {
        name = "AI Saxophone";
        instrument = "Saxophone VST";
        color = "bg-yellow-500";
      }

      const newTrack: DawTrack = {
        id: `track_${Date.now()}`,
        type,
        name,
        instrument,
        clips: [{
          id: `clip_${Date.now()}`,
          name: "Generated Clip",
          startTime: 0,
          duration: duration,
          notes: notes,
          audioUrl: undefined,
        }],
        mixer: {
          volume: 0.8,
          pan: 0,
          isMuted: false,
          isSolo: false,
          effects: [],
        },
        isArmed: false,
        color,
        automation: [],
      };

      return { newTrack };

    } catch (error) {
      const apiError = errorHandler.handleError(error, {
        operation: 'generateDawElement',
        metadata: { prompt: req.prompt }
      });
      throw apiError;
    }
  }
);
