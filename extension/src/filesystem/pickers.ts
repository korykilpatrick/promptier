/**
 * File and directory picker utilities for the filesystem module
 */
import * as Errors from './errors';
import { registry } from './registry';
import type { FileEntry, DirectoryEntry } from './types';

// Define a user cancelled error class
class UserCancelledError extends Errors.FileSystemError {
  constructor(message = "User cancelled the operation") {
    super(message, 'USER_CANCELLED');
    this.name = "UserCancelledError";
  }
}

// Define an unsupported operation error
class UnsupportedOperationError extends Errors.FileSystemError {
  constructor(message = "Operation not supported") {
    super(message, 'UNSUPPORTED_OPERATION');
    this.name = "UnsupportedOperationError";
  }
}

// Add these error classes to the Errors namespace
Object.assign(Errors, { UserCancelledError, UnsupportedOperationError });

/**
 * Options for the file picker
 */
export interface FilePickerOptions {
  /**
   * Whether to allow multiple file selection
   */
  multiple?: boolean;
  
  /**
   * Accepted file types (e.g. ['.txt', '.md', 'application/json'])
   */
  acceptTypes?: string[];
  
  /**
   * Whether to exclude the "All Files" option
   */
  excludeAcceptAllOption?: boolean;
  
  /**
   * Whether to allow directory selection instead of files
   */
  directory?: boolean;
}

/**
 * Show a file picker dialog
 * 
 * @param options - Options for the file picker
 * @returns Promise resolving to an array of file entries
 */
export async function showFilePicker(options: FilePickerOptions = {}): Promise<(FileEntry | DirectoryEntry)[]> {
  // Check if File System Access API is available
  if (typeof window === 'undefined' || 
      !('showOpenFilePicker' in window) || 
      !('showDirectoryPicker' in window)) {
    throw new UnsupportedOperationError("File System Access API is not supported in this browser");
  }
  
  try {
    if (options.directory) {
      // Show directory picker
      const dirHandle = await window.showDirectoryPicker();
      const handleId = registry.registerHandle(dirHandle);
      
      // Create directory entry
      const dirEntry: DirectoryEntry = {
        kind: 'directory',
        name: dirHandle.name,
        handle: dirHandle
      };
      
      return [dirEntry];
    } else {
      // Show file picker
      const pickerOptions: any = {
        multiple: options.multiple || false,
        excludeAcceptAllOption: options.excludeAcceptAllOption || false
      };
      
      // Add file types if provided
      if (options.acceptTypes && options.acceptTypes.length > 0) {
        pickerOptions.types = [
          {
            description: "Accepted Files",
            accept: options.acceptTypes.reduce((acc: Record<string, string[]>, type: string) => {
              // Map file extensions to MIME types
              const mimeType = type.startsWith('.') 
                ? `application/${type.substring(1)}` 
                : type;
              acc[mimeType] = [type];
              return acc;
            }, {})
          }
        ];
      }
      
      const fileHandles = await window.showOpenFilePicker(pickerOptions);
      
      // Create file entries
      const fileEntries = await Promise.all(
        fileHandles.map(async (handle: FileSystemFileHandle) => {
          const file = await handle.getFile();
          
          const fileEntry: FileEntry = {
            kind: 'file',
            name: file.name,
            handle: handle,
            lastModified: file.lastModified,
            size: file.size,
            type: file.type
          };
          
          return fileEntry;
        })
      );
      
      return fileEntries;
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new UserCancelledError();
    }
    throw error;
  }
}

/**
 * Show a directory picker dialog
 * 
 * @returns Promise resolving to a directory entry
 */
export async function showDirectoryPicker(): Promise<DirectoryEntry> {
  const entries = await showFilePicker({ directory: true });
  return entries[0] as DirectoryEntry;
}

/**
 * Show a file picker for multiple files
 * 
 * @param options - Options for the file picker
 * @returns Promise resolving to an array of file entries
 */
export async function showMultiFilePicker(options: Omit<FilePickerOptions, 'multiple' | 'directory'> = {}): Promise<FileEntry[]> {
  const entries = await showFilePicker({ ...options, multiple: true, directory: false });
  return entries as FileEntry[];
} 