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
  initialValues = {},
  validationOptions = {},
  parserOptions = {},
  useGlobalVariables = true
}) {
  // Log the template before parsing
  console.log('[useTemplateVariables] Parsing template:', template);
  
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

  // Helper function to extract the value from a global variable
  const extractGlobalVariableValue = useCallback((globalVar) => {
    if (!globalVar) return '';
    
    // Handle array of objects with type and value
    if (Array.isArray(globalVar.value) && globalVar.value.length > 0) {
      // First try to find a text entry
      const textEntry = globalVar.value.find(entry => entry && entry.type === 'text');
      if (textEntry) return textEntry.value;
      
      // Fall back to the first entry's value
      if (globalVar.value[0] && typeof globalVar.value[0].value === 'string') {
        return globalVar.value[0].value;
      }
    }
    
    // Handle string value (backward compatibility)
    if (typeof globalVar.value === 'string') {
      return globalVar.value;
    }
    
    return '';
  }, []);

  // Initialize values with defaults from variables and global variables
  const initialState = useMemo(() => {
    const state = {};
    
    safeVariables.forEach(v => {
      let initialValue = initialValues[v.name];
      let isDirty = initialValues[v.name] !== undefined;
      
      if (useGlobalVariables && initialValue === undefined) {
        const globalVar = globalVariables.find(gv => gv.name === v.name);
        if (globalVar) {
          initialValue = extractGlobalVariableValue(globalVar);
          isDirty = true;
        }
      }

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
  }, [safeVariables, initialValues, globalVariables, useGlobalVariables, extractGlobalVariableValue]);

  const [values, setValues] = useState(initialState);

  useEffect(() => {
    if (useGlobalVariables && globalVariables.length > 0) {
      setValues(prev => {
        const newValues = { ...prev };
        let hasChanges = false;

        safeVariables.forEach(v => {
          const globalVar = globalVariables.find(gv => gv.name === v.name);
          
          if (globalVar && !prev[v.name]?.isDirty) {
            newValues[v.name] = {
              ...prev[v.name],
              value: extractGlobalVariableValue(globalVar),
              isDirty: true
            };
            hasChanges = true;
          }
        });

        return hasChanges ? newValues : prev;
      });
    }
  }, [globalVariables, safeVariables, useGlobalVariables, extractGlobalVariableValue]);

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

  const resetValues = useCallback(() => {
    setValues(initialState);
  }, [initialState]);

  const validationErrors = useMemo(() => {
    return safeVariables
      .map(variable => {
        const state = values[variable.name];
        if (!state) return [];
        return state.errors;
      })
      .flat();
  }, [safeVariables, values]);

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