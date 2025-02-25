const { useState, useCallback, useEffect } = require('react');
const { toFrontendVariable } = require('../../../shared/types/variables');
const { useToast } = require('~/hooks/useToast');
const { makeApiRequest } = require('~/utils/api');

/**
 * @typedef {import('../../../shared/types/variables').UserVariable} UserVariable
 * @typedef {import('../../../shared/types/variables').VariableRequest} VariableRequest
 * 
 * @typedef {Object} UseUserVariablesOptions
 * @property {function(Error): void} [onError] - Error handler
 * @property {boolean} [autoFetch=true] - Whether to fetch variables on mount
 * 
 * @typedef {Object} UseUserVariablesReturn
 * @property {UserVariable[]} variables - User variables
 * @property {boolean} isLoading - Loading state
 * @property {boolean} isError - Error state
 * @property {function(): Promise<void>} fetchVariables - Fetch variables
 * @property {function(VariableRequest): Promise<UserVariable|null>} createVariable - Create a variable
 * @property {function(number, VariableRequest): Promise<UserVariable|null>} updateVariable - Update a variable
 * @property {function(number): Promise<boolean>} deleteVariable - Delete a variable
 * @property {function(string): UserVariable|undefined} getVariableByName - Get a variable by name
 */

/**
 * Hook for managing user variables
 * @param {UseUserVariablesOptions} options - Options
 * @returns {UseUserVariablesReturn} User variables state and methods
 */
function useUserVariables(options = {}) {
  const { onError, autoFetch = true } = options;
  const { addToast } = useToast();
  
  const [variables, setVariables] = useState([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [isError, setIsError] = useState(false);

  // Fetch all variables
  const fetchVariables = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      const response = await makeApiRequest({
        url: '/variables',
        method: 'GET'
      });
      
      if (response?.data) {
        const frontendVariables = response.data.map(item => toFrontendVariable(item));
        setVariables(frontendVariables);
      }
    } catch (error) {
      console.error('Error fetching user variables:', error);
      setIsError(true);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      } else {
        addToast({
          type: 'error',
          title: 'Failed to fetch variables',
          message: 'An error occurred while fetching your variables.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [addToast, onError]);

  // Create a new variable
  const createVariable = useCallback(async (data) => {
    try {
      console.log('Creating variable with data:', data);
      const response = await makeApiRequest({
        url: '/variables',
        method: 'POST',
        body: data
      });
      
      console.log('Create variable response:', response);
      
      if (response?.data) {
        const newVariable = toFrontendVariable(response.data);
        setVariables(prev => {
          // Check if variable with this name already exists
          const existingIndex = prev.findIndex(v => v.name === newVariable.name);
          if (existingIndex >= 0) {
            // Replace existing variable
            return [
              ...prev.slice(0, existingIndex),
              newVariable,
              ...prev.slice(existingIndex + 1)
            ];
          }
          // Add new variable
          return [...prev, newVariable];
        });
        return newVariable;
      }
      return null;
    } catch (error) {
      console.error('Error creating user variable:', error);
      
      addToast({
        type: 'error',
        title: 'Failed to create variable',
        message: 'An error occurred while creating your variable.'
      });
      
      return null;
    }
  }, [addToast]);

  // Update an existing variable
  const updateVariable = useCallback(async (id, data) => {
    try {
      const response = await makeApiRequest({
        url: `/variables/${id}`,
        method: 'PUT',
        body: data
      });
      
      if (response?.data) {
        const updatedVariable = toFrontendVariable(response.data);
        setVariables(prev => prev.map(v => v.id === id ? updatedVariable : v));
        return updatedVariable;
      }
      return null;
    } catch (error) {
      console.error('Error updating user variable:', error);
      
      addToast({
        type: 'error',
        title: 'Failed to update variable',
        message: 'An error occurred while updating your variable.'
      });
      
      return null;
    }
  }, [addToast]);

  // Delete a variable
  const deleteVariable = useCallback(async (id) => {
    try {
      await makeApiRequest({
        url: `/variables/${id}`,
        method: 'DELETE'
      });
      
      setVariables(prev => prev.filter(v => v.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting user variable:', error);
      
      addToast({
        type: 'error',
        title: 'Failed to delete variable',
        message: 'An error occurred while deleting your variable.'
      });
      
      return false;
    }
  }, [addToast]);

  // Get a variable by name
  const getVariableByName = useCallback((name) => {
    return variables.find(v => v.name === name);
  }, [variables]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchVariables();
    }
  }, [autoFetch, fetchVariables]);

  return {
    variables,
    isLoading,
    isError,
    fetchVariables,
    createVariable,
    updateVariable,
    deleteVariable,
    getVariableByName
  };
}

module.exports = { useUserVariables }; 