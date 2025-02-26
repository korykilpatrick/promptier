/**
 * Type definitions for the filesystem module
 */

/**
 * Text encoding options
 */
export type TextEncoding = 'utf-8' | 'utf-16' | 'ascii' | 'iso-8859-1';

/**
 * Options for filesystem operations
 */
export interface FileSystemOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Encoding for text operations */
  encoding?: TextEncoding;
  /** Maximum file size in bytes */
  maxSize?: number;
}

/**
 * File access modes
 */
export type FileAccessMode = 'read' | 'readwrite';

/**
 * File content types that can be returned
 */
export type FileDataType = string | ArrayBuffer;

/**
 * File content returned from read operations
 */
export interface FileContent {
  /** File data as string or ArrayBuffer */
  data: FileDataType;
  /** File metadata */
  metadata: FileMetadata;
}

/**
 * Entry for a file in directory listings
 */
export interface FileEntry {
  /** Entry name */
  name: string;
  /** Entry kind */
  kind: 'file';
  /** File handle */
  handle: FileSystemFileHandle;
  /** Last modified timestamp (if available) */
  lastModified?: number;
  /** File size in bytes (if available) */
  size?: number;
  /** File type (if available) */
  type?: string;
}

/**
 * Entry for a directory in directory listings
 */
export interface DirectoryEntry {
  /** Entry name */
  name: string;
  /** Entry kind */
  kind: 'directory';
  /** Directory handle */
  handle: FileSystemDirectoryHandle;
}

/**
 * Union type for file system entries
 */
export type FileSystemEntry = FileEntry | DirectoryEntry;

/**
 * Progress information for operations
 */
export interface ProgressInfo {
  /** Number of completed items */
  completed: number;
  /** Total number of items */
  total: number;
  /** Percentage of completion (0-100) */
  percentage: number;
}

/**
 * Callback for progress updates
 */
export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Options for file access handle operations
 */
export interface AccessHandleOptions extends FileSystemOptions {
  /** Whether to create a sync access handle */
  sync?: boolean;
}

/**
 * Interface for metadata of a file
 */
export interface FileMetadata {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  type: string;
  /** Last modified timestamp */
  lastModified: number;
}

/**
 * Result of a file operation
 */
export interface FileOperationResult<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data if operation was successful */
  data?: T;
  /** Error information if operation failed */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
  };
}

/**
 * Read options for file access handles
 */
export interface ReadOptions {
  /** Position to read from */
  at?: number;
}

/**
 * Write options for file access handles
 */
export interface WriteOptions {
  /** Position to write to */
  at?: number;
}

/**
 * Interface for the FileSystemSyncAccessHandle from the File System Access API
 * This provides synchronous read/write operations for better performance
 */
export interface FileSystemSyncAccessHandle {
  /**
   * Close the access handle
   */
  close(): void;
  
  /**
   * Flush any changes to disk
   */
  flush(): void;
  
  /**
   * Get the size of the file
   * @returns The size of the file in bytes
   */
  getSize(): number;
  
  /**
   * Truncate the file to the specified size
   * @param size The new size of the file
   */
  truncate(size: number): void;
  
  /**
   * Read data from the file into a buffer
   * @param buffer The buffer to read into
   * @param options Read options including position
   * @returns The number of bytes read
   */
  read(buffer: ArrayBuffer, options?: ReadOptions): number;
  
  /**
   * Write data from a buffer to the file
   * @param buffer The buffer to write from
   * @param options Write options including position
   * @returns The number of bytes written
   */
  write(buffer: ArrayBuffer, options?: WriteOptions): number;
} 