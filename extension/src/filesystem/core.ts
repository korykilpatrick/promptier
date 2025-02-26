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
import * as Errors from './errors';
import { cache, withCache } from './cache';

/**
 * Default maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Read a file and return its contents
 * 
 * @param fileHandle - File handle to read from
 * @param options - Options for reading
 * @returns Promise resolving to the file contents
 */
export async function readFile(
  fileHandle: FileSystemFileHandle,
  options: FileSystemOptions = {}
): Promise<FileContent> {
  try {
    // First check the cache
    const cachedContent = cache.getCachedFileContent(fileHandle, options);
    if (cachedContent) {
      Errors.logError(Errors.LogLevel.DEBUG, `Cache hit for file: ${fileHandle.name}`);
      return cachedContent;
    }
    
    // Set default options
    const { encoding = 'utf-8', maxSize } = options;
    
    // Get file metadata
    const file = await fileHandle.getFile();
    
    // Check file size if maxSize is set
    if (maxSize !== undefined && file.size > maxSize) {
      throw new Errors.FileWriteError(`File size ${file.size} exceeds maximum size ${maxSize}`);
    }
    
    // Read file content based on encoding
    let data: string | ArrayBuffer;
    if (encoding === 'utf-8' || encoding === 'utf-16' || encoding === 'ascii' || encoding === 'iso-8859-1') {
      data = await file.text();
    } else {
      data = await file.arrayBuffer();
    }
    
    // Create file metadata
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
    
    // Create result object
    const result: FileContent = { data, metadata };
    
    // Cache the result
    cache.cacheFileContent(fileHandle, result, options);
    
    return result;
  } catch (error) {
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    throw new Errors.FileReadError(`Error reading file: ${fileHandle.name}`, error);
  }
}

/**
 * Write content to a file
 * 
 * @param fileHandle - File handle to write to
 * @param content - Content to write to file (string, ArrayBuffer, or FileContent)
 * @param options - Options for writing file
 * @returns Promise resolving when write is complete
 */
export async function writeFile(
  fileHandle: FileSystemFileHandle, 
  content: string | ArrayBuffer | FileContent,
  options: FileSystemOptions = {}
): Promise<void> {
  try {
    // Process content based on type
    const dataToWrite = typeof content === 'object' && 'data' in content 
      ? content.data 
      : content;
    
    const writable = await fileHandle.createWritable();
    await writable.write(dataToWrite);
    await writable.close();
    
    // Invalidate the cache for this file
    const cacheKey = cache.generateFileKey(fileHandle, options);
    cache.delete(cacheKey);
  } catch (error) {
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    throw new Errors.FileWriteError(`Error writing to file: ${fileHandle.name}`, error);
  }
}

/**
 * Delete a file
 * Note: The File System Access API doesn't have a native delete method
 * This implementation is a placeholder and would need to be implemented
 * with the appropriate platform-specific approach
 * 
 * @param fileHandle - File handle to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteFile(
  fileHandle: FileSystemFileHandle
): Promise<void> {
  try {
    // File System Access API doesn't have a native delete method
    // This would use a different approach depending on the platform
    throw new Errors.FileSystemError(
      `Delete operation not implemented for: ${fileHandle.name}`,
      'FILE_DELETE_NOT_IMPLEMENTED'
    );
  } catch (error) {
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    
    throw new Errors.FileSystemError(
      `Failed to delete file: ${fileHandle.name}`,
      'FILE_DELETE_ERROR'
    );
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
      throw new Errors.DirectoryError(
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
    throw new Errors.DirectoryError(
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
    throw new Errors.FileNotFoundError(
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
    throw new Errors.DirectoryError(
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
      throw new Errors.CapabilityError(
        'createSyncAccessHandle', 
        'Sync access handles are not supported in this browser'
      );
    }
  } catch (error) {
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    throw new Errors.FileSystemError(
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
    throw new Errors.FileWriteError(
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
      throw new Errors.FileTooLargeError(
        `File exceeds maximum size of ${maxSize} bytes (${size} bytes)`
      );
    }
    
    // Create a buffer to hold the file data
    const buffer = new ArrayBuffer(size);
    
    // Read the entire file into the buffer
    const bytesRead = accessHandle.read(buffer, { at: 0 });
    
    // If we didn't read the entire file, something went wrong
    if (bytesRead !== size) {
      throw new Errors.FileReadError(
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
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    
    throw new Errors.FileReadError(
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