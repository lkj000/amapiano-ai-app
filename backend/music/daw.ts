import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import type { DawProjectData } from "./types";

export interface SaveProjectRequest {
  name: string;
  projectData: DawProjectData;
  projectId?: number; // Optional: for updating existing project
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
      return {
        projectId: result.id,
        name: result.name,
        lastSaved: result.created_at,
        version: result.version,
      };
    }
  }
);

export interface LoadProjectRequest {
  projectId: number;
}

export interface LoadProjectResponse {
  projectId: number;
  name: string;
  projectData: DawProjectData;
  lastSaved: Date;
  version: number;
}

// Loads a DAW project.
export const loadProject = api<LoadProjectRequest, LoadProjectResponse>(
  { expose: true, method: "GET", path: "/daw/projects/:projectId" },
  async ({ projectId }) => {
    const result = await musicDB.queryRow<{ id: number; name: string; project_data: DawProjectData; updated_at: Date; version: number }>`
      SELECT id, name, project_data, updated_at, version FROM daw_projects WHERE id = ${projectId}
    `;

    if (!result) {
      throw APIError.notFound("Project not found.");
    }

    return {
      projectId: result.id,
      name: result.name,
      projectData: result.project_data,
      lastSaved: result.updated_at,
      version: result.version,
    };
  }
);
