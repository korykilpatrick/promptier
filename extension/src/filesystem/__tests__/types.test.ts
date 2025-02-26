/**
 * Tests for filesystem type definitions
 */
import {
  FileSystemOptions,
  FileContent,
  FileAccessMode,
  FileEntry,
  DirectoryEntry,
  ProgressInfo,
  ProgressCallback,
  AccessHandleOptions,
  FileSystemSyncAccessHandle,
  FileMetadata,
  FileOperationResult,
  TextEncoding,
  FileDataType,
  ReadOptions,
  WriteOptions,
  FileSystemEntry
} from '../types';

describe('Type definitions', () => {
  test('FileSystemOptions type is compatible with expected properties', () => {
    const options: FileSystemOptions = {
      timeout: 5000,
      encoding: 'utf-8',
      maxSize: 1024 * 1024
    };
    
    expect(options.timeout).toBe(5000);
    expect(options.encoding).toBe('utf-8');
    expect(options.maxSize).toBe(1024 * 1024);
  });
  
  test('TextEncoding type accepts valid encodings', () => {
    // These should all compile without error
    const encodings: TextEncoding[] = [
      'utf-8',
      'utf-16',
      'ascii',
      'iso-8859-1'
    ];
    
    expect(encodings.length).toBe(4);
  });
  
  test('FileContent type structure', () => {
    const metadata: FileMetadata = {
      name: 'test.txt',
      size: 1024,
      type: 'text/plain',
      lastModified: Date.now()
    };
    
    const fileContent: FileContent = {
      data: 'test content',
      metadata
    };
    
    expect(fileContent.data).toBe('test content');
    expect(fileContent.metadata).toBe(metadata);
  });
  
  test('FileEntry and DirectoryEntry types are compatible with FileSystemEntry', () => {
    const fileEntry: FileEntry = {
      name: 'test.txt',
      kind: 'file',
      handle: {} as FileSystemFileHandle,
      size: 1024,
      lastModified: Date.now(),
      type: 'text/plain'
    };
    
    const dirEntry: DirectoryEntry = {
      name: 'test-dir',
      kind: 'directory',
      handle: {} as FileSystemDirectoryHandle
    };
    
    const entries: FileSystemEntry[] = [fileEntry, dirEntry];
    
    expect(entries.length).toBe(2);
    expect(entries[0].kind).toBe('file');
    expect(entries[1].kind).toBe('directory');
  });
  
  test('ReadOptions and WriteOptions types', () => {
    const readOptions: ReadOptions = { at: 0 };
    const writeOptions: WriteOptions = { at: 100 };
    
    expect(readOptions.at).toBe(0);
    expect(writeOptions.at).toBe(100);
  });
  
  test('FileOperationResult generic typing', () => {
    const successResult: FileOperationResult<string> = {
      success: true,
      data: 'test data'
    };
    
    const errorResult: FileOperationResult<string> = {
      success: false,
      error: {
        code: 'ERROR_CODE',
        message: 'Error message'
      }
    };
    
    expect(successResult.success).toBe(true);
    expect(successResult.data).toBe('test data');
    
    expect(errorResult.success).toBe(false);
    expect(errorResult.error?.code).toBe('ERROR_CODE');
    expect(errorResult.error?.message).toBe('Error message');
  });
}); 