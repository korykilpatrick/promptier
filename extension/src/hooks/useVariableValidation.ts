import { useMemo, useCallback } from 'react';
import type {
  TemplateVariable,
  TemplateVariableValidationError,
  VariableValidationOptions
} from '../types/template-variables';
import { TemplateVariableError } from '../types/template-variables';

interface ValidationResult {
  isValid: boolean;
  errors: TemplateVariableValidationError[];
}

interface UseVariableValidationProps {
  variable: TemplateVariable;
  options?: VariableValidationOptions;
}

const DEFAULT_OPTIONS: VariableValidationOptions = {
  maxLength: 1000, // Reasonable default max length
  minLength: 0
};

export function useVariableValidation({
  variable,
  options = {}
}: UseVariableValidationProps) {
  // Merge default options with provided options
  const validationOptions = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options]
  );

  // Create validation error helper
  const createError = useCallback(
    (
      type: TemplateVariableError,
      message: string
    ): TemplateVariableValidationError => ({
      type,
      message,
      variableName: variable.name,
      position: variable.position
    }),
    [variable]
  );

  // Main validation function
  const validateValue = useCallback(
    (value: string): ValidationResult => {
      const errors: TemplateVariableValidationError[] = [];
      const trimmedValue = value.trim();

      // Required validation
      if (variable.isRequired && !trimmedValue) {
        errors.push(
          createError(
            TemplateVariableError.MISSING_REQUIRED,
            `${variable.name} is required`
          )
        );
      }

      // Length validation
      if (validationOptions.maxLength && value.length > validationOptions.maxLength) {
        errors.push(
          createError(
            TemplateVariableError.INVALID_VALUE,
            `${variable.name} must be no longer than ${validationOptions.maxLength} characters`
          )
        );
      }

      if (validationOptions.minLength && trimmedValue.length < validationOptions.minLength) {
        errors.push(
          createError(
            TemplateVariableError.INVALID_VALUE,
            `${variable.name} must be at least ${validationOptions.minLength} characters`
          )
        );
      }

      // Pattern validation
      if (validationOptions.pattern && trimmedValue && !validationOptions.pattern.test(trimmedValue)) {
        errors.push(
          createError(
            TemplateVariableError.INVALID_VALUE,
            `${variable.name} has an invalid format`
          )
        );
      }

      // Custom validation
      if (validationOptions.validate && trimmedValue) {
        const customError = validationOptions.validate(trimmedValue);
        if (customError) {
          errors.push({
            ...customError,
            variableName: variable.name,
            position: variable.position
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    },
    [variable, validationOptions, createError]
  );

  // Debounced validation function for real-time validation
  const validateWithDebounce = useCallback(
    (value: string, callback: (result: ValidationResult) => void) => {
      // Clear any existing timeout
      const timeoutId = setTimeout(() => {
        const result = validateValue(value);
        callback(result);
      }, 300); // 300ms debounce

      // Return cleanup function
      return () => clearTimeout(timeoutId);
    },
    [validateValue]
  );

  return {
    validateValue,
    validateWithDebounce
  };
} 