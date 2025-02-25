import { TemplateVariableError, VARIABLE_NAME_PATTERN } from 'shared/types/template-variables';
import type {
  TemplateVariable,
  TemplateVariableValidationError,
  TemplateParseResult,
  TemplateVariableValues
} from 'shared/types/template-variables';

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
  
  // Then replace variables
  return result.replace(PATTERNS.VARIABLE, (match, name) => {
    const trimmedName = name.trim();
    const state = variableValues[trimmedName];
    
    // First try template values
    if (state?.isValid) {
      return state.value;
    }
    
    // If not found or invalid, try global variables
    const globalVar = trimmedName in globalVariableMap ? globalVariableMap[trimmedName] : null;
    if (globalVar) {
      if (Array.isArray(globalVar.value) && globalVar.value.length > 0) {
        // Get first text entry or just first entry
        const textEntry = globalVar.value.find((entry: any) => entry.type === 'text') || globalVar.value[0];
        return textEntry.value;
      } else if (typeof globalVar.value === 'string') {
        return globalVar.value;
      }
    }
    
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