/**
 * File-specific batch operations
 */
import { executeBatch, groupOperations } from './core';
import { BatchResult, BatchOptions, BatchFileOptions, BatchOperation } from './types';
import { FileContent, FileDataType, FileSystemOptions } from '../types';
import * as core from '../core';
import * as permissions from '../permissions';
import * as Errors from '../errors';

/**
 * Interface for a file write operation
 */
export interface FileWriteOperation {
  /** File handle to write to */
  handle: FileSystemFileHandle;
  /** Content to write to the file */
  content: FileDataType;
}

/**
 * Interface for a file copy/move operation
 */
export interface FileCopyMoveOperation {
  /** Source file handle */
  source: FileSystemFileHandle;
  /** Destination directory handle */
  destination: FileSystemDirectoryHandle;
  /** New filename (optional, uses source filename if not specified) */
  newName?: string;
}

/**
 * Read multiple files in batch
 * 
 * @param fileHandles - Array of file handles to read
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation
 */
export async function readFiles(
  fileHandles: FileSystemFileHandle[],
  options: BatchFileOptions = {}
): Promise<BatchResult<FileContent>> {
  const { verifyPermissions = true, ...batchOptions } = options;
  
  // Create read operations for each file
  const operations: BatchOperation<FileContent>[] = fileHandles.map(handle => async () => {
    if (verifyPermissions) {
      const hasPermission = await permissions.verifyPermission(handle, 'read');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for reading file: ${handle.name}`);
      }
    }
    
    return await core.readFile(handle, options);
  });
  
  return executeBatch<FileContent>(operations, batchOptions);
}

/**
 * Write to multiple files in batch
 * 
 * @param files - Array of file handles and content to write
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation
 */
export async function writeFiles(
  files: FileWriteOperation[],
  options: BatchFileOptions = {}
): Promise<BatchResult<void>> {
  const { verifyPermissions = true, ...batchOptions } = options;
  
  // Create write operations for each file
  const operations: BatchOperation<void>[] = files.map(file => async () => {
    if (verifyPermissions) {
      const hasPermission = await permissions.verifyPermission(file.handle, 'readwrite');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for writing to file: ${file.handle.name}`);
      }
    }
    
    await core.writeFile(file.handle, file.content, options);
  });
  
  return executeBatch<void>(operations, batchOptions);
}

/**
 * Delete multiple files in batch
 * 
 * @param fileHandles - Array of file handles to delete
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation
 */
export async function deleteFiles(
  fileHandles: FileSystemFileHandle[],
  options: BatchOptions = {}
): Promise<BatchResult<void>> {
  const { verifyPermissions = true, ...batchOptions } = options;
  
  // Create delete operations for each file
  const operations: BatchOperation<void>[] = fileHandles.map(handle => async () => {
    if (verifyPermissions) {
      const hasPermission = await permissions.verifyPermission(handle, 'readwrite');
      if (!hasPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for deleting file: ${handle.name}`);
      }
    }
    
    await core.deleteFile(handle);
  });
  
  return executeBatch<void>(operations, batchOptions);
}

/**
 * Copy multiple files in batch
 * 
 * @param operations - Array of source and destination for copy operations
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation with new file handles
 */
export async function copyFiles(
  operations: FileCopyMoveOperation[],
  options: BatchOptions = {}
): Promise<BatchResult<FileSystemFileHandle>> {
  const { verifyPermissions = true, ...batchOptions } = options;
  
  // Create copy operations
  const copyOperations: BatchOperation<FileSystemFileHandle>[] = operations.map(op => async () => {
    // Verify permissions for both source and destination
    if (verifyPermissions) {
      const sourcePermission = await permissions.verifyPermission(op.source, 'read');
      if (!sourcePermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for reading source file: ${op.source.name}`);
      }
      
      const destPermission = await permissions.verifyPermission(op.destination, 'readwrite');
      if (!destPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for writing to destination directory: ${op.destination.name}`);
      }
    }
    
    // Get the source file content
    const content = await core.readFile(op.source);
    
    // Create a new file in the destination directory
    const newName = op.newName || op.source.name;
    const newFileHandle = await op.destination.getFileHandle(newName, { create: true });
    
    // Write the content to the new file
    await core.writeFile(newFileHandle, content.data);
    
    return newFileHandle;
  });
  
  return executeBatch<FileSystemFileHandle>(copyOperations, batchOptions);
}

/**
 * Move multiple files in batch
 * 
 * @param operations - Array of source and destination for move operations
 * @param options - Options for the batch operation
 * @returns Promise resolving to results of the batch operation with new file handles
 */
export async function moveFiles(
  operations: FileCopyMoveOperation[],
  options: BatchOptions = {}
): Promise<BatchResult<FileSystemFileHandle>> {
  const { verifyPermissions = true, ...batchOptions } = options;
  
  // Create move operations (copy + delete)
  const moveOperations: BatchOperation<FileSystemFileHandle>[] = operations.map(op => async () => {
    // Verify permissions for both source and destination
    if (verifyPermissions) {
      const sourcePermission = await permissions.verifyPermission(op.source, 'readwrite');
      if (!sourcePermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for reading/deleting source file: ${op.source.name}`);
      }
      
      const destPermission = await permissions.verifyPermission(op.destination, 'readwrite');
      if (!destPermission) {
        throw new Errors.PermissionDeniedError(`Permission denied for writing to destination directory: ${op.destination.name}`);
      }
    }
    
    // Get the source file content
    const content = await core.readFile(op.source);
    
    // Create a new file in the destination directory
    const newName = op.newName || op.source.name;
    const newFileHandle = await op.destination.getFileHandle(newName, { create: true });
    
    // Write the content to the new file
    await core.writeFile(newFileHandle, content.data);
    
    // Delete the source file
    await core.deleteFile(op.source);
    
    return newFileHandle;
  });
  
  return executeBatch<FileSystemFileHandle>(moveOperations, batchOptions);
}

/**
 * Optimize batch operations by grouping files by their parent directory
 * This allows for more efficient permission checks and operations
 * 
 * @param files - Array of file handles
 * @returns Grouped file handles by parent directory
 */
export function groupFilesByDirectory(files: FileSystemFileHandle[]): Record<string, FileSystemFileHandle[]> {
  return groupOperations(files, (handle) => {
    // Use the parent directory path as the key
    // This is a simplification - in real code we'd need to actually get the parent
    return handle.name.split('/').slice(0, -1).join('/') || '/';
  });
} 