/**
 * Tests for recursive operations in the filesystem module
 */
import * as fs from '../index';
import * as recursive from '../utils/recursive';

// Mock the recursive module
jest.mock('../utils/recursive', () => ({
  listRecursive: jest.fn(),
  findFiles: jest.fn(),
  deleteRecursive: jest.fn(),
  copyRecursive: jest.fn()
}));

describe('Recursive filesystem operations', () => {
  // Create mock directory handle
  const mockDirHandle: FileSystemDirectoryHandle = {
    kind: 'directory',
    name: 'testDir',
    getDirectoryHandle: jest.fn(),
    getFileHandle: jest.fn(),
    removeEntry: jest.fn(),
    resolve: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    isSameEntry: jest.fn()
  };
  
  // Create mock file handles
  const createMockFileHandle = (name: string, size = 1024, type = 'text/plain'): FileSystemFileHandle => ({
    kind: 'file',
    name,
    getFile: jest.fn().mockResolvedValue({
      name,
      size,
      type,
      lastModified: Date.now()
    }),
    createWritable: jest.fn(),
    isSameEntry: jest.fn()
  });
  
  const mockFileHandles = [
    createMockFileHandle('test1.txt'),
    createMockFileHandle('test2.js', 2048, 'application/javascript'),
    createMockFileHandle('test3.css', 1500, 'text/css')
  ];
  
  const mockFileEntries = mockFileHandles.map(handle => ({
    kind: 'file' as const,
    name: handle.name,
    handle,
    size: (handle.getFile as jest.Mock).mock.results?.[0]?.value?.size || 1024,
    type: (handle.getFile as jest.Mock).mock.results?.[0]?.value?.type || 'text/plain',
    lastModified: (handle.getFile as jest.Mock).mock.results?.[0]?.value?.lastModified || Date.now()
  }));
  
  const mockSubDirHandle: FileSystemDirectoryHandle = {
    kind: 'directory',
    name: 'subDir',
    getDirectoryHandle: jest.fn(),
    getFileHandle: jest.fn(),
    removeEntry: jest.fn(),
    resolve: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    isSameEntry: jest.fn()
  };
  
  const mockDirEntry = {
    kind: 'directory' as const,
    name: 'subDir',
    handle: mockSubDirHandle
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    (recursive.listRecursive as jest.Mock).mockResolvedValue([...mockFileEntries, mockDirEntry]);
    (recursive.findFiles as jest.Mock).mockResolvedValue(mockFileEntries);
  });

  describe('fs.recursive.listRecursive', () => {
    test('should list files recursively with default options', async () => {
      const results = await fs.recursive.listRecursive(mockDirHandle);
      
      expect(recursive.listRecursive).toHaveBeenCalledWith(mockDirHandle, {}, 0, { completed: 0, total: 1 });
      expect(results).toHaveLength(4); // 3 files + 1 directory
      expect(results).toContainEqual(expect.objectContaining({ kind: 'file', name: 'test1.txt' }));
      expect(results).toContainEqual(expect.objectContaining({ kind: 'directory', name: 'subDir' }));
    });
    
    test('should respect maxDepth option', async () => {
      await fs.recursive.listRecursive(mockDirHandle, { maxDepth: 2 });
      
      expect(recursive.listRecursive).toHaveBeenCalledWith(
        mockDirHandle, 
        { maxDepth: 2 }, 
        0, 
        { completed: 0, total: 1 }
      );
    });
    
    test('should filter entries based on include patterns', async () => {
      await fs.recursive.listRecursive(mockDirHandle, { include: ['*.js', '*.css'] });
      
      expect(recursive.listRecursive).toHaveBeenCalledWith(
        mockDirHandle, 
        { include: ['*.js', '*.css'] }, 
        0, 
        { completed: 0, total: 1 }
      );
    });
    
    test('should filter entries based on exclude patterns', async () => {
      await fs.recursive.listRecursive(mockDirHandle, { exclude: ['*.txt'] });
      
      expect(recursive.listRecursive).toHaveBeenCalledWith(
        mockDirHandle, 
        { exclude: ['*.txt'] }, 
        0, 
        { completed: 0, total: 1 }
      );
    });
    
    test('should report progress using callback', async () => {
      const progressCallback = jest.fn();
      
      await fs.recursive.listRecursive(mockDirHandle, { progress: progressCallback });
      
      expect(recursive.listRecursive).toHaveBeenCalledWith(
        mockDirHandle, 
        { progress: progressCallback }, 
        0, 
        { completed: 0, total: 1 }
      );
    });
  });
  
  describe('fs.recursive.findFiles', () => {
    test('should find files based on predicate', async () => {
      const predicate = (entry: any) => entry.kind === 'file' && entry.name.endsWith('.js');
      
      const results = await fs.recursive.findFiles(mockDirHandle, predicate);
      
      expect(recursive.findFiles).toHaveBeenCalledWith(mockDirHandle, predicate, {});
      expect(results).toEqual(mockFileEntries);
    });
    
    test('should respect recursive options', async () => {
      const predicate = (entry: any) => entry.kind === 'file';
      const options = { maxDepth: 3, exclude: ['*.txt'] };
      
      await fs.recursive.findFiles(mockDirHandle, predicate, options);
      
      expect(recursive.findFiles).toHaveBeenCalledWith(mockDirHandle, predicate, options);
    });
  });
  
  describe('fs.recursive.deleteRecursive', () => {
    test('should delete directory recursively', async () => {
      await fs.recursive.deleteRecursive(mockDirHandle);
      
      expect(recursive.deleteRecursive).toHaveBeenCalledWith(mockDirHandle, {});
    });
    
    test('should respect exclude patterns', async () => {
      const options = { exclude: ['*.important'] };
      
      await fs.recursive.deleteRecursive(mockDirHandle, options);
      
      expect(recursive.deleteRecursive).toHaveBeenCalledWith(mockDirHandle, options);
    });
  });
  
  describe('fs.recursive.copyRecursive', () => {
    test('should copy directory recursively', async () => {
      const destDirHandle = createMockDirectoryHandle('destination');
      
      await fs.recursive.copyRecursive(mockDirHandle, destDirHandle);
      
      expect(recursive.copyRecursive).toHaveBeenCalledWith(mockDirHandle, destDirHandle, {});
    });
    
    test('should respect newName option', async () => {
      const destDirHandle = createMockDirectoryHandle('destination');
      const options = { newName: 'newDirName' };
      
      await fs.recursive.copyRecursive(mockDirHandle, destDirHandle, options);
      
      expect(recursive.copyRecursive).toHaveBeenCalledWith(mockDirHandle, destDirHandle, options);
    });
    
    test('should respect include/exclude patterns', async () => {
      const destDirHandle = createMockDirectoryHandle('destination');
      const options = { 
        include: ['*.js', '*.css'],
        exclude: ['node_modules', '*.tmp']
      };
      
      await fs.recursive.copyRecursive(mockDirHandle, destDirHandle, options);
      
      expect(recursive.copyRecursive).toHaveBeenCalledWith(mockDirHandle, destDirHandle, options);
    });
  });
});

// Helper function to create mock directory handles
function createMockDirectoryHandle(name: string): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    getDirectoryHandle: jest.fn(),
    getFileHandle: jest.fn(),
    removeEntry: jest.fn(),
    resolve: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    isSameEntry: jest.fn()
  };
} 