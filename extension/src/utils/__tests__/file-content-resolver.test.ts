/**
 * @jest-environment jsdom
 * Tests for file-content-resolver.ts with a focus on recursive directory operations
 * 
 * Note: To fix linter errors in this file, follow the instructions in TESTING.md:
 * 1. Install Jest types: npm install --save-dev @types/jest
 * 2. Update tsconfig.json to include Jest types in the "types" array
 * 3. Add explicit type annotations to parameters
 * 
 * Example fixes:
 * - import type { Mock } from 'jest';
 * - (fs.registry.getHandle as Mock).mockImplementation((id: string) => {...});
 */
import { resolveFileContents, activeResolveAllFileContents } from '../file-content-resolver';
import { VARIABLE_ENTRY_TYPES } from 'shared/types/variables';
import { fs } from '../../filesystem';
import type { FileSystemFileHandle, FileSystemDirectoryHandle } from '../../filesystem/types';

// Explicitly import Jest types
import type { Mock } from 'jest';

// Mock the filesystem module
jest.mock('../../filesystem', () => ({
  fs: {
    registry: {
      getHandle: jest.fn(),
      registerHandle: jest.fn()
    },
    readFile: jest.fn(),
    recursive: {
      listRecursive: jest.fn()
    },
    errors: {
      FileTooLargeError: class FileTooLargeError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'FileTooLargeError';
        }
      },
      PermissionDeniedError: class PermissionDeniedError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'PermissionDeniedError';
        }
      },
      FileSystemError: class FileSystemError extends Error {
        code: string;
        constructor(message: string, code: string) {
          super(message);
          this.name = 'FileSystemError';
          this.code = code;
        }
      }
    }
  }
}));

// Mock cache module
jest.mock('../../filesystem/cache', () => ({
  cache: {
    getCachedFileContent: jest.fn(),
    cacheFileContent: jest.fn()
  }
}));

describe('file-content-resolver', () => {
  // Mock file handle
  const mockFileHandle = {
    kind: 'file',
    name: 'test.txt',
    getFile: jest.fn().mockResolvedValue({
      name: 'test.txt',
      size: 1024,
      type: 'text/plain',
      lastModified: Date.now()
    })
  } as unknown as FileSystemFileHandle;
  
  // Mock directory handle
  const mockDirHandle = {
    kind: 'directory',
    name: 'testDir'
  } as unknown as FileSystemDirectoryHandle;
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (fs.registry.getHandle as Mock).mockImplementation((id: string) => {
      if (id === 'file-1') return mockFileHandle;
      if (id === 'dir-1') return mockDirHandle;
      return null;
    });
    
    (fs.registry.registerHandle as Mock).mockImplementation((handle: FileSystemHandle) => {
      if (handle === mockFileHandle) return 'file-1';
      if (handle === mockDirHandle) return 'dir-1';
      return `handle-${Math.random()}`;
    });
    
    (fs.readFile as Mock).mockResolvedValue('File content');
    
    // Mock implementation for recursive directory listing
    (fs.recursive.listRecursive as Mock).mockResolvedValue([
      {
        kind: 'file',
        name: 'file1.txt',
        handle: { 
          kind: 'file',
          name: 'file1.txt',
          getFile: jest.fn().mockResolvedValue({
            name: 'file1.txt',
            size: 1000,
            type: 'text/plain',
            lastModified: Date.now()
          })
        },
        size: 1000,
        type: 'text/plain',
        lastModified: Date.now()
      },
      {
        kind: 'file',
        name: 'file2.js',
        handle: { 
          kind: 'file',
          name: 'file2.js',
          getFile: jest.fn().mockResolvedValue({
            name: 'file2.js',
            size: 2000,
            type: 'application/javascript',
            lastModified: Date.now()
          })
        },
        size: 2000,
        type: 'application/javascript',
        lastModified: Date.now()
      }
    ]);
  });
  
  describe('resolveFileContents', () => {
    test('should process directory entries recursively when recursive option is enabled', async () => {
      // Create variables with directory entries
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.DIRECTORY,
              value: 'testDir',
              metadata: {
                path: 'testDir',
                handle: 'dir-1',
                recursive: {
                  enabled: true,
                  maxDepth: 2
                }
              }
            }
          ]
        }
      ];
      
      // Call resolveFileContents with recursive option enabled
      const result = await resolveFileContents(variables, {
        recursive: {
          enabled: true,
          maxDepth: 2
        }
      });
      
      // Verify recursive.listRecursive was called
      expect(fs.recursive.listRecursive).toHaveBeenCalledWith(
        mockDirHandle,
        expect.objectContaining({
          maxDepth: 2
        })
      );
      
      // Verify directory was processed and files were added
      expect(result[0].value.length).toBeGreaterThan(1);
      expect(result[0].value[0].metadata.contentResolved).toBe(true);
      
      // Check that the original directory entry is preserved
      expect(result[0].value[0].type).toBe(VARIABLE_ENTRY_TYPES.DIRECTORY);
      expect(result[0].value[0].value).toBe('testDir');
      
      // Check that file entries were added
      expect(result[0].value[1].type).toBe(VARIABLE_ENTRY_TYPES.FILE);
      expect(result[0].value[2].type).toBe(VARIABLE_ENTRY_TYPES.FILE);
    });
    
    test('should not process directories when recursive option is disabled', async () => {
      // Create variables with directory entries
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.DIRECTORY,
              value: 'testDir',
              metadata: {
                path: 'testDir',
                handle: 'dir-1'
              }
            }
          ]
        }
      ];
      
      // Call resolveFileContents with recursive option disabled
      const result = await resolveFileContents(variables, {
        recursive: {
          enabled: false
        }
      });
      
      // Verify recursive.listRecursive was not called
      expect(fs.recursive.listRecursive).not.toHaveBeenCalled();
      
      // Verify directory was not processed
      expect(result[0].value.length).toBe(1);
      expect(result[0].value[0].metadata.contentResolved).toBeUndefined();
    });
    
    test('should respect directory-specific recursive settings', async () => {
      // Create variables with directory entries
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.DIRECTORY,
              value: 'testDir1',
              metadata: {
                path: 'testDir1',
                handle: 'dir-1',
                recursive: {
                  enabled: true,
                  maxDepth: 3,
                  include: ['*.js']
                }
              }
            },
            {
              type: VARIABLE_ENTRY_TYPES.DIRECTORY,
              value: 'testDir2',
              metadata: {
                path: 'testDir2',
                handle: 'dir-1',
                recursive: {
                  enabled: false
                }
              }
            }
          ]
        }
      ];
      
      // Call resolveFileContents with recursive option enabled
      const result = await resolveFileContents(variables, {
        recursive: {
          enabled: true,
          maxDepth: 1
        }
      });
      
      // Verify recursive.listRecursive was called only for the first directory
      expect(fs.recursive.listRecursive).toHaveBeenCalledTimes(1);
      expect(fs.recursive.listRecursive).toHaveBeenCalledWith(
        mockDirHandle,
        expect.objectContaining({
          maxDepth: 3,
          include: ['*.js']
        })
      );
      
      // Verify only first directory was processed
      expect(result[0].value[0].metadata.contentResolved).toBe(true);
      expect(result[0].value[1].metadata.contentResolved).toBeUndefined();
    });
    
    test('should handle file size limits correctly', async () => {
      // Set up a large file
      const largeFileHandle = {
        kind: 'file',
        name: 'large.bin',
        getFile: jest.fn().mockResolvedValue({
          name: 'large.bin',
          size: 2 * 1024 * 1024, // 2MB (exceeding default limit)
          type: 'application/octet-stream',
          lastModified: Date.now()
        })
      };
      
      // Mock registry to return our large file handle
      (fs.registry.getHandle as jest.Mock).mockImplementation((id) => {
        if (id === 'large-file') return largeFileHandle;
        return null;
      });
      
      // Mock readFile to throw FileTooLargeError for this file
      (fs.readFile as jest.Mock).mockImplementation(async (handle) => {
        if (handle === largeFileHandle) {
          throw new fs.errors.FileTooLargeError("File exceeds size limit");
        }
        return "File content";
      });
      
      // Create test variables with the large file
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: 'large.bin',
              metadata: {
                handleId: 'large-file',
                size: 2 * 1024 * 1024,
                path: 'large.bin'
              }
            }
          ]
        }
      ];
      
      // Call resolveFileContents
      const result = await resolveFileContents(variables);
      
      // Verify error handling
      expect(fs.readFile).toHaveBeenCalledWith(largeFileHandle, expect.objectContaining({
        maxSize: expect.any(Number),
        encoding: 'utf-8'
      }));
      
      // The original entry should still be present but without resolved content
      expect(result[0].value[0].metadata.contentResolved).toBeFalsy();
    });
    
    test('should handle permission denied errors gracefully', async () => {
      // Set up a file that will trigger permission error
      const noPermissionFileHandle = {
        kind: 'file',
        name: 'protected.txt',
        getFile: jest.fn().mockResolvedValue({
          name: 'protected.txt',
          size: 1024,
          type: 'text/plain',
          lastModified: Date.now()
        })
      };
      
      // Mock registry to return our file handle
      (fs.registry.getHandle as jest.Mock).mockImplementation((id) => {
        if (id === 'protected-file') return noPermissionFileHandle;
        return null;
      });
      
      // Mock readFile to throw PermissionDeniedError for this file
      (fs.readFile as jest.Mock).mockImplementation(async (handle) => {
        if (handle === noPermissionFileHandle) {
          throw new fs.errors.PermissionDeniedError("Permission denied");
        }
        return "File content";
      });
      
      // Create test variables with the protected file
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: 'protected.txt',
              metadata: {
                handleId: 'protected-file',
                size: 1024,
                path: 'protected.txt'
              }
            }
          ]
        }
      ];
      
      // Call resolveFileContents
      const result = await resolveFileContents(variables);
      
      // Verify error handling
      expect(fs.readFile).toHaveBeenCalledWith(noPermissionFileHandle, expect.any(Object));
      
      // The original entry should still be present but without resolved content
      expect(result[0].value[0].metadata.contentResolved).toBeFalsy();
    });
    
    test('should handle different file types appropriately', async () => {
      // Set up handles for different file types
      const textFileHandle = {
        kind: 'file',
        name: 'text.txt',
        getFile: jest.fn().mockResolvedValue({
          name: 'text.txt',
          size: 100,
          type: 'text/plain',
          lastModified: Date.now()
        })
      };
      
      const imageFileHandle = {
        kind: 'file',
        name: 'image.png',
        getFile: jest.fn().mockResolvedValue({
          name: 'image.png',
          size: 5000,
          type: 'image/png',
          lastModified: Date.now()
        })
      };
      
      // Mock registry to return different file handles
      (fs.registry.getHandle as jest.Mock).mockImplementation((id) => {
        if (id === 'text-file') return textFileHandle;
        if (id === 'image-file') return imageFileHandle;
        return null;
      });
      
      // Mock readFile to return different content based on file type
      (fs.readFile as jest.Mock).mockImplementation(async (handle) => {
        if (handle === textFileHandle) return "Plain text content";
        if (handle === imageFileHandle) return "[Binary image data would be here]";
        return "Default content";
      });
      
      // Create test variables with different file types
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: 'text.txt',
              metadata: {
                handleId: 'text-file',
                size: 100,
                type: 'text/plain',
                path: 'text.txt'
              }
            },
            {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: 'image.png',
              metadata: {
                handleId: 'image-file',
                size: 5000,
                type: 'image/png',
                path: 'image.png'
              }
            }
          ]
        }
      ];
      
      // Call resolveFileContents
      const result = await resolveFileContents(variables);
      
      // Verify both files were processed correctly
      expect(fs.readFile).toHaveBeenCalledTimes(2);
      
      // Both entries should have content resolved
      expect(result[0].value[0].metadata.contentResolved).toBe(true);
      expect(result[0].value[1].metadata.contentResolved).toBe(true);
      
      // Check tags are created appropriately for different file types
      expect(result[0].value[0].value).toContain("<text_txt>");
      expect(result[0].value[1].value).toContain("<image_png>");
    });
  });
  
  describe('activeResolveAllFileContents', () => {
    test('should call resolveFileContents with recursive options', async () => {
      // Spy on resolveFileContents
      const resolveFileContentsSpy = jest.spyOn(
        require('../file-content-resolver'), 
        'resolveFileContents'
      ).mockResolvedValue([]);
      
      // Create variables with directory entries
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.DIRECTORY,
              value: 'testDir',
              metadata: {
                path: 'testDir',
                handle: 'dir-1'
              }
            }
          ]
        }
      ];
      
      // Call activeResolveAllFileContents with recursive options
      await activeResolveAllFileContents(variables, {
        recursive: {
          enabled: true,
          maxDepth: 5,
          include: ['*.txt', '*.md'],
          exclude: ['node_modules']
        }
      });
      
      // Verify resolveFileContents was called with the correct options
      expect(resolveFileContentsSpy).toHaveBeenCalledWith(
        variables,
        expect.objectContaining({
          recursive: {
            enabled: true,
            maxDepth: 5,
            include: ['*.txt', '*.md'],
            exclude: ['node_modules']
          }
        })
      );
      
      // Restore original implementation
      resolveFileContentsSpy.mockRestore();
    });
    
    test('should handle mixed success/failure when processing multiple files', async () => {
      // Set up handles for a successful file and a failing file
      const successFileHandle = {
        kind: 'file',
        name: 'success.txt',
        getFile: jest.fn().mockResolvedValue({
          name: 'success.txt',
          size: 100,
          type: 'text/plain',
          lastModified: Date.now()
        })
      };
      
      const failingFileHandle = {
        kind: 'file',
        name: 'failing.txt',
        getFile: jest.fn().mockImplementation(() => {
          throw new Error("File cannot be accessed");
        })
      };
      
      // Mock registry to return different file handles
      (fs.registry.getHandle as jest.Mock).mockImplementation((id) => {
        if (id === 'success-file') return successFileHandle;
        if (id === 'failing-file') return failingFileHandle;
        return null;
      });
      
      // Mock readFile to handle success and failure
      (fs.readFile as jest.Mock).mockImplementation(async (handle) => {
        if (handle === successFileHandle) return "Success content";
        if (handle === failingFileHandle) throw new Error("Failed to read file");
        return "Default content";
      });
      
      // Create test variables with both files
      const variables = [
        {
          name: 'files',
          value: [
            {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: 'success.txt',
              metadata: {
                handleId: 'success-file',
                size: 100,
                type: 'text/plain',
                path: 'success.txt'
              }
            },
            {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: 'failing.txt',
              metadata: {
                handleId: 'failing-file',
                size: 100,
                type: 'text/plain',
                path: 'failing.txt'
              }
            }
          ]
        }
      ];
      
      // Call activeResolveAllFileContents
      const result = await activeResolveAllFileContents(variables);
      
      // Should return true as at least one file was processed successfully
      expect(result).toBe(true);
      
      // Verify function behaves correctly with partial failures
      expect(fs.readFile).toHaveBeenCalledWith(successFileHandle, expect.any(Object));
    });
  });
}); 