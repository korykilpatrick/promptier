/**
 * Tests for filesystem module
 */
import * as fs from '../index';
import * as core from '../core';
import * as permissions from '../permissions';
import { FileSystemError, PermissionDeniedError } from '../errors';

// Mock the permissions module
jest.mock('../permissions', () => ({
  verifyPermission: jest.fn()
}));

// Mock the core module
jest.mock('../core', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  listDirectory: jest.fn(),
  createDirectory: jest.fn(),
  fileExists: jest.fn(),
  directoryExists: jest.fn(),
  getFileHandle: jest.fn()
}));

describe('Filesystem module', () => {
  // Create mock file handle
  const mockFileHandle: FileSystemFileHandle = {
    kind: 'file',
    name: 'test.txt',
    getFile: jest.fn(),
    createWritable: jest.fn(),
    isSameEntry: jest.fn()
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    (permissions.verifyPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('readFile', () => {
    test('should call core.readFile with correct parameters when permissions granted', async () => {
      const options = { encoding: 'utf-8' };
      const mockContent = { data: 'test content', metadata: { name: 'test.txt', size: 123, type: 'text/plain', lastModified: 123456 } };
      
      (core.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      const result = await fs.readFile(mockFileHandle, options);
      
      expect(permissions.verifyPermission).toHaveBeenCalledWith(mockFileHandle, 'read');
      expect(core.readFile).toHaveBeenCalledWith(mockFileHandle, options);
      expect(result).toBe('test content');
    });

    test('should throw PermissionDeniedError when permissions not granted', async () => {
      (permissions.verifyPermission as jest.Mock).mockResolvedValue(false);
      
      await expect(fs.readFile(mockFileHandle)).rejects.toThrow(PermissionDeniedError);
      expect(core.readFile).not.toHaveBeenCalled();
    });

    test('should propagate FileSystemError from core.readFile', async () => {
      const originalError = new FileSystemError('Core error', 'TEST_ERROR');
      (core.readFile as jest.Mock).mockRejectedValue(originalError);
      
      await expect(fs.readFile(mockFileHandle)).rejects.toThrow(originalError);
    });
  });

  describe('writeFile', () => {
    test('should call core.writeFile with correct parameters when permissions granted', async () => {
      const content = 'test content';
      const options = { encoding: 'utf-8' };
      
      await fs.writeFile(mockFileHandle, content, options);
      
      expect(permissions.verifyPermission).toHaveBeenCalledWith(mockFileHandle, 'readwrite');
      expect(core.writeFile).toHaveBeenCalledWith(mockFileHandle, content, options);
    });
  });

  describe('fileExists', () => {
    test('should return true when file exists and permissions granted', async () => {
      (core.fileExists as jest.Mock).mockResolvedValue(true);
      
      const result = await fs.fileExists(mockDirHandle, 'test.txt');
      
      expect(permissions.verifyPermission).toHaveBeenCalledWith(mockDirHandle, 'read');
      expect(core.fileExists).toHaveBeenCalledWith(mockDirHandle, 'test.txt');
      expect(result).toBe(true);
    });

    test('should return false when non-permission error occurs', async () => {
      (core.fileExists as jest.Mock).mockRejectedValue(new Error('Not found'));
      
      const result = await fs.fileExists(mockDirHandle, 'test.txt');
      
      expect(result).toBe(false);
    });
  });
}); 