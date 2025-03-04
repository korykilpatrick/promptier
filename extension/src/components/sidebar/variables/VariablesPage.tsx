import React, { useState, useCallback, useEffect } from "react";
import { useUserVariables } from "../../../hooks/useUserVariables";
import { useToast } from "../../../hooks/useToast";
import { LoadingSkeleton } from "../common/LoadingSkeleton";
import { VariableTypeSelector } from "./VariableTypeSelector";
import { FilePicker } from "./FilePicker";

// Variable entry types
const VARIABLE_ENTRY_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  DIRECTORY: 'directory'
};

// Helper to create a text entry
const createTextEntry = (value) => ({
  type: VARIABLE_ENTRY_TYPES.TEXT,
  value
});

// Helper to get text entries from a variable
const getTextEntries = (variable) => {
  if (!variable || !variable.value) return [];
  return Array.isArray(variable.value)
    ? variable.value.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.TEXT)
    : [];
};

function VariablesPage() {
  const {
    variables,
    createVariable,
    updateVariable,
    deleteVariable,
    getVariableByName,
    isLoading,
    error
  } = useUserVariables({ autoFetch: true });

  const { addToast } = useToast();

  // Form state for creating/editing variables
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    textValue: '',
    entries: [],
    variableType: VARIABLE_ENTRY_TYPES.TEXT
  });
  
  const [createForm, setCreateForm] = useState({
    name: '',
    textValue: '',
    variableType: VARIABLE_ENTRY_TYPES.TEXT
  });

  const resetForms = () => {
    setEditForm({
      id: null,
      name: '',
      textValue: '',
      entries: [],
      variableType: VARIABLE_ENTRY_TYPES.TEXT
    });
    setCreateForm({
      name: '',
      textValue: '',
      variableType: VARIABLE_ENTRY_TYPES.TEXT
    });
    setIsEditing(false);
  };

  // Handle editing a variable
  const handleEdit = useCallback((variable) => {
    const textEntries = getTextEntries(variable);
    const textValue = textEntries.length > 0 
      ? textEntries.map((entry) => entry.value).join('\n')
      : '';
    
    setEditForm({
      id: variable.id,
      name: variable.name,
      textValue,
      entries: Array.isArray(variable.value) ? variable.value : [],
      variableType: Array.isArray(variable.value) && variable.value.length > 0
        ? variable.value[0].type
        : VARIABLE_ENTRY_TYPES.TEXT
    });
    setIsEditing(true);
  }, []);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    resetForms();
  }, []);

  // Handle clearing file entries during edit
  const handleClearFileEntries = useCallback(() => {
    setEditForm(prev => ({
      ...prev,
      entries: prev.entries.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.TEXT),
      variableType: VARIABLE_ENTRY_TYPES.TEXT
    }));
  }, []);

  // Handle saving an edit
  const handleSaveEdit = useCallback(async () => {
    try {
      // Prepare entries based on variable type
      const textValueArray = editForm.textValue.trim()
        ? editForm.textValue.split('\n').map((value) => createTextEntry(value))
        : [];
      
      const nonTextEntries = editForm.entries.filter((entry) =>
        entry.type !== VARIABLE_ENTRY_TYPES.TEXT
      );
      
      const combinedEntries = [...textValueArray, ...nonTextEntries];
      
      // Update variable
      await updateVariable(editForm.id, {
        name: editForm.name,
        value: combinedEntries
      });
      
      addToast({
        type: "success",
        message: `Variable "${editForm.name}" updated successfully`,
        duration: 3000
      });
      
      resetForms();
    } catch (error) {
      console.error("Error updating variable:", error);
      addToast({
        type: "error",
        message: `Error updating variable: ${error.message}`,
        duration: 5000
      });
    }
  }, [editForm, updateVariable, addToast]);

  // Handle variable deletion
  const handleDelete = useCallback(async (id, name) => {
    try {
      await deleteVariable(id);
      addToast({
        type: "success",
        message: `Variable "${name}" deleted successfully`,
        duration: 3000
      });
    } catch (error) {
      console.error("Error deleting variable:", error);
      addToast({
        type: "error",
        message: `Error deleting variable: ${error.message}`,
        duration: 5000
      });
    }
  }, [deleteVariable, addToast]);

  // Handle variable type change
  const handleVariableTypeChange = useCallback((type) => {
    if (isEditing) {
      setEditForm(prev => ({
        ...prev,
        variableType: type
      }));
    } else {
      setCreateForm(prev => ({
        ...prev,
        variableType: type
      }));
    }
  }, [isEditing]);

  // Handle file selection for new variable
  const handleFileSelect = useCallback((entries) => {
    const entriesArray = Array.isArray(entries) ? entries : [entries];
    setCreateForm(prev => ({
      ...prev,
      entries: entriesArray
    }));
  }, []);

  // Handle file selection during edit
  const handleEditFileSelect = useCallback((entries) => {
    const entriesArray = Array.isArray(entries) ? entries : [entries];
    setEditForm(prev => ({
      ...prev,
      entries: [...prev.entries.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.TEXT), ...entriesArray]
    }));
  }, []);

  // Handle variable creation
  const handleCreateVariable = useCallback(async () => {
    try {
      // Validate name
      if (!createForm.name.trim()) {
        addToast({
          type: "error",
          message: "Variable name cannot be empty",
          duration: 3000
        });
        return;
      }

      // Check for duplicate name
      const existingVar = await getVariableByName(createForm.name);
      if (existingVar) {
        addToast({
          type: "error",
          message: `Variable "${createForm.name}" already exists`,
          duration: 3000
        });
        return;
      }

      // Prepare entries based on variable type
      let valueArray = [];
      
      if (createForm.variableType === VARIABLE_ENTRY_TYPES.TEXT) {
        valueArray = createForm.textValue.trim()
          ? createForm.textValue.split('\n').map((value) => createTextEntry(value))
          : [createTextEntry('')]; // At least one empty entry
      } else {
        // For file/directory, use the entries from the file picker
        valueArray = createForm.entries && createForm.entries.length > 0
          ? createForm.entries
          : []; // Empty array if no files selected
      }
      
      // Create the variable
      await createVariable({
        name: createForm.name,
        value: valueArray
      });
      
      addToast({
        type: "success",
        message: `Variable "${createForm.name}" created successfully`,
        duration: 3000
      });
      
      // Reset form
      setCreateForm({
        name: '',
        textValue: '',
        variableType: VARIABLE_ENTRY_TYPES.TEXT
      });
      
    } catch (error) {
      console.error("Error creating variable:", error);
      addToast({
        type: "error",
        message: `Error creating variable: ${error.message}`,
        duration: 5000
      });
    }
  }, [createForm, createVariable, getVariableByName, addToast]);

  // Render content based on loading/error state
  if (isLoading) {
    return (
      <div className="plasmo-p-4">
        <div className="plasmo-mb-6">
          <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-700 plasmo-mb-2">Global Variables</h2>
          <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-4">
            Create and manage reusable variables for your templates
          </p>
        </div>
        <LoadingSkeleton count={4} variant="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="plasmo-p-4">
        <div className="plasmo-bg-error-50 plasmo-border plasmo-border-error-200 plasmo-rounded-md plasmo-p-4 plasmo-mb-4">
          <div className="plasmo-flex">
            <div className="plasmo-flex-shrink-0">
              <svg className="plasmo-h-5 plasmo-w-5 plasmo-text-error-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="plasmo-ml-3">
              <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-error-800">Error loading variables</h3>
              <div className="plasmo-mt-2 plasmo-text-sm plasmo-text-error-700">
                <p>{error.message || "An unexpected error occurred"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plasmo-p-4 plasmo-h-full plasmo-overflow-y-auto">
      <div className="plasmo-mb-6">
        <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-700 plasmo-mb-2">Global Variables</h2>
        <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-4">
          Create and manage reusable variables for your templates
        </p>
      </div>

      {/* Create Variable Form */}
      {!isEditing && (
        <div className="plasmo-mb-6">
          <div className="plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-shadow-sm plasmo-overflow-hidden">
            <div className="plasmo-p-4">
              <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-800 plasmo-mb-3">Create New Variable</h3>
              
              <div className="plasmo-mb-4">
                <label htmlFor="variableName" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                  Variable Name
                </label>
                <input
                  type="text"
                  id="variableName"
                  className="plasmo-input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter variable name"
                />
              </div>
              
              <div className="plasmo-mb-4">
                <VariableTypeSelector
                  selectedType={createForm.variableType}
                  onChange={handleVariableTypeChange}
                />
              </div>
              
              {createForm.variableType === VARIABLE_ENTRY_TYPES.TEXT ? (
                <div className="plasmo-mb-4">
                  <label htmlFor="variableValue" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                    Variable Value
                  </label>
                  <textarea
                    id="variableValue"
                    className="plasmo-input plasmo-resize-y"
                    rows={3}
                    value={createForm.textValue}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, textValue: e.target.value }))}
                    placeholder="Enter variable value (use multiple lines for multiple values)"
                  />
                </div>
              ) : (
                <div className="plasmo-mb-4">
                  <FilePicker
                    type={createForm.variableType === VARIABLE_ENTRY_TYPES.DIRECTORY ? 'directory' : 'file'}
                    onSelect={handleFileSelect}
                    multiple={true}
                  />
                </div>
              )}
              
              <div className="plasmo-flex plasmo-justify-end">
                <button
                  type="button"
                  onClick={handleCreateVariable}
                  className="plasmo-btn-primary"
                >
                  Create Variable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variable Form */}
      {isEditing && (
        <div className="plasmo-mb-6">
          <div className="plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-shadow-sm plasmo-overflow-hidden">
            <div className="plasmo-p-4">
              <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
                <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-800">Edit Variable</h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="plasmo-text-gray-400 hover:plasmo-text-gray-500"
                >
                  <svg className="plasmo-h-5 plasmo-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="plasmo-mb-4">
                <label htmlFor="editVariableName" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                  Variable Name
                </label>
                <input
                  type="text"
                  id="editVariableName"
                  className="plasmo-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="plasmo-mb-4">
                <VariableTypeSelector
                  selectedType={editForm.variableType}
                  onChange={handleVariableTypeChange}
                />
              </div>
              
              {editForm.variableType === VARIABLE_ENTRY_TYPES.TEXT ? (
                <div className="plasmo-mb-4">
                  <label htmlFor="editVariableValue" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                    Variable Value
                  </label>
                  <textarea
                    id="editVariableValue"
                    className="plasmo-input plasmo-resize-y"
                    rows={3}
                    value={editForm.textValue}
                    onChange={(e) => setEditForm(prev => ({ ...prev, textValue: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="plasmo-mb-4">
                  {editForm.entries.filter(entry =>
                    entry.type === VARIABLE_ENTRY_TYPES.FILE ||
                    entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY
                  ).length > 0 && (
                    <div className="plasmo-mb-2">
                      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-2">
                        <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                          Current Files/Directories
                        </label>
                        <button
                          type="button"
                          onClick={handleClearFileEntries}
                          className="plasmo-text-xs plasmo-text-error-600 hover:plasmo-text-error-800"
                        >
                          Clear All
                        </button>
                      </div>
                      <ul className="plasmo-max-h-40 plasmo-overflow-y-auto plasmo-text-sm plasmo-mb-3 plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded plasmo-p-2">
                        {editForm.entries.filter(entry =>
                          entry.type === VARIABLE_ENTRY_TYPES.FILE ||
                          entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY
                        ).map((entry, index) => (
                          <li key={index} className="plasmo-mb-1 plasmo-flex plasmo-items-center">
                            <span className="plasmo-mr-1">
                              {entry.type === VARIABLE_ENTRY_TYPES.FILE ? '📄' : '📁'}
                            </span>
                            <span className="plasmo-truncate">{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <FilePicker
                    type={editForm.variableType === VARIABLE_ENTRY_TYPES.DIRECTORY ? 'directory' : 'file'}
                    onSelect={handleEditFileSelect}
                    multiple={true}
                  />
                </div>
              )}
              
              <div className="plasmo-flex plasmo-justify-end plasmo-space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="plasmo-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="plasmo-btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div>
        <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-2">
          Your Variables {variables.length > 0 && `(${variables.length})`}
        </h3>
        
        {variables.length === 0 ? (
          <div className="plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-shadow-sm plasmo-p-4 plasmo-text-center">
            <svg className="plasmo-w-8 plasmo-h-8 plasmo-mx-auto plasmo-text-gray-400 plasmo-mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="plasmo-text-sm plasmo-text-gray-500">No variables created yet</p>
          </div>
        ) : (
          <div className="plasmo-space-y-2">
            {variables.map((variable) => {
              // Determine variable type and icon
              const hasFileEntries = Array.isArray(variable.value) && variable.value.some(
                entry => entry.type === VARIABLE_ENTRY_TYPES.FILE || entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY
              );
              
              const valuePreview = Array.isArray(variable.value)
                ? variable.value.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.TEXT).map(entry => entry.value).join(', ')
                : typeof variable.value === 'string' ? variable.value : '';
              
              const truncatedPreview = valuePreview.length > 60
                ? valuePreview.substring(0, 60) + '...'
                : valuePreview;
              
              return (
                <div
                  key={variable.id}
                  className="plasmo-template-item-compact plasmo-relative plasmo-group"
                >
                  <div className="plasmo-py-2 plasmo-px-3">
                    <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
                      <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-flex-1 plasmo-min-w-0">
                        {hasFileEntries ? (
                          <span className="plasmo-text-primary-500 plasmo-flex-shrink-0">
                            <svg className="plasmo-w-4 plasmo-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="plasmo-text-gray-500 plasmo-flex-shrink-0">
                            <svg className="plasmo-w-4 plasmo-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                        
                        <h3 className="plasmo-template-name">{variable.name}</h3>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="plasmo-flex plasmo-items-center plasmo-ml-1 plasmo-flex-shrink-0 plasmo-space-x-0.5">
                        <button
                          onClick={() => handleEdit(variable)}
                          className="plasmo-action-btn-compact plasmo-template-action-btn"
                          aria-label="Edit variable"
                        >
                          <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(variable.id, variable.name)}
                          className="plasmo-action-btn-compact plasmo-template-action-btn plasmo-text-error-500 hover:plasmo-text-error-700"
                          aria-label="Delete variable"
                        >
                          <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Variable Value Preview */}
                    <div className="plasmo-template-description-compact plasmo-mt-1.5">
                      {hasFileEntries ? (
                        <div className="plasmo-flex plasmo-items-center plasmo-text-gray-500">
                          <span className="plasmo-mr-1">
                            {Array.isArray(variable.value) && variable.value.some(entry => entry.type === VARIABLE_ENTRY_TYPES.FILE) && '📄 '}
                            {Array.isArray(variable.value) && variable.value.some(entry => entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY) && '📁 '}
                          </span>
                          <span>
                            {Array.isArray(variable.value) ? `${variable.value.length} file/directory entries` : 'File entries'}
                          </span>
                        </div>
                      ) : (
                        truncatedPreview || <span className="plasmo-italic plasmo-text-gray-400">Empty value</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VariablesPage; 