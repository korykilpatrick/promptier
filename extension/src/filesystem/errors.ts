/**
 * Custom error classes for the filesystem module
 */

/**
 * Base error class for filesystem errors
 */
export class FileSystemError extends Error {
  /** Error code */
  code: string;
  /** Original error that caused this error (if any) */
  originalError?: unknown;
  /** Call stack at time of error (for better debugging) */
  errorStack?: string;
  
  constructor(message: string, code = 'FILESYSTEM_ERROR', originalError?: unknown) {
    super(message);
    this.name = 'FileSystemError';
    this.code = code;
    this.originalError = originalError;
    this.errorStack = new Error().stack;
  }
  
  /**
   * Convert error to JSON for serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      originalError: this.originalError ? 
        (this.originalError instanceof Error ? 
          { message: (this.originalError as Error).message } : 
          String(this.originalError)
        ) : undefined
    };
  }
  
  /**
   * Get full error chain as string (for detailed logging)
   */
  getErrorChain(): string {
    let result = `${this.name}: ${this.message} (${this.code})`;
    
    if (this.originalError) {
      if (this.originalError instanceof FileSystemError) {
        result += `\n  Caused by: ${this.originalError.getErrorChain()}`;
      } else if (this.originalError instanceof Error) {
        result += `\n  Caused by: ${this.originalError.name}: ${this.originalError.message}`;
        if (this.originalError.stack) {
          result += `\n    at ${this.originalError.stack.split('\n').slice(1).join('\n    at ')}`;
        }
      } else {
        result += `\n  Caused by: ${String(this.originalError)}`;
      }
    }
    
    return result;
  }
}

/**
 * Error thrown when permission is denied for file operations
 */
export class PermissionDeniedError extends FileSystemError {
  constructor(message = 'Permission denied', originalError?: unknown) {
    super(message, 'PERMISSION_DENIED', originalError);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when file is not found
 */
export class FileNotFoundError extends FileSystemError {
  constructor(message = 'File not found', originalError?: unknown) {
    super(message, 'FILE_NOT_FOUND', originalError);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown when file is too large
 */
export class FileTooLargeError extends FileSystemError {
  constructor(message = 'File too large', originalError?: unknown) {
    super(message, 'FILE_TOO_LARGE', originalError);
    this.name = 'FileTooLargeError';
  }
}

/**
 * Error thrown when file cannot be read
 */
export class FileReadError extends FileSystemError {
  constructor(message = 'Failed to read file', originalError?: unknown) {
    super(message, 'FILE_READ_ERROR', originalError);
    this.name = 'FileReadError';
  }
}

/**
 * Error thrown when file cannot be written
 */
export class FileWriteError extends FileSystemError {
  constructor(message = 'Failed to write file', originalError?: unknown) {
    super(message, 'FILE_WRITE_ERROR', originalError);
    this.name = 'FileWriteError';
  }
}

/**
 * Error thrown when directory operation fails
 */
export class DirectoryError extends FileSystemError {
  constructor(message = 'Directory operation failed', code = 'DIRECTORY_ERROR', originalError?: unknown) {
    super(message, code, originalError);
    this.name = 'DirectoryError';
  }
}

/**
 * Error thrown when operation times out
 */
export class TimeoutError extends FileSystemError {
  constructor(message = 'Operation timed out', originalError?: unknown) {
    super(message, 'TIMEOUT_ERROR', originalError);
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when a batch operation fails
 */
export class BatchOperationError extends FileSystemError {
  /** Failed operations details */
  failedOperations: { index: number; error: Error }[];
  
  constructor(
    message = 'Batch operation failed',
    failedOperations: { index: number; error: Error }[] = [],
    originalError?: unknown
  ) {
    super(message, 'BATCH_OPERATION_ERROR', originalError);
    this.name = 'BatchOperationError';
    this.failedOperations = failedOperations;
  }
  
  override toJSON() {
    return {
      ...super.toJSON(),
      failedOperations: this.failedOperations.map(op => ({
        index: op.index,
        error: op.error instanceof Error ? 
          { message: op.error.message, name: op.error.name } : 
          op.error
      }))
    };
  }
}

/**
 * Error thrown when browser capability is missing
 */
export class CapabilityError extends FileSystemError {
  /** The capability that is missing */
  capability: string;
  
  constructor(
    capability: string, 
    message: string = `Browser does not support required capability: ${capability}`, 
    originalError?: unknown
  ) {
    super(
      message,
      'CAPABILITY_ERROR',
      originalError
    );
    this.name = 'CapabilityError';
    this.capability = capability;
  }
  
  override toJSON() {
    return {
      ...super.toJSON(),
      capability: this.capability
    };
  }
}

/**
 * Helper functions for error handling
 */

/**
 * Log levels for filesystem errors
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Interface for the logger
 */
export interface ErrorLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

/**
 * Default logger implementation that logs to console
 */
export const defaultLogger: ErrorLogger = {
  debug: (message: string) => console.debug(`[Filesystem:DEBUG] ${message}`),
  info: (message: string) => console.info(`[Filesystem:INFO] ${message}`),
  warn: (message: string) => console.warn(`[Filesystem:WARN] ${message}`),
  error: (message: string, error?: unknown) => {
    console.error(`[Filesystem:ERROR] ${message}`);
    if (error) {
      if (error instanceof FileSystemError) {
        console.error(error.getErrorChain());
      } else if (error instanceof Error) {
        console.error(error);
      } else {
        console.error('Original error:', error);
      }
    }
  }
};

// Current active logger
let currentLogger: ErrorLogger = defaultLogger;

/**
 * Set the logger to use for filesystem errors
 * 
 * @param logger - The logger to use
 */
export function setLogger(logger: ErrorLogger): void {
  currentLogger = logger;
}

/**
 * Get the current logger
 * 
 * @returns The current logger
 */
export function getLogger(): ErrorLogger {
  return currentLogger;
}

/**
 * Log an error with the current logger
 * 
 * @param level - Log level
 * @param message - Message to log
 * @param error - Optional error to log
 */
export function logError(level: LogLevel, message: string, error?: unknown): void {
  switch (level) {
    case LogLevel.DEBUG:
      currentLogger.debug(message);
      break;
    case LogLevel.INFO:
      currentLogger.info(message);
      break;
    case LogLevel.WARN:
      currentLogger.warn(message);
      break;
    case LogLevel.ERROR:
      currentLogger.error(message, error);
      break;
  }
}

/**
 * Safely wraps a function with error handling and logging
 * 
 * @param fn - Function to wrap
 * @param errorHandler - Function to handle errors
 * @param logOptions - Options for logging
 * @returns Wrapped function
 */
export function withErrorHandlingAndLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler: (error: unknown) => Promise<ReturnType<T>> | ReturnType<T>,
  logOptions?: {
    operation: string;
    logLevel?: LogLevel;
    shouldLogSuccess?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      
      if (logOptions?.shouldLogSuccess) {
        logError(logOptions.logLevel || LogLevel.DEBUG, 
          `Successfully executed ${logOptions.operation || 'operation'}`);
      }
      
      return result;
    } catch (error) {
      const logLevel = logOptions?.logLevel || LogLevel.ERROR;
      const operation = logOptions?.operation || 'operation';
      
      logError(logLevel, `Error during ${operation}`, error);
      
      return await errorHandler(error);
    }
  }) as T;
}

/**
 * Convert any error to a FileSystemError
 * 
 * @param error - Error to convert
 * @returns FileSystemError
 */
export function toFileSystemError(error: unknown): FileSystemError {
  if (error instanceof FileSystemError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new FileSystemError(error.message, 'UNKNOWN_ERROR', error);
  }
  
  return new FileSystemError(
    typeof error === 'string' ? error : 'Unknown error',
    'UNKNOWN_ERROR',
    error
  );
}

/**
 * Checks if error is of a specific type
 * 
 * @param error - Error to check
 * @param errorType - Error type to check against
 * @returns Whether error is of the specified type
 */
export function isErrorOfType<T extends typeof FileSystemError>(
  error: unknown,
  errorType: T
): error is InstanceType<T> {
  return error instanceof errorType;
}

/**
 * Creates an enhanced error handler that chains errors and provides consistent logging
 * 
 * @param errorClass - Error class to create
 * @param defaultMessage - Default error message
 * @param operationName - Name of the operation for logging
 * @returns Error handler function
 */
export function createErrorHandler<T extends typeof FileSystemError>(
  errorClass: T,
  defaultMessage: string,
  operationName: string
): (message?: string, originalError?: unknown) => InstanceType<T> {
  return (message?: string, originalError?: unknown) => {
    const errorMessage = message || defaultMessage;
    const error = new errorClass(errorMessage, undefined, originalError) as InstanceType<T>;
    
    logError(LogLevel.ERROR, `${operationName} failed: ${errorMessage}`, error);
    
    return error;
  };
} 