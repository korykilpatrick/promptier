/**
 * Performance tests for filesystem module
 * 
 * These tests benchmark file operations using the file system module
 * with and without optimizations like caching and batch operations.
 */
import * as fs from '../index';
import { cache } from '../cache';

// Helper for measuring execution time
async function measureExecutionTime(fn: () => Promise<any>): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

// Skip tests in CI environment
const runPerformanceTests = process.env.CI !== 'true';

// Mock file system for test
const mockFiles = new Map<string, string>();
const mockHandles = new Map<string, FileSystemFileHandle>();

// Mock implementations
jest.mock('../core', () => ({
  readFile: jest.fn(async (handle: FileSystemFileHandle) => {
    const content = mockFiles.get(handle.name) || '';
    return {
      data: content,
      metadata: {
        name: handle.name,
        size: content.length,
        type: 'text/plain',
        lastModified: Date.now()
      }
    };
  }),
  
  writeFile: jest.fn(async (handle: FileSystemFileHandle, content: string) => {
    mockFiles.set(handle.name, content);
  })
}));

// Create mock file handles
function createMockFileHandle(name: string): FileSystemFileHandle {
  if (mockHandles.has(name)) {
    return mockHandles.get(name)!;
  }
  
  const handle = {
    kind: 'file' as const,
    name,
    getFile: jest.fn().mockResolvedValue({
      name,
      size: mockFiles.get(name)?.length || 0,
      type: 'text/plain',
      lastModified: Date.now()
    }),
    createWritable: jest.fn(),
    isSameEntry: jest.fn()
  };
  
  mockHandles.set(name, handle);
  return handle;
}

describe('Filesystem performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    mockHandles.clear();
    cache.clearCache();
    
    // Set up test data
    for (let i = 0; i < 100; i++) {
      const name = `file-${i}.txt`;
      const content = `Content of file ${i}. ${'x'.repeat(500 * i)}`;
      mockFiles.set(name, content);
      createMockFileHandle(name);
    }
  });
  
  describe('File reading performance', () => {
    // Only run in non-CI environments
    (runPerformanceTests ? test : test.skip)('cached file reading is faster than uncached', async () => {
      const fileHandle = createMockFileHandle('file-50.txt');
      
      // First read (uncached)
      const uncachedTime = await measureExecutionTime(async () => {
        await fs.readFile(fileHandle);
      });
      
      // Second read (cached)
      const cachedTime = await measureExecutionTime(async () => {
        await fs.readFile(fileHandle);
      });
      
      console.log(`Uncached read: ${uncachedTime.toFixed(2)}ms, Cached read: ${cachedTime.toFixed(2)}ms`);
      
      // Cached should be faster
      expect(cachedTime).toBeLessThan(uncachedTime);
    });
    
    (runPerformanceTests ? test : test.skip)('batch reads are more efficient than sequential reads', async () => {
      const fileHandles = Array.from({ length: 10 }, (_, i) => createMockFileHandle(`file-${i}.txt`));
      
      // Sequential reads
      const sequentialTime = await measureExecutionTime(async () => {
        for (const handle of fileHandles) {
          await fs.readFile(handle);
        }
      });
      
      // Clear cache to ensure fair comparison
      cache.clearCache();
      
      // Batch reads
      const batchTime = await measureExecutionTime(async () => {
        await fs.readFiles(fileHandles.map(handle => ({ handle })));
      });
      
      console.log(`Sequential reads: ${sequentialTime.toFixed(2)}ms, Batch reads: ${batchTime.toFixed(2)}ms`);
      
      // Batch should be faster
      expect(batchTime).toBeLessThan(sequentialTime);
    });
  });
  
  describe('File writing performance', () => {
    (runPerformanceTests ? test : test.skip)('batch writes are more efficient than sequential writes', async () => {
      const fileHandles = Array.from({ length: 10 }, (_, i) => createMockFileHandle(`new-file-${i}.txt`));
      const content = 'Test content for write performance';
      
      // Sequential writes
      const sequentialTime = await measureExecutionTime(async () => {
        for (const handle of fileHandles) {
          await fs.writeFile(handle, content);
        }
      });
      
      // Batch writes (with different file names to avoid cache effects)
      const batchFileHandles = Array.from({ length: 10 }, (_, i) => createMockFileHandle(`batch-file-${i}.txt`));
      
      const batchTime = await measureExecutionTime(async () => {
        await fs.writeFiles(batchFileHandles.map(handle => ({ 
          handle, 
          content
        })));
      });
      
      console.log(`Sequential writes: ${sequentialTime.toFixed(2)}ms, Batch writes: ${batchTime.toFixed(2)}ms`);
      
      // Batch should be faster
      expect(batchTime).toBeLessThan(sequentialTime);
    });
  });
  
  describe('Cache performance', () => {
    (runPerformanceTests ? test : test.skip)('cache hit rate affects performance', async () => {
      // Create 20 file handles
      const fileHandles = Array.from({ length: 20 }, (_, i) => createMockFileHandle(`cache-file-${i}.txt`));
      
      // Pre-cache 10 files
      for (let i = 0; i < 10; i++) {
        await fs.readFile(fileHandles[i]);
      }
      
      // Measure performance with 50% cache hit rate
      const mixedTime = await measureExecutionTime(async () => {
        for (const handle of fileHandles) {
          await fs.readFile(handle);
        }
      });
      
      // Pre-cache all files
      for (const handle of fileHandles) {
        await fs.readFile(handle);
      }
      
      // Measure performance with 100% cache hit rate
      const fullCacheTime = await measureExecutionTime(async () => {
        for (const handle of fileHandles) {
          await fs.readFile(handle);
        }
      });
      
      console.log(`Mixed cache (50%): ${mixedTime.toFixed(2)}ms, Full cache (100%): ${fullCacheTime.toFixed(2)}ms`);
      
      // Full cache should be faster
      expect(fullCacheTime).toBeLessThan(mixedTime);
      // Full cache should be significantly faster (at least 30%)
      expect(fullCacheTime).toBeLessThan(mixedTime * 0.7);
    });
  });
}); 