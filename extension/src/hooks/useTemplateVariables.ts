import { useState, useCallback, useMemo } from 'react';
import {
  TemplateVariableError
} from '../types/template-variables';
import type {
  TemplateVariable,
  TemplateVariableValues,
  TemplateVariableValidationError,
  VariableValidationOptions
} from '../types/template-variables';
import { useTemplateParser } from './useTemplateParser';

interface UseTemplateVariablesProps {
  template: string;
  initialValues?: Record<string, string>;
  validationOptions?: Record<string, VariableValidationOptions>;
  parserOptions?: {
    useCache?: boolean;
    skipUnchanged?: boolean;
  };
}

interface UseTemplateVariablesReturn {
  parseResult: ReturnType<typeof useTemplateParser>['parseResult'];
  values: TemplateVariableValues;
  setVariableValue: (name: string, value: string) => void;
  resetValues: () => void;
  hasAllRequiredValues: boolean;
  validationErrors: TemplateVariableValidationError[];
  parserStats: {
    cacheHit: boolean;
    parseTime: number;
  };
}

export function useTemplateVariables({
  template,
  initialValues = {}, // Default to empty object
  validationOptions = {},
  parserOptions = {}
}: UseTemplateVariablesProps): UseTemplateVariablesReturn {
  // Use optimized template parser
  const { parseResult, cacheStats } = useTemplateParser(template, parserOptions);

  // Ensure variables is always an array
  const safeVariables = parseResult.variables ?? [];

  // Initialize values with defaults from variables
  const initialState = useMemo(() => {
    const state: TemplateVariableValues = {};
    safeVariables.forEach(v => {
      const initialValue = initialValues[v.name] ?? v.defaultValue ?? '';
      state[v.name] = {
        value: initialValue,
        isDirty: initialValues[v.name] !== undefined,
        isValid: true,
        errors: []
      };
    });
    return state;
  }, [safeVariables, initialValues]);

  const [values, setValues] = useState<TemplateVariableValues>(initialState);

  // Validate a single variable value
  const validateValue = useCallback((name: string, value: string) => {
    const variable = safeVariables.find(v => v.name === name);
    const options = validationOptions[name];
    const errors: TemplateVariableValidationError[] = [];

    if (variable?.isRequired && !value) {
      errors.push({
        type: TemplateVariableError.MISSING_REQUIRED,
        message: `${name} is required`,
        variableName: name
      });
    }

    if (options) {
      if (options.maxLength && value.length > options.maxLength) {
        errors.push({
          type: TemplateVariableError.INVALID_VALUE,
          message: `${name} cannot be longer than ${options.maxLength} characters`,
          variableName: name
        });
      }
      if (options.minLength && value.length < options.minLength) {
        errors.push({
          type: TemplateVariableError.INVALID_VALUE,
          message: `${name} must be at least ${options.minLength} characters`,
          variableName: name
        });
      }
      if (options.pattern && !options.pattern.test(value)) {
        errors.push({
          type: TemplateVariableError.INVALID_VALUE,
          message: `${name} has an invalid format`,
          variableName: name
        });
      }
      if (options.validate) {
        const error = options.validate(value);
        if (error) errors.push(error);
      }
    }

    return errors;
  }, [safeVariables, validationOptions]);

  // Set a single variable value
  const setVariableValue = useCallback((name: string, value: string) => {
    setValues(prev => {
      const errors = validateValue(name, value);
      return {
        ...prev,
        [name]: {
          value,
          isDirty: true,
          isValid: errors.length === 0,
          errors
        }
      };
    });
  }, [validateValue]);

  // Reset values to initial state
  const resetValues = useCallback(() => {
    setValues(initialState);
  }, [initialState]);

  // Get all validation errors
  const validationErrors = useMemo(() => {
    return safeVariables
      .map(variable => {
        const state = values[variable.name];
        if (!state) return [];
        return state.errors;
      })
      .flat();
  }, [safeVariables, values]);

  const hasAllRequiredValues = validationErrors.length === 0;

  return {
    parseResult,
    values,
    setVariableValue,
    resetValues,
    hasAllRequiredValues,
    validationErrors,
    parserStats: cacheStats
  };
}