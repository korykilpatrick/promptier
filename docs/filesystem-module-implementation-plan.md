# File System Module: Implementation Plan

## Overview

This document outlines the implementation plan for a modular, robust file system access module for the Promptier extension. The module will provide a clean, well-structured API for file operations with proper permissions handling, error management, and performance optimization.

## Goals

- [ ] Create a modular, maintainable file system API
- [ ] Properly handle permissions for file access
- [ ] Implement robust error handling
- [ ] Ensure optimal performance for file operations
- [ ] Provide a clean developer experience

## Architecture

```
extension/src/filesystem/
├── core.ts        # Core filesystem operations
├── permissions.ts # Permission handling 
├── registry.ts    # File handle registry
├── types.ts       # Type definitions
├── errors.ts      # Custom error types
├── utils.ts       # Utility functions
└── index.ts       # Public API
```

## Implementation Timeline

### Phase 1: Foundation and Core Implementation (Week 1)

#### 1. Setup Module Structure
- [ ] Create directory structure at `extension/src/filesystem/`
- [ ] Implement initial type definitions in `types.ts`
- [ ] Set up module exports in `index.ts`

#### 2. Core File Operations Implementation
- [ ] Implement `core.ts` with basic file operations:
  - [ ] `readFile`: Read file content with size checks and optimization
  - [ ] `writeFile`: Write content to files with error handling
  - [ ] `deleteFile`: Remove files safely
  - [ ] `listDirectory`: List contents of directories
  - [ ] `createDirectory`: Create new directories

#### 3. Error Handling System
- [ ] Implement `errors.ts` with custom error classes:
  - [ ] `FileSystemError` as base class
  - [ ] Specialized errors: `PermissionDeniedError`, `FileNotFoundError`, etc.
  - [ ] Error serialization for UI consumption

#### 4. Registry Implementation
- [ ] Enhance the existing `FileHandleRegistry` in `registry.ts`:
  - [ ] Improved IndexedDB persistence
  - [ ] Better handle management and garbage collection
  - [ ] Type safety improvements

### Phase 2: Permission Management (Week 1-2)

#### 1. Permission System Implementation
- [ ] Create `permissions.ts` with:
  - [ ] `requestPermission`: Request read/write permissions
  - [ ] `checkPermission`: Verify existing permissions
  - [ ] `persistPermission`: Save granted permissions
  - [ ] `upgradePermission`: Upgrade from read to write

#### 2. Permission UI Components
- [ ] Create UI components for permission requests
- [ ] Implement toast notifications for permission status

#### 3. Permission Storage
- [ ] Implement permission caching mechanism
- [ ] Develop persistence strategy for permissions

### Phase 3: Public API and Utilities (Week 2)

#### 1. Complete Public API
- [ ] Finalize `index.ts` with well-documented public functions
- [ ] Implement higher-level operations combining core functions

#### 2. Utility Functions
- [ ] Create helpful utility functions in `utils.ts`:
  - [ ] Path manipulation utilities
  - [ ] MIME type detection
  - [ ] File size formatting
  - [ ] Safe file name validation

#### 3. Testing Infrastructure
- [ ] Create unit tests for core functionality
- [ ] Implement integration tests for permission flows

### Phase 4: Migration and Integration (Week 3)

#### 1. FilePicker Component Update
- [ ] Refactor `FilePicker.tsx` to use the new module
- [ ] Enhance UX for file selection

#### 2. File Content Resolver Migration
- [ ] Update `file-content-resolver.ts` to use the new API
- [ ] Migrate existing functionality while maintaining compatibility

#### 3. Document New API
- [ ] Create comprehensive documentation
- [ ] Add JSDoc comments for all public functions

### Phase 5: Optimization and Refinement (Week 3-4)

#### 1. Performance Optimization
- [ ] Implement caching strategies
- [ ] Add batch operations for multiple files
- [ ] Optimize large file handling

#### 2. Error Recovery
- [ ] Implement retry mechanisms
- [ ] Add recovery strategies for common failures

#### 3. Final Integration
- [ ] Ensure all components use the new API
- [ ] Remove deprecated access patterns

## Technical Implementation Details

### Key Type Definitions

```typescript
// filesystem/types.ts
export interface FileSystemOptions {
  maxSize?: number;
  timeout?: number;
  retryCount?: number;
}

export type FileAccessMode = 'read' | 'write' | 'readwrite';

export interface FileContent {
  data: string | ArrayBuffer;
  encoding?: string;
  mimeType?: string;
}

export interface FileEntry {
  handle: FileSystemFileHandle;
  name: string;
  path?: string;
  size?: number;
  lastModified?: number;
  type?: string;
}

export interface DirectoryEntry {
  handle: FileSystemDirectoryHandle;
  name: string;
  path?: string;
}
```

### Error Handling Implementation

```typescript
// filesystem/errors.ts
export class FileSystemError extends Error {
  code: string;
  
  constructor(message: string, code = 'FILESYSTEM_ERROR') {
    super(message);
    this.name = 'FileSystemError';
    this.code = code;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code
    };
  }
}

export class PermissionDeniedError extends FileSystemError {
  constructor(message = 'Permission denied') {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionDeniedError';
  }
}

export class FileNotFoundError extends FileSystemError {
  constructor(message = 'File not found') {
    super(message, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
  }
}

export class FileTooLargeError extends FileSystemError {
  constructor(message = 'File too large') {
    super(message, 'FILE_TOO_LARGE');
    this.name = 'FileTooLargeError';
  }
}

export class FileReadError extends FileSystemError {
  originalError?: any;
  
  constructor(message = 'Failed to read file', originalError?: any) {
    super(message, 'FILE_READ_ERROR');
    this.name = 'FileReadError';
    this.originalError = originalError;
  }
}

export class FileWriteError extends FileSystemError {
  originalError?: any;
  
  constructor(message = 'Failed to write file', originalError?: any) {
    super(message, 'FILE_WRITE_ERROR');
    this.name = 'FileWriteError';
    this.originalError = originalError;
  }
}
```

### Core File Operations

```typescript
// filesystem/core.ts
import { FileContent, FileEntry } from './types';
import * as Errors from './errors';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default

export async function readFile(
  fileHandle: FileSystemFileHandle, 
  options: { maxSize?: number } = {}
): Promise<FileContent> {
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  
  try {
    const file = await fileHandle.getFile();
    
    if (file.size > maxSize) {
      throw new Errors.FileTooLargeError(`File exceeds maximum size of ${maxSize} bytes`);
    }
    
    const text = await file.text();
    return {
      data: text,
      mimeType: file.type
    };
  } catch (error) {
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    
    throw new Errors.FileReadError(
      `Failed to read file: ${fileHandle.name}`, 
      error
    );
  }
}

export async function writeFile(
  fileHandle: FileSystemFileHandle, 
  content: FileContent
): Promise<void> {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(content.data);
    await writable.close();
  } catch (error) {
    throw new Errors.FileWriteError(
      `Failed to write to file: ${fileHandle.name}`,
      error
    );
  }
}

export async function deleteFile(
  fileHandle: FileSystemFileHandle
): Promise<void> {
  try {
    // File System Access API doesn't have a native delete method
    // This would use a different approach depending on the platform
    throw new Error('Not implemented');
  } catch (error) {
    throw new Errors.FileSystemError(
      `Failed to delete file: ${fileHandle.name}`,
      'FILE_DELETE_ERROR'
    );
  }
}

export async function listDirectory(
  dirHandle: FileSystemDirectoryHandle
): Promise<Array<FileEntry | DirectoryEntry>> {
  const entries: Array<FileEntry | DirectoryEntry> = [];
  
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        
        entries.push({
          handle: fileHandle,
          name,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type
        });
      } else {
        entries.push({
          handle: handle as FileSystemDirectoryHandle,
          name
        });
      }
    }
    
    return entries;
  } catch (error) {
    throw new Errors.FileSystemError(
      `Failed to list directory: ${dirHandle.name}`,
      'DIRECTORY_LIST_ERROR'
    );
  }
}

export async function createDirectory(
  parentDirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parentDirHandle.getDirectoryHandle(name, { create: true });
  } catch (error) {
    throw new Errors.FileSystemError(
      `Failed to create directory: ${name}`,
      'DIRECTORY_CREATE_ERROR'
    );
  }
}
```

### Permission Management

```typescript
// filesystem/permissions.ts
import { FileAccessMode } from './types';
import * as Errors from './errors';

export async function requestPermission(
  handle: FileSystemHandle,
  mode: FileAccessMode = 'read'
): Promise<boolean> {
  try {
    // The File System Access API's requestPermission method
    const result = await handle.requestPermission({ mode });
    return result === 'granted';
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function verifyPermission(
  handle: FileSystemHandle,
  mode: FileAccessMode = 'read'
): Promise<boolean> {
  try {
    const options = { mode };
    // Check if permission descriptor is supported
    if (await handle.queryPermission(options) === 'granted') {
      return true;
    }
    
    // Request permission if not already granted
    return await requestPermission(handle, mode);
  } catch (error) {
    console.error('Permission verification failed:', error);
    return false;
  }
}

export async function upgradePermission(
  handle: FileSystemHandle
): Promise<boolean> {
  // Attempt to upgrade from read to readwrite
  return await requestPermission(handle, 'readwrite');
}
```

### Enhanced Registry

```typescript
// filesystem/registry.ts
export class FileHandleRegistry {
  private static instance: FileHandleRegistry;
  private handles: Map<string, FileSystemHandle> = new Map();
  private dbName = 'promptier-file-system';
  private storeName = 'handles';
  private dbPromise: Promise<IDBDatabase> | null = null;

  private constructor() {
    this.initDatabase();
    this.loadHandlesFromDB();
  }

  public static getInstance(): FileHandleRegistry {
    if (!FileHandleRegistry.instance) {
      FileHandleRegistry.instance = new FileHandleRegistry();
    }
    return FileHandleRegistry.instance;
  }

  private initDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.error('[FileHandleRegistry] IndexedDB not supported');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (event) => {
        console.error('[FileHandleRegistry] IndexedDB error:', event);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[FileHandleRegistry] IndexedDB opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
          console.log('[FileHandleRegistry] Created object store:', this.storeName);
        }
      };
    });

    return this.dbPromise;
  }

  public registerHandle(id: string, handle: FileSystemHandle): string {
    this.handles.set(id, handle);
    this.saveHandleToDB(id, handle);
    return id;
  }

  public getHandle(id: string): FileSystemHandle | undefined {
    return this.handles.get(id);
  }

  public removeHandle(id: string): boolean {
    const exists = this.handles.has(id);
    if (exists) {
      this.handles.delete(id);
      this.removeHandleFromDB(id);
    }
    return exists;
  }

  public async getAllHandles(): Promise<Map<string, FileSystemHandle>> {
    await this.loadHandlesFromDB();
    return new Map(this.handles);
  }

  private async saveHandleToDB(id: string, handle: FileSystemHandle): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // We can't directly store the handle in IndexedDB because it's not serializable
      // Instead, we use the FileSystem Access API's serialization capability
      const serialized = await (window as any).FileSystemAccessFileHandle?.serializable?.serialized(handle);
      
      store.put({
        id,
        handle: serialized || handle, // Fall back to handle which may not work in all browsers
        name: handle.name,
        kind: handle.kind,
        timestamp: Date.now()
      });
      
      console.log(`[FileHandleRegistry] Saved handle to DB: ${id}`);
    } catch (error) {
      console.error(`[FileHandleRegistry] Failed to save handle to DB: ${id}`, error);
    }
  }

  private async removeHandleFromDB(id: string): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(id);
      console.log(`[FileHandleRegistry] Removed handle from DB: ${id}`);
    } catch (error) {
      console.error(`[FileHandleRegistry] Failed to remove handle from DB: ${id}`, error);
    }
  }

  private async loadHandlesFromDB(): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const records = request.result;
        console.log(`[FileHandleRegistry] Loaded ${records.length} handles from DB`);
        
        for (const record of records) {
          try {
            // Attempt to deserialize if possible
            let handle = record.handle;
            if ((window as any).FileSystemAccessFileHandle?.serializable?.deserialize) {
              handle = await (window as any).FileSystemAccessFileHandle.serializable.deserialize(record.handle);
            }
            
            this.handles.set(record.id, handle);
          } catch (error) {
            console.warn(`[FileHandleRegistry] Failed to deserialize handle: ${record.id}`, error);
          }
        }
      };
      
      request.onerror = (event) => {
        console.error('[FileHandleRegistry] Failed to load handles from DB', event);
      };
    } catch (error) {
      console.error('[FileHandleRegistry] Error loading handles from DB', error);
    }
  }
}

// Export singleton instance
export const registry = FileHandleRegistry.getInstance();
```

### Public API

```typescript
// filesystem/index.ts
import * as core from './core';
import * as permissions from './permissions';
import { registry } from './registry';
import * as utils from './utils';
import * as Errors from './errors';
import { FileContent, FileSystemOptions, FileEntry, DirectoryEntry } from './types';

/**
 * Read a file and return its contents
 */
export async function readFile(
  fileHandle: FileSystemFileHandle,
  options?: FileSystemOptions
): Promise<string> {
  // Verify permissions before reading
  const hasPermission = await permissions.verifyPermission(fileHandle, 'read');
  if (!hasPermission) {
    throw new Errors.PermissionDeniedError(`Permission denied for reading file: ${fileHandle.name}`);
  }
  
  // Read the file
  const content = await core.readFile(fileHandle, options);
  return content.data as string;
}

/**
 * Write content to a file
 */
export async function writeFile(
  fileHandle: FileSystemFileHandle, 
  content: string,
  options?: FileSystemOptions
): Promise<void> {
  // Verify permissions before writing
  const hasPermission = await permissions.verifyPermission(fileHandle, 'readwrite');
  if (!hasPermission) {
    throw new Errors.PermissionDeniedError(`Permission denied for writing to file: ${fileHandle.name}`);
  }
  
  // Write to the file
  await core.writeFile(fileHandle, { data: content });
}

/**
 * Delete a file
 */
export async function deleteFile(
  fileHandle: FileSystemFileHandle
): Promise<void> {
  // Verify permissions before deleting
  const hasPermission = await permissions.verifyPermission(fileHandle, 'readwrite');
  if (!hasPermission) {
    throw new Errors.PermissionDeniedError(`Permission denied for deleting file: ${fileHandle.name}`);
  }
  
  // Delete the file
  await core.deleteFile(fileHandle);
}

/**
 * List the contents of a directory
 */
export async function listDirectory(
  dirHandle: FileSystemDirectoryHandle
): Promise<Array<FileEntry | DirectoryEntry>> {
  // Verify permissions before listing
  const hasPermission = await permissions.verifyPermission(dirHandle, 'read');
  if (!hasPermission) {
    throw new Errors.PermissionDeniedError(`Permission denied for reading directory: ${dirHandle.name}`);
  }
  
  // List the directory
  return await core.listDirectory(dirHandle);
}

/**
 * Create a directory
 */
export async function createDirectory(
  parentDirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  // Verify permissions before creating
  const hasPermission = await permissions.verifyPermission(parentDirHandle, 'readwrite');
  if (!hasPermission) {
    throw new Errors.PermissionDeniedError(`Permission denied for creating directory in: ${parentDirHandle.name}`);
  }
  
  // Create the directory
  return await core.createDirectory(parentDirHandle, name);
}

// Export the public API
export const fs = {
  readFile,
  writeFile,
  deleteFile,
  listDirectory,
  createDirectory,
  permissions,
  registry,
  utils,
  errors: Errors
};
```

## Integration with Existing Code

### Update FilePicker.tsx

The `FilePicker.tsx` component will be updated to use our new filesystem module:

```typescript
// Before
const fileHandle = await window.showOpenFilePicker(options);
// ...
const file = await fileHandle.getFile();

// After
import { fs } from '../../filesystem';
// ...
const fileHandle = await window.showOpenFilePicker(options);
fs.registry.registerHandle(id, fileHandle);
// ...
const content = await fs.readFile(fileHandle);
```

### Update file-content-resolver.ts

The `file-content-resolver.ts` module will be updated to use our new filesystem module:

```typescript
// Before
export async function ensureFilePermissions(variables: any[]): Promise<boolean> {
  // Current permission checking logic
}

// After
import { fs } from '../filesystem';

export async function ensureFilePermissions(variables: any[]): Promise<boolean> {
  // Use our permissions module
  return await fs.permissions.ensureVariablePermissions(variables);
}

// Before
export async function activeFetchFileContent(entry: any): Promise<string | null> {
  // Current file reading logic
}

// After
export async function activeFetchFileContent(entry: any): Promise<string | null> {
  // Use our file reading module
  try {
    const handle = fs.registry.getHandle(entry.metadata.handleId);
    if (!handle) return null;
    
    return await fs.readFile(handle);
  } catch (error) {
    console.error(`[activeFetchFileContent] Error reading file:`, error);
    return null;
  }
}
```

## Testing Strategy

### Unit Tests

- [ ] Test each core function in isolation
- [ ] Mock FileSystem APIs for deterministic testing
- [ ] Verify error handling works correctly

### Integration Tests

- [ ] Test permission flows
- [ ] Test reading/writing actual files
- [ ] Test file handle persistence

### Component Tests

- [ ] Test UI components with the new filesystem module
- [ ] Ensure user experience is seamless

## Performance Considerations

- [ ] Implement caching for frequently accessed files
- [ ] Consider streaming for large files
- [ ] Optimize permission checks to minimize user prompts
- [ ] Monitor and profile file operations

## Security Considerations

- [ ] Never expose file handles to untrusted contexts
- [ ] Validate all inputs to filesystem operations
- [ ] Implement proper error handling to prevent information leakage
- [ ] Follow the principle of least privilege for file access

## Conclusion

This implementation plan outlines a comprehensive approach to creating a modular, robust file system access module for the Promptier extension. By following this plan, we will create a well-structured, maintainable, and performant solution for file system operations that properly handles permissions and error cases. 