const { useState, useCallback, useMemo, useEffect } = require('react');
const { TemplateVariableError } = require('shared/types/template-variables');
const { useTemplateParser } = require('./useTemplateParser');
const { useUserVariables } = require('./useUserVariables');

/**
 * @typedef {import('shared/types/template-variables').TemplateVariable} TemplateVariable
 * @typedef {import('shared/types/template-variables').TemplateVariableValues} TemplateVariableValues
 * @typedef {import('shared/types/template-variables').TemplateVariableValidationError} TemplateVariableValidationError
 * @typedef {import('shared/types/template-variables').VariableValidationOptions} VariableValidationOptions
 */

/**
 * @typedef {Object} UseTemplateVariablesProps
 * @property {string} template - The template string to parse
 * @property {Record<string, string>} [initialValues] - Initial variable values
 * @property {Record<string, VariableValidationOptions>} [validationOptions] - Validation options
 * @property {Object} [parserOptions] - Parser options
 * @property {boolean} [parserOptions.useCache] - Whether to use cache
 * @property {boolean} [parserOptions.skipUnchanged] - Whether to skip unchanged
 * @property {boolean} [useGlobalVariables] - Whether to use global variables
 */

/**
 * Hook for extracting and managing template variables
 * @param {UseTemplateVariablesProps} options - Options
 * @returns {Object} Template variables state and methods
 */
function useTemplateVariables({
  template,
  initialValues = {}, // Default to empty object
  validationOptions = {},
  parserOptions = {},
  useGlobalVariables = true
}) {
  // Use optimized template parser
  const { parseResult, cacheStats } = useTemplateParser(template, parserOptions);

  // Access global user variables
  const {
    variables: globalVariables,
    isLoading: isLoadingGlobalVariables,
    createVariable
  } = useUserVariables({ autoFetch: useGlobalVariables });

  // Ensure variables is always an array
  const safeVariables = parseResult.variables ?? [];

  // Initialize values with defaults from variables and global variables
  const initialState = useMemo(() => {
    const state = {};
    
    safeVariables.forEach(v => {
      // Try to get the value from initialValues, then global variables, then default value
      let initialValue = initialValues[v.name];
      let isDirty = initialValues[v.name] !== undefined;
      
      // If useGlobalVariables is true and we don't have a value yet, try to get it from global variables
      if (useGlobalVariables && initialValue === undefined) {
        const globalVar = globalVariables.find(gv => gv.name === v.name);
        if (globalVar) {
          initialValue = globalVar.value;
          isDirty = true;
        }
      }

      // If we still don't have a value, use the default value
      if (initialValue === undefined) {
        initialValue = v.defaultValue ?? '';
        isDirty = false;
      }

      state[v.name] = {
        value: initialValue,
        isDirty,
        isValid: true,
        errors: []
      };
    });
    
    return state;
  }, [safeVariables, initialValues, globalVariables, useGlobalVariables]);

  const [values, setValues] = useState(initialState);

  // Update values when global variables change
  useEffect(() => {
    if (useGlobalVariables && globalVariables.length > 0) {
      setValues(prev => {
        const newValues = { ...prev };
        let hasChanges = false;

        safeVariables.forEach(v => {
          const globalVar = globalVariables.find(gv => gv.name === v.name);
          
          // Only update if the variable doesn't already have a user-set value
          if (globalVar && !prev[v.name]?.isDirty) {
            newValues[v.name] = {
              ...prev[v.name],
              value: globalVar.value,
              isDirty: true
            };
            hasChanges = true;
          }
        });

        return hasChanges ? newValues : prev;
      });
    }
  }, [globalVariables, safeVariables, useGlobalVariables]);

  // Validate a single variable value
  const validateValue = useCallback((name, value) => {
    const variable = safeVariables.find(v => v.name === name);
    const options = validationOptions[name];
    const errors = [];

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
  const setVariableValue = useCallback((name, value) => {
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

  // Save selected variables to global variables
  const saveToGlobalVariables = useCallback(async (variableNames) => {
    if (!useGlobalVariables) return;

    const namesToSave = variableNames || 
      Object.entries(values)
        .filter(([_, state]) => state.isDirty && state.isValid)
        .map(([name]) => name);

    for (const name of namesToSave) {
      const state = values[name];
      if (state && state.isValid) {
        await createVariable({ name, value: state.value });
      }
    }
  }, [values, createVariable, useGlobalVariables]);

  const hasAllRequiredValues = validationErrors.length === 0;

  return {
    parseResult,
    values,
    setVariableValue,
    resetValues,
    hasAllRequiredValues,
    validationErrors,
    parserStats: cacheStats,
    saveToGlobalVariables,
    globalVariables,
    isLoadingGlobalVariables
  };
}

module.exports = { useTemplateVariables };