import { api } from "encore.dev/api";
import { musicDB } from "./db";
import log from "encore.dev/log";

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  version: string;
  checks: {
    database: {
      status: "ok" | "error";
      latency?: number;
      error?: string;
    };
    storage: {
      status: "ok" | "error";
      error?: string;
    };
  };
}

export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async (): Promise<HealthResponse> => {
    const timestamp = new Date();
    const checks: HealthResponse['checks'] = {
      database: { status: "ok" },
      storage: { status: "ok" }
    };

    // Check database connectivity
    try {
      const start = Date.now();
      await musicDB.queryRow`SELECT 1 as check`;
      const latency = Date.now() - start;
      checks.database = { status: "ok", latency };
    } catch (error) {
      log.error("Database health check failed", { error: (error as Error).message });
      checks.database = { 
        status: "error", 
        error: (error as Error).message 
      };
    }

    // Determine overall status
    const hasErrors = Object.values(checks).some(check => check.status === "error");
    const status = hasErrors ? "unhealthy" : "healthy";

    return {
      status,
      timestamp,
      version: "1.0.0",
      checks
    };
  }
);

export const readiness = api<void, { ready: boolean }>(
  { expose: true, method: "GET", path: "/ready" },
  async (): Promise<{ ready: boolean }> => {
    try {
      // Check if database is ready
      await musicDB.queryRow`SELECT 1 as check`;
      return { ready: true };
    } catch (error) {
      log.error("Readiness check failed", { error: (error as Error).message });
      return { ready: false };
    }
  }
);
