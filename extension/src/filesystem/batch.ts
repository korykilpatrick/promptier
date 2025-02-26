/**
 * Batch operations for filesystem operations
 * Allows for more efficient handling of multiple file operations
 */

import * as Errors from './errors';
import { CapabilityError, FileSystemError } from './errors';
import * as permissions from './permissions';
import * as core from './core';
import { FileContent, FileSystemOptions, ProgressCallback, ProgressInfo } from './types';

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
 * Execute a batch of operations with proper error handling and concurrency
 * 
 * @param operations - Array of operations to execute
 * @param options - Options for batch execution
 * @returns Promise resolving to batch operation results
 */
export async function executeBatch<T>(
  operations: BatchOperation<T>[],
  options: BatchOptions = {}
): Promise<BatchResult<T>> {
  const {
    continueOnError = false,
    maxConcurrent = 0, // 0 means no limit
    onProgress,
    verifyPermissions = true
  } = options;
  
  const results: T[] = [];
  const failedOperations: { index: number; error: Error }[] = [];
  let completed = 0;
  
  if (operations.length === 0) {
    return { success: true, results, failedOperations };
  }
  
  // Helper function to update progress
  const updateProgress = () => {
    if (onProgress) {
      onProgress({
        completed,
        total: operations.length,
        percentage: Math.round((completed / operations.length) * 100)
      });
    }
  };
  
  try {
    // If maxConcurrent is 0 or 1, or there's only one operation, run sequentially
    if (maxConcurrent === 1 || maxConcurrent === 0 && operations.length === 1) {
      for (let i = 0; i < operations.length; i++) {
        try {
          const result = await operations[i]();
          results.push(result);
        } catch (error) {
          failedOperations.push({ 
            index: i, 
            error: Errors.toFileSystemError(error) 
          });
          
          if (!continueOnError) {
            break;
          }
        } finally {
          completed++;
          updateProgress();
        }
      }
    } else {
      // Run with concurrency limit
      const limit = maxConcurrent > 0 ? maxConcurrent : operations.length;
      let active = 0;
      let nextIndex = 0;
      
      // Process operations up to the concurrency limit
      const runNextOperation = async (): Promise<void> => {
        if (nextIndex >= operations.length) {
          return;
        }
        
        const index = nextIndex++;
        active++;
        
        try {
          const result = await operations[index]();
          results[index] = result;
        } catch (error) {
          failedOperations.push({ 
            index, 
            error: Errors.toFileSystemError(error) 
          });
          
          if (!continueOnError) {
            // Skip remaining operations
            nextIndex = operations.length;
          }
        } finally {
          active--;
          completed++;
          updateProgress();
          
          // If we should continue, start another operation
          if (nextIndex < operations.length && (continueOnError || failedOperations.length === 0)) {
            await runNextOperation();
          }
        }
      };
      
      // Start initial batch of operations up to the limit
      const initialBatch = Math.min(limit, operations.length);
      const initialPromises = [];
      
      for (let i = 0; i < initialBatch; i++) {
        initialPromises.push(runNextOperation());
      }
      
      await Promise.all(initialPromises);
    }
    
    const success = failedOperations.length === 0;
    return { success, results, failedOperations };
  } catch (error) {
    throw new Errors.BatchOperationError(
      'Failed to execute batch operations',
      failedOperations,
      error
    );
  }
}

/**
 * Read multiple files in a batch operation
 * 
 * @param fileHandles - Array of file handles to read
 * @param options - Options for reading files and batch execution
 * @returns Promise resolving to batch operation results
 */
export async function readFiles(
  fileHandles: FileSystemFileHandle[],
  options: FileSystemOptions & BatchOptions = {}
): Promise<BatchResult<FileContent>> {
  const {
    continueOnError = true,
    maxConcurrent = 5,
    onProgress,
    verifyPermissions = true,
    ...fileOptions
  } = options;
  
  // If we need to verify permissions first
  if (verifyPermissions) {
    for (const handle of fileHandles) {
      const hasPermission = await permissions.verifyPermission(handle, 'read');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(
          `Permission denied for reading files. Access not granted for: ${handle.name}`
        );
      }
    }
  }
  
  // Create operations
  const operations = fileHandles.map(handle => {
    return async () => {
      return await core.readFile(handle, fileOptions);
    };
  });
  
  return await executeBatch<FileContent>(operations, {
    continueOnError,
    maxConcurrent,
    onProgress
  });
}

/**
 * Write content to multiple files in a batch operation
 * 
 * @param files - Array of file handles and content to write
 * @param options - Options for writing files and batch execution
 * @returns Promise resolving to batch operation results
 */
export async function writeFiles(
  files: Array<{ handle: FileSystemFileHandle; content: string | ArrayBuffer }>,
  options: FileSystemOptions & BatchOptions = {}
): Promise<BatchResult<void>> {
  const {
    continueOnError = false,
    maxConcurrent = 3,
    onProgress,
    verifyPermissions = true,
    ...fileOptions
  } = options;
  
  // If we need to verify permissions first
  if (verifyPermissions) {
    for (const file of files) {
      const hasPermission = await permissions.verifyPermission(file.handle, 'readwrite');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(
          `Permission denied for writing files. Write access not granted for: ${file.handle.name}`
        );
      }
    }
  }
  
  // Create operations
  const operations = files.map(file => {
    return async () => {
      await core.writeFile(file.handle, file.content, fileOptions);
    };
  });
  
  return await executeBatch<void>(operations, {
    continueOnError,
    maxConcurrent,
    onProgress
  });
}

/**
 * Delete multiple files in a batch operation
 * 
 * @param fileHandles - Array of file handles to delete
 * @param options - Options for batch execution
 * @returns Promise resolving to batch operation results
 */
export async function deleteFiles(
  fileHandles: FileSystemFileHandle[],
  options: BatchOptions = {}
): Promise<BatchResult<void>> {
  const {
    continueOnError = false,
    maxConcurrent = 5,
    onProgress,
    verifyPermissions = true
  } = options;
  
  // If we need to verify permissions first
  if (verifyPermissions) {
    for (const handle of fileHandles) {
      const hasPermission = await permissions.verifyPermission(handle, 'readwrite');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(
          `Permission denied for deleting files. Write access not granted for: ${handle.name}`
        );
      }
    }
  }
  
  // Create operations
  const operations = fileHandles.map(handle => {
    return async () => {
      // Check if the file exists
      await handle.getFile();
      
      // Use the File System Access API to delete
      if ('remove' in handle && typeof handle.remove === 'function') {
        await handle.remove();
      } else {
        // Create a custom error message for missing remove capability
        const errorMessage = `Browser does not support the remove method on file handles`;
        throw new Errors.FileSystemError(errorMessage, 'CAPABILITY_ERROR');
      }
    };
  });
  
  return await executeBatch<void>(operations, {
    continueOnError,
    maxConcurrent,
    onProgress
  });
}

/**
 * Copy multiple files in a batch operation
 * 
 * @param operations - Array of source and destination for copy operations
 * @param options - Options for batch execution
 * @returns Promise resolving to batch operation results
 */
export async function copyFiles(
  operations: Array<{ 
    source: FileSystemFileHandle; 
    destination: FileSystemDirectoryHandle; 
    newName?: string;
  }>,
  options: BatchOptions = {}
): Promise<BatchResult<FileSystemFileHandle>> {
  const {
    continueOnError = false,
    maxConcurrent = 3,
    onProgress,
    verifyPermissions = true
  } = options;
  
  // If we need to verify permissions first
  if (verifyPermissions) {
    for (const op of operations) {
      // Need read permission for source
      const hasSourcePermission = await permissions.verifyPermission(
        op.source, 'read'
      );
      
      // Need write permission for destination
      const hasDestPermission = await permissions.verifyPermission(
        op.destination, 'readwrite'
      );
      
      if (!hasSourcePermission || !hasDestPermission) {
        throw new Errors.PermissionDeniedError(
          'Permission denied for copying files. ' + 
          (!hasSourcePermission ? `Read access not granted for: ${op.source.name}. ` : '') +
          (!hasDestPermission ? `Write access not granted for destination directory.` : '')
        );
      }
    }
  }
  
  // Create operations
  const copyOps = operations.map(op => {
    return async () => {
      // Read the source file
      const file = await op.source.getFile();
      const fileContent = await file.arrayBuffer();
      
      // Create a new file in the destination directory
      const newName = op.newName || op.source.name;
      const newFileHandle = await op.destination.getFileHandle(newName, { create: true });
      
      // Write the content to the new file
      const writable = await newFileHandle.createWritable();
      await writable.write(fileContent);
      await writable.close();
      
      return newFileHandle;
    };
  });
  
  return await executeBatch<FileSystemFileHandle>(copyOps, {
    continueOnError,
    maxConcurrent,
    onProgress
  });
}

/**
 * Move multiple files in a batch operation (copy + delete)
 * 
 * @param operations - Array of source and destination for move operations
 * @param options - Options for batch execution
 * @returns Promise resolving to batch operation results
 */
export async function moveFiles(
  operations: Array<{ 
    source: FileSystemFileHandle; 
    destination: FileSystemDirectoryHandle; 
    newName?: string;
  }>,
  options: BatchOptions = {}
): Promise<BatchResult<FileSystemFileHandle>> {
  const {
    continueOnError = false,
    maxConcurrent = 3,
    onProgress,
    verifyPermissions = true
  } = options;
  
  // Copy the files first
  const copyResult = await copyFiles(operations, {
    ...options,
    onProgress: onProgress ? 
      (progress: ProgressInfo) => onProgress({
        ...progress,
        total: progress.total * 2, // Adjust for two-phase operation
        percentage: Math.round(progress.percentage / 2) // Half of the total progress
      }) : undefined
  });
  
  // If copy failed and we shouldn't continue on error, return the result
  if (!copyResult.success && !continueOnError) {
    return copyResult;
  }
  
  // Create delete operations for successfully copied files
  const deleteOps: BatchOperation<void>[] = [];
  const sourceHandlesToDelete: FileSystemFileHandle[] = [];
  
  // Only delete sources that were successfully copied
  for (let i = 0; i < operations.length; i++) {
    // Skip failed operations
    if (copyResult.failedOperations.some(op => op.index === i)) {
      continue;
    }
    
    sourceHandlesToDelete.push(operations[i].source);
  }
  
  // Delete the original files
  if (sourceHandlesToDelete.length > 0) {
    const deleteResult = await deleteFiles(sourceHandlesToDelete, {
      continueOnError,
      maxConcurrent,
      verifyPermissions,
      onProgress: onProgress ?
        (progress: ProgressInfo) => onProgress({
          completed: copyResult.results.length + progress.completed,
          total: operations.length * 2,
          percentage: 50 + Math.round(progress.percentage / 2) // Second half of progress
        }) : undefined
    });
    
    // Combine the results
    return {
      success: copyResult.success && deleteResult.success,
      results: copyResult.results,
      failedOperations: [
        ...copyResult.failedOperations,
        ...deleteResult.failedOperations.map(op => ({
          index: sourceHandlesToDelete[op.index] ? 
            operations.findIndex(o => o.source === sourceHandlesToDelete[op.index]) : 
            op.index,
          error: new Errors.FileSystemError(
            `Failed to delete source file after copying: ${op.error.message}`,
            'MOVE_DELETE_ERROR',
            op.error
          )
        }))
      ]
    };
  }
  
  return copyResult;
} 