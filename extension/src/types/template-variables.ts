/**
 * Valid variable name pattern:
 * - Must start with a letter or underscore
 * - Can contain letters, numbers, and underscores
 * - Cannot end with an underscore
 */
export const VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*[a-zA-Z0-9]$/;

/**
 * Types of validation errors that can occur with template variables
 */
export enum TemplateVariableError {
  INVALID_NAME = 'invalid_name',
  DUPLICATE_NAME = 'duplicate_name',
  MISSING_REQUIRED = 'missing_required',
  INVALID_VALUE = 'invalid_value',
  MALFORMED_SYNTAX = 'malformed_syntax'
}

/**
 * Represents a validation error for a template variable
 */
export interface TemplateVariableValidationError {
  type: TemplateVariableError;
  message: string;
  variableName?: string;
  /** The position in the template where the error occurred */
  position?: {
    start: number;
    end: number;
  };
}

/**
 * Represents a variable found in a template
 */
export interface TemplateVariable {
  /** The name of the variable (must match VARIABLE_NAME_PATTERN) */
  name: string;
  /** Optional default value for the variable */
  defaultValue?: string;
  /** Optional description of the variable's purpose */
  description?: string;
  /** Whether the variable is required (no default value) */
  isRequired: boolean;
  /** The original matched text from the template */
  originalMatch: string;
  /** The position in the template where this variable was found */
  position: {
    start: number;
    end: number;
  };
}

/**
 * Represents the current state of a variable's value
 */
export interface TemplateVariableState {
  /** The current value of the variable */
  value: string;
  /** Whether the value has been modified from its default */
  isDirty: boolean;
  /** Whether the current value is valid */
  isValid: boolean;
  /** Any validation errors for the current value */
  errors: TemplateVariableValidationError[];
}

/**
 * Maps variable names to their current state
 */
export type TemplateVariableValues = Record<string, TemplateVariableState>;

/**
 * Result of parsing a template for variables
 */
export interface TemplateParseResult {
  /** The variables found in the template */
  variables: TemplateVariable[];
  /** Any errors encountered while parsing */
  errors: TemplateVariableValidationError[];
  /** Whether the template syntax is valid */
  isValid: boolean;
  /** The processed template with escaped characters handled */
  template: string;
}

/**
 * Options for variable validation
 */
export interface VariableValidationOptions {
  /** Maximum length for variable values */
  maxLength?: number;
  /** Minimum length for variable values */
  minLength?: number;
  /** Regular expression pattern that values must match */
  pattern?: RegExp;
  /** Custom validation function */
  validate?: (value: string) => TemplateVariableValidationError | null;
} 