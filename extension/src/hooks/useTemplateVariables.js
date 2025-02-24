// CommonJS version of useTemplateVariables
try {
  // Import dependencies with unique names to avoid redeclarations
  const _React = require("react");
  const { useState, useCallback, useMemo } = _React;
  const { TemplateVariableError } = require("../../../shared/types/template-variables");
  const { useTemplateParser } = require("./useTemplateParser");

  /**
   * Hook for managing template variables
   * @param {Object} props - Hook properties
   * @param {string} props.template - Template content
   * @param {Object} [props.initialValues={}] - Initial values for variables
   * @param {Object} [props.validationOptions={}] - Validation options for variables
   * @param {Object} [props.parserOptions={}] - Options for the template parser
   * @returns {Object} Template variables state and operations
   */
  function useTemplateVariables({
    template,
    initialValues = {}, 
    validationOptions = {},
    parserOptions = {}
  }) {
    // Use optimized template parser
    const { parseResult, cacheStats } = useTemplateParser(template, parserOptions);

    // Ensure variables is always an array
    const safeVariables = parseResult.variables || [];

    // Initialize values with defaults from variables
    const initialState = useMemo(() => {
      const state = {};
      safeVariables.forEach(v => {
        const defaultValue = v.defaultValue || '';
        const initialValue = initialValues[v.name] !== undefined ? initialValues[v.name] : defaultValue;
        state[v.name] = {
          value: initialValue,
          isDirty: initialValues[v.name] !== undefined,
          isValid: true,
          errors: []
        };
      });
      return state;
    }, [safeVariables, initialValues]);

    const [values, setValues] = useState(initialState);

    // Validate a single variable value
    const validateValue = useCallback((name, value) => {
      const variable = safeVariables.find(v => v.name === name);
      const options = validationOptions[name];
      const errors = [];

      if (variable && variable.isRequired && !value) {
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

    const hasAllRequiredValues = validationErrors.length === 0;

    // Return variables for use in component
    const variables = useMemo(() => {
      return safeVariables;
    }, [safeVariables]);

    return {
      variables,
      parseResult,
      values,
      setVariableValue,
      resetValues,
      hasAllRequiredValues,
      validationErrors,
      parserStats: cacheStats
    };
  }

  // Export as CommonJS module
  module.exports = { useTemplateVariables };
} catch (error) {
  console.error("Error in useTemplateVariables.js:", error);
  
  // Provide a fallback implementation if loading fails
  function fallbackUseTemplateVariables({ template }) {
    console.warn("Using fallback implementation of useTemplateVariables");
    const _React = require("react");
    const [values] = _React.useState({});
    
    return {
      variables: [],
      parseResult: { variables: [] },
      values: {},
      setVariableValue: () => console.warn("setVariableValue not available in fallback"),
      resetValues: () => console.warn("resetValues not available in fallback"),
      hasAllRequiredValues: true,
      validationErrors: [],
      parserStats: { cacheHit: false, parseTime: 0 }
    };
  }
  
  module.exports = { useTemplateVariables: fallbackUseTemplateVariables };
} 