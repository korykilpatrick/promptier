/**
 * Tests for the file content resolver
 * 
 * This file contains unit tests for the file content resolver utilities.
 * These tests verify that file contents are properly resolved and formatted.
 */

import { resolveFileContents, copyWithResolvedFileContents } from './file-content-resolver';
import { VARIABLE_ENTRY_TYPES } from 'shared/types/variables';

describe('File Content Resolver', () => {
  // Mock file system API
  const mockFile = {
    name: 'test.txt',
    size: 1024,
    text: jest.fn().mockResolvedValue('This is test file content')
  };
  
  const mockFileHandle = {
    kind: 'file',
    name: 'test.txt',
    getFile: jest.fn().mockResolvedValue(mockFile),
    queryPermission: jest.fn().mockResolvedValue('granted'),
    requestPermission: jest.fn().mockResolvedValue('granted')
  };
  
  // Mock file with special XML characters
  const mockFileWithXmlChars = {
    name: 'xml-test.txt',
    size: 1024,
    text: jest.fn().mockResolvedValue('Content with <tags> & special chars > here')
  };
  
  const mockFileWithXmlCharsHandle = {
    kind: 'file',
    name: 'xml-test.txt',
    getFile: jest.fn().mockResolvedValue(mockFileWithXmlChars),
    queryPermission: jest.fn().mockResolvedValue('granted'),
    requestPermission: jest.fn().mockResolvedValue('granted')
  };
  
  // Mock variables
  const mockFileVariable = {
    id: 1,
    name: 'test_file',
    value: [
      {
        type: VARIABLE_ENTRY_TYPES.FILE,
        value: '/path/to/test.txt',
        name: 'test.txt',
        metadata: {
          handle: mockFileHandle
        }
      }
    ]
  };

  // Mock variable with file containing XML characters
  const mockXmlFileVariable = {
    id: 2,
    name: 'xml_file',
    value: [
      {
        type: VARIABLE_ENTRY_TYPES.FILE,
        value: '/path/to/xml-test.txt',
        name: 'xml-test.txt',
        metadata: {
          handle: mockFileWithXmlCharsHandle
        }
      }
    ]
  };

  // Mock clipboard API
  const originalClipboard = global.navigator.clipboard;
  beforeAll(() => {
    Object.defineProperty(global.navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      },
      writable: true
    });
  });
  
  afterAll(() => {
    Object.defineProperty(global.navigator, 'clipboard', {
      value: originalClipboard,
      writable: true
    });
  });
  
  // Mock template parser
  jest.mock('./template-parser', () => ({
    replaceVariables: jest.fn((content, templateValues, variables) => {
      // Simple mock implementation that just returns the content
      return content;
    })
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveFileContents', () => {
    it('should return an empty array if no variables are provided', async () => {
      const result = await resolveFileContents();
      expect(result).toEqual([]);
    });

    it('should resolve file entries to their content', async () => {
      const result = await resolveFileContents([mockFileVariable]);
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toHaveLength(1);
      expect(result[0].value[0].value).toContain('This is test file content');
      expect(result[0].value[0].value).toContain('<file path="/path/to/test.txt">');
    });

    it('should properly escape XML special characters in content', async () => {
      const result = await resolveFileContents([mockXmlFileVariable]);
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toHaveLength(1);
      
      // Check that XML special characters are properly escaped
      expect(result[0].value[0].value).not.toContain('<tags>');
      expect(result[0].value[0].value).toContain('&lt;tags&gt;');
      expect(result[0].value[0].value).not.toContain(' & ');
      expect(result[0].value[0].value).toContain(' &amp; ');
      expect(result[0].value[0].value).toContain('special chars &gt; here');
      expect(result[0].value[0].value).toContain('<file path="/path/to/xml-test.txt">');
    });

    it('should not wrap content in XML tags when wrapInXmlTags is false', async () => {
      const result = await resolveFileContents([mockFileVariable], { wrapInXmlTags: false });
      
      expect(result).toHaveLength(1);
      expect(result[0].value).toHaveLength(1);
      expect(result[0].value[0].value).toBe('This is test file content');
      expect(result[0].value[0].value).not.toContain('<file path=');
    });

    it('should handle permission denied', async () => {
      // Mock permission denied
      mockFileHandle.queryPermission.mockResolvedValueOnce('denied');
      mockFileHandle.requestPermission.mockResolvedValueOnce('denied');
      
      const result = await resolveFileContents([mockFileVariable]);
      
      expect(result[0].value[0].value).toContain('Permission denied');
    });

    it('should handle file read errors', async () => {
      // Mock file read error
      mockFileHandle.getFile.mockRejectedValueOnce(new Error('File read error'));
      
      const result = await resolveFileContents([mockFileVariable]);
      
      expect(result[0].value[0].value).toContain('Error reading file');
    });
  });

  describe('copyWithResolvedFileContents', () => {
    it('should copy resolved content to clipboard', async () => {
      const content = 'Template with {{test_file}}';
      const success = await copyWithResolvedFileContents(content, {}, [mockFileVariable]);
      
      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Mock clipboard error
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
        new Error('Clipboard error')
      );
      
      const content = 'Template with {{test_file}}';
      const success = await copyWithResolvedFileContents(content, {}, [mockFileVariable]);
      
      expect(success).toBe(false);
    });
  });
}); 