import { describe, test, expect, beforeAll } from "vitest";
import { listSamples, getSample, searchSamplesByCulturalContext } from "./samples";

describe("Samples API", () => {
  describe("listSamples", () => {
    test("should return all samples when no filters provided", async () => {
      const response = await listSamples({});
      
      expect(response.samples).toBeDefined();
      expect(response.total).toBeGreaterThan(0);
      expect(response.categories).toBeDefined();
      expect(Array.isArray(response.samples)).toBe(true);
    });

    test("should filter samples by genre", async () => {
      const response = await listSamples({ genre: "amapiano" });
      
      expect(response.samples).toBeDefined();
      response.samples.forEach(sample => {
        expect(sample.genre).toBe("amapiano");
      });
    });

    test("should filter samples by category", async () => {
      const response = await listSamples({ category: "log_drum" });
      
      expect(response.samples).toBeDefined();
      response.samples.forEach(sample => {
        expect(sample.category).toBe("log_drum");
      });
    });

    test("should filter samples by BPM", async () => {
      const response = await listSamples({ bpm: 120 });
      
      expect(response.samples).toBeDefined();
      response.samples.forEach(sample => {
        if (sample.bpm) {
          expect(sample.bpm).toBeGreaterThanOrEqual(115);
          expect(sample.bpm).toBeLessThanOrEqual(125);
        }
      });
    });

    test("should filter samples by key signature", async () => {
      const response = await listSamples({ keySignature: "C" });
      
      expect(response.samples).toBeDefined();
      response.samples.forEach(sample => {
        if (sample.keySignature) {
          expect(sample.keySignature).toBe("C");
        }
      });
    });

    test("should apply pagination with limit", async () => {
      const response = await listSamples({ limit: 5 });
      
      expect(response.samples.length).toBeLessThanOrEqual(5);
    });

    test("should apply pagination with offset", async () => {
      const firstPage = await listSamples({ limit: 5, offset: 0 });
      const secondPage = await listSamples({ limit: 5, offset: 5 });
      
      expect(firstPage.samples[0]?.id).not.toBe(secondPage.samples[0]?.id);
    });

    test("should return category distribution", async () => {
      const response = await listSamples({});
      
      expect(response.categories).toBeDefined();
      expect(typeof response.categories).toBe("object");
      
      const categoryKeys = Object.keys(response.categories);
      expect(categoryKeys.length).toBeGreaterThan(0);
    });

    test("should return samples with all required fields", async () => {
      const response = await listSamples({ limit: 1 });
      
      expect(response.samples.length).toBeGreaterThan(0);
      const sample = response.samples[0];
      
      expect(sample.id).toBeDefined();
      expect(sample.name).toBeDefined();
      expect(sample.category).toBeDefined();
      expect(sample.genre).toBeDefined();
      expect(sample.fileUrl).toBeDefined();
      expect(sample.createdAt).toBeDefined();
    });
  });

  describe("getSample", () => {
    test("should return a specific sample by ID", async () => {
      const allSamples = await listSamples({ limit: 1 });
      const sampleId = allSamples.samples[0].id;
      
      const sample = await getSample({ id: sampleId });
      
      expect(sample).toBeDefined();
      expect(sample.id).toBe(sampleId);
    });

    test("should throw error for non-existent sample", async () => {
      await expect(getSample({ id: 999999 })).rejects.toThrow();
    });

    test("should return sample with public URL", async () => {
      const allSamples = await listSamples({ limit: 1 });
      const sampleId = allSamples.samples[0].id;
      
      const sample = await getSample({ id: sampleId });
      
      expect(sample.fileUrl).toBeDefined();
      if (sample.fileUrl) {
        expect(typeof sample.fileUrl).toBe("string");
      }
    });
  });

  describe("searchSamplesByCulturalContext", () => {
    test("should search samples by cultural query", async () => {
      const response = await searchSamplesByCulturalContext({ 
        query: "traditional log drum" 
      });
      
      expect(response.samples).toBeDefined();
      expect(Array.isArray(response.samples)).toBe(true);
    });

    test("should return relevant samples for amapiano query", async () => {
      const response = await searchSamplesByCulturalContext({ 
        query: "amapiano" 
      });
      
      expect(response.samples).toBeDefined();
      expect(response.samples.length).toBeGreaterThan(0);
    });

    test("should return empty array for irrelevant query", async () => {
      const response = await searchSamplesByCulturalContext({ 
        query: "xyznonexistent" 
      });
      
      expect(response.samples).toBeDefined();
      expect(Array.isArray(response.samples)).toBe(true);
    });
  });

  describe("Data Integrity", () => {
    test("should have log drum samples", async () => {
      const response = await listSamples({ category: "log_drum" });
      
      expect(response.samples.length).toBeGreaterThan(0);
    });

    test("should have piano samples", async () => {
      const response = await listSamples({ category: "piano" });
      
      expect(response.samples.length).toBeGreaterThan(0);
    });

    test("should have percussion samples", async () => {
      const response = await listSamples({ category: "percussion" });
      
      expect(response.samples.length).toBeGreaterThan(0);
    });

    test("should have bass samples", async () => {
      const response = await listSamples({ category: "bass" });
      
      expect(response.samples.length).toBeGreaterThan(0);
    });

    test("all samples should have valid genres", async () => {
      const response = await listSamples({});
      
      const validGenres = ["amapiano", "private_school_amapiano", "bacardi", "sgija"];
      
      response.samples.forEach(sample => {
        expect(validGenres).toContain(sample.genre);
      });
    });

    test("all samples should have valid categories", async () => {
      const response = await listSamples({});
      
      const validCategories = [
        "log_drum", "piano", "percussion", "bass", "vocal", 
        "saxophone", "guitar", "synth"
      ];
      
      response.samples.forEach(sample => {
        expect(validCategories).toContain(sample.category);
      });
    });
  });
});
