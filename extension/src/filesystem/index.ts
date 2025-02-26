/**
 * Filesystem module for interacting with the File System Access API
 * 
 * This module provides a high-level interface for file operations
 * built on top of the File System Access API
 */

// Import types
import {
  FileSystemOptions,
  FileContent,
  FileAccessMode,
  FileEntry,
  DirectoryEntry,
  ProgressCallback,
  ProgressInfo,
  AccessHandleOptions,
  FileSystemSyncAccessHandle
} from './types';

// Import components
import * as core from './core';
import * as permissions from './permissions';
import * as utils from './utils';
import * as batch from './batch';
import { registry } from './registry';
import * as Errors from './errors';
import { cache } from './cache';
import * as recursive from './utils/recursive';

// Re-export everything from errors for convenience
export * from './errors';

// Re-export types
export type {
  FileSystemOptions,
  FileContent,
  FileAccessMode,
  FileEntry,
  DirectoryEntry,
  ProgressCallback,
  ProgressInfo,
  AccessHandleOptions,
  FileSystemSyncAccessHandle
};

// Re-export batch operation types
export type {
  BatchOptions,
  BatchResult,
  BatchOperation
} from './batch/types';

/**
 * Higher-order function to wrap core operations with permission checks and error handling
 * 
 * @template T Type of the filesystem handle
 * @template P Parameters tuple type excluding the first handle parameter
 * @template R Return type of the core function
 * @param coreFunction - The core function to wrap
 * @param errorWrapper - Function to wrap errors
 * @param permissionMode - The permission mode required
 * @param operationName - Name of the operation for logging
 * @returns Wrapped function with permission checks and error handling
 */
function withPermissionCheck<
  T extends FileSystemHandle,
  P extends any[],
  R
>(
  coreFunction: (handle: T, ...args: P) => Promise<R>,
  errorWrapper: (message: string, originalError?: unknown) => Error,
  permissionMode: FileAccessMode = 'read',
  operationName: string = 'File operation'
): (handle: T, ...args: P) => Promise<R> {
  return Errors.withErrorHandlingAndLogging(
    async (handle: T, ...args: P): Promise<R> => {
      // Verify permissions before operation
      const hasPermission = await permissions.verifyPermission(handle, permissionMode);
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for ${permissionMode} operation on: ${handle.name}`);
      }
      
      // Execute the core function
      return await coreFunction(handle, ...args);
    },
    (error) => {
      // Rethrow if it's already a filesystem error
      if (error instanceof Errors.FileSystemError) {
        throw error;
      }
      
      // Otherwise wrap in appropriate error
      const specificMessage = `${operationName} failed: ${(error instanceof Error) ? error.message : 'unknown error'}`;
      throw errorWrapper(specificMessage, error);
    },
    {
      operation: operationName,
      logLevel: Errors.LogLevel.ERROR,
      shouldLogSuccess: true
    }
  );
}

/**
 * Higher-order function for existence check operations with permission checks
 * These operations have special error handling - they return false instead of throwing for not-found errors
 * 
 * @param coreFunction - The core function to check existence
 * @param operationName - Name of the operation for logging
 * @returns Wrapped function with permission checks and error handling
 */
function withExistenceCheck(
  coreFunction: (handle: FileSystemDirectoryHandle, name: string) => Promise<boolean>,
  operationName: string = 'Existence check'
): (handle: FileSystemDirectoryHandle, name: string) => Promise<boolean> {
  return Errors.withErrorHandlingAndLogging(
    async (handle: FileSystemDirectoryHandle, name: string): Promise<boolean> => {
      // Verify permissions before checking
      const hasPermission = await permissions.verifyPermission(handle, 'read');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for reading directory: ${handle.name}`);
      }
      
      // Check existence
      return await coreFunction(handle, name);
    },
    async (error) => {
      if (error instanceof Errors.PermissionDeniedError) {
        throw error;
      }
      // For other errors, we return false (item doesn't exist)
      return false;
    },
    {
      operation: operationName,
      logLevel: Errors.LogLevel.DEBUG
    }
  );
}

/**
 * Read a file and return its contents
 * 
 * @param fileHandle - File handle to read
 * @param options - Options for reading the file
 * @returns Promise resolving to the file contents as a string
 */
export const readFile = withPermissionCheck<FileSystemFileHandle, [FileSystemOptions?], string>(
  async (fileHandle, options?: FileSystemOptions) => {
    const content = await core.readFile(fileHandle, options);
    return content.data as string;
  },
  (message, error) => new Errors.FileReadError(message, error),
  'read',
  'Error reading file'
);

/**
 * Write content to a file
 * 
 * @param fileHandle - File handle to write to
 * @param content - Content to write to the file
 * @param options - Options for writing the file
 * @returns Promise resolving when the write is complete
 */
export const writeFile = withPermissionCheck<FileSystemFileHandle, [string | ArrayBuffer, FileSystemOptions?], void>(
  async (fileHandle, content: string | ArrayBuffer, options?: FileSystemOptions) => {
    await core.writeFile(fileHandle, content, options);
  },
  (message, error) => new Errors.FileWriteError(message, error),
  'readwrite',
  'Error writing to file'
);

/**
 * List the contents of a directory
 * 
 * @param dirHandle - Directory handle to list
 * @returns Promise resolving to an array of file and directory entries
 */
export const listDirectory = withPermissionCheck<FileSystemDirectoryHandle, [], Array<FileEntry | DirectoryEntry>>(
  async (dirHandle) => {
    return await core.listDirectory(dirHandle);
  },
  (message, error) => new Errors.DirectoryError(message, 'DIRECTORY_LIST_ERROR', error),
  'read',
  'Error listing directory'
);

/**
 * Create a directory
 * 
 * @param parentDirHandle - Parent directory handle
 * @param name - Name of the directory to create
 * @returns Promise resolving to the new directory handle
 */
export const createDirectory = withPermissionCheck<FileSystemDirectoryHandle, [string], FileSystemDirectoryHandle>(
  async (parentDirHandle, name: string) => {
    return await core.createDirectory(parentDirHandle, name);
  },
  (message, error) => new Errors.DirectoryError(message, 'DIRECTORY_CREATE_ERROR', error),
  'readwrite',
  'Error creating directory'
);

/**
 * Check if a file exists in a directory
 * 
 * @param dirHandle - Directory handle to check in
 * @param fileName - Name of the file to check for
 * @returns Promise resolving to whether the file exists
 */
export const fileExists = withExistenceCheck(
  core.fileExists
);

/**
 * Check if a directory exists in a parent directory
 * 
 * @param parentDirHandle - Parent directory handle to check in
 * @param dirName - Name of the directory to check for
 * @returns Promise resolving to whether the directory exists
 */
export const directoryExists = withExistenceCheck(
  core.directoryExists
);

/**
 * Get a file handle from a directory
 * 
 * @param dirHandle - Directory handle to get file from
 * @param fileName - Name of the file to get
 * @param create - Whether to create the file if it doesn't exist
 * @returns Promise resolving to the file handle
 */
export async function getFileHandle(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  create: boolean = false
): Promise<FileSystemFileHandle> {
  try {
    // Determine permission mode based on create flag
    const mode = create ? 'readwrite' : 'read';
    
    // Verify permissions
    const hasPermission = await permissions.verifyPermission(dirHandle, mode);
    if (!hasPermission) {
      throw new Errors.PermissionDeniedError(`Permission denied for accessing file: ${fileName}`);
    }
    
    // Get the file handle
    return await core.getFileHandle(dirHandle, fileName, create);
  } catch (error) {
    // Rethrow if it's already a filesystem error
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    
    // Otherwise wrap in a FileNotFoundError or generic FileSystemError
    if (error instanceof DOMException && (error.name === 'NotFoundError' || error.message.includes('not found'))) {
      throw new Errors.FileNotFoundError(`File not found: ${fileName}`, error);
    }
    
    throw new Errors.FileSystemError(`Error accessing file: ${fileName}`, 'FILE_ACCESS_ERROR', error);
  }
}

/**
 * Batch file operations
 */

/**
 * Read multiple files in batch
 * 
 * @param fileHandles - Array of file handles to read
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation
 */
export const readFiles = batch.readFiles;

/**
 * Write to multiple files in batch
 * 
 * @param files - Array of file handles and content to write
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation
 */
export const writeFiles = batch.writeFiles;

/**
 * Delete multiple files in batch
 * 
 * @param fileHandles - Array of file handles to delete
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation
 */
export const deleteFiles = batch.deleteFiles;

/**
 * Copy multiple files in batch
 * 
 * @param operations - Array of source and destination for copy operations
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation with new file handles
 */
export async function copyFiles(
  operations: Array<{ 
    source: FileSystemFileHandle; 
    destination: FileSystemDirectoryHandle; 
    newName?: string;
  }>,
  options?: batch.BatchOptions
): Promise<batch.BatchResult<FileSystemFileHandle>> {
  return await batch.copyFiles(operations, options);
}

/**
 * Move multiple files in batch
 * 
 * @param operations - Array of source and destination for move operations
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation with new file handles
 */
export async function moveFiles(
  operations: Array<{ 
    source: FileSystemFileHandle; 
    destination: FileSystemDirectoryHandle; 
    newName?: string;
  }>,
  options?: batch.BatchOptions
): Promise<batch.BatchResult<FileSystemFileHandle>> {
  return await batch.moveFiles(operations, options);
}

/**
 * Read a file using sync access handle for better performance
 * 
 * @param fileHandle - File handle to read
 * @param options - Options for reading the file
 * @returns Promise resolving to the file contents
 */
export const readFileWithSyncAccess = withPermissionCheck<FileSystemFileHandle, [FileSystemOptions?], FileContent>(
  async (fileHandle, options?: FileSystemOptions) => {
    return await core.readFileWithSyncAccess(fileHandle, options);
  },
  (message, error) => new Errors.FileReadError(message, error),
  'read',
  'Error reading file with sync access'
);

/**
 * Write content to a file using sync access handle for better performance
 * 
 * @param fileHandle - File handle to write to
 * @param content - Content to write to the file
 * @param options - Options for writing the file
 * @returns Promise resolving when the write is complete
 */
export const writeFileWithSyncAccess = withPermissionCheck<FileSystemFileHandle, [string | ArrayBuffer, FileSystemOptions?], void>(
  async (fileHandle, content: string | ArrayBuffer, options?: FileSystemOptions) => {
    await core.writeFileWithSyncAccess(fileHandle, content, options);
  },
  (message, error) => new Errors.FileWriteError(message, error),
  'readwrite',
  'Error writing to file with sync access'
);

/**
 * Create a sync access handle for a file
 * 
 * @param fileHandle - File handle to create sync access for
 * @returns Promise resolving to the sync access handle
 */
export const createSyncAccessHandle = withPermissionCheck<FileSystemFileHandle, [], FileSystemSyncAccessHandle>(
  async (fileHandle) => {
    return await core.createSyncAccessHandle(fileHandle);
  },
  (message, error) => new Errors.FileSystemError(message, 'SYNC_ACCESS_HANDLE_ERROR', error),
  'readwrite',
  'Error creating sync access handle'
);

// Export public API
export const fs = {
  // Core operations
  readFile,
  writeFile,
  listDirectory,
  createDirectory,
  fileExists,
  directoryExists,
  getFileHandle,
  
  // Batch operations
  readFiles,
  writeFiles,
  deleteFiles,
  copyFiles,
  moveFiles,
  
  // Sync access operations
  readFileWithSyncAccess,
  writeFileWithSyncAccess,
  createSyncAccessHandle,
  
  // Recursive operations
  recursive,
  
  // Utilities
  utils,
  
  // Permission management
  permissions,
  
  // File handle registry
  registry,
  
  // Error handling and logging
  errors: Errors,
  
  // Cache
  cache
}; 