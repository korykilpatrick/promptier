/**
 * File Content Resolution Service
 * 
 * This service resolves file references to their contents during copy operations.
 * It wraps file contents in simple tags with the filename as the tag name.
 * 
 * DEBUG MODE: Enhanced diagnostics for file handle issues
 */

import type { VariableEntry } from 'shared/types/variables';
import { VARIABLE_ENTRY_TYPES, isFileEntry, isDirectoryEntry } from 'shared/types/variables';
import { replaceVariables } from './template-parser';
import * as path from 'path';
import { fileHandleRegistry } from '../components/sidebar/variables/FilePicker';

// Very large size limit (equiv to ~200k tokens) in bytes
// 800KB is approximately 200k tokens at 4 chars per token
const MAX_FILE_SIZE = 800 * 1024;

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
  // Remove any path information and get just the filename
  const basename = getBasename(filename);
  
  // Replace characters that would be invalid in XML tag names
  // XML tag names can't contain spaces, <, >, &, ", ', etc.
  return basename.replace(/[^\w.-]/g, '_');
}

/**
 * Retrieves a file handle from metadata, either directly or from the registry
 * @param metadata The file metadata object
 * @returns The file handle or undefined if not available
 */
function getFileHandleFromMetadata(metadata: any): any {
  // Check if we have a handleId (new approach)
  if (metadata?.handleId) {
    console.log(`[getFileHandleFromMetadata] Retrieving handle from registry with ID: ${metadata.handleId}`);
    return fileHandleRegistry.getHandle(metadata.handleId);
  }
  
  // Legacy check for direct handle (will be an empty object if serialized/deserialized)
  if (metadata?.handle) {
    console.log(`[getFileHandleFromMetadata] Found direct handle reference in metadata`);
    
    // Check if it's a valid handle or an empty object
    if (typeof metadata.handle === 'object' && 
        Object.keys(metadata.handle).length > 0 && 
        typeof metadata.handle.getFile === 'function') {
      console.log(`[getFileHandleFromMetadata] Direct handle appears valid`);
      return metadata.handle;
    } else {
      console.warn(`[getFileHandleFromMetadata] Direct handle is invalid (empty or missing getFile method)`);
    }
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
      debug: options.debug || true // Enable debug by default for troubleshooting
    };
    
    console.log(`[resolveFileContents] Starting resolution with options:`, resolveOptions);
    console.log(`[resolveFileContents] FileHandleRegistry has ${fileHandleRegistry.getHandleCount()} registered handles`);
    
    // Filter out variables without values
    if (!Array.isArray(variables) || variables.length === 0) {
      console.log(`[resolveFileContents] No variables to process`);
      return variables;
    }
    
    // Process each variable
    const fileVariablePromises = variables.map(async (variable) => {
      // Skip variables without value arrays
      if (!variable || !Array.isArray(variable.value) || variable.value.length === 0) {
      return variable;
    }
    
      // Only process if array contains file or directory entries
      const containsFileRefs = variable.value.some(
        (entry: VariableEntry) => isFileEntry(entry) || isDirectoryEntry(entry)
      );
      
      if (!containsFileRefs) {
      return variable;
    }
    
      // Process each entry in the variable's value array
      console.log(`[resolveFileContents] Processing variable: ${variable.name}`);
      const valueArray = variable.value;
      
      // Process all entries to resolve file references to their contents
    const processedEntries = await Promise.all(valueArray.map(async (entry: VariableEntry) => {
      // Handle file entries
        if (isFileEntry(entry) && entry.metadata) {
          try {
            console.log(`[resolveFileContents] Processing file entry: ${entry.value}`);
            
            // Get the file handle from metadata (either direct or from registry)
            const handle = getFileHandleFromMetadata(entry.metadata);
            
            // Debug handle retrieval
            if (resolveOptions.debug) {
              console.log(`[resolveFileContents] DEBUG: Handle retrieval result:`, {
                handleExists: !!handle,
                handleType: typeof handle,
                handleIsEmpty: handle ? Object.keys(handle).length === 0 : true,
                hasGetFileMethod: handle ? typeof handle.getFile === 'function' : false,
                handleKind: handle?.kind
              });
            }
            
            // If handle is not available or invalid, return early with error
            if (!handle || typeof handle !== 'object' || Object.keys(handle).length === 0) {
              console.error(`[resolveFileContents] Missing or invalid file handle for ${entry.value}`);
              return {
                ...entry,
                value: `Cannot access file: ${entry.value} - File handle is unavailable or invalid`
              };
            }
            
            // ENHANCED DIAGNOSTICS: Validate file handle
            console.log(`[resolveFileContents] DEBUG: Checking file handle...`);
            const handleDiagnostics = await validateFileHandle(handle);
            console.log(`[resolveFileContents] DEBUG: Handle validation: ${handleDiagnostics.isValid ? 'VALID' : 'INVALID'}`);
            console.log(`[resolveFileContents] DEBUG: Handle diagnostics: ${handleDiagnostics.diagnostics}`);
            
            if (!handleDiagnostics.isValid) {
              console.error(`[resolveFileContents] File handle validation failed: ${handleDiagnostics.diagnostics}`);
              return {
                ...entry,
                value: `Cannot access file: ${entry.value} - ${handleDiagnostics.diagnostics}`
              };
            }
            
            // More detailed metadata inspection
            if (resolveOptions.debug) {
              console.log(`[resolveFileContents] File metadata details:`, {
                keys: entry.metadata ? Object.keys(entry.metadata) : [],
                size: entry.metadata?.size,
                path: entry.metadata?.path,
                handleId: entry.metadata?.handleId,
                lastModified: entry.metadata?.lastModified
              });
            }
            
            // Try to get a better file path from metadata if available
            let filePath = entry.value;
            if (entry.metadata?.path) {
              filePath = entry.metadata.path;
              console.log(`[resolveFileContents] Using path from metadata: ${filePath}`);
            }
            
            // Get the basename for tag creation
            const filename = getBasename(filePath);
            const tagName = createTagFromFilename(filename);
            console.log(`[resolveFileContents] Using tag name: ${tagName} for file: ${filename}`);
            
            // Check if size is available in metadata and it exceeds limit
            if (entry.metadata?.size && entry.metadata.size > resolveOptions.maxFileSize) {
              console.warn(`[resolveFileContents] File exceeds size limit: ${filePath} (${entry.metadata.size} bytes)`);
              return {
                ...entry,
                value: `File too large: ${filePath} (${entry.metadata.size} bytes)`
              };
            }
            
            // If this is a browser environment, try to access the file using the File System Access API
            if (handle && typeof window !== 'undefined') {
              try {
                console.log(`[resolveFileContents] Attempting to access file directly via handle`);
                
                console.log(`[resolveFileContents] DEBUG: About to call getFile() on handle...`);
                // Try to get the file directly - this may throw if permission was denied
                // The browser will generally show a permission prompt automatically if needed
                const file = await handle.getFile();
                console.log(`[resolveFileContents] File retrieved: ${file.name}, size: ${file.size} bytes, path: ${filePath}`);
                
                // Read file content
                const content = await file.text();
                console.log(`[resolveFileContents] File content read, length: ${content.length} characters`);
                console.log(`[resolveFileContents] Content preview: ${content.substring(0, 100)}...`);
                
                // Format with simple tags using the filename
                const formattedContent = resolveOptions.wrapInTags
                  ? `<${tagName}>\n${content}\n</${tagName}>`
                  : content;
                
                console.log(`[resolveFileContents] Formatted content length: ${formattedContent.length} characters`);
                console.log(`[resolveFileContents] Formatted content preview: ${formattedContent.substring(0, 100)}...`);
                
                // Return entry with content as value and also store raw content for fallback
                return {
                  ...entry,
                  value: formattedContent,
                  metadata: {
                    ...entry.metadata,
                    rawContent: content, // Store raw content in metadata for easy access
                    tagName, // Store the tag name we used
                    contentResolved: true
                  }
                };
              } catch (accessError) {
                console.error('[resolveFileContents] Error accessing file via handle:', accessError);
                
                // If access failed, we can still try an alternate approach or return the error
                // Try to get the file name at least
                let errorMessage = `Error accessing file: ${filePath}`;
                let fileName = entry.value;
                
                try {
                  if (handle.name) {
                    fileName = handle.name;
                    console.log(`[resolveFileContents] Got file name from handle: ${fileName}`);
                  }
                } catch (nameError) {
                  console.error('[resolveFileContents] Could not get file name from handle:', nameError);
                }
                
            return {
              ...entry,
                  value: `${errorMessage} - ${accessError instanceof Error ? accessError.message : 'Permission denied or file not available'}`,
                  metadata: {
                    ...entry.metadata,
                    accessError: accessError instanceof Error ? accessError.message : 'Permission denied',
                    fileName,
                    debugInfo: `Handle validation: ${handleDiagnostics.diagnostics}` // Add diagnostic info
                  }
                };
              }
          } else {
              // No handle or not in browser environment
              console.log(`[resolveFileContents] No valid file handle available or not in browser environment`);
            return {
              ...entry,
                value: `Cannot access file: ${filePath} - No valid file handle`
            };
          }
        } catch (error: unknown) {
            console.error('[resolveFileContents] Error reading file:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            ...entry,
            value: `Error reading file: ${entry.value} - ${errorMessage}`
          };
        }
      }
      
      // Handle directory entries (optional future enhancement)
        else if (isDirectoryEntry(entry) && entry.metadata) {
          // Get the directory handle (either direct or from registry)
          const handle = getFileHandleFromMetadata(entry.metadata);
          
        // For directories, you might want to list files or process them
        // This is a placeholder for directory handling
          console.log(`[resolveFileContents] Processing directory: ${entry.value}`);
        return {
          ...entry,
          value: `Directory: ${entry.value} (directory contents not processed)`
        };
      }
      
      // Return other entries unchanged
        console.log(`[resolveFileContents] Entry is not a file/directory with handle, leaving unchanged:`, JSON.stringify(entry, null, 2));
      return entry;
    }));
    
      // Update variable with processed entries
    return {
      ...variable,
      value: processedEntries
    };
  });
  
    // Wait for all file variable promises to complete
    const processedVariables = await Promise.all(fileVariablePromises);
    
    return processedVariables;
  } catch (error: unknown) {
    console.error('[resolveFileContents] Error resolving file contents:', error);
    return variables;
  }
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
 * Attempts to directly access files, bypassing the permission checking
 * that was previously used. This is a simpler approach that will work with
 * the updated File System Access API.
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
              
              // Get the handle from metadata or registry
              const handle = getFileHandleFromMetadata(entry.metadata);
              
              if (!handle) {
                console.warn(`[ensureFilePermissions] No valid handle found for ${fileName}`);
                continue;
              }
              
              // Try to access one file to verify permissions
              try {
                if (handle.kind === 'file') {
                  console.log(`[ensureFilePermissions] Testing access to file: ${fileName}`);
                  await handle.getFile();
                  console.log(`[ensureFilePermissions] Successfully accessed file: ${fileName}`);
                  accessSuccessful = true;
                  
                  // No need to try more files once one succeeds
                  break;
                }
              } catch (error) {
                console.warn(`[ensureFilePermissions] Could not access file: ${fileName}`, error);
                // Continue trying other files even if this one fails
              }
            }
          }
          
          // If we've successfully accessed a file, no need to check more variables
          if (accessSuccessful) {
            break;
          }
        }
      }
    }
    
    // If no file entries were found, return true (no permissions needed)
    if (!hasFileEntries) {
      console.log(`[ensureFilePermissions] No file entries found, no permissions needed`);
      return true;
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
 * Actively fetches file content from the filesystem
 * This function should be called whenever fresh file content is needed
 * 
 * @param entry The file entry to fetch content for
 * @returns A promise resolving to the file content (wrapped in tags) or null if unsuccessful
 */
export async function activeFetchFileContent(entry: any): Promise<string | null> {
  if (!entry || entry.type !== 'file' || !entry.metadata) {
    console.log(`[activeFetchFileContent] Invalid entry, cannot fetch content`);
    return null;
  }
  
  const filePath = entry.metadata?.path || entry.value || 'unknown';
  console.log(`[activeFetchFileContent] Fetching content for file: ${filePath}`);
  
  try {
    // Get file handle from the registry
    let handle = null;
    
    // Check if handleId is present in metadata
    const handleId = entry.metadata?.handleId;
    if (handleId && typeof handleId === 'string') {
      handle = fileHandleRegistry.getHandle(handleId);
      console.log(`[activeFetchFileContent] Retrieved handle from registry with ID: ${handleId}`);
    } else if (entry.metadata?.handle) {
      // Legacy path for backward compatibility
      handle = getFileHandleFromMetadata(entry.metadata);
    }
    
    if (!handle) {
      console.warn(`[activeFetchFileContent] No valid handle found for ${filePath}`);
      return null;
    }
    
    // Ensure we have permission to access the file
    try {
      // For file handles with verifyPermission method (non-standard but sometimes available)
      if (typeof (handle as any).verifyPermission === 'function') {
        await (handle as any).verifyPermission({ mode: 'read' });
      } 
      // Standard File System Access API permission check
      else if (typeof handle.requestPermission === 'function') {
        const permission = await handle.requestPermission({ mode: 'read' });
        if (permission !== 'granted') {
          throw new Error(`Permission not granted for file: ${filePath}`);
        }
      }
    } catch (permError) {
      console.warn(`[activeFetchFileContent] Permission error for ${filePath}:`, permError);
      // Continue anyway, the getFile() call will fail if permissions are really missing
    }
    
    // Verify the handle has the getFile method (should be a FileSystemFileHandle)
    if (handle.kind !== 'file' || typeof (handle as any).getFile !== 'function') {
      console.error(`[activeFetchFileContent] Handle is not a file handle or missing getFile method`);
      return null;
    }
    
    // Fetch the file
    const file = await (handle as any).getFile();
    
    if (!file) {
      console.error(`[activeFetchFileContent] Failed to get file object from handle`);
      return null;
    }
    
    console.log(`[activeFetchFileContent] File retrieved: ${file.name}, size: ${file.size} bytes`);
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`[activeFetchFileContent] File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE} bytes)`);
      return `File too large: ${filePath} (${formatFileSize(file.size)})`;
    }
    
    // Read file content
    const content = await file.text();
    console.log(`[activeFetchFileContent] File content read, length: ${content.length} characters`);
    
    // Create tag name from file name for consistent wrapping
    const fileName = file.name || entry.metadata?.path?.split(/[\/\\]/).pop() || 'file';
    const tagName = fileName.replace(/[^\w.-]/g, '_');
    
    // Wrap content in tags
    const taggedContent = `<${tagName}>\n${content}\n</${tagName}>`;
    
    // Update entry metadata
    if (entry.metadata) {
      entry.metadata.contentResolved = true;
      entry.metadata.lastFetchedAt = Date.now();
      entry.metadata.tagName = tagName;
      entry.metadata.contentLength = content.length;
    }
    
    return taggedContent;
  } catch (error) {
    console.error(`[activeFetchFileContent] Error fetching file content:`, error);
    return null;
  }
}

/**
 * Actively resolves file contents for all file variables
 * This is the main function to call before copying templates with file references
 * 
 * @param variables Array of variables that may contain file entries
 * @param options Optional configuration for file resolution
 * @returns Promise resolving to a boolean indicating success
 */
export async function activeResolveAllFileContents(
  variables: any[], 
  options: { 
    autoReacquireHandles?: boolean 
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
    autoReacquireHandles: options.autoReacquireHandles !== false
  };
  
  // Check the file handle registry status
  const registryHandleCount = fileHandleRegistry.getHandleCount();
  console.log(`[activeResolveAllFileContents] Current registry has ${registryHandleCount} handles`);
  
  // First identify if there are any missing handles
  if (opts.autoReacquireHandles) {
    for (const variable of variables) {
      if (variable?.value && Array.isArray(variable.value)) {
        for (const entry of variable.value) {
          if (entry && entry.type === 'file' && entry.metadata) {
            // Access the handle property from metadata (not handleId)
            const handleId = entry.metadata.handle;
            if (handleId) {
              const handle = fileHandleRegistry.getHandle(handleId);
              if (!handle) {
                missingHandlesCount++;
              }
            }
          }
        }
      }
    }
    
    // If we found missing handles, try to reacquire them
    if (missingHandlesCount > 0 || registryHandleCount === 0) {
      console.log(`[activeResolveAllFileContents] Found ${missingHandlesCount} missing handles, attempting to reacquire`);
      try {
        const reacquired = await reacquireFileHandles(variables);
        console.log(`[activeResolveAllFileContents] Handle reacquisition ${reacquired ? 'successful' : 'failed'}`);
        
        // If reacquisition failed completely, return early
        if (!reacquired) {
          console.warn(`[activeResolveAllFileContents] Failed to reacquire any file handles, cannot proceed`);
          return false;
        }
      } catch (error) {
        console.error(`[activeResolveAllFileContents] Error reacquiring file handles:`, error);
        // Continue anyway, we'll try with whatever handles we have
      }
    }
  }
  
  // First ensure we have permissions
  try {
    const hasPermissions = await ensureFilePermissions(variables);
    
    if (!hasPermissions) {
      console.warn(`[activeResolveAllFileContents] Failed to ensure file permissions`);
      return false;
    }
  } catch (error) {
    console.error(`[activeResolveAllFileContents] Error checking file permissions:`, error);
    // Continue anyway, we'll fail on individual files if needed
  }
  
  // Process each variable
  for (const variable of variables) {
    if (variable?.value && Array.isArray(variable.value)) {
      console.log(`[activeResolveAllFileContents] Processing variable: ${variable.name || 'unnamed'}`);
      
      // Find all file entries in this variable
      for (let i = 0; i < variable.value.length; i++) {
        const entry = variable.value[i];
        
        if (entry && entry.type === 'file' && entry.metadata) {
          fileCount++;
          const filePath = entry.metadata?.path || entry.value || 'unknown';
          console.log(`[activeResolveAllFileContents] Processing file: ${filePath}`);
          
          try {
            // Use our active fetch function to get fresh content
            const content = await activeFetchFileContent(entry);
            
            if (content) {
              // Update the entry value with the content
              variable.value[i].value = content;
              console.log(`[activeResolveAllFileContents] Successfully updated file content for ${filePath}`);
              successCount++;
            } else {
              console.warn(`[activeResolveAllFileContents] Failed to fetch content for ${filePath}`);
            }
          } catch (error) {
            console.error(`[activeResolveAllFileContents] Error processing file ${filePath}:`, error);
          }
        }
      }
    }
  }
  
  console.log(`[activeResolveAllFileContents] Completed: ${successCount}/${fileCount} files resolved`);
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
  
  // Check if we're in a browser environment with File System API support
  if (typeof window === 'undefined' || !window.showOpenFilePicker) {
    console.log(`[reacquireFileHandles] Environment does not support File System Access API`);
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
        const entry = variable.value[i];
        
        if (entry && entry.type === 'file' && entry.metadata) {
          const filePath = entry.metadata?.path || entry.value || 'unknown';
          
          // Skip if we've already processed this file path
          if (processedPaths.has(filePath)) {
            continue;
          }
          
          // Check if handle exists in registry
          let handleExists = false;
          if (entry.metadata?.handleId) {
            const handle = fileHandleRegistry.getHandle(entry.metadata.handleId);
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
      
      const fileHandles = await window.showOpenFilePicker({
        multiple: false
      });
      
      if (fileHandles && fileHandles.length > 0) {
        const handle = fileHandles[0];
        
        // Validate the selected file is similar to what we expect
        const file = await handle.getFile();
        console.log(`[reacquireFileHandles] User selected: ${file.name}, size: ${file.size} bytes`);
        
        // Register the new handle and update the metadata
        const handleId = fileHandleRegistry.registerHandle(handle);
        
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
      console.error(`[reacquireFileHandles] Error reacquiring handle for ${filePath}:`, error);
    }
  }
  
  console.log(`[reacquireFileHandles] Reacquired ${reacquiredHandlesCount}/${missingHandlesCount} file handles`);
  return reacquiredHandlesCount > 0;
}

// Export the file handle registry
export { fileHandleRegistry }; 