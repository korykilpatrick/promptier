const React = require("react");
const { useState, useCallback, useEffect } = React;
const { useUserVariables } = require("../../../hooks/useUserVariables");
const { useToast } = require("../../../hooks/useToast");
const { createTextEntry, getTextEntries } = require("shared/types/variables");

/**
 * Component for managing global user variables
 * @typedef {import("shared/types/variables").UserVariable} UserVariable
 * @typedef {import("shared/types/variables").VariableEntry} VariableEntry
 */
function VariablesPage() {
  const { addToast } = useToast();
  const {
    variables,
    isLoading,
    fetchVariables,
    createVariable,
    updateVariable,
    deleteVariable
  } = useUserVariables();

  const [newVariable, setNewVariable] = useState({ name: "", value: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", value: "" });

  // Start editing a variable
  const handleEdit = useCallback((/** @type {UserVariable} */ variable) => {
    setEditingId(variable.id);
    
    // Extract text values from variable entries
    const textEntries = getTextEntries(variable);
    const textValue = textEntries.length > 0 
      ? textEntries.map(/** @param {VariableEntry} entry */ entry => entry.value).join('\n') 
      : '';
    
    setEditForm({
      name: variable.name,
      value: textValue
    });
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({ name: "", value: "" });
  }, []);

  // Save edited variable
  const handleSaveEdit = useCallback(async () => {
    if (!editForm.name.trim()) {
      addToast({
        type: "error",
        title: "Invalid name",
        message: "Variable name cannot be empty"
      });
      return;
    }

    try {
      // Convert the value string to an array of text entries
      const valueArray = editForm.value.trim()
        ? editForm.value.split('\n').map(/** @param {string} value */ value => createTextEntry(value))
        : [];
        
      await updateVariable(editingId, {
        name: editForm.name.trim(),
        value: valueArray
      });
      
      setEditingId(null);
      setEditForm({ name: "", value: "" });
      
      addToast({
        type: "success",
        title: "Variable updated",
        message: `Variable "${editForm.name}" has been updated`
      });
    } catch (error) {
      console.error("Failed to update variable:", error);
      addToast({
        type: "error",
        title: "Update failed",
        message: "Failed to update the variable"
      });
    }
  }, [editingId, editForm, updateVariable, addToast]);

  // Delete a variable
  const handleDelete = useCallback(async (/** @type {number} */ id, /** @type {string} */ name) => {
    if (confirm(`Are you sure you want to delete the variable "${name}"?`)) {
      try {
        await deleteVariable(id);
        addToast({
          type: "success",
          title: "Variable deleted",
          message: `Variable "${name}" has been deleted`
        });
      } catch (error) {
        console.error("Failed to delete variable:", error);
        addToast({
          type: "error",
          title: "Delete failed",
          message: "Failed to delete the variable"
        });
      }
    }
  }, [deleteVariable, addToast]);

  // Create a new variable
  const handleCreateVariable = useCallback(async (/** @type {React.FormEvent} */ e) => {
    e.preventDefault();
    
    if (!newVariable.name.trim()) {
      addToast({
        type: "error",
        title: "Invalid name",
        message: "Variable name cannot be empty"
      });
      return;
    }

    try {
      // Convert the value string to an array of text entries
      const valueArray = newVariable.value.trim()
        ? newVariable.value.split('\n').map(/** @param {string} value */ value => createTextEntry(value))
        : [];
        
      await createVariable({
        name: newVariable.name.trim(),
        value: valueArray
      });
      
      setNewVariable({ name: "", value: "" });
      
      addToast({
        type: "success",
        title: "Variable created",
        message: `Variable "${newVariable.name}" has been created`
      });
    } catch (error) {
      console.error("Failed to create variable:", error);
      addToast({
        type: "error",
        title: "Creation failed",
        message: "Failed to create the variable"
      });
    }
  }, [newVariable, createVariable, addToast]);

  return (
    <div className="plasmo-w-full plasmo-bg-white plasmo-p-4">
      <h1 className="plasmo-text-xl plasmo-font-semibold plasmo-mb-4 plasmo-text-gray-800">Global Variables</h1>
      
      {/* Create Variable Form */}
      <div className="plasmo-bg-gray-50 plasmo-rounded-lg plasmo-p-4 plasmo-mb-6 plasmo-border plasmo-border-gray-200">
        <h2 className="plasmo-text-sm plasmo-font-medium plasmo-mb-3 plasmo-text-gray-700">Create New Variable</h2>
        <form onSubmit={handleCreateVariable} className="plasmo-space-y-3">
          <div>
            <label htmlFor="variableName" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
              Variable Name
            </label>
            <input
              type="text"
              id="variableName"
              className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-gray-300 
                plasmo-shadow-sm plasmo-focus:border-blue-500 plasmo-focus:ring plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20
                plasmo-text-sm plasmo-py-1.5 plasmo-px-3"
              value={newVariable.name}
              onChange={(e) => setNewVariable(/** @param {Object} prev */ prev => ({ ...prev, name: e.target.value }))}
              placeholder="Variable name"
              required
            />
          </div>
          
          <div>
            <label htmlFor="variableValue" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
              Value
            </label>
            <textarea
              id="variableValue"
              className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-gray-300 
                plasmo-shadow-sm plasmo-focus:border-blue-500 plasmo-focus:ring plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20
                plasmo-text-sm plasmo-py-1.5 plasmo-px-3 plasmo-resize-y"
              value={newVariable.value}
              onChange={(e) => setNewVariable(/** @param {Object} prev */ prev => ({ ...prev, value: e.target.value }))}
              placeholder="Variable value"
              rows={3}
            />
          </div>
          
          <div className="plasmo-flex plasmo-justify-end">
            <button
              type="submit"
              className="plasmo-px-4 plasmo-py-2 plasmo-bg-blue-600 plasmo-text-white plasmo-text-sm plasmo-font-medium plasmo-rounded-md
                plasmo-shadow-sm hover:plasmo-bg-blue-700 plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-offset-2
                plasmo-focus:ring-blue-500 plasmo-transition-colors plasmo-duration-150"
            >
              Create Variable
            </button>
          </div>
        </form>
      </div>
      
      {/* Variables List */}
      <h2 className="plasmo-text-sm plasmo-font-medium plasmo-mb-3 plasmo-text-gray-700">Your Variables</h2>
      
      {isLoading ? (
        <div className="plasmo-flex plasmo-justify-center plasmo-py-10">
          <div className="plasmo-flex plasmo-items-center plasmo-text-gray-500">
            <svg className="plasmo-animate-spin plasmo-h-5 plasmo-w-5 plasmo-mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="plasmo-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="plasmo-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading variables...
          </div>
        </div>
      ) : variables.length === 0 ? (
        <div className="plasmo-bg-gray-50 plasmo-rounded-lg plasmo-p-6 plasmo-text-center plasmo-border plasmo-border-gray-200">
          <p className="plasmo-text-gray-500 plasmo-text-sm">
            You don't have any global variables yet. Create one to get started!
          </p>
        </div>
      ) : (
        <div className="plasmo-bg-white plasmo-rounded-lg plasmo-border plasmo-border-gray-200 plasmo-divide-y plasmo-divide-gray-200">
          {variables.map(/** @param {UserVariable} variable */ variable => (
            <div key={variable.id} className="plasmo-p-4">
              {editingId === variable.id ? (
                <div className="plasmo-space-y-3">
                  <div>
                    <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                      Variable Name
                    </label>
                    <input
                      type="text"
                      className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-gray-300 
                        plasmo-shadow-sm plasmo-focus:border-blue-500 plasmo-focus:ring plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20
                        plasmo-text-sm plasmo-py-1.5 plasmo-px-3"
                      value={editForm.name}
                      onChange={(e) => setEditForm(/** @param {Object} prev */ prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Variable name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                      Value
                    </label>
                    <textarea
                      className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-gray-300 
                        plasmo-shadow-sm plasmo-focus:border-blue-500 plasmo-focus:ring plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20
                        plasmo-text-sm plasmo-py-1.5 plasmo-px-3 plasmo-resize-y"
                      value={editForm.value}
                      onChange={(e) => setEditForm(/** @param {Object} prev */ prev => ({ ...prev, value: e.target.value }))}
                      placeholder="Variable value"
                      rows={3}
                    />
                  </div>
                  
                  <div className="plasmo-flex plasmo-justify-end plasmo-space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="plasmo-px-4 plasmo-py-2 plasmo-bg-gray-200 plasmo-text-gray-800 plasmo-text-sm plasmo-font-medium plasmo-rounded-md
                        plasmo-shadow-sm hover:plasmo-bg-gray-300 plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-offset-2
                        plasmo-focus:ring-gray-500 plasmo-transition-colors plasmo-duration-150"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="plasmo-px-4 plasmo-py-2 plasmo-bg-blue-600 plasmo-text-white plasmo-text-sm plasmo-font-medium plasmo-rounded-md
                        plasmo-shadow-sm hover:plasmo-bg-blue-700 plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-offset-2
                        plasmo-focus:ring-blue-500 plasmo-transition-colors plasmo-duration-150"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                    <div>
                      <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">
                        {variable.name}
                      </h3>
                      <div className="plasmo-mt-1 plasmo-text-sm plasmo-text-gray-600 plasmo-whitespace-pre-wrap">
                        {Array.isArray(variable.value) && variable.value.length > 0 
                          ? getTextEntries(variable).map(/** @param {VariableEntry} entry */ entry => entry.value).join('\n') 
                          : <em className="plasmo-text-gray-400">Empty value</em>}
                      </div>
                    </div>
                    <div className="plasmo-flex plasmo-ml-4 plasmo-space-x-2">
                      <button
                        onClick={() => handleEdit(variable)}
                        className="plasmo-text-gray-400 hover:plasmo-text-blue-600 plasmo-focus:outline-none"
                        title="Edit variable"
                      >
                        <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(variable.id, variable.name)}
                        className="plasmo-text-gray-400 hover:plasmo-text-red-600 plasmo-focus:outline-none"
                        title="Delete variable"
                      >
                        <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="plasmo-mt-2 plasmo-text-xs plasmo-text-gray-500">
                    Created: {new Date(variable.createdAt).toLocaleString()}
                    {variable.updatedAt !== variable.createdAt && 
                      ` • Updated: ${new Date(variable.updatedAt).toLocaleString()}`}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

module.exports = { VariablesPage }; 