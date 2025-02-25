/**
 * Hook for accessing and using global variables across templates
 */

const React = require("react");

const { useCallback } = React;
const { useUserVariables } = require("./useUserVariables");

/**
 * Hook for accessing and using global variables across templates
 * @param {Object} options - Hook options
 * @param {boolean} [options.autoFetch=true] - Whether to fetch variables on mount
 * @returns {Object} Global variables state and methods
 */
function useGlobalVariables(options = {}) {
  const { autoFetch = true } = options;

  // Use the existing useUserVariables hook for the core variable functionality
  const {
    variables,
    isLoading,
    getVariableByName,
    fetchVariables,
  } = useUserVariables({ autoFetch });

  // Create a convenient map of variable names to their values
  const variableMap = variables.reduce((acc, variable) => {
    acc[variable.name] = variable.value;
    return acc;
  }, {});

  // Helper to get a value directly by variable name
  const getValueByName = useCallback((name) => {
    const variable = getVariableByName(name);
    return variable ? variable.value : undefined;
  }, [getVariableByName]);

  // For more complex use cases: refresh the variable list
  const refreshVariables = useCallback(async () => {
    await fetchVariables();
  }, [fetchVariables]);

  return {
    variables,
    isLoading,
    getVariableByName,
    getValueByName,
    variableMap,
    refreshVariables,
  };
}

module.exports = { useGlobalVariables }; 