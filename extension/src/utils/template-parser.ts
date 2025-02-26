import { TemplateVariableError, VARIABLE_NAME_PATTERN } from 'shared/types/template-variables';
import type {
  TemplateVariable,
  TemplateVariableValidationError,
  TemplateParseResult,
  TemplateVariableValues
} from 'shared/types/template-variables';
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
  
  // Helper function to detect file content
  const isResolvedFileContent = (value: string, entry: any): boolean => {
    if (typeof value !== 'string') {
      console.log(`[replaceVariables] isResolvedFileContent: value is not a string:`, value);
      return false;
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
    
    // If the entry has metadata.tagName, that's the tag we used
    if (entry?.metadata?.tagName) {
      const tagName = entry.metadata.tagName;
      const tagPattern = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`);
      const hasTag = tagPattern.test(value);
      console.log(`[replaceVariables] isResolvedFileContent: Has tag ${tagName}: ${hasTag}`);
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
    console.log(`[replaceVariables] Attempting late file resolution for entry:`, JSON.stringify({
      type: entry?.type,
      value: entry?.value,
      metadata: {
        path: entry?.metadata?.path,
        size: entry?.metadata?.size,
        handleId: entry?.metadata?.handleId,
        handleExists: !!getFileHandleFromMetadata(entry?.metadata)
      }
    }));
    
    // Only attempt if we can get a valid handle - prioritize handleId over direct handle
    let handle = null;
    
    if (entry?.metadata?.handleId) {
      handle = fileHandleRegistry.getHandle(entry.metadata.handleId);
      console.log(`[replaceVariables] Retrieved handle from registry with ID: ${entry.metadata.handleId}`);
    } else if (entry?.metadata?.handle) {
      // Legacy path for backward compatibility
      handle = getFileHandleFromMetadata(entry.metadata);
    }
    
    if (handle) {
      try {
        console.log(`[replaceVariables] Found handle, validating...`);
        
        // Validate handle properties
        if (typeof handle !== 'object') {
          throw new Error(`Handle is not an object, it's a ${typeof handle}`);
        }
        
        if (Object.keys(handle).length === 0) {
          throw new Error("Handle is an empty object {} - likely serialized/deserialized incorrectly");
        }
        
        if (typeof handle.getFile !== 'function') {
          throw new Error(`Handle missing getFile() method. Available properties: ${Object.keys(handle).join(', ')}`);
        }
        
        console.log(`[replaceVariables] Handle validation passed, attempting to get file...`);
        const file = await handle.getFile();
        
        if (file) {
          console.log(`[replaceVariables] File successfully retrieved: ${file.name}, size: ${file.size} bytes`);
          const content = await file.text();
          console.log(`[replaceVariables] Late resolution succeeded, content length: ${content.length}`);
          
          // Get the filename for tag creation
          let tagName = 'file';
          if (entry.metadata?.path) {
            const filename = entry.metadata.path.split(/[\/\\]/).pop() || entry.metadata.path;
            tagName = filename.replace(/[^\w.-]/g, '_');
          } else if (file.name) {
            tagName = file.name.replace(/[^\w.-]/g, '_');
          }
          
          console.log(`[replaceVariables] Using tag: <${tagName}> for content wrapping`);
          
          // Update entry's metadata
          if (entry.metadata) {
            entry.metadata.contentResolved = true;
            entry.metadata.tagName = tagName;
            entry.metadata.rawContent = content;
          }
          
          // Wrap in tag
          return `<${tagName}>\n${content}\n</${tagName}>`;
        }
      } catch (error) {
        console.error(`[replaceVariables] Late file resolution failed:`, error);
        console.log(`[replaceVariables] DEBUG: Handle type: ${typeof handle}`);
        
        if (typeof handle === 'object' && handle !== null) {
          console.log(`[replaceVariables] DEBUG: Handle keys: ${Object.keys(handle).join(', ')}`);
          console.log(`[replaceVariables] DEBUG: Handle prototype:`, 
            Object.getPrototypeOf(handle) ? 
            Object.getOwnPropertyNames(Object.getPrototypeOf(handle)) : 
            'No prototype'
          );
        }
        
        // Update metadata with error information
        if (entry.metadata) {
          entry.metadata.lateResolutionFailed = true;
          entry.metadata.lateResolutionError = error instanceof Error ? error.message : String(error);
        }
      }
    } else {
      console.log(`[replaceVariables] No valid handle found for late resolution`);
      
      // Log more details about the entry to help diagnose the issue
      if (entry?.metadata) {
        console.log(`[replaceVariables] Entry metadata keys:`, Object.keys(entry.metadata));
        
        // If we have a handleId but no handle was found, log that
        if (entry.metadata.handleId) {
          console.warn(`[replaceVariables] HandleId ${entry.metadata.handleId} not found in registry`);
          console.log(`[replaceVariables] Registry has ${fileHandleRegistry.getHandleCount()} handles`);
        }
      }
    }
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
          console.log(`[replaceVariables] Using file content: ${fileEntry.value.substring(0, 50)}...`);
          
          // If this is a file entry that doesn't have resolved content yet,
          // we'll try to fetch the content directly if the handle is available
          if (fileEntry.type === 'file' && typeof fileEntry.value === 'string' && 
              !isResolvedFileContent(fileEntry.value, fileEntry) && 
              fileEntry.metadata) {
            
            console.log(`[replaceVariables] File entry exists but content not resolved yet, attempting direct access`);
            console.log(`[replaceVariables] File metadata:`, JSON.stringify({
              path: fileEntry.metadata.path,
              size: fileEntry.metadata.size,
              handleId: fileEntry.metadata.handleId,
              hasDirectHandle: !!fileEntry.metadata.handle
            }));
            
            // We can't use async/await here, but we can at least try to trigger the file resolution 
            // so it might be available on subsequent operations
            attemptLateFileResolution(fileEntry).then(content => {
              if (content) {
                // Update the entry's value with the content
                fileEntry.value = content;
                console.log(`[replaceVariables] Updated file entry with content: ${content.substring(0, 50)}...`);
                
                // If we want to persist this for future operations, we could store it
                // This might not work in the current flow but could be useful for debugging
                if (variableValues[trimmedName] && Array.isArray(variableValues[trimmedName])) {
                  const index = variableValues[trimmedName].findIndex(
                    (entry: any) => entry.type === 'file' && entry.metadata?.path === fileEntry.metadata?.path
                  );
                  if (index >= 0) {
                    variableValues[trimmedName][index].value = content;
                    console.log(`[replaceVariables] Updated original variable value with resolved content`);
                  }
                }
              }
            }).catch(err => {
              console.error(`[replaceVariables] Error in late file resolution:`, err);
            });
            
            // For now, use what we have - either the path or a basic message
            if (fileEntry.metadata?.path) {
              return `[File: ${fileEntry.metadata.path}]`;
            } else {
              return `[File: ${fileEntry.value}]`;
            }
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
        // Get first text entry or just first entry
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