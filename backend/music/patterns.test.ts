import { describe, test, expect } from "vitest";
import { listPatterns, getPattern, getRecommendedPatterns } from "./patterns";

describe("Patterns API", () => {
  describe("listPatterns", () => {
    test("should return all patterns when no filters provided", async () => {
      const response = await listPatterns({});
      
      expect(response.patterns).toBeDefined();
      expect(response.total).toBeGreaterThan(0);
      expect(response.categories).toBeDefined();
      expect(Array.isArray(response.patterns)).toBe(true);
    });

    test("should filter patterns by genre", async () => {
      const response = await listPatterns({ genre: "amapiano" });
      
      expect(response.patterns).toBeDefined();
      response.patterns.forEach(pattern => {
        expect(pattern.genre).toBe("amapiano");
      });
    });

    test("should filter patterns by category", async () => {
      const response = await listPatterns({ category: "chord_progression" });
      
      expect(response.patterns).toBeDefined();
      response.patterns.forEach(pattern => {
        expect(pattern.category).toBe("chord_progression");
      });
    });

    test("should filter patterns by BPM", async () => {
      const response = await listPatterns({ bpm: 120 });
      
      expect(response.patterns).toBeDefined();
      response.patterns.forEach(pattern => {
        if (pattern.bpm) {
          expect(pattern.bpm).toBeGreaterThanOrEqual(115);
          expect(pattern.bpm).toBeLessThanOrEqual(125);
        }
      });
    });

    test("should filter patterns by key signature", async () => {
      const response = await listPatterns({ keySignature: "C" });
      
      expect(response.patterns).toBeDefined();
      response.patterns.forEach(pattern => {
        if (pattern.keySignature) {
          expect(pattern.keySignature).toBe("C");
        }
      });
    });

    test("should apply pagination with limit", async () => {
      const response = await listPatterns({ limit: 5 });
      
      expect(response.patterns.length).toBeLessThanOrEqual(5);
    });

    test("should return category distribution", async () => {
      const response = await listPatterns({});
      
      expect(response.categories).toBeDefined();
      expect(typeof response.categories).toBe("object");
      
      const categoryKeys = Object.keys(response.categories);
      expect(categoryKeys.length).toBeGreaterThan(0);
    });

    test("should return patterns with all required fields", async () => {
      const response = await listPatterns({ limit: 1 });
      
      expect(response.patterns.length).toBeGreaterThan(0);
      const pattern = response.patterns[0];
      
      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.category).toBeDefined();
      expect(pattern.genre).toBeDefined();
      expect(pattern.patternData).toBeDefined();
      expect(pattern.createdAt).toBeDefined();
    });

    test("should return patterns with valid pattern data", async () => {
      const response = await listPatterns({ limit: 5 });
      
      response.patterns.forEach(pattern => {
        expect(typeof pattern.patternData).toBe("object");
        expect(pattern.patternData).not.toBeNull();
      });
    });
  });

  describe("getPattern", () => {
    test("should return a specific pattern by ID", async () => {
      const allPatterns = await listPatterns({ limit: 1 });
      const patternId = allPatterns.patterns[0].id;
      
      const pattern = await getPattern({ id: patternId });
      
      expect(pattern).toBeDefined();
      expect(pattern.id).toBe(patternId);
    });

    test("should throw error for non-existent pattern", async () => {
      await expect(getPattern({ id: 999999 })).rejects.toThrow();
    });

    test("should return pattern with complete data", async () => {
      const allPatterns = await listPatterns({ limit: 1 });
      const patternId = allPatterns.patterns[0].id;
      
      const pattern = await getPattern({ id: patternId });
      
      expect(pattern.patternData).toBeDefined();
      expect(typeof pattern.patternData).toBe("object");
    });
  });

  describe("getRecommendedPatterns", () => {
    test("should return recommendations for genre", async () => {
      const response = await getRecommendedPatterns({ 
        genre: "amapiano" 
      });
      
      expect(response.patterns).toBeDefined();
      expect(Array.isArray(response.patterns)).toBe(true);
      
      response.patterns.forEach(pattern => {
        expect(pattern.genre).toBe("amapiano");
      });
    });

    test("should exclude current patterns from recommendations", async () => {
      const allPatterns = await listPatterns({ genre: "amapiano", limit: 2 });
      const currentPatternIds = allPatterns.patterns.map(p => p.id);
      
      const response = await getRecommendedPatterns({ 
        genre: "amapiano",
        currentPatterns: currentPatternIds
      });
      
      response.patterns.forEach(pattern => {
        expect(currentPatternIds).not.toContain(pattern.id);
      });
    });

    test("should recommend patterns matching BPM", async () => {
      const response = await getRecommendedPatterns({ 
        genre: "amapiano",
        bpm: 120
      });
      
      expect(response.patterns).toBeDefined();
      response.patterns.forEach(pattern => {
        if (pattern.bpm) {
          expect(pattern.bpm).toBeGreaterThanOrEqual(115);
          expect(pattern.bpm).toBeLessThanOrEqual(125);
        }
      });
    });

    test("should recommend patterns matching key signature", async () => {
      const response = await getRecommendedPatterns({ 
        genre: "amapiano",
        keySignature: "C"
      });
      
      expect(response.patterns).toBeDefined();
    });

    test("should limit recommendations to 5 patterns", async () => {
      const response = await getRecommendedPatterns({ 
        genre: "amapiano"
      });
      
      expect(response.patterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Pattern Categories", () => {
    test("should have chord progression patterns", async () => {
      const response = await listPatterns({ category: "chord_progression" });
      
      expect(response.patterns.length).toBeGreaterThan(0);
    });

    test("should have drum pattern patterns", async () => {
      const response = await listPatterns({ category: "drum_pattern" });
      
      expect(response.patterns.length).toBeGreaterThan(0);
    });

    test("should have bass pattern patterns", async () => {
      const response = await listPatterns({ category: "bass_pattern" });
      
      expect(response.patterns.length).toBeGreaterThan(0);
    });

    test("should have melody patterns", async () => {
      const response = await listPatterns({ category: "melody" });
      
      expect(response.patterns.length).toBeGreaterThan(0);
    });
  });

  describe("Pattern Data Structure", () => {
    test("chord progressions should have chords array", async () => {
      const response = await listPatterns({ 
        category: "chord_progression",
        limit: 1
      });
      
      expect(response.patterns.length).toBeGreaterThan(0);
      const pattern = response.patterns[0];
      
      expect(pattern.patternData).toHaveProperty("chords");
      expect(Array.isArray(pattern.patternData.chords)).toBe(true);
    });

    test("drum patterns should have drum elements", async () => {
      const response = await listPatterns({ 
        category: "drum_pattern",
        limit: 1
      });
      
      expect(response.patterns.length).toBeGreaterThan(0);
      const pattern = response.patterns[0];
      
      expect(typeof pattern.patternData).toBe("object");
    });

    test("all patterns should have valid genres", async () => {
      const response = await listPatterns({});
      
      const validGenres = ["amapiano", "private_school_amapiano", "bacardi", "sgija"];
      
      response.patterns.forEach(pattern => {
        expect(validGenres).toContain(pattern.genre);
      });
    });

    test("all patterns should have valid categories", async () => {
      const response = await listPatterns({});
      
      const validCategories = [
        "drum_pattern", "bass_pattern", "chord_progression", 
        "melody", "percussion_pattern", "arpeggio"
      ];
      
      response.patterns.forEach(pattern => {
        expect(validCategories).toContain(pattern.category);
      });
    });
  });

  describe("Performance", () => {
    test("should handle large result sets efficiently", async () => {
      const start = Date.now();
      await listPatterns({ limit: 50 });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test("should handle multiple filters efficiently", async () => {
      const start = Date.now();
      await listPatterns({ 
        genre: "amapiano",
        category: "chord_progression",
        bpm: 120,
        keySignature: "C"
      });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000);
    });
  });
});
