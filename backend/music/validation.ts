import { APIError } from "encore.dev/api";
import type { Genre, SampleCategory, PatternCategory } from "./types";

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const validators = {
  // Genre validation
  genre(value: unknown): Genre {
    const validGenres = ["amapiano", "private_school_amapiano", "bacardi", "sgija"];
    
    if (typeof value !== "string") {
      throw new ValidationError("Genre must be a string", "genre");
    }
    
    if (!validGenres.includes(value)) {
      throw new ValidationError(
        `Genre must be one of: ${validGenres.join(", ")}`,
        "genre"
      );
    }
    
    return value as Genre;
  },

  // Sample category validation
  sampleCategory(value: unknown): SampleCategory {
    const validCategories: SampleCategory[] = [
      "log_drum", "piano", "percussion", "bass", "vocal", 
      "saxophone", "guitar", "synth"
    ];
    
    if (typeof value !== "string") {
      throw new ValidationError("Category must be a string", "category");
    }
    
    if (!validCategories.includes(value as SampleCategory)) {
      throw new ValidationError(
        `Category must be one of: ${validCategories.join(", ")}`,
        "category"
      );
    }
    
    return value as SampleCategory;
  },

  // Pattern category validation
  patternCategory(value: unknown): PatternCategory {
    const validCategories: PatternCategory[] = [
      "drum_pattern", "bass_pattern", "chord_progression", 
      "melody", "percussion_pattern", "arpeggio"
    ];
    
    if (typeof value !== "string") {
      throw new ValidationError("Category must be a string", "category");
    }
    
    if (!validCategories.includes(value as PatternCategory)) {
      throw new ValidationError(
        `Category must be one of: ${validCategories.join(", ")}`,
        "category"
      );
    }
    
    return value as PatternCategory;
  },

  // BPM validation
  bpm(value: unknown): number {
    if (typeof value !== "number") {
      throw new ValidationError("BPM must be a number", "bpm");
    }
    
    if (value < 60 || value > 200) {
      throw new ValidationError("BPM must be between 60 and 200", "bpm");
    }
    
    return value;
  },

  // Key signature validation
  keySignature(value: unknown): string {
    const validKeys = [
      "C", "C#", "Db", "D", "D#", "Eb", "E", "F", 
      "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
      "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", 
      "Gm", "G#m", "Am", "A#m", "Bm"
    ];
    
    if (typeof value !== "string") {
      throw new ValidationError("Key signature must be a string", "keySignature");
    }
    
    if (!validKeys.includes(value)) {
      throw new ValidationError(
        `Key signature must be a valid musical key`,
        "keySignature"
      );
    }
    
    return value;
  },

  // String validation
  string(value: unknown, fieldName: string, options?: { 
    minLength?: number; 
    maxLength?: number;
    required?: boolean;
  }): string {
    if (value === null || value === undefined) {
      if (options?.required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return "";
    }
    
    if (typeof value !== "string") {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }
    
    if (options?.minLength && value.length < options.minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.minLength} characters`,
        fieldName
      );
    }
    
    if (options?.maxLength && value.length > options.maxLength) {
      throw new ValidationError(
        `${fieldName} must be at most ${options.maxLength} characters`,
        fieldName
      );
    }
    
    return value;
  },

  // Number validation
  number(value: unknown, fieldName: string, options?: {
    min?: number;
    max?: number;
    required?: boolean;
  }): number {
    if (value === null || value === undefined) {
      if (options?.required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return 0;
    }
    
    if (typeof value !== "number" || isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a number`, fieldName);
    }
    
    if (options?.min !== undefined && value < options.min) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.min}`,
        fieldName
      );
    }
    
    if (options?.max !== undefined && value > options.max) {
      throw new ValidationError(
        `${fieldName} must be at most ${options.max}`,
        fieldName
      );
    }
    
    return value;
  },

  // ID validation
  id(value: unknown, fieldName: string = "id"): number {
    if (typeof value !== "number" || value <= 0 || !Number.isInteger(value)) {
      throw new ValidationError(`${fieldName} must be a positive integer`, fieldName);
    }
    
    return value;
  },

  // Array validation
  array<T>(
    value: unknown, 
    fieldName: string,
    itemValidator?: (item: unknown) => T
  ): T[] {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName);
    }
    
    if (itemValidator) {
      return value.map(itemValidator);
    }
    
    return value as T[];
  }
};

// Helper to convert validation errors to API errors
export function handleValidationError(error: unknown): never {
  if (error instanceof ValidationError) {
    throw APIError.invalidArgument(error.message, {
      field: error.field
    });
  }
  
  if (error instanceof APIError) {
    throw error;
  }
  
  throw APIError.internal("An unexpected error occurred");
}

// Sanitization utilities
export const sanitize = {
  // Sanitize filename for storage
  filename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  },

  // Sanitize search query
  searchQuery(query: string): string {
    return query.trim().slice(0, 200);
  },

  // Sanitize tags
  tags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .slice(0, 20);
  }
};
