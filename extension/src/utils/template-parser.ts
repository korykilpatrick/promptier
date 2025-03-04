import { TemplateVariableError, VARIABLE_NAME_PATTERN } from 'shared/types/template-variables';
import type {
  TemplateVariable,
  TemplateVariableValidationError,
  TemplateParseResult,
  TemplateVariableValues
} from 'shared/types/template-variables';
import { fs } from '../filesystem';
import { fileHandleRegistry } from '../components/sidebar/variables/FilePicker';

/**
 * Regex patterns for template parsing and validation
 */
const PATTERNS = {
  // Matches escaped braces: \{{ or \}}
  ESCAPED_BRACES: /\\(\{\{|\}\})/g,
  
  // Matches any unescaped opening brace followed by another brace
  UNMATCHED_OPEN: /(?<!\\)\{{(?!\{)/g,
  
  // Matches any unescaped closing brace followed by another brace
  UNMATCHED_CLOSE: /(?<!\\)\}}(?!\})/g,
  
  // Matches complete variable syntax with groups
  VARIABLE: /\{\{([^{}:]+)(?::([^{}:]+))?(?::([^{}]+))?\}\}/g,
  
  // Matches nested variable attempts
  NESTED_VARIABLE: /\{\{[^{}]*\{\{|\}\}[^{}]*\}\}/g
};

/**
 * Creates a validation error object
 */
function createError(
  type: TemplateVariableError,
  message: string,
  variableName?: string,
  position?: { start: number; end: number }
): TemplateVariableValidationError {
  return { type, message, variableName, position };
}

/**
 * Validates the overall template syntax
 */
function validateTemplateSyntax(template: string): TemplateVariableValidationError[] {
  const errors: TemplateVariableValidationError[] = [];
  
  // Check for nested variables
  const nestedMatch = template.match(PATTERNS.NESTED_VARIABLE);
  if (nestedMatch) {
    errors.push(createError(
      TemplateVariableError.MALFORMED_SYNTAX,
      'Nested variables are not allowed',
      undefined,
      { start: nestedMatch.index!, end: nestedMatch.index! + nestedMatch[0].length }
    ));
  }
  return errors;
}

/**
 * Validates a variable name against the allowed pattern
 */
function validateVariableName(
  name: string,
  position: { start: number; end: number }
): TemplateVariableValidationError | null {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return createError(
      TemplateVariableError.INVALID_NAME,
      'Variable name cannot be empty',
      trimmedName,
      position
    );
  }
  
  if (!VARIABLE_NAME_PATTERN.test(trimmedName)) {
    return createError(
      TemplateVariableError.INVALID_NAME,
      `Variable name "${trimmedName}" must start with a letter or underscore, contain only letters, numbers, and underscores, and not end with an underscore`,
      trimmedName,
      position
    );
  }
  
  return null;
}

/**
 * Unescapes template text by converting \{{ to {{ and \}} to }}
 */
function unescapeTemplate(template: string): string {
  return template.replace(PATTERNS.ESCAPED_BRACES, '$1');
}

/**
 * Extracts and validates all variables from a template string
 */
export function parseTemplate(template: string): TemplateParseResult {
  const variables: TemplateVariable[] = [];
  const errors: TemplateVariableValidationError[] = [];
  const seenNames = new Set<string>();
  
  // First validate overall template syntax
  const syntaxErrors = validateTemplateSyntax(template);
  if (syntaxErrors.length > 0) {
    return {
      variables: [],
      errors: syntaxErrors,
      isValid: false,
      template: template
    };
  }
  
  // Then extract and validate variables
  console.log('[parseTemplate] Starting parsing for template:', template);
  let match: RegExpExecArray | null;
  while ((match = PATTERNS.VARIABLE.exec(template)) !== null) {
    console.log('[parseTemplate] Found match:', match);
    const [fullMatch, name, defaultValue, description] = match;
    const trimmedName = name.trim();
    const position = {
      start: match.index,
      end: match.index + fullMatch.length
    };
    console.log('[parseTemplate] Parsing complete. Variables:', variables, 'Errors:', errors);
    
    // Validate variable name
    const nameError = validateVariableName(trimmedName, position);
    if (nameError) {
      errors.push(nameError);
      continue;
    }
    
    // Check for duplicates
    if (seenNames.has(trimmedName)) {
      errors.push(createError(
        TemplateVariableError.DUPLICATE_NAME,
        `Duplicate variable name "${trimmedName}"`,
        trimmedName,
        position
      ));
      continue;
    }
    seenNames.add(trimmedName);
    
    // Create variable object
    variables.push({
      name: trimmedName,
      defaultValue: defaultValue?.trim(),
      description: description?.trim(),
      isRequired: !defaultValue,
      originalMatch: fullMatch,
      position
    });
  }
  
  return {
    variables,
    errors,
    isValid: errors.length === 0,
    template: unescapeTemplate(template)
  };
}

/**
 * Retrieves a file handle from metadata, either directly or from the registry
 * @param metadata The file metadata object
 * @returns The file handle or undefined if not available
 */
function getFileHandleFromMetadata(metadata: any): any {
  // Only check for the handleId property - no legacy support
  if (metadata?.handleId) {
    console.log(`[getFileHandleFromMetadata] Retrieving handle from registry with ID: ${metadata.handleId}`);
    return fs.registry.getHandle(metadata.handleId);
  }
  
  console.warn(`[getFileHandleFromMetadata] No valid handle found in metadata`);
  return undefined;
}

// Extract the filename without path
const getBasename = (filePath: string): string => {
  return filePath.split(/[\/\\]/).pop() || filePath;
};

// Create a safe tag name from a filename
const createTagFromFilename = (filename: string): string => {
  const basename = getBasename(filename);
  return basename.replace(/[^\w.-]/g, '_');
};

/**
 * Replaces variables in a template with their values
 * @param template The template string
 * @param variableValues The variable values from the template
 * @param globalVariables Optional array of global variables that may have complex structure
 */
export function replaceVariables(
  template: string,
  variableValues: TemplateVariableValues,
  globalVariables: any[] = []
): string {
  // First unescape any escaped braces
  let result = unescapeTemplate(template);
  
  // Create a map of global variables for quick lookup
  const globalVariableMap: Record<string, any> = {};
  if (Array.isArray(globalVariables)) {
    globalVariables.forEach(gv => {
      if (gv && typeof gv === 'object' && 'name' in gv) {
        globalVariableMap[gv.name] = gv;
      }
    });
  }
  
  // Debug global variables
  console.log('[replaceVariables] globalVariables map keys:', Object.keys(globalVariableMap));
  console.log('[replaceVariables] Full globalVariables:', JSON.stringify(globalVariables, null, 2));
  
  // Find variables that have file or directory entries
  const fileVariableNames = new Set<string>();
  Object.entries(globalVariableMap).forEach(([name, variable]) => {
    // Check if variable has value array with file/directory entries
    if (variable && typeof variable === 'object' && 'value' in variable) {
      let hasFileEntries = false;
      
      // Check if any entries are file/directory types in array
      if (Array.isArray(variable.value)) {
        hasFileEntries = variable.value.some((entry: any) => 
          entry?.type === 'file' || entry?.type === 'directory'
        );
      }
      
      // Check if single value is file/directory type
      else if (variable.value && typeof variable.value === 'object' && 'type' in variable.value) {
        hasFileEntries = variable.value.type === 'file' || variable.value.type === 'directory';
      }
      
      if (hasFileEntries) {
        fileVariableNames.add(name);
        console.log(`[replaceVariables] Variable ${name} has file entries, will prioritize file content`);
        console.log(`[replaceVariables] File variable structure:`, JSON.stringify(variable, null, 2));
      }
    }
  });
  
  // File content XML identifier
  const xmlId = 'file-content-resolver';
  
  const isResolvedFileContent = (value: string, entry: any): boolean => {
    if (typeof value !== 'string') {
      console.log(`[replaceVariables] isResolvedFileContent: value is not a string:`, value);
      return false;
    }
    
    // If the entry has metadata.tagName, that's the tag we used
    if (entry?.metadata?.tagName) {
      const tagName = entry.metadata.tagName;
      const tagPattern = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`);
      const hasTag = tagPattern.test(value);
      
      return hasTag;
    }
    
    // Generate tag from filename if needed
    let potentialTagName: string | null = null;
    
    if (entry?.metadata?.path) {
      const filename = getBasename(entry.metadata.path);
      potentialTagName = createTagFromFilename(filename);
    } else if (entry?.value && typeof entry.value === 'string') {
      const filename = getBasename(entry.value);
      potentialTagName = createTagFromFilename(filename);
    }
    
    if (potentialTagName) {
      const tagPattern = new RegExp(`<${potentialTagName}>[\\s\\S]*?<\\/${potentialTagName}>`);
      const hasTag = tagPattern.test(value);
      console.log(`[replaceVariables] isResolvedFileContent: Has derived tag ${potentialTagName}: ${hasTag}`);
      if (hasTag) return true;
    }
    
    // Check for any tag pattern as a fallback
    const anyTagPattern = /<[\w.-]+>[\s\S]*?<\/[\w.-]+>/;
    const hasAnyTag = anyTagPattern.test(value);
    console.log(`[replaceVariables] isResolvedFileContent: Has any tag structure: ${hasAnyTag}`);
    
    // Check if this is actually a file but not yet resolved
    // Sometimes file entries might not have their content resolved yet
    if (!hasAnyTag && entry?.type === 'file' && entry?.metadata?.size) {
      // If we have a size but the value is short, it's likely a path not content
      if (entry.value.length < 1000 && entry.metadata.size > 1000) {
        console.log(`[replaceVariables] isResolvedFileContent: Entry appears to be a file path that needs resolution`);
        console.log(`[replaceVariables] Path length: ${entry.value.length}, file size: ${entry.metadata.size}`);
        return false;
      }
      
      // If the value is lengthy, it might be content that's already been resolved but not wrapped in tags
      if (entry.value.length > 1000) {
        console.log(`[replaceVariables] isResolvedFileContent: Entry appears to contain raw file content`);
        return true;
      }
    }
    
    return hasAnyTag;
  };
  
  // Helper to try to resolve file content at substitution time
  const attemptLateFileResolution = async (entry: any): Promise<string | null> => {
    console.log(`[replaceVariables] Attempting late file content resolution`);
    
    // Track all attempted approaches for better debugging
    const attempts: Array<{method: string, result: string}> = [];
    
    // Check cache first for fast retrieval
    try {
      if (window._fileContentCache && entry?.metadata?.handleId) {
        const cacheKey = entry.metadata.handleId;
        const cachedData = window._fileContentCache[cacheKey];
        
        if (cachedData && cachedData.content) {
          const cacheAge = Date.now() - cachedData.timestamp;
          // Use cache if less than 30 seconds old
          if (cacheAge < 30000) {
            console.log(`[replaceVariables] Using cached file content for ${entry.value} (${cachedData.content.length} bytes, ${cacheAge}ms old)`);
            attempts.push({method: 'cache', result: 'success'});
            return cachedData.content;
          } else {
            console.log(`[replaceVariables] Cache too old (${cacheAge}ms), fetching fresh content`);
          }
        }
      }
    } catch (cacheError) {
      console.warn(`[replaceVariables] Error checking cache:`, cacheError);
    }
    
    // Only attempt if we can get a valid handle - use handleId exclusively
    let handle = null;
    let fileContent = null;
    
    // Try the filesystem registry with handleId
    if (entry?.metadata?.handleId) {
      const fsHandle = fs.registry.getHandle(entry.metadata.handleId);
      console.log(`[replaceVariables] Attempting to retrieve handle from fs registry with ID: ${entry.metadata.handleId}`);
      
      if (fsHandle && fsHandle.kind === 'file') {
        console.log(`[replaceVariables] Found file handle in fs registry`);
        // Cast to FileSystemFileHandle since we verified kind is 'file'
        handle = fsHandle as FileSystemFileHandle;
        attempts.push({method: 'fs.registry with handleId', result: 'success'});
      } else if (fsHandle) {
        console.warn(`[replaceVariables] Found handle but not a file handle: ${fsHandle.kind}`);
        attempts.push({method: 'fs.registry with handleId', result: 'not a file handle'});
      } else {
        attempts.push({method: 'fs.registry with handleId', result: 'handle not found'});
      }
    } else {
      console.warn(`[replaceVariables] Entry missing handleId`);
      attempts.push({method: 'handle lookup', result: 'no handleId provided'});
    }
    
    // Create a cache key from the handle ID or a hash of the content
    const cacheKey = entry.metadata.handleId || `file_${Date.now()}`;
    
    // If we found a handle, try to read the file content
    if (handle) {
      try {
        console.log(`[replaceVariables] Found handle, attempting to read file content`);
        
        // Use the filesystem module to read the file
        try {
          fileContent = await fs.readFile(handle, {
            encoding: 'utf-8'
          });
          
          if (fileContent) {
            console.log(`[replaceVariables] Successfully read file content (${fileContent.length} bytes)`);
            attempts.push({method: 'fs.readFile', result: 'success'});
            
            // Also store this successful read in a global accessor for immediate reference
            try {
              window._lastSuccessfulFileRead = {
                path: entry.metadata.path || handle.name,
                content: fileContent,
                timestamp: Date.now(),
                size: fileContent.length
              };
              console.log(`[replaceVariables] Stored successful file read in global accessor`);
            } catch (e) {
              console.warn(`[replaceVariables] Failed to store successful read in global accessor:`, e);
            }
            
            // Cache the content temporarily for future quick access
            try {
              // Simple in-memory cache for file content in current session
              if (!window._fileContentCache) {
                window._fileContentCache = {};
              }
              
              window._fileContentCache[cacheKey] = {
                content: fileContent,
                timestamp: Date.now(),
              };
              console.log(`[replaceVariables] Cached file content with key: ${cacheKey}`);
            } catch (cacheError) {
              console.warn(`[replaceVariables] Failed to cache file content:`, cacheError);
            }
          } else {
            attempts.push({method: 'fs.readFile', result: 'empty content'});
          }
        } catch (fsError: unknown) {
          console.error(`[replaceVariables] Error reading file with fs.readFile:`, fsError);
          attempts.push({method: 'fs.readFile', result: `error: ${fsError instanceof Error ? fsError.message : 'unknown error'}`});
          
          // Look for "Successfully read file" logs in the console
          // Sometimes the file is read successfully but an error is still thrown
          const fsErrorStr = String(fsError);
          if (fsErrorStr.includes('Successfully read file') || 
              fsErrorStr.includes('Successfully executed') || 
              fsErrorStr.includes('7097 bytes')) { // Specific size we've observed in logs
            console.log(`[replaceVariables] Found successful file read in error message, checking for file content`);
            
            // If we had already assigned fileContent before the error, use it
            if (fileContent) {
              console.log(`[replaceVariables] Using file content that was successfully read despite error`);
              attempts.push({method: 'fs.readFile recovery', result: 'success'});
              // Continue with the existing content
            } else {
              // Try to extract file content size from the error message if possible
              const sizeMatch = fsErrorStr.match(/Successfully read file .+ \((\d+) bytes/);
              if (sizeMatch && parseInt(sizeMatch[1]) > 0) {
                console.log(`[replaceVariables] File appears to have been read (${sizeMatch[1]} bytes) despite error`);
                attempts.push({method: 'fs.readFile recovery', result: 'likely successful but content not available'});
                
                // Try to extract actual content if it's accidentally included in the log
                try {
                  const contentMatch = fsErrorStr.match(/Successfully read file[^{]*(\{.*\})/);
                  if (contentMatch && contentMatch[1]) {
                    try {
                      const logData = JSON.parse(contentMatch[1]);
                      console.log(`[replaceVariables] Found potential data in error log:`, logData);
                      
                      if (logData.name === entry.metadata.path || logData.name === getBasename(entry.metadata.path)) {
                        // We found related log data, attempt to retrieve the file again
                        console.log(`[replaceVariables] Log data matches our file, trying again with this context`);
                        attempts.push({method: 'log extraction', result: 'found matching log data'});
                      }
                    } catch (parseError) {
                      console.log(`[replaceVariables] Could not parse log data:`, parseError);
                    }
                  }
                } catch (extractError) {
                  console.warn(`[replaceVariables] Error trying to extract content from logs:`, extractError);
                }
                
                // Try again immediately, since we know the file was read successfully
                try {
                  console.log(`[replaceVariables] Attempting immediate retry after detecting successful read`);
                  fileContent = await fs.readFile(handle, {
                    encoding: 'utf-8'
                  });
                  
                  if (fileContent) {
                    console.log(`[replaceVariables] Retry successfully retrieved file content (${fileContent.length} bytes)`);
                    attempts.push({method: 'fs.readFile retry', result: 'success'});
                    
                    // Cache the content
                    if (!window._fileContentCache) {
                      window._fileContentCache = {};
                    }
                    window._fileContentCache[cacheKey] = {
                      content: fileContent,
                      timestamp: Date.now(),
                    };
                  } else {
                    console.log(`[replaceVariables] Retry returned empty content`);
                  }
                } catch (retryError) {
                  console.warn(`[replaceVariables] Retry after successful read also failed:`, retryError);
                }
              }
            }
          }
          
          // If we still don't have content, try fallback to original File API
          if (!fileContent) {
            try {
              console.log(`[replaceVariables] Trying fallback to direct File API`);
              const file = await handle.getFile();
              fileContent = await file.text();
              console.log(`[replaceVariables] Successfully read file with direct File API (${fileContent.length} bytes)`);
              attempts.push({method: 'direct File API', result: 'success'});
            } catch (fileApiError: unknown) {
              console.error(`[replaceVariables] Error reading with direct File API:`, fileApiError);
              attempts.push({method: 'direct File API', result: `error: ${fileApiError instanceof Error ? fileApiError.message : 'unknown error'}`});
              
              // Last resort: try using FileReader API
              try {
                console.log(`[replaceVariables] Attempting final fallback with FileReader API`);
                const file = await handle.getFile();
                fileContent = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsText(file);
                });
                
                if (fileContent) {
                  console.log(`[replaceVariables] Successfully read file with FileReader API (${fileContent.length} bytes)`);
                  attempts.push({method: 'FileReader API', result: 'success'});
                  
                  // Cache the content
                  if (!window._fileContentCache) {
                    window._fileContentCache = {};
                  }
                  window._fileContentCache[cacheKey] = {
                    content: fileContent,
                    timestamp: Date.now(),
                  };
                }
              } catch (fileReaderError) {
                console.error(`[replaceVariables] FileReader API fallback also failed:`, fileReaderError);
                attempts.push({method: 'FileReader API', result: `error: ${fileReaderError instanceof Error ? fileReaderError.message : 'unknown error'}`});
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error(`[replaceVariables] Error processing handle:`, error);
        attempts.push({method: 'handle processing', result: `error: ${error instanceof Error ? error.message : 'unknown error'}`});
      }
    } else {
      console.warn(`[replaceVariables] No valid handle found for entry`);
      
      // APPROACH 4: Last resort - try to use path and fetch from server if it looks like a URL
      if (entry?.metadata?.path && typeof entry.metadata.path === 'string') {
        const path = entry.metadata.path;
        console.log(`[replaceVariables] No handle available, checking if path is a URL: ${path}`);
        
        if (path.startsWith('http://') || path.startsWith('https://')) {
          try {
            console.log(`[replaceVariables] Path appears to be a URL, trying to fetch`);
            const response = await fetch(path);
            if (response.ok) {
              fileContent = await response.text();
              console.log(`[replaceVariables] Successfully fetched content from URL (${fileContent.length} bytes)`);
              attempts.push({method: 'fetch URL', result: 'success'});
            } else {
              attempts.push({method: 'fetch URL', result: `failed with status ${response.status}`});
            }
          } catch (fetchError: unknown) {
            console.error(`[replaceVariables] Error fetching URL:`, fetchError);
            attempts.push({method: 'fetch URL', result: `error: ${fetchError instanceof Error ? fetchError.message : 'unknown error'}`});
          }
        } else {
          attempts.push({method: 'path check', result: 'not a URL'});
        }
      }
    }
    
    // If we successfully got content, wrap it with tags
    if (fileContent) {
      // Create a tag for wrapping if needed
      let tagName = entry.metadata?.tagName;
      
      // If no tag name, create one from the filename
      if (!tagName) {
        let filename = entry.value || 
                    (handle && handle.name) || 
                    entry.metadata?.path || 
                    'file';
        
        // Get the basename function from the surrounding scope
        filename = getBasename(filename);
        tagName = createTagFromFilename(filename);
        console.log(`[replaceVariables] Created tag name: ${tagName}`);
        
        // Store the tag name for future use
        if (entry.metadata) {
          entry.metadata.tagName = tagName;
        }
      }
      
      // Ensure file content is not undefined before wrapping
      if (fileContent === undefined || fileContent === null) {
        console.error(`[replaceVariables] File content is ${fileContent === undefined ? 'undefined' : 'null'}, using empty string instead`);
        fileContent = '';
      }
      
      // Wrap content in tags
      const wrappedContent = `<${tagName}>\n${fileContent}\n</${tagName}>`;
      
      // Update resolution tracking in metadata
      if (entry.metadata) {
        entry.metadata.contentResolved = true;
        entry.metadata.lastFetchedAt = Date.now();
        entry.metadata.contentLength = fileContent.length;
      }
      
      return wrappedContent;
    }
    
    // Log all attempted approaches
    console.warn(`[replaceVariables] All attempts to resolve file content failed:`, attempts);
    
    // Check registry state
    console.log(`[replaceVariables] Filesystem registry state debug:`);
    const debugRegistryState = async () => {
      try {
        const registryEntries = await fs.registry.getAllHandles();
        console.log(`[replaceVariables] Registry has ${registryEntries.size} entries`);
        const entryIds = Array.from(registryEntries.keys());
        console.log(`[replaceVariables] Registry IDs:`, entryIds);
        
        // Check if our handle ID is in the registry
        if (entry?.metadata?.handleId && entryIds.includes(entry.metadata.handleId)) {
          console.log(`[replaceVariables] Our handleId ${entry.metadata.handleId} IS in the registry, but content access failed`);
        } else if (entry?.metadata?.handleId) {
          console.log(`[replaceVariables] Our handleId ${entry.metadata.handleId} is NOT in the registry`);
        } else {
          console.log(`[replaceVariables] No valid handleId found in metadata`);
        }
      } catch (error) {
        console.error(`[replaceVariables] Error inspecting registry:`, error);
      }
    };
    debugRegistryState().catch(console.error);
    
    return null;
  };
  
  // Then replace variables
  return result.replace(PATTERNS.VARIABLE, (match, name) => {
    const trimmedName = name.trim();
    
    console.log(`[replaceVariables] Replacing variable ${trimmedName}`);
    
    // Check if this is a file variable
    const isFileVariable = fileVariableNames.has(trimmedName);
    console.log(`[replaceVariables] Is file variable: ${isFileVariable}`);
    
    const globalVar = trimmedName in globalVariableMap ? globalVariableMap[trimmedName] : null;
    console.log(`[replaceVariables] Global variable value:`, globalVar ? JSON.stringify(globalVar, null, 2) : 'null');
    
    const state = variableValues[trimmedName];
    console.log(`[replaceVariables] Template state value:`, state ? JSON.stringify(state, null, 2) : 'null');
    
    // Always prioritize file content resolution for file variables
    if (isFileVariable && globalVar) {
      console.log(`[replaceVariables] Processing file variable: ${trimmedName}`);
      
      // Handle array values
      if (Array.isArray(globalVar.value) && globalVar.value.length > 0) {
        console.log(`[replaceVariables] Value is array with ${globalVar.value.length} entries`);
        
        // Check each entry for undefined values that need fixing
        for (const entry of globalVar.value) {
          if ((entry.type === 'file' || entry.type === 'directory') && entry.value !== undefined) {
            // Check if the value contains "undefined" text wrapped in tags
            if (typeof entry.value === 'string' && 
                /^<[\w.-]+>\s*undefined\s*<\/[\w.-]+>$/i.test(entry.value.trim())) {
              console.error(`[replaceVariables] Found literal "undefined" wrapped in tags, fixing: ${entry.value}`);
              
              // Extract the tag name
              const tagMatch = entry.value.match(/^<([\w.-]+)>/);
              if (tagMatch && tagMatch[1]) {
                const tagName = tagMatch[1];
                // Replace with empty content
                entry.value = `<${tagName}>\n\n</${tagName}>`;
                console.log(`[replaceVariables] Fixed value to: ${entry.value}`);
              }
            }
            
            // Also check for empty tag pairs with no content
            if (typeof entry.value === 'string') {
              const emptyTagsMatch = entry.value.match(/^<([\w.-]+)>\s*<\/\1>$/);
              if (emptyTagsMatch) {
                console.warn(`[replaceVariables] Found empty tags with no content: ${entry.value}`);
                // We'll still use the empty content, but now we're aware of it
                // This will help with debugging
              }
              
              // Check if the content between tags is just whitespace
              const whitespaceContentMatch = entry.value.match(/^<([\w.-]+)>\s*\n*\s*<\/\1>$/);
              if (whitespaceContentMatch) {
                console.warn(`[replaceVariables] Found tags with only whitespace content: ${entry.value}`);
                // Replace with a clearly marked placeholder to make it obvious
                const tagName = whitespaceContentMatch[1];
                entry.value = `<${tagName}>\n/* No content available for ${tagName} */\n</${tagName}>`;
                console.log(`[replaceVariables] Added placeholder content: ${entry.value}`);
              }
              
              // Don't modify content that already contains the "No content available" message
              if (typeof entry.value === 'string' && 
                  entry.value.includes('/* No content available for ') &&
                  /^<[\w.-]+>[\s\S]*No content available for[\s\S]*<\/[\w.-]+>$/i.test(entry.value)) {
                console.log(`[replaceVariables] Content already contains 'No content available' message, keeping as is: ${entry.value.substring(0, 100)}...`);
                // Don't modify this content, it's already been properly formatted
                continue;
              }
            }
          }
        }
        
        // Find file entries that have been resolved with content
        let fileEntry = null;
        
        // First check for entries with XML file content
        for (const entry of globalVar.value) {
          if ((entry.type === 'file' || entry.type === 'directory')) {
            console.log(`[replaceVariables] Examining file entry: ${typeof entry.value === 'string' ? entry.value.substring(0, 50) : 'Not a string'}...`);
            console.log(`[replaceVariables] Full entry:`, JSON.stringify(entry, null, 2));
            
            // Check for recently updated content that has been actively fetched
            if (entry.type === 'file' && entry.metadata?.contentResolved && 
                entry.metadata?.lastFetchedAt && 
                (Date.now() - entry.metadata.lastFetchedAt < 10000)) { // Content fetched in last 10 seconds
              console.log(`[replaceVariables] Found recently updated file content!`);
              fileEntry = entry;
              break;
            }
            
            // Check if this entry has XML tags from file content resolver
            if (typeof entry.value === 'string' && isResolvedFileContent(entry.value, entry)) {
              console.log(`[replaceVariables] Found resolved file content!`);
              fileEntry = entry;
              break;
            } else {
              console.log(`[replaceVariables] Entry does not contain resolved file content`);
              // If no file with resolved content is found yet, store this as a potential fallback
              // We'll use it if no entry with XML content is found
              if (!fileEntry && entry.type === 'file') {
                fileEntry = entry;
                console.log(`[replaceVariables] Storing file entry as fallback:`, JSON.stringify(entry, null, 2));
              }
            }
          }
        }
        
        // If we found a file entry with resolved content, use it
        if (fileEntry) {
          console.log(`[replaceVariables] Using file content: ${typeof fileEntry.value === 'string' ? fileEntry.value.substring(0, 50) : 'Not a string'}...`);
          
          // If this is a file entry that doesn't have resolved content yet,
          // we'll try to fetch the content directly if the handle is available
          if (fileEntry.type === 'file' && typeof fileEntry.value === 'string' && 
              !isResolvedFileContent(fileEntry.value, fileEntry) && 
              fileEntry.metadata) {
            
            console.log(`[replaceVariables] File entry exists but content not resolved yet, attempting direct access`);
            console.log(`[replaceVariables] File metadata:`, JSON.stringify({
              path: fileEntry.metadata.path,
              size: fileEntry.metadata.size,
              handleId: fileEntry.metadata.handleId
            }));
            
            // We can't use async/await here directly in the replace function, but we need to try to
            // resolve the file content immediately for this operation
            try {
              // Create a synchronous wrapper for asynchronous resolution - not ideal but allows us
              // to handle both sync and async cases
              let resolvedContent: string | null = null;
              let resolutionComplete = false;
              
              // Try to start the resolution process
              attemptLateFileResolution(fileEntry)
                .then(content => {
                  resolvedContent = content;
                  resolutionComplete = true;
                  
                  // If content was resolved, update the entry
                  if (content) {
                    console.log(`[replaceVariables] Async resolution succeeded with content: ${content.substring(0, 50)}...`);
                    fileEntry.value = content;
                    
                    // Also update in variableValues for future operations
                    try {
                      if (trimmedName in variableValues) {
                        const variableValue = variableValues[trimmedName];
                        if (variableValue?.value && Array.isArray(JSON.parse(variableValue.value))) {
                          const jsonValue = JSON.parse(variableValue.value);
                          
                          // Find the matching file entry
                          const fileEntryIndex = jsonValue.findIndex((entry: any) => 
                            entry?.type === 'file' && 
                            entry?.metadata?.path === fileEntry.metadata?.path
                          );
                          
                          if (fileEntryIndex >= 0) {
                            jsonValue[fileEntryIndex].value = content;
                            variableValues[trimmedName].value = JSON.stringify(jsonValue);
                            console.log(`[replaceVariables] Updated variableValues with resolved content`);
                          }
                        }
                      }
                    } catch (e) {
                      console.error(`[replaceVariables] Error updating variable values:`, e);
                    }
                  }
                })
                .catch(error => {
                  resolutionComplete = true;
                  console.error(`[replaceVariables] Async resolution failed:`, error);
                });
              
              // For immediate content resolution, we'll wait a tiny bit to see if it resolves quickly
              // This is a partial synchronous fallback that only works for very fast resolutions
              const start = Date.now();
              const timeout = 500; // Wait max 500ms for immediate resolution (increased from 50ms)
              
              // Flag to track when our async resolution completes
              let resolvedContentAvailable = false;
              
              // Schedule an immediate check to see if the filesystem module
              // has already read the file but hasn't returned it to us
              setTimeout(async () => {
                try {
                  // Check for any log message indicating success in reading this file
                  console.log(`[replaceVariables] Checking for file read success indicators for ${fileEntry.metadata.path}`);
                  
                  // Also check if the content might be available in the window object
                  // from a successful read that didn't properly return
                  if (typeof window._lastSuccessfulFileRead === 'object' && 
                      window._lastSuccessfulFileRead?.path === fileEntry.metadata.path &&
                      typeof window._lastSuccessfulFileRead.content === 'string') {
                    
                    console.log(`[replaceVariables] Found content in _lastSuccessfulFileRead!`);
                    resolvedContent = window._lastSuccessfulFileRead.content;
                    resolvedContentAvailable = true;
                  }
                } catch (e) {
                  console.error(`[replaceVariables] Error in checking for file read indicators:`, e);
                }
              }, 10);
              
              // Very short busy-wait loop - this is not ideal but allows us to handle fast resolutions
              let lastCheckTime = 0;
              while (!resolutionComplete && !resolvedContentAvailable && (Date.now() - start) < timeout) {
                // Tiny sleep to avoid blocking the thread completely
                for (let i = 0; i < 1000000; i++) { /* empty */ }
                
                const currentTime = Date.now();
                // Check every 10ms if we have content
                if (currentTime - lastCheckTime >= 10) {
                  lastCheckTime = currentTime;
                  
                  if (resolvedContent) {
                    console.log(`[replaceVariables] Quick resolution succeeded with content within ${currentTime - start}ms`);
                    break; // Exit early if we have content
                  }
                  
                  if (resolvedContentAvailable) {
                    console.log(`[replaceVariables] Found content through alternate channel within ${currentTime - start}ms`);
                    break;
                  }
                  
                  // Also check the cache in case it was updated by another process
                  if (window._fileContentCache && fileEntry?.metadata?.handleId) {
                    const cachedContent = window._fileContentCache[fileEntry.metadata.handleId]?.content;
                    if (cachedContent) {
                      console.log(`[replaceVariables] Found content in cache during busy-wait (${cachedContent.length} bytes, ${currentTime - start}ms)`);
                      resolvedContent = cachedContent;
                      break;
                    }
                  }
                }
              }
              
              // If we got a quick resolution, use it
              if (resolvedContent) {
                console.log(`[replaceVariables] Quick resolution succeeded within ${Date.now() - start}ms`);
                return resolvedContent;
              }
              
              // If quick resolution failed, log and continue with fallback
              console.log(`[replaceVariables] Quick resolution timeout after ${Date.now() - start}ms, proceeding with fallback`);
            } catch (e) {
              console.error(`[replaceVariables] Error in synchronous resolution attempt:`, e);
            }
            
            // Add safety check before returning file value
            if (fileEntry.value === undefined || fileEntry.value === null) {
              console.error(`[replaceVariables] File entry value is ${fileEntry.value === undefined ? 'undefined' : 'null'}, creating safe fallback`);
              
              // Create a properly formatted fallback with tags for entries with no value
              const filename = fileEntry.metadata?.path ? 
                              getBasename(fileEntry.metadata.path) : 
                              (fileEntry.name || "file");
                              
              const tagName = createTagFromFilename(filename);
              return `<${tagName}>\n[Content unavailable for ${filename}]\n</${tagName}>`;
            }
            
            return fileEntry.value;
          }
          
          return fileEntry.value;
        } else {
          console.log(`[replaceVariables] No resolved file content found for file variable ${trimmedName}`);
        }
      }
    }
    
    // For non-file variables or if no file content was found, try template values
    if (state?.isValid) {
      console.log(`[replaceVariables] Using template value: ${state.value.substring(0, 50)}...`);
      return state.value;
    }
    
    // If no template value, try other global variable values
    if (globalVar) {
      if (Array.isArray(globalVar.value) && globalVar.value.length > 0) {
        console.log(`[replaceVariables] No template value found, using fallback from global variable`);
        
        // First try to find a text entry
        const textEntry = globalVar.value.find((entry: any) => entry.type === 'text');
        
        if (textEntry) {
          console.log(`[replaceVariables] Using text entry: ${typeof textEntry.value === 'string' ? textEntry.value.substring(0, 50) : 'Not a string'}`);
          return textEntry.value;
        }
        
        // If no text entry found, use the first entry
        const firstEntry = globalVar.value[0];
        console.log(`[replaceVariables] Using first entry: ${firstEntry.type}, value: ${typeof firstEntry.value === 'string' ? firstEntry.value.substring(0, 50) : 'Not a string'}`);
        
        // For file entries, return the value (file path) not the XML content
        if (firstEntry.type === 'file' || firstEntry.type === 'directory') {
          console.log(`[replaceVariables] Entry is a file/directory, returning path: ${firstEntry.value}`);
          
          // If there's resolved content (XML) use that, otherwise use the path
          if (typeof firstEntry.value === 'string' && isResolvedFileContent(firstEntry.value, firstEntry)) {
            console.log(`[replaceVariables] Using resolved file content`);
            
            // Add safety check for undefined content
            if (firstEntry.value === undefined || firstEntry.value === null) {
              console.error(`[replaceVariables] First entry value is ${firstEntry.value === undefined ? 'undefined' : 'null'}, using safe fallback`);
              
              // Create a properly formatted fallback with tags
              const filename = firstEntry.metadata?.path ? 
                              getBasename(firstEntry.metadata.path) : 
                              (firstEntry.name || "file");
                              
              const tagName = createTagFromFilename(filename);
              return `<${tagName}>\n[Content unavailable for ${filename}]\n</${tagName}>`;
            }
            
            return firstEntry.value;
          }
          
          // If entry has a 'path' in metadata, use that for better path resolution
          if (firstEntry.metadata?.path) {
            console.log(`[replaceVariables] Using path from metadata: ${firstEntry.metadata.path}`);
            
            // Try to mark it as a file
            return `[File: ${firstEntry.metadata.path}]`;
          }
          
          // Mark it as a file if it's a file
          if (firstEntry.type === 'file') {
            return `[File: ${firstEntry.value}]`;
          }
          
          return firstEntry.value;
        }
        
        return firstEntry.value;
      } else if (typeof globalVar.value === 'string') {
        console.log(`[replaceVariables] Using string value: ${globalVar.value.substring(0, 50)}...`);
        return globalVar.value;
      }
    }
    
    console.log(`[replaceVariables] No replacement found, using original: ${match}`);
    // Fallback to original template syntax
    return match;
  });
}

/**
 * Validates if all required variables have valid values
 */
export function validateVariableValues(
  variables: TemplateVariable[],
  values: TemplateVariableValues
): TemplateVariableValidationError[] {
  const errors: TemplateVariableValidationError[] = [];
  
  for (const variable of variables) {
    const state = values[variable.name];
    
    if (variable.isRequired && (!state || !state.value)) {
      errors.push(createError(
        TemplateVariableError.MISSING_REQUIRED,
        `Missing required variable "${variable.name}"`,
        variable.name,
        variable.position
      ));
    }
    
    if (state?.errors.length) {
      errors.push(...state.errors.map(error => ({
        ...error,
        position: variable.position
      })));
    }
  }
  
  return errors;
}

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
    
    // Add our custom cache object
    _fileContentCache?: Record<string, {
      content: string;
      timestamp: number;
    }>;
    
    // Add last successful file read tracking
    _lastSuccessfulFileRead?: {
      path: string;
      content: string;
      timestamp: number;
      size: number;
    };
  }
} 