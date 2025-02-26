/**
 * Type definitions for batch operations
 */
import { ProgressCallback, FileContent, FileSystemOptions } from '../types';

/**
 * Type for a single operation in a batch
 */
export type BatchOperation<T = any> = () => Promise<T>;

/**
 * Result of a batch operation
 */
export interface BatchResult<T = any> {
  /** Whether the entire batch operation succeeded */
  success: boolean;
  /** Results of successful operations */
  results: T[];
  /** Failed operations with their errors */
  failedOperations: { index: number; error: Error }[];
}

/**
 * Options for batch operation execution
 */
export interface BatchOptions {
  /** Whether to continue execution after errors */
  continueOnError?: boolean;
  /** Maximum concurrent operations (0 = unlimited) */
  maxConcurrent?: number;
  /** Callback for progress updates */
  onProgress?: ProgressCallback;
  /** Whether to automatically verify permissions */
  verifyPermissions?: boolean;
}

/**
 * Combined options for batch file operations
 */
export interface BatchFileOptions extends FileSystemOptions, BatchOptions {} 