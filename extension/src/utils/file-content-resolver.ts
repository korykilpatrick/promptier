/**
 * File Content Resolution Service
 * 
 * This service resolves file references to their contents during copy operations.
 * It wraps file contents in simple tags with the filename as the tag name.
 * 
 * Enhanced with:
 * - Filesystem module integration
 * - Caching support
 * - Batch processing
 * - Recursive directory handling support
 * 
 * DEBUG MODE: Enhanced diagnostics for file handle issues
 */

// Add File System Access API types
declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle[]>;
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

import type { VariableEntry } from 'shared/types/variables';
import { VARIABLE_ENTRY_TYPES, isFileEntry, isDirectoryEntry } from 'shared/types/variables';
import { replaceVariables } from './template-parser';
import path from 'path';
import { fileHandleRegistry } from '../components/sidebar/variables/FilePicker';
import { fs } from '../filesystem';
// Import pickers separately since they're not exposed directly on the fs object
import * as fsPickers from '../filesystem/pickers';
// Import errors for proper typing
import * as fsErrors from '../filesystem/errors';
// Import cache and types for improved performance
import { FileMetadata, FileEntry, DirectoryEntry } from '../filesystem/types';
import { cache } from '../filesystem/cache';

// Define error tracking interface
interface AttemptDetail {
  time: string;
  error: string;
  source: string;
}

// Very large size limit (equiv to ~200k tokens) in bytes
// 800KB is approximately 200k tokens at 4 chars per token
const MAX_FILE_SIZE = 800 * 1024;

/**
 * Represents a variable entry for a file
 */
interface FileVariableEntry {
  type: 'file';
  value: string;
  metadata: FileEntryMetadata;
}

/**
 * Represents a variable entry for a directory
 */
interface DirectoryVariableEntry {
  type: 'directory';
  value: string;
  metadata: DirectoryEntryMetadata;
}

/**
 * File entry metadata structure
 */
interface FileEntryMetadata {
  /**
   * Path or name of the file
   */
  path?: string;
  
  /**
   * Size of the file in bytes
   */
  size?: number;
  
  /**
   * MIME type of the file
   */
  type?: string;
  
  /**
   * Last modified timestamp
   */
  lastModified?: number;
  
  /**
   * ID reference to the file handle in the registry
   */
  handleId?: string;
  
  /**
   * Whether content has been resolved
   */
  contentResolved?: boolean;
  
  /**
   * When content was last fetched
   */
  lastFetchedAt?: number;
  
  /**
   * Tag name used for wrapping content
   */
  tagName?: string;
  
  /**
   * Length of the resolved content
   */
  contentLength?: number;
}

/**
 * Directory entry metadata structure
 */
interface DirectoryEntryMetadata {
  /**
   * Path or name of the directory
   */
  path?: string;
  
  /**
   * ID reference to the directory handle in the registry
   */
  handleId?: string;
  
  /**
   * Whether content has been resolved
   */
  contentResolved?: boolean;
  
  /**
   * When content was last fetched
   */
  lastFetchedAt?: number;
  
  /**
   * Recursive processing options
   */
  recursive?: {
    /**
     * Whether to process recursively
     */
    enabled: boolean;
    
    /**
     * Maximum recursion depth 
     */
    maxDepth?: number;
    
    /**
     * Include patterns
     */
    include?: string[];
    
    /**
     * Exclude patterns
     */
    exclude?: string[];
  };
}

/**
 * Options for file content resolution
 */
interface FileContentResolutionOptions {
  /**
   * Whether to wrap file contents in tags
   * Default: true
   */
  wrapInTags?: boolean;
  
  /**
   * Maximum size for a single file in bytes
   * Default: MAX_FILE_SIZE (800KB)
   */
  maxFileSize?: number;
  
  /**
   * Enable detailed debugging 
   * Default: false
   */
  debug?: boolean;
  
  /**
   * Enable caching for file contents
   * Default: true
   */
  useCache?: boolean;
  
  /**
   * Cache TTL in milliseconds
   * Default: 5 minutes
   */
  cacheTTL?: number;
  
  /**
   * Options for recursive directory processing
   */
  recursive?: {
    /**
     * Whether to process directories recursively
     * Default: false
     */
    enabled?: boolean;
    
    /**
     * Maximum recursion depth
     * Default: 5
     */
    maxDepth?: number;
    
    /**
     * Include files/directories matching these patterns
     */
    include?: string[];
    
    /**
     * Exclude files/directories matching these patterns
     */
    exclude?: string[];
  };
}

/**
 * Extracts the filename without directory path
 * @param filePath Full path to file
 * @returns Base filename without path
 */
function getBasename(filePath: string): string {
  // Handle both Unix and Windows paths
  return filePath.split(/[\/\\]/).pop() || filePath;
}

/**
 * Creates a safe tag name from a filename
 * @param filename The filename to convert
 * @returns A tag-safe version of the filename
 */
function createTagFromFilename(filename: string): string {
  const baseName = path.basename(filename);
  return baseName.replace(/[^\w.-]/g, '_');
}

/**
 * Retrieves a file handle from metadata, either directly or from the registry
 * @param metadata The file metadata object
 * @returns The file handle or undefined if not available
 */
function getFileHandleFromMetadata(metadata: FileEntryMetadata): any {
  // Only check for handleId property - no legacy support
  if (metadata?.handleId) {
    console.log(`[getFileHandleFromMetadata] Retrieving handle from registry with ID: ${metadata.handleId}`);
    return fs.registry.getHandle(metadata.handleId);
  }
  
  console.warn(`[getFileHandleFromMetadata] No valid handle found in metadata`);
  return undefined;
}

/**
 * Checks if a file handle is valid and can be used to access a file
 * @param handle The file handle to check
 * @returns Object containing validation result and diagnostic information
 */
async function validateFileHandle(handle: any): Promise<{isValid: boolean; diagnostics: string}> {
  if (!handle) {
    return {isValid: false, diagnostics: "Handle is null or undefined"};
  }
  
  // Check handle type
  const handleType = typeof handle;
  if (handleType !== 'object') {
    return {isValid: false, diagnostics: `Handle is not an object, it's a ${handleType}`};
  }
  
  // Check for empty object
  if (Object.keys(handle).length === 0) {
    return {isValid: false, diagnostics: "Handle is an empty object {}"};
  }
  
  // Check for required properties
  if (!handle.kind) {
    return {isValid: false, diagnostics: "Handle is missing 'kind' property"};
  }
  
  if (handle.kind !== 'file') {
    return {isValid: false, diagnostics: `Handle kind is not 'file', it's '${handle.kind}'`};
  }
  
  // Check for method
  if (typeof handle.getFile !== 'function') {
    return {
      isValid: false, 
      diagnostics: `Handle is missing getFile() method. Available properties: ${Object.keys(handle).join(', ')}`
    };
  }
  
  try {
    // Try to get name (should be safe, doesn't require permissions)
    const name = handle.name || "(unnamed)";
    
    return {
      isValid: true,
      diagnostics: `Valid file handle for '${name}'. getFile method exists.`
    };
  } catch (error) {
    return {
      isValid: false,
      diagnostics: `Handle validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Fetches file content using the filesystem module
 * @param handleId The handle ID to get content from
 * @param options Options for content resolution
 * @returns File content as a string or null if retrieval failed
 */
async function fetchFileContent(
  handleId: string | undefined, 
  options: { maxFileSize?: number; useCache?: boolean } = {}
): Promise<string | null> {
  if (!handleId) {
    console.error('[fetchFileContent] No handle ID provided');
    return null;
  }

  try {
    // Get the handle from the registry
    const handle = fs.registry.getHandle(handleId);
    
    if (!handle) {
      console.error(`[fetchFileContent] No handle found for ID: ${handleId}`);
      return null;
    }
    
    // Make sure it's a file handle
    if (handle.kind !== 'file') {
      console.error(`[fetchFileContent] Handle is not a file: ${handleId}`);
      return null;
    }
    
    // Set options for reading
    const readOptions = {
      encoding: 'utf-8' as const,
      maxSize: options.maxFileSize || MAX_FILE_SIZE
    };
    
    // Read the file using the filesystem module
    try {
      return await fs.readFile(handle as FileSystemFileHandle, readOptions);
    } catch (error) {
      if (error instanceof fs.errors.FileTooLargeError) {
        console.error(`[fetchFileContent] File too large (${handle.name}), max size: ${readOptions.maxSize} bytes`);
        throw new Error(`File too large: ${handle.name}. Maximum size: ${Math.round(readOptions.maxSize / 1024)} KB`);
      } else {
        console.error(`[fetchFileContent] Error reading file: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  } catch (error) {
    console.error('[fetchFileContent] Error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Resolves file references in variables to their actual content
 * @param variables Array of global variables
 * @param options Options for content resolution
 * @returns Array of variables with file references resolved to content
 */
export async function resolveFileContents(
  variables: any[] = [],
  options: FileContentResolutionOptions = {}
): Promise<any[]> {
  try {
    // Default options
    const resolveOptions: Required<FileContentResolutionOptions> = {
      wrapInTags: options.wrapInTags !== false,
      maxFileSize: options.maxFileSize || MAX_FILE_SIZE,
      debug: options.debug || false,
      useCache: options.useCache !== false,
      cacheTTL: options.cacheTTL || 5 * 60 * 1000, // Default to 5 minutes
      recursive: {
        enabled: options.recursive?.enabled || false,
        maxDepth: options.recursive?.maxDepth || 5,
        include: options.recursive?.include || [],
        exclude: options.recursive?.exclude || []
      }
    };
    
    console.log(`[resolveFileContents] Starting resolution with options:`, resolveOptions);
    
    // Filter out variables without values
    if (!Array.isArray(variables) || variables.length === 0) {
      console.log(`[resolveFileContents] No variables to process`);
      return variables;
    }
    
    // First, ensure we have the necessary permissions
    const hasPermissions = await ensureFilePermissions(variables);
    if (!hasPermissions) {
      console.warn(`[resolveFileContents] Failed to ensure file permissions`);
      return variables;
    }
    
    // If recursive option is enabled, process directories first to find all files
    if (resolveOptions.recursive.enabled) {
      variables = await processDirectoriesRecursively(variables, resolveOptions);
    }
    
    // Collect all file entries that need resolution
    interface FileToResolve {
      variable: any;
      entryIndex: number;
      entry: any;
      handleId: string;
    }
    
    const filesToResolve: FileToResolve[] = [];
    
    // Find all file entries that need resolution
    for (const variable of variables) {
      if (!variable || !Array.isArray(variable.value) || variable.value.length === 0) {
        continue;
      }
      
      for (let i = 0; i < variable.value.length; i++) {
        const entry = variable.value[i];
        
        // Only process file entries
        if (!isFileEntry(entry)) {
          continue;
        }
        
        // Ensure metadata exists
        if (!entry.metadata) {
          entry.metadata = {};
        }
        
        // Check if handle exists
        if (!entry.metadata) {
          console.warn(`[resolveFileContents] File entry has no metadata: ${entry}`);
          continue;
        }
        
        // Get handle ID
        const handleId = entry.metadata.handleId;
        if (!handleId) {
          console.warn(`[resolveFileContents] No handle ID for file: ${entry.value}`);
          continue;
        }
        
        // Add to the list of files to resolve
        filesToResolve.push({
          variable,
          entryIndex: i,
          entry,
          handleId
        });
      }
    }
    
    console.log(`[resolveFileContents] Found ${filesToResolve.length} files to resolve`);
    
    if (filesToResolve.length === 0) {
      return variables;
    }
    
    // Process each file to resolve
    const resolvePromises = filesToResolve.map(async ({ variable, entryIndex, entry, handleId }) => {
      try {
        // Get the handle from the registry
        const handle = fs.registry.getHandle(handleId);
        if (!handle || handle.kind !== 'file') {
          console.error(`[resolveFileContents] Invalid handle for file: ${entry.value}`);
          return false;
        }
        
        // Setup options for reading the file
        const readOptions = {
          maxFileSize: resolveOptions.maxFileSize,
          useCache: resolveOptions.useCache
        };
        
        // Try to get the content from cache or read it
        let content;
        let readAttemptSucceeded = false;
        let contentSize = 0;
        
        if (resolveOptions.useCache) {
          // Try to get from cache first
          const cachedContent = cache.getCachedFileContent(handle as FileSystemFileHandle, {});
          if (cachedContent && cachedContent.data !== undefined && cachedContent.data !== null) {
            console.log(`[resolveFileContents] Using cached content for file: ${entry.value}`);
            content = cachedContent.data as string;
            readAttemptSucceeded = true;
            contentSize = typeof content === 'string' ? content.length : 0;
          } else {
            console.log(`[resolveFileContents] Cache miss or invalid cached data for file: ${entry.value}, reading from file system`);
            
            // Read the file and cache it
            try {
              content = await fs.readFile(handle as FileSystemFileHandle, {
                maxSize: resolveOptions.maxFileSize,
                encoding: 'utf-8'
              });
              
              // Check logs for successful read even if content is undefined
              if (content === undefined || content === null) {
                console.log(`[resolveFileContents] File read operation completed but returned ${content === undefined ? 'undefined' : 'null'} content. Checking for successful read in logs...`);
                
                // If we're getting undefined but the logs show a successful read, try to get file content directly
                try {
                  const file = await (handle as FileSystemFileHandle).getFile();
                  // Use direct File API as fallback
                  const fileContent = await file.text();
                  if (fileContent) {
                    console.log(`[resolveFileContents] Successfully retrieved content using direct File API (${fileContent.length} bytes)`);
                    content = fileContent;
                    readAttemptSucceeded = true;
                    contentSize = fileContent.length;
                  }
                } catch (directReadError) {
                  console.error(`[resolveFileContents] Direct file read also failed:`, directReadError);
                }
              } else {
                readAttemptSucceeded = true;
                contentSize = typeof content === 'string' ? content.length : 0;
              }
              
              // Get file metadata for cache
              const file = await (handle as FileSystemFileHandle).getFile();
              const metadata: FileMetadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
              };
              
              // Cache the content with the specified TTL
              if (content !== undefined && content !== null) {
                cache.cacheFileContent(handle as FileSystemFileHandle, {
                  data: content,
                  metadata
                });
                
                console.log(`[resolveFileContents] Cached content for file: ${entry.value}`);
              } else {
                console.error(`[resolveFileContents] Read file returned undefined/null content for ${entry.value}, cannot cache`);
              }
            } catch (readError) {
              console.error(`[resolveFileContents] Error reading file:`, readError);
              
              // Check if the error message actually contains a successful read indication
              // This is a workaround for when the fs module logs success but throws an error
              if (readError && typeof readError.toString === 'function') {
                const errorString = readError.toString();
                if (errorString.includes('Successfully read file') && errorString.includes('bytes')) {
                  console.log(`[resolveFileContents] Error message indicates successful read, attempting recovery`);
                  
                  // Try direct File API as fallback
                  try {
                    const file = await (handle as FileSystemFileHandle).getFile();
                    const fileContent = await file.text();
                    if (fileContent) {
                      console.log(`[resolveFileContents] Recovery succeeded, got content directly (${fileContent.length} bytes)`);
                      content = fileContent;
                      readAttemptSucceeded = true;
                      contentSize = fileContent.length;
                    }
                  } catch (recoveryError) {
                    console.error(`[resolveFileContents] Recovery attempt failed:`, recoveryError);
                  }
                }
              }
            }
          }
        } else {
          // Read the file directly (no caching)
          try {
            content = await fs.readFile(handle as FileSystemFileHandle, {
              maxSize: resolveOptions.maxFileSize,
              encoding: 'utf-8'
            });
            readAttemptSucceeded = content !== undefined && content !== null;
            contentSize = typeof content === 'string' ? content.length : 0;
          } catch (directReadError) {
            console.error(`[resolveFileContents] Error in direct file read:`, directReadError);
          }
        }
        
        // Special handling for cases where file was definitely read but content is undefined
        if (!content && readAttemptSucceeded) {
          console.warn(`[resolveFileContents] Read attempt succeeded but content is empty or undefined. Using empty string.`);
          content = '';
        }
        
        // Get the tag name for wrapping
        const tagName = entry.metadata.tagName || createTagFromFilename(entry.value);
        
        // Save the original value
        const originalValue = entry.value;
        
        // If content is undefined or empty, use a placeholder message
        if (content === undefined || content === null) {
          const filename = entry.value || (handle as FileSystemFileHandle).name;
          console.warn(`[resolveFileContents] Content for ${filename} is undefined, using empty string`);
          
          // Create placeholder content with a comment explaining the issue
          const tagName = createTagFromFilename(filename);
          entry.value = `<${tagName}>\n/* No content available for ${path.basename(filename)} */\n</${tagName}>`;
          
          // Mark as resolved with empty content
          if (resolveOptions.wrapInTags) {
            // Update the metadata on the entry
            if (variable.value[entryIndex].metadata) {
              variable.value[entryIndex].metadata.contentResolved = true;
              variable.value[entryIndex].metadata.tagName = tagName;
              variable.value[entryIndex].metadata.lastFetchedAt = Date.now();
              variable.value[entryIndex].metadata.contentLength = 0;
            }
          }
          
          // Don't continue processing this entry
          return true;
        }
        
        // Create an XML tag for the content
        const xmlTagName = createTagFromFilename(entry.value);
        const wrapped = `<${xmlTagName}>\n${content}\n</${xmlTagName}>`;
        
        // Update the entry's value with the wrapped content
        entry.value = wrapped;
        
        // Update metadata
        variable.value[entryIndex].metadata.contentResolved = true;
        variable.value[entryIndex].metadata.lastFetchedAt = Date.now();
        variable.value[entryIndex].metadata.contentLength = content.length;
        variable.value[entryIndex].metadata.tagName = tagName;
        
        console.log(`[resolveFileContents] Resolved file: ${originalValue} (${content.length} bytes)`);
        return true;
      } catch (error) {
        if (error instanceof fs.errors.FileTooLargeError) {
          console.error(`[resolveFileContents] File too large: ${entry.value}`);
        } else if (error instanceof fs.errors.PermissionDeniedError) {
          console.error(`[resolveFileContents] Permission denied for file: ${entry.value}`);
        } else {
          console.error(`[resolveFileContents] Error processing file entry:`, error);
        }
        return false;
      }
    });
    
    // Wait for all files to be resolved
    await Promise.all(resolvePromises);
    
    return variables;
  } catch (error) {
    console.error('[resolveFileContents] Error resolving file contents:', error);
    return variables; // Return original variables on error
  }
}

/**
 * Process directories recursively to gather all contained files
 * @param variables Array of variables to process
 * @param options Options for recursive processing
 * @returns Updated array of variables with expanded file entries
 */
async function processDirectoriesRecursively(
  variables: any[] = [],
  options: Required<FileContentResolutionOptions>
): Promise<any[]> {
  // Variables to be processed
  const directoriesToProcess: Array<{
    variable: any;
    entryIndex: number;
    entry: DirectoryVariableEntry;
    handle: FileSystemDirectoryHandle;
  }> = [];
  
  // Find all directory entries that need to be processed
  for (const variable of variables) {
    if (!variable || !Array.isArray(variable.value) || variable.value.length === 0) {
      continue;
    }
    
    for (let i = 0; i < variable.value.length; i++) {
      const entry = variable.value[i] as DirectoryVariableEntry;
      
      // Skip non-directory entries
      if (!isDirectoryEntry(entry)) {
        continue;
      }
      
      // Ensure metadata exists
      if (!entry.metadata) {
        entry.metadata = {};
      }
      
      // Check if recursion is enabled for this directory
      const dirRecursiveOptions = entry.metadata.recursive || { enabled: options.recursive.enabled };
      if (!dirRecursiveOptions.enabled) {
        continue;
      }
      
      // Get handle ID
      const handleId = entry.metadata.handleId;
      if (!handleId) {
        console.warn(`[processDirectoriesRecursively] No handle ID for directory: ${entry.value}`);
        continue;
      }
      
      // Get handle from registry
      const handle = fs.registry.getHandle(handleId) as FileSystemDirectoryHandle;
      if (!handle || handle.kind !== 'directory') {
        console.warn(`[processDirectoriesRecursively] Invalid handle for directory: ${entry.value}`);
        continue;
      }
      
      // Add to list of directories to process
      directoriesToProcess.push({
        variable,
        entryIndex: i,
        entry,
        handle
      });
    }
  }
  
  console.log(`[processDirectoriesRecursively] Found ${directoriesToProcess.length} directories to process recursively`);
  
  if (directoriesToProcess.length === 0) {
    return variables;
  }
  
  // Process each directory
  for (const { variable, entryIndex, entry, handle } of directoriesToProcess) {
    try {
      console.log(`[processDirectoriesRecursively] Processing directory: ${entry.value}`);
      
      // Get recursive options for this directory
      const recursiveOpts = {
        maxDepth: entry.metadata.recursive?.maxDepth || options.recursive.maxDepth,
        include: entry.metadata.recursive?.include || options.recursive.include,
        exclude: entry.metadata.recursive?.exclude || options.recursive.exclude
      };
      
      // Use the recursive module to list all files in the directory
      const entries = await fs.recursive.listRecursive(handle, recursiveOpts);
      
      console.log(`[processDirectoriesRecursively] Found ${entries.length} entries in ${entry.value}`);
      
      // Convert filesystem entries to variable entries
      const variableEntries: VariableEntry[] = [];
      
      for (const fsEntry of entries) {
        if (fsEntry.kind === 'file') {
          // Convert file entry
          const fileEntry = createFileVariableEntry(fsEntry);
          variableEntries.push(fileEntry);
        }
        // Skip directory entries inside the recursive result to avoid nested recursion
      }
      
      // Add the file entries to the variable's value array
      // Keep the original directory entry and append the file entries
      if (variableEntries.length > 0) {
        // Update the directory entry to indicate it's been processed
        variable.value[entryIndex].metadata.contentResolved = true;
        variable.value[entryIndex].metadata.lastFetchedAt = Date.now();
        
        // Append all found files after the directory entry
        variable.value.splice(entryIndex + 1, 0, ...variableEntries);
        
        console.log(`[processDirectoriesRecursively] Added ${variableEntries.length} file entries from directory: ${entry.value}`);
      }
    } catch (error) {
      console.error(`[processDirectoriesRecursively] Error processing directory ${entry.value}:`, error);
    }
  }
  
  return variables;
}

/**
 * Creates a variable entry for a file from a filesystem entry
 * @param fsEntry The filesystem entry
 * @returns A variable entry for the file
 */
function createFileVariableEntry(fsEntry: FileEntry): VariableEntry {
  // Register the handle in the registry
  const handleId = fs.registry.registerHandle(fsEntry.handle);
  
  // Determine the full path if available
  const filePath = fsEntry.name;
  
  // Create a variable entry
  return {
    type: VARIABLE_ENTRY_TYPES.FILE,
    value: filePath,
    metadata: {
      path: filePath,
      size: fsEntry.size,
      type: fsEntry.type,
      lastModified: fsEntry.lastModified,
      handleId: handleId
    }
  };
}

/**
 * Enhances the clipboard operation by resolving file contents before copying
 * @param content The content to copy to clipboard
 * @param templateValues Values for template variables
 * @param variables Array of global variables that may contain file references
 * @param options Options for content resolution
 * @returns Whether the copy operation was successful
 */
export async function copyWithResolvedFileContents(
  content: string,
  templateValues: Record<string, any> = {},
  variables: any[] = [],
  options: FileContentResolutionOptions = {}
): Promise<boolean> {
  try {
    console.log('[copyWithResolvedFileContents] Starting copy with resolved file contents');
    
    // Resolve file contents
    const resolvedVariables = await resolveFileContents(variables, options);
    console.log(`[copyWithResolvedFileContents] File resolution complete for ${resolvedVariables.length} variables`);
    
    // Replace variables in content
    const finalContent = replaceVariables(content, templateValues, resolvedVariables);
    console.log(`[copyWithResolvedFileContents] Variables replaced, final content length: ${finalContent.length} characters`);
    console.log(`[copyWithResolvedFileContents] Final content starts with: ${finalContent.substring(0, 100)}...`);
    
    // Check for unreplaced variables
    const variableRegex = /\{\{([^{}]+)\}\}/g;
    const variableMatches = finalContent.match(variableRegex);
    const variableNames = variableMatches 
      ? variableMatches.map(match => match.substring(2, match.length - 2).trim()) 
      : [];
    
    for (const variableName of variableNames) {
      if (finalContent.includes(`{{${variableName}}}`)) {
        console.warn(`[copyWithResolvedFileContents] Warning: Variable ${variableName} was not replaced in the final content`);
        
        // Check why the variable wasn't replaced
        console.log(`[copyWithResolvedFileContents] Debugging unreplaced variable ${variableName}:`);
        
        // Find the variable in the resolved variables
        const resolvedVar = resolvedVariables.find(v => v.name === variableName);
        if (resolvedVar) {
          console.log(`[copyWithResolvedFileContents] Resolved variable found:`, JSON.stringify(resolvedVar, (key, value) => {
            // Avoid logging large file contents or circular references
            if (key === 'value' && typeof value === 'string' && value.length > 500) {
              return value.substring(0, 500) + '... [content truncated]';
            }
            if (key === 'handle') return '[File Handle]';
            return value;
          }, 2));
        } else {
          console.log(`[copyWithResolvedFileContents] Variable ${variableName} not found in resolved variables`);
        }
        
        // Check template values
        if (variableName in templateValues) {
          console.log(`[copyWithResolvedFileContents] Template value for ${variableName}:`, templateValues[variableName]);
        } else {
          console.log(`[copyWithResolvedFileContents] No template value for ${variableName}`);
        }
      }
    }
    
    // Copy to clipboard
    try {
      // Try browser clipboard API first
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(finalContent);
      } else if (typeof require !== 'undefined') {
        // Try Node.js clipboard if available
        const clipboard = require('clipboardy');
        await clipboard.write(finalContent);
      }
      return true;
    } catch (clipError) {
      console.error('[copyWithResolvedFileContents] Failed to copy to clipboard:', clipError);
      return false;
    }
  } catch (error) {
    console.error('[copyWithResolvedFileContents] Error copying with resolved file contents:', error);
    return false;
  }
}

/**
 * Ensures that we have the necessary permissions to access the files
 * referenced in the variables.
 * 
 * @param variables Array of global variables
 * @returns Whether all files could be accessed
 */
export async function ensureFilePermissions(variables: any[]): Promise<boolean> {
  try {
    // Check if we have any file entries
    let hasFileEntries = false;
    let accessSuccessful = false;
    
    // For tracking which files we've attempted to access
    const attemptedFiles: string[] = [];
    
    // Collect all unique file handles
    const handles: FileSystemHandle[] = [];
    const handleIds = new Set<string>();
    
    // Scan variables for file entries
    if (Array.isArray(variables)) {
      for (const variable of variables) {
        if (variable?.value && Array.isArray(variable.value)) {
          for (const entry of variable.value) {
            if ((isFileEntry(entry) || isDirectoryEntry(entry)) && entry.metadata) {
              hasFileEntries = true;
              
              const fileName = entry.metadata.path || entry.value || 'unknown file';
              
              // Skip if we've already tried this file
              if (attemptedFiles.includes(fileName)) {
                continue;
              }
              
              attemptedFiles.push(fileName);
              
              // Extract handle ID from metadata
              const handleId = entry.metadata.handleId;
              if (!handleId) {
                console.warn(`[ensureFilePermissions] No handle ID for entry: ${entry.name || fileName}`);
                continue;
              }
              
              if (!handleIds.has(handleId)) {
                // Get the handle from the registry
                const handle = fs.registry.getHandle(handleId);
                if (handle) {
                  handleIds.add(handleId);
                  handles.push(handle);
                } else {
                  console.warn(`[ensureFilePermissions] No handle found in registry for ${fileName}`);
                }
              }
            }
          }
        }
      }
    }
    
    // If no file entries were found, return true (no permissions needed)
    if (!hasFileEntries || handles.length === 0) {
      console.log(`[ensureFilePermissions] No file entries found, no permissions needed`);
      return true;
    }
    
    console.log(`[ensureFilePermissions] Found ${handles.length} unique file handles to check permissions for`);
    
    // Verify permissions for all handles
    for (const handle of handles) {
      try {
        // Use the filesystem permissions module to verify read permission
        const hasPermission = await fs.permissions.verifyPermission(handle, 'read');
        
        if (hasPermission) {
          console.log(`[ensureFilePermissions] Permission verified for ${handle.name || 'unnamed'}`);
          accessSuccessful = true;
          // We only need one successful permission check to know the user is engaging with the permission prompt
          break;
        } else {
          console.warn(`[ensureFilePermissions] Permission denied for ${handle.name || 'unnamed'}`);
        }
      } catch (error) {
        console.warn(`[ensureFilePermissions] Error checking permission for ${handle.name || 'unnamed'}:`, error);
        // Continue trying other handles even if this one fails
      }
    }
    
    // Return true if we successfully accessed at least one file
    return accessSuccessful;
  } catch (error: unknown) {
    console.error('Error ensuring file permissions:', error);
    return false;
  }
}

/**
 * Formats file size in a human-readable format
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Actively resolves file contents for all variables with file entries
 * This is a more aggressive approach that ensures file contents are resolved
 * by explicitly checking and re-requesting permissions if needed
 * 
 * @param variables Array of variables that may contain file entries
 * @param options Options for resolution
 * @returns Promise resolving to a boolean indicating whether all file contents were successfully resolved
 */
export async function activeResolveAllFileContents(
  variables: any[],
  options: {
    useCache?: boolean,
    cacheTTL?: number,
    forceReacquire?: boolean,
    useParallelProcessing?: boolean,
    autoReacquireHandles?: boolean,
    recursive?: {
      enabled?: boolean,
      maxDepth?: number,
      include?: string[],
      exclude?: string[]
    }
  } = {}
): Promise<boolean> {
  if (!Array.isArray(variables) || variables.length === 0) {
    console.log(`[activeResolveAllFileContents] No variables to process`);
    return false;
  }
  
  console.log(`[activeResolveAllFileContents] Processing ${variables.length} variables`);
  let successCount = 0;
  let fileCount = 0;
  let missingHandlesCount = 0;
  
  // Default options
  const opts = {
    autoReacquireHandles: options.autoReacquireHandles !== false,
    forceReacquire: options.forceReacquire === true,
    useParallelProcessing: options.useParallelProcessing !== false,
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 5 * 60 * 1000, // Default to 5 minutes
    recursive: {
      enabled: options.recursive?.enabled || false,
      maxDepth: options.recursive?.maxDepth || 5,
      include: options.recursive?.include || [],
      exclude: options.recursive?.exclude || []
    }
  };
  
  console.log(`[activeResolveAllFileContents] Options:`, {
    autoReacquireHandles: opts.autoReacquireHandles,
    forceReacquire: opts.forceReacquire,
    useCache: opts.useCache,
    recursive: opts.recursive.enabled
  });
  
  // Ensure registry is loaded before proceeding
  try {
    const registry = fs.registry;
    if (registry && typeof registry.ensureRegistryLoaded === 'function') {
      console.log(`[activeResolveAllFileContents] Ensuring registry is loaded...`);
      await registry.ensureRegistryLoaded();
      console.log(`[activeResolveAllFileContents] Registry loaded successfully`);
    } else {
      console.warn(`[activeResolveAllFileContents] Registry not available or missing ensureRegistryLoaded method`);
    }
  } catch (err) {
    console.error(`[activeResolveAllFileContents] Failed to load registry:`, err);
  }
  
  // First check if we need to process directories recursively
  if (opts.recursive.enabled) {
    console.log(`[activeResolveAllFileContents] Recursive mode enabled, processing directories first`);
    
    // Resolve file contents with recursive option enabled
    variables = await resolveFileContents(variables, {
      useCache: opts.useCache,
      cacheTTL: opts.cacheTTL,
      recursive: {
        enabled: true,
        maxDepth: opts.recursive.maxDepth,
        include: opts.recursive.include,
        exclude: opts.recursive.exclude
      }
    });
    
    // Return early if we processed directories
    return true;
  }
  
  // Auto-reacquire file handles if needed
  if (opts.autoReacquireHandles) {
    console.log(`[activeResolveAllFileContents] Auto-reacquire handles enabled, checking for missing handles...`);
    
    // Get a count of file entries before attempting to reacquire
    let fileEntryCount = 0;
    let missingHandleCount = 0;
    
    // Scan variables to count file entries and missing handles
    for (const variable of variables) {
      if (variable?.value && Array.isArray(variable.value)) {
        for (const entry of variable.value) {
          if (entry && entry.type === 'file' && entry.metadata) {
            fileEntryCount++;
            
            // Check if handle exists in registry
            let handleExists = false;
            if (entry.metadata.handleId) {
              const handle = fs.registry.getHandle(entry.metadata.handleId);
              handleExists = !!handle;
            }
            
            if (!handleExists) {
              missingHandleCount++;
            }
          }
        }
      }
    }
    
    console.log(`[activeResolveAllFileContents] Found ${fileEntryCount} file entries, ${missingHandleCount} with missing handles`);
    
    // If missing handles, try to reacquire them
    if (missingHandleCount > 0) {
      try {
        console.log(`[activeResolveAllFileContents] Attempting to reacquire missing handles...`);
        const reacquired = await reacquireFileHandles(variables);
        console.log(`[activeResolveAllFileContents] Reacquire result: ${reacquired ? 'successful' : 'failed'}`);
      } catch (err) {
        console.error(`[activeResolveAllFileContents] Error reacquiring handles:`, err);
      }
    }
  }
  
  // Process all variables to resolve file contents
  // Use either parallel or sequential processing based on options
  if (opts.useParallelProcessing) {
    console.log(`[activeResolveAllFileContents] Using parallel processing for file content resolution`);
    
    // Process all variables in parallel
    const results = await Promise.all(
      variables.map(variable => resolveFileContents([variable], opts).then(result => result.length > 0))
    );
    
    // Count successful resolutions
    successCount = results.filter(Boolean).length;
  } else {
    console.log(`[activeResolveAllFileContents] Using sequential processing for file content resolution`);
    
    // Process variables sequentially
    for (const variable of variables) {
      const resolved = await resolveFileContents([variable], opts).then(result => result.length > 0);
      if (resolved) {
        successCount++;
      }
    }
  }
  
  console.log(`[activeResolveAllFileContents] Resolution complete. Successfully processed ${successCount}/${variables.length} variables`);
  return successCount > 0;
}

/**
 * Re-acquires file handles that are missing from the registry
 * This prompts the user to re-select files that were previously selected
 * but whose handles are no longer valid (e.g., after page refresh)
 * 
 * @param variables Array of variables that may contain file entries
 * @returns Promise resolving to a boolean indicating whether all handles were successfully re-acquired
 */
export async function reacquireFileHandles(variables: any[]): Promise<boolean> {
  if (!Array.isArray(variables) || variables.length === 0) {
    console.log(`[reacquireFileHandles] No variables to process`);
    return false;
  }
  
  // Check if filesystem module is available
  if (!fs || !fsPickers) {
    console.log(`[reacquireFileHandles] Filesystem module unavailable`);
    return false;
  }
  
  console.log(`[reacquireFileHandles] Checking ${variables.length} variables for missing file handles`);
  let missingHandlesCount = 0;
  let reacquiredHandlesCount = 0;
  
  // First, identify all file entries with missing handles
  const entriesWithMissingHandles: Array<{
    variable: any,
    index: number,
    entry: any
  }> = [];
  
  // Track file paths to avoid duplicate prompts
  const processedPaths = new Set<string>();
  
  // Find all entries with missing handles
  for (const variable of variables) {
    if (variable?.value && Array.isArray(variable.value)) {
      for (let i = 0; i < variable.value.length; i++) {
        const entry = variable.value[i] as FileVariableEntry;
        
        if (entry && entry.type === 'file' && entry.metadata) {
          const metadata = entry.metadata;
          const filePath = metadata?.path || entry.value || 'unknown';
          
          // Skip if we've already processed this file path
          if (processedPaths.has(filePath)) {
            continue;
          }
          
          // Check if handle exists in registry
          let handleExists = false;
          if (metadata?.handleId) {
            const handle = fs.registry.getHandle(metadata.handleId);
            handleExists = !!handle;
          }
          
          if (!handleExists) {
            missingHandlesCount++;
            entriesWithMissingHandles.push({ variable, index: i, entry });
            processedPaths.add(filePath);
            console.log(`[reacquireFileHandles] Found missing handle for: ${filePath}`);
          }
        }
      }
    }
  }
  
  // If no missing handles, return early
  if (missingHandlesCount === 0) {
    console.log(`[reacquireFileHandles] No missing handles found`);
    return true;
  }
  
  console.log(`[reacquireFileHandles] Found ${missingHandlesCount} missing file handles`);
  
  // Prompt user to reselect each file
  for (const { variable, index, entry } of entriesWithMissingHandles) {
    const filePath = entry.metadata?.path || entry.value || 'unknown';
    console.log(`[reacquireFileHandles] Prompting to reselect file: ${filePath}`);
    
    try {
      // Prompt user to select the file
      alert(`Please reselect this file that was previously included: ${filePath}`);
      
      // Use the filesystem pickers module
      const fileEntries = await fsPickers.showFilePicker({
        multiple: false
      });
      
      if (fileEntries && fileEntries.length > 0) {
        const fileEntry = fileEntries[0];
        
        // Get file information - need to obtain the native File object
        // For FileEntry, we need to use the handle's getFile method
        let file;
        if (fileEntry.kind === 'file') {
          file = await fileEntry.handle.getFile();
        } else {
          console.warn(`[reacquireFileHandles] Selected entry is not a file: ${fileEntry.name}`);
          continue;
        }
        
        console.log(`[reacquireFileHandles] User selected: ${file.name}, size: ${file.size} bytes`);
        
        // Register the handle in the filesystem registry
        const handleId = fs.registry.registerHandle(fileEntry.handle);
        
        // Update the entry with the new handle
        variable.value[index].metadata.handleId = handleId;
        console.log(`[reacquireFileHandles] Registered new handle with ID: ${handleId} for ${filePath}`);
        
        // Update path if it's changed
        if (file.name !== getBasename(filePath)) {
          console.log(`[reacquireFileHandles] Updating path from ${filePath} to ${file.name}`);
          variable.value[index].metadata.path = file.name;
          variable.value[index].value = file.name;
        }
        
        // Update size if it's changed
        if (file.size !== entry.metadata.size) {
          console.log(`[reacquireFileHandles] Updating size from ${entry.metadata.size} to ${file.size}`);
          variable.value[index].metadata.size = file.size;
        }
        
        // Update type and last modified
        variable.value[index].metadata.type = file.type;
        variable.value[index].metadata.lastModified = file.lastModified;
        
        // Successfully reacquired handle
        reacquiredHandlesCount++;
      } else {
        console.warn(`[reacquireFileHandles] User cancelled file selection for ${filePath}`);
      }
    } catch (error) {
      // UserCancelledError is added to the Errors object in pickers.ts
      // but we need to check if it's an instance of Errors.FileSystemError with the right code
      if (error instanceof fsErrors.FileSystemError && error.code === 'USER_CANCELLED') {
        console.log(`[reacquireFileHandles] User cancelled file selection for ${filePath}`);
      } else {
        console.error(`[reacquireFileHandles] Error reacquiring handle for ${filePath}:`, error);
      }
    }
  }
  
  console.log(`[reacquireFileHandles] Reacquired ${reacquiredHandlesCount}/${missingHandlesCount} file handles`);
  return reacquiredHandlesCount > 0;
}

// Export the file handle registry
export { fileHandleRegistry };

/**
 * Diagnoses issues with file handles in variables
 * This function produces detailed diagnostic information about the state of file handles
 * 
 * @param variables Variables that may contain file entries to diagnose
 * @returns Diagnostic information as a string
 */
export function diagnoseFileHandles(variables: any[]): string {
  if (!Array.isArray(variables) || variables.length === 0) {
    return 'No variables to diagnose';
  }
  
  const diagnostics: string[] = [];
  diagnostics.push(`File Handle Diagnostic Report - ${new Date().toISOString()}`);
  diagnostics.push('-'.repeat(80));
  
  // Registry info
  let registryInfo = 'Registry unavailable';
  try {
    const registry = fs.registry;
    if (registry) {
      registryInfo = `Registry available`;
    }
  } catch (err) {
    registryInfo = `Registry error: ${err instanceof Error ? err.message : String(err)}`;
  }
  diagnostics.push(`Registry Status: ${registryInfo}`);
  diagnostics.push('-'.repeat(80));
  
  // Variable diagnostics
  let fileVariableCount = 0;
  let fileEntryCount = 0;
  let validHandleCount = 0;
  let invalidHandleCount = 0;
  
  for (const variable of variables) {
    if (!variable || !variable.name) continue;
    
    // Count file entries in this variable
    let varFileEntryCount = 0;
    
    if (variable.value && Array.isArray(variable.value)) {
      for (const entry of variable.value) {
        if (entry && entry.type === 'file' && entry.metadata) {
          varFileEntryCount++;
          fileEntryCount++;
          
          // Check handle status
          const handleId = entry.metadata.handleId;
          let hasValidHandle = false;
          
          if (handleId) {
            try {
              const handle = fs.registry.getHandle(handleId);
              hasValidHandle = !!handle;
              
              if (hasValidHandle) {
                validHandleCount++;
              } else {
                invalidHandleCount++;
              }
            } catch (err) {
              invalidHandleCount++;
            }
          } else {
            invalidHandleCount++;
          }
          
          // Add entry diagnostic
          const filePath = entry.metadata.path || entry.value || 'unknown';
          const handleStatus = hasValidHandle ? 'VALID' : 'INVALID';
          diagnostics.push(`File: ${filePath}`);
          diagnostics.push(`  Handle ID: ${handleId || 'MISSING'}`);
          diagnostics.push(`  Handle Status: ${handleStatus}`);
          diagnostics.push(`  Size: ${entry.metadata.size || 'unknown'}`);
          diagnostics.push('-'.repeat(40));
        }
      }
    }
    
    if (varFileEntryCount > 0) {
      fileVariableCount++;
    }
  }
  
  // Summary
  diagnostics.push('-'.repeat(80));
  diagnostics.push('Summary:');
  diagnostics.push(`Variables with file entries: ${fileVariableCount}/${variables.length}`);
  diagnostics.push(`Total file entries: ${fileEntryCount}`);
  diagnostics.push(`Valid handles: ${validHandleCount}`);
  diagnostics.push(`Invalid handles: ${invalidHandleCount}`);
  
  return diagnostics.join('\n');
} 