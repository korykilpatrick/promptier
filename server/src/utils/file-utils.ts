/**
 * File Utilities for File Variable Implementation
 * 
 * This module provides utilities for working with file-based variables,
 * including path validation, file content extraction, and file metadata handling.
 */

import fs from 'fs';
import path from 'path';

// Maximum file size that can be read (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Check if a file path exists and is accessible
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists: ${filePath}`, error);
    return false;
  }
}

/**
 * Validate if a file path is safe (no path traversal, exists, and within size limits)
 */
export function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  // Basic safety checks
  if (!filePath) {
    return { valid: false, error: 'File path is empty' };
  }

  // Normalize the path to prevent path traversal attacks
  const normalizedPath = path.normalize(filePath);
  
  // Check if file exists
  if (!fileExists(normalizedPath)) {
    return { valid: false, error: 'File does not exist or is not accessible' };
  }

  // Check if path is a file (not a directory)
  try {
    const stats = fs.statSync(normalizedPath);
    
    if (stats.isDirectory()) {
      return { valid: false, error: 'Path is a directory, not a file' };
    }
    
    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File exceeds maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error(`Error validating file path: ${normalizedPath}`, error);
    return { valid: false, error: 'Error accessing file' };
  }
}

/**
 * Validate a directory path
 */
export function validateDirectoryPath(dirPath: string): { valid: boolean; error?: string } {
  // Basic safety checks
  if (!dirPath) {
    return { valid: false, error: 'Directory path is empty' };
  }

  // Normalize the path to prevent path traversal attacks
  const normalizedPath = path.normalize(dirPath);
  
  // Check if directory exists
  if (!fileExists(normalizedPath)) {
    return { valid: false, error: 'Directory does not exist or is not accessible' };
  }

  // Check if path is a directory
  try {
    const stats = fs.statSync(normalizedPath);
    
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path is a file, not a directory' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error(`Error validating directory path: ${normalizedPath}`, error);
    return { valid: false, error: 'Error accessing directory' };
  }
}

/**
 * Read content from a file with proper error handling
 */
export function readFileContent(filePath: string): { content: string | null; error?: string } {
  // Validate file path first
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return { content: null, error: validation.error };
  }

  try {
    // Read file content as UTF-8 text
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content };
  } catch (error) {
    console.error(`Error reading file content: ${filePath}`, error);
    return { content: null, error: 'Error reading file content' };
  }
}

/**
 * List files in a directory (recursively if specified)
 */
export function listDirectoryFiles(
  dirPath: string, 
  recursive: boolean = false
): { files: string[] | null; error?: string } {
  // Validate directory path first
  const validation = validateDirectoryPath(dirPath);
  if (!validation.valid) {
    return { files: null, error: validation.error };
  }

  try {
    if (!recursive) {
      // Non-recursive listing (just files in the current directory)
      const files = fs.readdirSync(dirPath)
        .filter(file => {
          const fullPath = path.join(dirPath, file);
          return fs.statSync(fullPath).isFile();
        })
        .map(file => path.join(dirPath, file));
      
      return { files };
    } else {
      // Recursive listing
      const files: string[] = [];
      
      function traverseDirectory(currentPath: string) {
        const entries = fs.readdirSync(currentPath);
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry);
          const stats = fs.statSync(fullPath);
          
          if (stats.isFile()) {
            files.push(fullPath);
          } else if (stats.isDirectory()) {
            traverseDirectory(fullPath);
          }
        }
      }
      
      traverseDirectory(dirPath);
      return { files };
    }
  } catch (error) {
    console.error(`Error listing directory files: ${dirPath}`, error);
    return { files: null, error: 'Error listing directory files' };
  }
}

/**
 * Get basic metadata for a file
 */
export function getFileMetadata(filePath: string): { 
  metadata: { size: number; mtime: Date; basename: string } | null; 
  error?: string 
} {
  try {
    const stats = fs.statSync(filePath);
    return {
      metadata: {
        size: stats.size,
        mtime: stats.mtime,
        basename: path.basename(filePath)
      }
    };
  } catch (error) {
    console.error(`Error getting file metadata: ${filePath}`, error);
    return { metadata: null, error: 'Error getting file metadata' };
  }
}

/**
 * Process file entries to include their content
 * @param entries Array of file entries
 * @returns Array of entries with content added
 */
export function processFileEntries(entries: any[]): { 
  processed: any[]; 
  errors: {id: string; error: string}[] 
} {
  const processed = [];
  const errors = [];

  for (const entry of entries) {
    if (entry.type === 'file') {
      const { content, error } = readFileContent(entry.value);
      
      if (error) {
        errors.push({ id: entry.id || entry.value, error });
      } else {
        processed.push({
          ...entry,
          content
        });
      }
    } else if (entry.type === 'directory') {
      const { files, error } = listDirectoryFiles(entry.value, true);
      
      if (error) {
        errors.push({ id: entry.id || entry.value, error });
      } else {
        processed.push({
          ...entry,
          files
        });
      }
    } else {
      // For text entries, just pass them through
      processed.push(entry);
    }
  }

  return { processed, errors };
}

/**
 * Validate multiple variable entries
 * @param entries Array of variable entries to validate
 * @returns Validation results
 */
export function validateVariableEntries(entries: any[]): {
  valid: boolean;
  errors: {id: string; error: string}[];
} {
  const errors = [];

  if (!Array.isArray(entries)) {
    return { valid: false, errors: [{ id: 'value', error: 'Variable value must be an array' }] };
  }

  for (const entry of entries) {
    // Check basic structure
    if (!entry || typeof entry !== 'object') {
      errors.push({ id: 'entry', error: 'Entry must be an object' });
      continue;
    }

    if (!entry.type) {
      errors.push({ id: entry.id || 'entry', error: 'Entry must have a type' });
      continue;
    }

    if (!entry.value && entry.value !== '') {
      errors.push({ id: entry.id || 'entry', error: 'Entry must have a value' });
      continue;
    }

    // Validate based on type
    if (entry.type === 'file') {
      const validation = validateFilePath(entry.value);
      if (!validation.valid) {
        errors.push({ id: entry.id || entry.value, error: validation.error || 'Invalid file path' });
      }
    } else if (entry.type === 'directory') {
      const validation = validateDirectoryPath(entry.value);
      if (!validation.valid) {
        errors.push({ id: entry.id || entry.value, error: validation.error || 'Invalid directory path' });
      }
    }
    // No validation needed for text type
  }

  return { valid: errors.length === 0, errors };
} 