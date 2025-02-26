/**
 * Utilities for recursive directory operations
 */
import { FileEntry, DirectoryEntry, ProgressCallback } from '../types';
import * as core from '../core';
import * as Errors from '../errors';
import * as permissions from '../permissions';

/**
 * Options for recursive directory operations
 */
export interface RecursiveOptions {
  /** Exclude files/directories matching these patterns */
  exclude?: string[];
  /** Include only files/directories matching these patterns */
  include?: string[];
  /** Maximum depth to recurse (0 = no recursion, just direct children) */
  maxDepth?: number;
  /** Progress callback for long operations */
  progress?: ProgressCallback;
}

/**
 * Check if a file/directory should be included based on patterns
 * 
 * @param name - Name to check against patterns
 * @param patterns - Array of glob patterns
 * @returns Whether the name matches any pattern
 */
function matchesPattern(name: string, patterns: string[]): boolean {
  // Simple glob pattern matching, could be enhanced with an actual glob library
  return patterns.some(pattern => {
    if (pattern.startsWith('*') && pattern.endsWith('*')) {
      // *contains*
      return name.includes(pattern.slice(1, -1));
    } else if (pattern.startsWith('*')) {
      // *suffix
      return name.endsWith(pattern.slice(1));
    } else if (pattern.endsWith('*')) {
      // prefix*
      return name.startsWith(pattern.slice(0, -1));
    } else {
      // exact match
      return name === pattern;
    }
  });
}

/**
 * Check if a file/directory should be included based on options
 * 
 * @param name - Name to check
 * @param options - Recursive options
 * @returns Whether the item should be included
 */
function shouldInclude(name: string, options: RecursiveOptions): boolean {
  // Exclude has priority over include
  if (options.exclude && matchesPattern(name, options.exclude)) {
    return false;
  }
  
  // If include patterns are specified, must match at least one
  if (options.include && options.include.length > 0) {
    return matchesPattern(name, options.include);
  }
  
  // Default to include everything
  return true;
}

/**
 * Recursively list all files and directories
 * 
 * @param dirHandle - Directory handle to list
 * @param options - Recursive options
 * @param currentDepth - Current recursion depth (internal use)
 * @param progressState - Progress tracking state (internal use)
 * @returns Promise resolving to array of entries
 */
export async function listRecursive(
  dirHandle: FileSystemDirectoryHandle,
  options: RecursiveOptions = {},
  currentDepth: number = 0,
  progressState: { completed: number; total: number } = { completed: 0, total: 1 }
): Promise<Array<FileEntry | DirectoryEntry>> {
  try {
    // Check if we've exceeded max depth
    const maxDepth = options.maxDepth ?? Infinity;
    if (currentDepth > maxDepth) {
      return [];
    }
    
    // Get entries at current level
    const entries = await core.listDirectory(dirHandle);
    
    // Update total count (for progress reporting)
    progressState.total += entries.length;
    
    // Initialize results array
    let results: Array<FileEntry | DirectoryEntry> = [];
    
    // Process entries
    for (const entry of entries) {
      // Skip if excluded by options
      if (!shouldInclude(entry.name, options)) {
        continue;
      }
      
      // Add current entry to results
      results.push(entry);
      
      // Increment completed count
      progressState.completed++;
      
      // Report progress if callback provided
      if (options.progress) {
        options.progress({
          completed: progressState.completed,
          total: progressState.total,
          percentage: Math.round((progressState.completed / progressState.total) * 100)
        });
      }
      
      // Recursively process directories if not at max depth
      if (entry.kind === 'directory' && currentDepth < maxDepth) {
        const subEntries = await listRecursive(
          entry.handle,
          options,
          currentDepth + 1,
          progressState
        );
        
        results = results.concat(subEntries);
      }
    }
    
    return results;
  } catch (error) {
    Errors.logError(
      Errors.LogLevel.ERROR,
      `Error during recursive directory listing: ${dirHandle.name}`,
      error
    );
    throw new Errors.DirectoryError(
      `Failed to recursively list directory: ${dirHandle.name}`,
      'RECURSIVE_LIST_ERROR',
      error
    );
  }
}

/**
 * Recursively find files matching a predicate
 * 
 * @param dirHandle - Directory handle to search in
 * @param predicate - Function to test files against
 * @param options - Recursive options
 * @returns Promise resolving to array of matching file entries
 */
export async function findFiles(
  dirHandle: FileSystemDirectoryHandle,
  predicate: (entry: FileEntry | DirectoryEntry) => boolean,
  options: RecursiveOptions = {}
): Promise<Array<FileEntry | DirectoryEntry>> {
  try {
    // Get all entries recursively
    const allEntries = await listRecursive(dirHandle, options);
    
    // Filter matching entries
    return allEntries.filter(predicate);
  } catch (error) {
    Errors.logError(
      Errors.LogLevel.ERROR,
      `Error finding files in directory: ${dirHandle.name}`,
      error
    );
    throw new Errors.DirectoryError(
      `Failed to find files in directory: ${dirHandle.name}`,
      'FIND_FILES_ERROR',
      error
    );
  }
}

/**
 * Recursively delete a directory and all its contents
 * 
 * @param dirHandle - Directory handle to delete recursively
 * @param options - Recursive options
 * @returns Promise resolving when deletion is complete
 */
export async function deleteRecursive(
  dirHandle: FileSystemDirectoryHandle,
  options: RecursiveOptions = {}
): Promise<void> {
  try {
    // Check permissions
    const hasPermission = await permissions.verifyPermission(dirHandle, 'readwrite');
    if (!hasPermission) {
      throw new Errors.PermissionDeniedError(
        `Permission denied for recursive deletion of directory: ${dirHandle.name}`
      );
    }
    
    // List all entries to track progress
    const entries = await core.listDirectory(dirHandle);
    const progressState = { completed: 0, total: entries.length };
    
    // Process each entry
    for (const entry of entries) {
      // Skip if excluded by options
      if (!shouldInclude(entry.name, options)) {
        progressState.completed++;
        continue;
      }
      
      // Handle directories recursively
      if (entry.kind === 'directory') {
        await deleteRecursive(entry.handle, options);
        // After recursively deleting contents, remove the directory
        await dirHandle.removeEntry(entry.name, { recursive: false });
      } else {
        // Delete files
        await dirHandle.removeEntry(entry.name);
      }
      
      // Update progress
      progressState.completed++;
      if (options.progress) {
        options.progress({
          completed: progressState.completed,
          total: progressState.total,
          percentage: Math.round((progressState.completed / progressState.total) * 100)
        });
      }
    }
  } catch (error) {
    Errors.logError(
      Errors.LogLevel.ERROR,
      `Error during recursive directory deletion: ${dirHandle.name}`,
      error
    );
    throw new Errors.DirectoryError(
      `Failed to recursively delete directory: ${dirHandle.name}`,
      'RECURSIVE_DELETE_ERROR',
      error
    );
  }
}

/**
 * Recursively copy a directory and all its contents
 * 
 * @param sourceDirHandle - Source directory handle
 * @param destDirHandle - Destination directory handle
 * @param options - Recursive options
 * @returns Promise resolving to the new directory handle
 */
export async function copyRecursive(
  sourceDirHandle: FileSystemDirectoryHandle,
  destDirHandle: FileSystemDirectoryHandle,
  options: RecursiveOptions & { newName?: string } = {}
): Promise<FileSystemDirectoryHandle> {
  try {
    // Check permissions
    const sourcePermission = await permissions.verifyPermission(sourceDirHandle, 'read');
    if (!sourcePermission) {
      throw new Errors.PermissionDeniedError(
        `Permission denied for reading source directory: ${sourceDirHandle.name}`
      );
    }
    
    const destPermission = await permissions.verifyPermission(destDirHandle, 'readwrite');
    if (!destPermission) {
      throw new Errors.PermissionDeniedError(
        `Permission denied for writing to destination directory: ${destDirHandle.name}`
      );
    }
    
    // Get directory name (or use provided name)
    const dirName = options.newName || sourceDirHandle.name;
    
    // Create destination directory
    const newDirHandle = await destDirHandle.getDirectoryHandle(dirName, { create: true });
    
    // List all entries to track progress
    const entries = await core.listDirectory(sourceDirHandle);
    const progressState = { completed: 0, total: entries.length };
    
    // Process each entry
    for (const entry of entries) {
      // Skip if excluded by options
      if (!shouldInclude(entry.name, options)) {
        progressState.completed++;
        continue;
      }
      
      // Handle directories recursively
      if (entry.kind === 'directory') {
        await copyRecursive(entry.handle, newDirHandle, {
          ...options,
          newName: entry.name
        });
      } else {
        // Copy files
        const fileContent = await core.readFile(entry.handle);
        const newFileHandle = await newDirHandle.getFileHandle(entry.name, { create: true });
        await core.writeFile(newFileHandle, fileContent.data);
      }
      
      // Update progress
      progressState.completed++;
      if (options.progress) {
        options.progress({
          completed: progressState.completed,
          total: progressState.total,
          percentage: Math.round((progressState.completed / progressState.total) * 100)
        });
      }
    }
    
    return newDirHandle;
  } catch (error) {
    Errors.logError(
      Errors.LogLevel.ERROR,
      `Error during recursive directory copy: ${sourceDirHandle.name} to ${destDirHandle.name}`,
      error
    );
    throw new Errors.DirectoryError(
      `Failed to recursively copy directory: ${sourceDirHandle.name}`,
      'RECURSIVE_COPY_ERROR',
      error
    );
  }
} 