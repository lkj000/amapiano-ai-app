import { APIError } from "encore.dev/api";
import log from "encore.dev/log";

export interface ErrorContext {
  operation: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  suggestions?: string[];
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class EnhancedErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private errorPatterns: Map<string, number> = new Map();

  handleError(error: any, context: ErrorContext): APIError {
    const errorDetails = this.analyzeError(error, context);
    this.trackError(errorDetails, context);
    this.logError(error, errorDetails, context);
    
    return this.createAPIError(errorDetails);
  }

  private analyzeError(error: any, context: ErrorContext): ErrorDetails {
    if (error instanceof APIError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: ['unavailable', 'resource_exhausted', 'deadline_exceeded'].includes(error.code),
        severity: ['internal', 'unavailable', 'data_loss'].includes(error.code) ? 'high' : 'medium'
      };
    }

    // Database errors
    if (this.isDatabaseError(error)) {
      return this.handleDatabaseError(error, context);
    }

    // AI service errors
    if (this.isAIServiceError(error)) {
      return this.handleAIServiceError(error, context);
    }

    // File processing errors
    if (this.isFileProcessingError(error)) {
      return this.handleFileProcessingError(error, context);
    }

    // Network errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, context);
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, context);
    }

    // Rate limiting errors
    if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(error, context);
    }

    // Cultural validation errors
    if (this.isCulturalValidationError(error)) {
      return this.handleCulturalValidationError(error, context);
    }

    // Default error handling
    return this.handleGenericError(error, context);
  }

  private handleDatabaseError(error: any, context: ErrorContext): ErrorDetails {
    if (error.code === '23505') { // Unique constraint violation
      return {
        code: 'already_exists',
        message: 'A resource with these details already exists',
        details: { constraint: error.constraint },
        suggestions: ['Try with different parameters', 'Check if the resource already exists'],
        retryable: false,
        severity: 'medium'
      };
    }

    if (error.code === '23503') { // Foreign key violation
      return {
        code: 'invalid_reference',
        message: 'Referenced resource does not exist',
        details: { table: error.table, column: error.column },
        suggestions: ['Verify the referenced resource exists', 'Check your input parameters'],
        retryable: false,
        severity: 'medium'
      };
    }

    if (error.code === 'ECONNREFUSED') {
      return {
        code: 'database_unavailable',
        message: 'Database connection failed',
        suggestions: ['Try again in a few moments', 'Contact support if the issue persists'],
        retryable: true,
        severity: 'high'
      };
    }

    return {
      code: 'database_error',
      message: 'A database error occurred',
      details: { code: error.code },
      suggestions: ['Try again', 'Contact support if the issue persists'],
      retryable: true,
      severity: 'high'
    };
  }

  private handleAIServiceError(error: any, context: ErrorContext): ErrorDetails {
    if (error.message?.includes('rate limit') || error.status === 429) {
      return {
        code: 'ai_rate_limit',
        message: 'AI service rate limit exceeded',
        suggestions: ['Wait a moment before trying again', 'Consider upgrading your plan'],
        retryable: true,
        severity: 'medium'
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        code: 'ai_timeout',
        message: 'AI processing took too long',
        suggestions: ['Try with a shorter audio file', 'Simplify your request'],
        retryable: true,
        severity: 'medium'
      };
    }

    if (error.message?.includes('invalid prompt')) {
      return {
        code: 'invalid_prompt',
        message: 'The provided prompt could not be processed',
        suggestions: [
          'Make your description more specific',
          'Use musical terms like BPM, key, instruments',
          'Avoid special characters or very long descriptions'
        ],
        retryable: false,
        severity: 'low'
      };
    }

    if (error.message?.includes('JSON')) {
      return {
        code: 'ai_invalid_response',
        message: 'The AI returned an invalid response format.',
        details: { originalError: error.message },
        suggestions: ['Try rephrasing your prompt', 'Try again in a moment'],
        retryable: true,
        severity: 'medium'
      };
    }

    return {
      code: 'ai_service_error',
      message: 'AI service encountered an error: ' + error.message,
      suggestions: ['Try again with different parameters', 'Contact support if the issue persists'],
      retryable: true,
      severity: 'high'
    };
  }

  private handleFileProcessingError(error: any, context: ErrorContext): ErrorDetails {
    if (error.message?.includes('file too large')) {
      return {
        code: 'file_too_large',
        message: 'File size exceeds the maximum limit',
        details: { maxSize: '500MB' },
        suggestions: [
          'Compress your audio file',
          'Use a shorter audio clip',
          'Convert to a more efficient format like MP3'
        ],
        retryable: false,
        severity: 'low'
      };
    }

    if (error.message?.includes('unsupported format')) {
      return {
        code: 'unsupported_format',
        message: 'File format is not supported',
        details: { 
          supportedFormats: ['MP3', 'WAV', 'FLAC', 'M4A', 'AAC', 'MP4', 'AVI', 'MOV'] 
        },
        suggestions: [
          'Convert your file to a supported format',
          'Use MP3 or WAV for best compatibility'
        ],
        retryable: false,
        severity: 'low'
      };
    }

    if (error.message?.includes('corrupted')) {
      return {
        code: 'corrupted_file',
        message: 'The uploaded file appears to be corrupted',
        suggestions: [
          'Try uploading the file again',
          'Check if the original file plays correctly',
          'Try a different file'
        ],
        retryable: true,
        severity: 'medium'
      };
    }

    return {
      code: 'file_processing_error',
      message: 'Error processing the uploaded file',
      suggestions: ['Try uploading a different file', 'Contact support if the issue persists'],
      retryable: true,
      severity: 'medium'
    };
  }

  private handleNetworkError(error: any, context: ErrorContext): ErrorDetails {
    if (error.code === 'ENOTFOUND') {
      return {
        code: 'invalid_url',
        message: 'The provided URL could not be accessed',
        suggestions: [
          'Check if the URL is correct',
          'Ensure the video/audio is publicly accessible',
          'Try a different URL'
        ],
        retryable: false,
        severity: 'low'
      };
    }

    if (error.code === 'ETIMEDOUT') {
      return {
        code: 'network_timeout',
        message: 'Network request timed out',
        suggestions: ['Try again', 'Check your internet connection'],
        retryable: true,
        severity: 'medium'
      };
    }

    return {
      code: 'network_error',
      message: 'Network error occurred',
      suggestions: ['Check your internet connection', 'Try again in a moment'],
      retryable: true,
      severity: 'medium'
    };
  }

  private handleValidationError(error: any, context: ErrorContext): ErrorDetails {
    return {
      code: 'validation_error',
      message: error.message || 'Input validation failed',
      details: error.details,
      suggestions: [
        'Check your input parameters',
        'Ensure all required fields are provided',
        'Verify data formats and ranges'
      ],
      retryable: false,
      severity: 'low'
    };
  }

  private handleRateLimitError(error: any, context: ErrorContext): ErrorDetails {
    return {
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please slow down.',
      details: { retryAfter: '60s' },
      suggestions: [
        'Wait a minute before trying again',
        'Consider upgrading your plan for higher limits',
        'Batch your requests to reduce frequency'
      ],
      retryable: true,
      severity: 'medium'
    };
  }

  private handleCulturalValidationError(error: any, context: ErrorContext): ErrorDetails {
    return {
      code: 'cultural_validation_failed',
      message: 'Content does not meet cultural authenticity standards',
      details: error.details,
      suggestions: [
        'Review the cultural authenticity feedback',
        'Adjust your prompt to include more traditional elements',
        'Consider using reference tracks from authentic amapiano artists'
      ],
      retryable: true,
      severity: 'low'
    };
  }

  private handleGenericError(error: any, context: ErrorContext): ErrorDetails {
    return {
      code: 'internal_error',
      message: 'An unexpected error occurred: ' + (error.message || 'Unknown error'),
      suggestions: ['Try again', 'Contact support if the issue persists'],
      retryable: true,
      severity: 'high'
    };
  }

  private createAPIError(details: ErrorDetails): APIError {
    const apiErrorMap = {
      'already_exists': APIError.alreadyExists,
      'invalid_reference': APIError.invalidArgument,
      'database_unavailable': APIError.unavailable,
      'database_error': APIError.internal,
      'ai_rate_limit': APIError.resourceExhausted,
      'ai_timeout': APIError.deadlineExceeded,
      'invalid_prompt': APIError.invalidArgument,
      'ai_invalid_response': APIError.internal,
      'ai_service_error': APIError.internal,
      'file_too_large': APIError.invalidArgument,
      'unsupported_format': APIError.invalidArgument,
      'corrupted_file': APIError.invalidArgument,
      'file_processing_error': APIError.internal,
      'invalid_url': APIError.invalidArgument,
      'network_timeout': APIError.deadlineExceeded,
      'network_error': APIError.unavailable,
      'validation_error': APIError.invalidArgument,
      'rate_limit_exceeded': APIError.resourceExhausted,
      'cultural_validation_failed': APIError.failedPrecondition,
      'internal_error': APIError.internal
    };

    const createError = apiErrorMap[details.code as keyof typeof apiErrorMap] || APIError.internal;
    const error = createError(details.message);

    if (details.details || details.suggestions) {
      return error.withDetails({
        ...details.details,
        suggestions: details.suggestions,
        retryable: details.retryable,
        severity: details.severity
      });
    }

    return error;
  }

  private trackError(details: ErrorDetails, context: ErrorContext): void {
    const errorKey = `${context.operation}:${details.code}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Track error patterns for analysis
    const patternKey = details.code;
    const patternCount = this.errorPatterns.get(patternKey) || 0;
    this.errorPatterns.set(patternKey, patternCount + 1);
  }

  private logError(error: any, details: ErrorDetails, context: ErrorContext): void {
    const logData = {
      operation: context.operation,
      errorCode: details.code,
      errorMessage: details.message,
      severity: details.severity,
      retryable: details.retryable,
      userId: context.userId,
      requestId: context.requestId,
      metadata: context.metadata,
      originalError: error.message,
      stack: error.stack
    };

    if (details.severity === 'critical' || details.severity === 'high') {
      log.error("High severity error", logData);
    } else if (details.severity === 'medium') {
      log.warn("Medium severity error", logData);
    } else {
      log.info("Low severity error", logData);
    }
  }

  getErrorStats(): any {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      errorPatterns: Object.fromEntries(this.errorPatterns),
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
    };
  }

  // Error type detection methods
  private isDatabaseError(error: any): boolean {
    return error.code && (
      error.code.startsWith('23') || // Constraint violations
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.name === 'DatabaseError'
    );
  }

  private isAIServiceError(error: any): boolean {
    return error.message && (
      error.message.includes('AI') ||
      error.message.includes('model') ||
      error.message.includes('generation') ||
      error.message.includes('OpenAI') ||
      error.message.includes('HuggingFace') ||
      error.message.includes('JSON') ||
      error.status === 429
    );
  }

  private isFileProcessingError(error: any): boolean {
    return error.message && (
      error.message.includes('file') ||
      error.message.includes('upload') ||
      error.message.includes('format') ||
      error.message.includes('size') ||
      error.message.includes('corrupted')
    );
  }

  private isNetworkError(error: any): boolean {
    return error.code && (
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED'
    );
  }

  private isValidationError(error: any): boolean {
    return error.name === 'ValidationError' || 
           (error.message && error.message.includes('validation'));
  }

  private isRateLimitError(error: any): boolean {
    return error.message && (
      error.message.includes('rate limit') ||
      error.message.includes('too many requests') ||
      error.status === 429
    );
  }

  private isCulturalValidationError(error: any): boolean {
    return error.message && (
      error.message.includes('cultural') ||
      error.message.includes('authenticity') ||
      error.message.includes('validation')
    );
  }
}

// Global error handler instance
export const errorHandler = new EnhancedErrorHandler();

// Utility function for consistent error handling
export function handleError(error: any, context: ErrorContext): APIError {
  return errorHandler.handleError(error, context);
}

// Error recovery utilities
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry non-retryable errors
      if (error instanceof APIError && error.code === 'invalid_argument') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        log.info(`Retrying operation, attempt ${attempt + 1}/${maxRetries}`, { delay });
      }
    }
  }
  
  throw lastError;
}
