/**
 * Core filesystem operations for the File System Access API
 */
import { 
  FileContent, 
  FileSystemOptions, 
  FileEntry, 
  DirectoryEntry, 
  FileMetadata,
  AccessHandleOptions,
  FileSystemSyncAccessHandle
} from './types';
import * as utils from './utils';
import * as errors from './errors';
import { cache, withCache } from './cache';
import * as permissions from './permissions';

/**
 * Default maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Options for reading files
 */
interface ReadFileOptions {
  /** Text encoding to use when reading the file */
  encoding?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
}

/**
 * Options for writing files
 */
interface WriteFileOptions {
  /** Create file if it doesn't exist */
  create?: boolean;
  /** Whether to truncate the file if it exists */
  truncate?: boolean;
}

// Add this to fix the globalThis error
interface ExtendedGlobalThis {
  rootDirectoryHandle?: FileSystemDirectoryHandle;
}

/**
 * Get the parent directory of a file or directory
 * @param handle Handle to get the parent of
 * @returns Parent directory handle
 */
async function getRoot(handle: FileSystemHandle): Promise<FileSystemDirectoryHandle> {
  // Try to get the parent directory if available
  if ('getParent' in handle && typeof (handle as any).getParent === 'function') {
    try {
      return await (handle as any).getParent();
    } catch (error) {
      console.warn('Could not get parent directory:', error);
    }
  }
  
  // Fallback: For browsers where getParent is not supported, try to use the root handle
  // This is implementation-specific and may not work in all browsers
  const extended = globalThis as unknown as ExtendedGlobalThis;
  if (extended.rootDirectoryHandle) {
    return extended.rootDirectoryHandle;
  }
  
  throw new errors.FileSystemError(
    'Cannot determine parent directory for this file',
    'PARENT_DIRECTORY_UNKNOWN'
  );
}

/**
 * Read a file and return its contents as a string
 * @param handle File handle to read from
 * @param options Read options
 * @returns File contents as a string
 */
export async function readFile(
  handle: FileSystemFileHandle,
  options: ReadFileOptions = {}
): Promise<string> {
  const {
    encoding = 'utf-8',
    maxSize = 10 * 1024 * 1024
  } = options;
  
  try {
    // Log the operation
    errors.logOperation(
      errors.LogLevel.DEBUG, 
      'readFile', 
      `Starting read operation for file: ${handle.name}`,
      undefined,
      { name: handle.name }
    );
    
    // Track performance if enabled
    const startTime = performance.now();
    
    // Get the file
    const file = await handle.getFile();
    
    // Check file size
    if (maxSize && file.size > maxSize) {
      throw new errors.FileTooLargeError(
        `File size (${file.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`
      );
    }
    
    errors.logOperation(
      errors.LogLevel.DEBUG, 
      'readFile', 
      `Reading file ${file.name} (${file.size} bytes)`,
      undefined,
      { name: file.name, size: file.size, type: file.type }
    );
    
    // Read as text
    const content = await file.text();
    
    // Ensure content is never undefined 
    if (content === undefined || content === null) {
      errors.logOperation(
        errors.LogLevel.WARN, 
        'readFile', 
        `File ${file.name} read returned ${content === undefined ? 'undefined' : 'null'}, using empty string`,
        undefined,
        { name: file.name, size: file.size, type: file.type }
      );
      return '';
    }
    
    // Log success
    const duration = Math.round(performance.now() - startTime);
    errors.logOperation(
      errors.LogLevel.INFO, 
      'readFile', 
      `Successfully read file ${file.name} (${content.length} bytes, ${duration}ms)`,
      undefined,
      { name: file.name, size: file.size, duration }
    );
    
    return content;
  } catch (error) {
    // Handle specific error types
    if (error instanceof errors.FileSystemError) {
      throw error;
    }
    
    if ((error as DOMException)?.name === 'NotFoundError') {
      throw new errors.FileNotFoundError('File not found', error);
    }
    
    if ((error as DOMException)?.name === 'NotAllowedError') {
      throw new errors.PermissionDeniedError('Permission denied to read file', error);
    }
    
    throw new errors.FileReadError('Failed to read file', error);
  }
}

/**
 * Write content to a file
 * @param handle File handle to write to
 * @param content Content to write
 * @param options Write options
 */
export async function writeFile(
  handle: FileSystemFileHandle,
  content: string | ArrayBuffer | Blob,
  options: WriteFileOptions = {}
): Promise<void> {
  try {
    // Track performance if enabled
    const startTime = performance.now();
    
    // Log the operation
    errors.logOperation(
      errors.LogLevel.INFO, 
      'writeFile', 
      `Starting write operation for file: ${handle.name}`,
      undefined,
      { name: handle.name }
    );
    
    // Request write permission if needed
    const writeAllowed = await permissions.verifyPermission(handle, 'readwrite');
    if (!writeAllowed) {
      throw new errors.PermissionDeniedError('Permission denied to write to file');
    }
    
    // Get writable stream
    const writable = await handle.createWritable();
    
    // Calculate content size for logging
    let contentSize: number;
    if (typeof content === 'string') {
      contentSize = new Blob([content]).size;
    } else if (content instanceof ArrayBuffer) {
      contentSize = content.byteLength;
    } else {
      contentSize = content.size;
    }
    
    errors.logOperation(
      errors.LogLevel.INFO, 
      'writeFile', 
      `Writing ${contentSize} bytes to file ${handle.name}`,
      undefined,
      { name: handle.name, size: contentSize }
    );
    
    // Write content
    await writable.write(content);
    
    // Close the stream
    await writable.close();
    
    // Log success
    const duration = Math.round(performance.now() - startTime);
    errors.logOperation(
      errors.LogLevel.INFO, 
      'writeFile', 
      `Successfully wrote ${contentSize} bytes to file ${handle.name} (${duration}ms)`,
      undefined,
      { name: handle.name, size: contentSize, duration }
    );
  } catch (error) {
    if (error instanceof errors.FileSystemError) {
      throw error;
    }
    
    if ((error as DOMException)?.name === 'NotFoundError') {
      throw new errors.FileNotFoundError('File not found', error);
    }
    
    if ((error as DOMException)?.name === 'NotAllowedError') {
      throw new errors.PermissionDeniedError('Permission denied to write to file', error);
    }
    
    throw new errors.FileWriteError('Failed to write to file', error);
  }
}

/**
 * Delete a file
 * @param handle File handle to delete
 */
export async function deleteFile(handle: FileSystemFileHandle): Promise<void> {
  try {
    // Track performance if enabled
    const startTime = performance.now();
    
    // Log the operation
    errors.logOperation(
      errors.LogLevel.WARN, 
      'deleteFile', 
      `Starting delete operation for file: ${handle.name}`,
      undefined,
      { name: handle.name }
    );
    
    // Get the parent directory
    const root = await getRoot(handle);
    
    // Get file name
    const name = handle.name;
    
    errors.logOperation(
      errors.LogLevel.WARN, 
      'deleteFile', 
      `Deleting file ${name}`,
      undefined,
      { name }
    );
    
    // Remove the file
    await root.removeEntry(name);
    
    // Log success
    const duration = Math.round(performance.now() - startTime);
    errors.logOperation(
      errors.LogLevel.INFO, 
      'deleteFile', 
      `Successfully deleted file ${name} (${duration}ms)`,
      undefined,
      { name, duration }
    );
  } catch (error) {
    if (error instanceof errors.FileSystemError) {
      throw error;
    }
    
    if ((error as DOMException)?.name === 'NotFoundError') {
      throw new errors.FileNotFoundError('File not found', error);
    }
    
    if ((error as DOMException)?.name === 'NotAllowedError') {
      throw new errors.PermissionDeniedError('Permission denied to delete file', error);
    }
    
    throw new errors.FileSystemError('Failed to delete file', 'FILE_DELETE_ERROR', error);
  }
}

/**
 * List contents of a directory
 * Note: This implementation manually gets each handle due to
 * varying browser support for the entries() and values() methods
 * 
 * @param dirHandle - Directory handle to list
 * @returns Promise resolving to array of directory entries
 */
export async function listDirectory(
  dirHandle: FileSystemDirectoryHandle
): Promise<Array<FileEntry | DirectoryEntry>> {
  const entries: Array<FileEntry | DirectoryEntry> = [];
  
  try {
    // Use a more compatible approach instead of values() or entries()
    // which may not be supported in all browsers
    // @ts-ignore: Using dynamic property access pattern
    for await (const [name, handle] of Object.entries(dirHandle)) {
      // Skip if not a handle
      if (!handle || typeof handle !== 'object' || !('kind' in handle)) {
        continue;
      }
      
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        try {
          const file = await fileHandle.getFile();
          
          entries.push({
            handle: fileHandle,
            name: fileHandle.name || name,
            kind: 'file',
            size: file.size,
            lastModified: file.lastModified,
            type: file.type
          });
        } catch (error) {
          console.error(`Error getting file info for ${name}:`, error);
          // Add basic info if we can't get file details
          entries.push({
            handle: fileHandle,
            name: fileHandle.name || name,
            kind: 'file'
          });
        }
      } else {
        const dirHandle = handle as FileSystemDirectoryHandle;
        entries.push({
          handle: dirHandle,
          name: dirHandle.name || name,
          kind: 'directory'
        });
      }
    }
    
    return entries;
  } catch (error) {
    // Try alternative method if the previous one failed
    try {
      // Newer File System Access API might have a different approach
      // @ts-ignore: keys() might exist in newer implementations
      const keys = dirHandle.keys ? [...await dirHandle.keys()] : [];
      
      for (const name of keys) {
        let handle;
        try {
          // Try to get the entry as a file first
          handle = await dirHandle.getFileHandle(name).catch(() => null);
          
          if (!handle) {
            // If not a file, try as a directory
            handle = await dirHandle.getDirectoryHandle(name).catch(() => null);
          }
          
          if (!handle) continue;
          
          if (handle.kind === 'file') {
            const fileHandle = handle as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            
            entries.push({
              handle: fileHandle,
              name: fileHandle.name || name,
              kind: 'file',
              size: file.size,
              lastModified: file.lastModified,
              type: file.type
            });
          } else {
            entries.push({
              handle: handle as FileSystemDirectoryHandle,
              name: handle.name || name,
              kind: 'directory'
            });
          }
        } catch (error) {
          console.error(`Error processing entry ${name}:`, error);
        }
      }
      
      return entries;
    } catch (fallbackError) {
      console.error("Failed to list directory with either method:", fallbackError);
      throw new errors.DirectoryError(
        `Failed to list directory: ${dirHandle.name}`,
        'DIRECTORY_LIST_ERROR'
      );
    }
  }
}

/**
 * Create a directory
 * 
 * @param parentDirHandle - Parent directory handle
 * @param name - Name of the directory to create
 * @returns Promise resolving to the new directory handle
 */
export async function createDirectory(
  parentDirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parentDirHandle.getDirectoryHandle(name, { create: true });
  } catch (error) {
    throw new errors.DirectoryError(
      `Failed to create directory: ${name}`,
      'DIRECTORY_CREATE_ERROR'
    );
  }
}

/**
 * Check if a file exists in a directory
 * 
 * @param dirHandle - Directory handle to check in
 * @param fileName - Name of the file to check for
 * @returns Promise resolving to whether the file exists
 */
export async function fileExists(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists in a parent directory
 * 
 * @param parentDirHandle - Parent directory handle to check in
 * @param dirName - Name of the directory to check for
 * @returns Promise resolving to whether the directory exists
 */
export async function directoryExists(
  parentDirHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<boolean> {
  try {
    await parentDirHandle.getDirectoryHandle(dirName);
    return true;
  } catch {
    return false;
  }
}

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
    return await dirHandle.getFileHandle(fileName, { create });
  } catch (error) {
    throw new errors.FileNotFoundError(
      `File not found: ${fileName}`,
    );
  }
}

/**
 * Get a directory handle from a parent directory
 * 
 * @param parentDirHandle - Parent directory handle
 * @param dirName - Name of the directory to get
 * @param create - Whether to create the directory if it doesn't exist
 * @returns Promise resolving to the directory handle
 */
export async function getDirectoryHandle(
  parentDirHandle: FileSystemDirectoryHandle,
  dirName: string,
  create: boolean = false
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parentDirHandle.getDirectoryHandle(dirName, { create });
  } catch (error) {
    throw new errors.DirectoryError(
      `Directory not found: ${dirName}`,
      'DIRECTORY_NOT_FOUND'
    );
  }
}

/**
 * Create a sync access handle for efficient file operations
 * 
 * @param fileHandle - File handle to create sync access for
 * @returns Promise resolving to the sync access handle
 */
export async function createSyncAccessHandle(
  fileHandle: FileSystemFileHandle
): Promise<FileSystemSyncAccessHandle> {
  try {
    // Check if createSyncAccessHandle is available
    if ('createSyncAccessHandle' in fileHandle && 
        typeof fileHandle.createSyncAccessHandle === 'function') {
      return await fileHandle.createSyncAccessHandle();
    } else {
      throw new errors.CapabilityError(
        'createSyncAccessHandle', 
        'Sync access handles are not supported in this browser'
      );
    }
  } catch (error) {
    if (error instanceof errors.FileSystemError) {
      throw error;
    }
    throw new errors.FileSystemError(
      `Failed to create sync access handle for file: ${fileHandle.name}`,
      'SYNC_ACCESS_HANDLE_ERROR',
      error
    );
  }
}

/**
 * Write to a file using a sync access handle for better performance
 * 
 * @param fileHandle - File handle to write to
 * @param content - Content to write
 * @param options - Options for writing
 * @returns Promise resolving when write is complete
 */
export async function writeFileWithSyncAccess(
  fileHandle: FileSystemFileHandle,
  content: string | ArrayBuffer,
  options: FileSystemOptions = {}
): Promise<void> {
  let accessHandle: FileSystemSyncAccessHandle | null = null;
  
  try {
    // Get the data buffer
    let buffer: ArrayBuffer;
    if (typeof content === 'string') {
      const encoder = new TextEncoder();
      buffer = encoder.encode(content).buffer;
    } else {
      buffer = content;
    }
    
    // Create a sync access handle
    accessHandle = await createSyncAccessHandle(fileHandle);
    
    // Write the data (sync operations are synchronous but in an async context)
    accessHandle.write(buffer, { at: 0 });
    
    // Truncate to the written length to ensure the file is exactly the size of our data
    accessHandle.truncate(buffer.byteLength);
    
    // Flush to ensure data is written to disk
    accessHandle.flush();
  } catch (error) {
    throw new errors.FileWriteError(
      `Failed to write to file with sync access: ${fileHandle.name}`,
      error
    );
  } finally {
    // Always close the handle when done
    if (accessHandle) {
      try {
        accessHandle.close();
      } catch (closeError) {
        console.error('Error closing sync access handle:', closeError);
      }
    }
  }
}

/**
 * Read from a file using a sync access handle for better performance
 * 
 * @param fileHandle - File handle to read from
 * @param options - Options for reading
 * @returns Promise resolving to file content
 */
export async function readFileWithSyncAccess(
  fileHandle: FileSystemFileHandle,
  options: FileSystemOptions = {}
): Promise<FileContent> {
  let accessHandle: FileSystemSyncAccessHandle | null = null;
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  
  try {
    // Create a sync access handle
    accessHandle = await createSyncAccessHandle(fileHandle);
    
    // Get the file size
    const size = accessHandle.getSize();
    
    if (size > maxSize) {
      throw new errors.FileTooLargeError(
        `File exceeds maximum size of ${maxSize} bytes (${size} bytes)`
      );
    }
    
    // Create a buffer to hold the file data
    const buffer = new ArrayBuffer(size);
    
    // Read the entire file into the buffer
    const bytesRead = accessHandle.read(buffer, { at: 0 });
    
    // If we didn't read the entire file, something went wrong
    if (bytesRead !== size) {
      throw new errors.FileReadError(
        `Failed to read entire file: expected ${size} bytes, got ${bytesRead} bytes`
      );
    }
    
    // Get file metadata
    // We can't directly get metadata from the sync handle, so use the file handle
    const file = await fileHandle.getFile();
    
    // Convert to text if encoding is specified or return as ArrayBuffer
    let data: string | ArrayBuffer = buffer;
    if (options.encoding) {
      const decoder = new TextDecoder(options.encoding);
      data = decoder.decode(new Uint8Array(buffer));
    }
    
    return {
      data,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    };
  } catch (error) {
    if (error instanceof errors.FileSystemError) {
      throw error;
    }
    
    throw new errors.FileReadError(
      `Failed to read file with sync access: ${fileHandle.name}`,
      error
    );
  } finally {
    // Always close the handle when done
    if (accessHandle) {
      try {
        accessHandle.close();
      } catch (closeError) {
        console.error('Error closing sync access handle:', closeError);
      }
    }
  }
} 