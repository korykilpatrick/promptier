# Filesystem Module Documentation

## Overview

The filesystem module provides a robust and consistent interface for interacting with the File System Access API in the browser. It offers a range of features including file/directory picker dialogs, file reading/writing, handle management, caching, permissions handling, and recursive directory operations.

## Key Features

- **Modern API**: Simple, promise-based API for accessing the filesystem
- **Type Safety**: Full TypeScript support with detailed types
- **Robust Error Handling**: Consistent error types and detailed error messages
- **Handle Registry**: Central registry for file and directory handles
- **Content Caching**: Performance optimizations for frequently accessed files
- **Batch Operations**: Process multiple files efficiently
- **Recursive Processing**: Easily traverse directory trees
- **Permission Management**: Simplified permission requests and verification

## Core Components

The filesystem module consists of the following components:

### Core API (`core.ts`)

Basic file system operations:

```typescript
import { fs } from '../filesystem';

// Read a file
const content = await fs.readFile(fileHandle, { encoding: 'utf-8' });

// Write to a file
await fs.writeFile(fileHandle, 'Hello, world!');

// Get file information
const info = await fs.getFileInfo(fileHandle);
```

### Pickers (`pickers.ts`)

File and directory selection dialogs:

```typescript
import { fs } from '../filesystem';

// Pick a single file
const fileEntry = await fs.showFilePicker({
  multiple: false,
  acceptTypes: ['.txt', '.md']
});

// Pick multiple files
const fileEntries = await fs.showFilePicker({
  multiple: true,
  acceptTypes: ['.jpg', '.png']
});

// Pick a directory
const dirEntry = await fs.showDirectoryPicker();
```

### Handle Registry (`registry.ts`)

Central storage for file handles:

```typescript
import { fs } from '../filesystem';

// Register a handle
const handleId = fs.registry.registerHandle(fileHandle);

// Retrieve a handle
const handle = fs.registry.getHandle(handleId);

// Check if a handle exists
const exists = await fs.registry.hasHandle(handleId);
```

### Permissions (`permissions.ts`)

Manage file system permissions:

```typescript
import { fs } from '../filesystem';

// Check permission
const hasPermission = await fs.permissions.verifyPermission(
  fileHandle, 
  'readwrite'
);

// Request permission
await fs.permissions.requestPermission(fileHandle, 'read');
```

### Cache (`cache.ts`)

Performance optimizations for file access:

```typescript
import { fs } from '../filesystem';
import { cache } from '../filesystem/cache';

// Get cached file content
const cachedContent = cache.getCachedFileContent(fileHandle);

// Cache file content
cache.cacheFileContent(fileHandle, {
  data: 'File content here',
  metadata: {
    name: 'example.txt',
    size: 1024,
    type: 'text/plain',
    lastModified: Date.now()
  }
});

// Clear cache
cache.clearCache();
```

### Batch Operations (`batch.ts`)

Process multiple files:

```typescript
import { fs } from '../filesystem';

// Read multiple files
const results = await fs.batch.readFiles([fileHandle1, fileHandle2], {
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});

// Process a list of files
await fs.batch.processFiles([fileHandle1, fileHandle2], {
  processor: async (handle) => {
    const content = await fs.readFile(handle);
    return content.length;
  },
  onProgress: (completed, total) => {
    console.log(`Processed ${completed}/${total} files`);
  }
});
```

### Recursive Operations (`recursive.ts`)

Working with directory trees:

```typescript
import { fs } from '../filesystem';

// List files recursively
const entries = await fs.recursive.listRecursive(dirHandle, {
  maxDepth: 5,
  include: ['*.txt', '*.md'],
  exclude: ['node_modules']
});

// Process files recursively
await fs.recursive.processRecursive(dirHandle, {
  processor: async (entry) => {
    if (entry.kind === 'file') {
      const content = await fs.readFile(entry.handle);
      console.log(`${entry.name}: ${content.length} bytes`);
    }
  },
  maxDepth: 3
});
```

## Error Handling

The filesystem module provides structured error types to help with error handling:

```typescript
import { fs } from '../filesystem';

try {
  await fs.readFile(fileHandle);
} catch (error) {
  if (error instanceof fs.errors.FileTooLargeError) {
    console.error('File is too large');
  } else if (error instanceof fs.errors.PermissionDeniedError) {
    console.error('Permission denied');
  } else if (error instanceof fs.errors.FileNotFoundError) {
    console.error('File not found');
  } else if (error instanceof fs.errors.FileSystemError) {
    console.error(`File system error: ${error.message} (code: ${error.code})`);
  } else {
    console.error('Unknown error', error);
  }
}
```

## Integration with Component System

### FilePicker Component

The FilePicker component is fully integrated with the filesystem module:

```typescript
import { fs } from '../filesystem';
import type { FileEntry, DirectoryEntry } from '../filesystem/types';

// In component code
const openFilePicker = async () => {
  try {
    const entries = await fs.showFilePicker({ 
      multiple: allowMultiple,
      acceptTypes: acceptTypes
    });
    
    // Process entries...
  } catch (error) {
    if (error instanceof fs.errors.FileSystemError && error.code === 'USER_CANCELLED') {
      console.log('User cancelled selection');
    } else {
      console.error('Error selecting files', error);
    }
  }
};
```

### File Content Resolution

The file content resolver uses the filesystem module for efficient content processing:

```typescript
import { fs } from '../filesystem';
import { cache } from '../filesystem/cache';

// Check if content is in cache
const cachedContent = cache.getCachedFileContent(handle);
if (cachedContent) {
  return cachedContent.data;
}

// Read file content
const content = await fs.readFile(handle, {
  maxSize: options.maxFileSize,
  encoding: 'utf-8'
});

// Cache the content
cache.cacheFileContent(handle, {
  data: content,
  metadata: {
    // ...file metadata
  }
});
```

## Performance Considerations

- Use the cache system for frequently accessed files
- Use batch operations for processing multiple files
- Set appropriate file size limits to avoid memory issues
- Implement progress tracking for long-running operations

## Best Practices

1. **Always handle errors**: Use specific error types for better error handling
2. **Use the registry**: Store handles in the registry to ensure they're accessible throughout the app
3. **Check permissions**: Always verify permissions before reading/writing files
4. **Implement progress reporting**: Use progress callbacks for batch and recursive operations
5. **Leverage caching**: Cache file contents for improved performance 