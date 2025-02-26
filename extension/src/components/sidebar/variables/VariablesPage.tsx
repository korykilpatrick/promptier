const React = require("react");
const { useState, useCallback, useEffect } = React;
const { useUserVariables } = require("../../../hooks/useUserVariables");
const { useToast } = require("../../../hooks/useToast");
const { createTextEntry, getTextEntries, VARIABLE_ENTRY_TYPES, getFileEntries, getDirectoryEntries } = require("shared/types/variables");
import type { UserVariable, VariableEntry } from "shared/types/variables";
import FilePicker from "./FilePicker";
import VariableTypeSelector from "./VariableTypeSelector";

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
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Update editForm state to include entries array for all entry types
  const [editForm, setEditForm] = useState<{
    name: string;
    textValue: string;
    entries: VariableEntry[];
  }>({ 
    name: "", 
    textValue: "", 
    entries: [] 
  });
  
  const [variableType, setVariableType] = useState(VARIABLE_ENTRY_TYPES.TEXT);
  const [fileEntries, setFileEntries] = useState<VariableEntry[]>([]);
  
  // Add state for edit mode
  const [editVariableType, setEditVariableType] = useState(VARIABLE_ENTRY_TYPES.TEXT);

  // Start editing a variable
  const handleEdit = useCallback((variable: UserVariable) => {
    setEditingId(variable.id);
    
    // Extract text values from variable entries
    const textEntries = getTextEntries(variable);
    const textValue = textEntries.length > 0 
      ? textEntries.map((entry: VariableEntry) => entry.value).join('\n') 
      : '';
    
    // Store all entries in the edit form
    setEditForm({
      name: variable.name,
      textValue: textValue,
      entries: [...variable.value] // Make a copy of all entries
    });
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({ name: "", textValue: "", entries: [] });
  }, []);

  // Handle clearing all file/directory entries
  const handleClearFileEntries = useCallback(() => {
    if (confirm("Are you sure you want to remove all file and directory entries?")) {
      setEditForm({
        ...editForm,
        entries: editForm.entries.filter((entry: VariableEntry) => 
          entry.type === VARIABLE_ENTRY_TYPES.TEXT
        )
      });
    }
  }, [editForm]);

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
      // Create updated entries array based on text value
      // (For now we're preserving the existing behavior, will update later)
      const textValueArray = editForm.textValue.trim()
        ? editForm.textValue.split('\n').map((value: string) => createTextEntry(value))
        : [];
      
      // Filter out text entries from the existing entries and keep other types
      const nonTextEntries = editForm.entries.filter((entry: VariableEntry) => 
        entry.type !== VARIABLE_ENTRY_TYPES.TEXT
      );
      
      // Combine new text entries with existing non-text entries
      const combinedEntries = [...textValueArray, ...nonTextEntries];
        
      await updateVariable(editingId as number, {
        name: editForm.name.trim(),
        value: combinedEntries
      });
      
      setEditingId(null);
      setEditForm({ name: "", textValue: "", entries: [] });
      
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
  const handleDelete = useCallback(async (id: number, name: string) => {
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

  // Handle variable type change
  const handleVariableTypeChange = useCallback((type: string) => {
    setVariableType(type);
    // Reset file entries when changing type
    if (type !== VARIABLE_ENTRY_TYPES.FILE && type !== VARIABLE_ENTRY_TYPES.DIRECTORY) {
      setFileEntries([]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((entries: VariableEntry | VariableEntry[]) => {
    const entriesArray = Array.isArray(entries) ? entries : [entries];
    setFileEntries(entriesArray);
  }, []);

  // Handle file selection for edit mode
  const handleEditFileSelect = useCallback((entries: VariableEntry | VariableEntry[]) => {
    const entriesArray = Array.isArray(entries) ? entries : [entries];
    
    // Add new entries to the existing entries
    setEditForm({
      ...editForm,
      entries: [...editForm.entries, ...entriesArray]
    });
  }, [editForm]);

  // Create a new variable
  const handleCreateVariable = useCallback(async (e: React.FormEvent) => {
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
      let valueArray: VariableEntry[] = [];
      
      // Handle different variable types
      if (variableType === VARIABLE_ENTRY_TYPES.TEXT) {
        // Convert the value string to an array of text entries
        valueArray = newVariable.value.trim()
          ? newVariable.value.split('\n').map((value: string) => createTextEntry(value))
          : [];
      } else if (
        (variableType === VARIABLE_ENTRY_TYPES.FILE || 
         variableType === VARIABLE_ENTRY_TYPES.DIRECTORY) && 
        fileEntries.length > 0
      ) {
        // Use the selected file entries
        valueArray = fileEntries;
      }
      
      if (valueArray.length === 0) {
        addToast({
          type: "error",
          title: "Empty value",
          message: "Please provide a value for the variable"
        });
        return;
      }
        
      await createVariable({
        name: newVariable.name.trim(),
        value: valueArray
      });
      
      // Reset form after successful creation
      setNewVariable({ name: "", value: "" });
      setFileEntries([]);
      setVariableType(VARIABLE_ENTRY_TYPES.TEXT); // Reset to text type
      
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
  }, [newVariable, variableType, fileEntries, createVariable, addToast]);

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
              value={newVariable.name}
              onChange={(e) => setNewVariable({...newVariable, name: e.target.value})}
              className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border-gray-300 plasmo-shadow-sm focus:plasmo-border-blue-500 focus:plasmo-ring-blue-500 plasmo-text-sm"
              placeholder="my_variable"
            />
          </div>
          
          {/* Variable Type Selector */}
          <VariableTypeSelector 
            selectedType={variableType} 
            onChange={handleVariableTypeChange} 
          />
          
          {variableType === VARIABLE_ENTRY_TYPES.TEXT ? (
            <div>
              <label htmlFor="variableValue" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                Variable Value
              </label>
              <textarea
                id="variableValue"
                value={newVariable.value}
                onChange={(e) => setNewVariable({...newVariable, value: e.target.value})}
                rows={3}
                className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border-gray-300 plasmo-shadow-sm focus:plasmo-border-blue-500 focus:plasmo-ring-blue-500 plasmo-text-sm"
                placeholder="Enter variable value..."
              />
              <p className="plasmo-mt-1 plasmo-text-xs plasmo-text-gray-500">
                Each line will be treated as a separate value.
              </p>
            </div>
          ) : (
            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                Select {variableType === VARIABLE_ENTRY_TYPES.FILE ? "File" : "Directory"}
              </label>
              <FilePicker 
                onFileSelect={handleFileSelect}
                allowDirectories={variableType === VARIABLE_ENTRY_TYPES.DIRECTORY}
                allowMultiple={true}
              />
              {fileEntries.length === 0 && (
                <p className="plasmo-mt-1 plasmo-text-xs plasmo-text-gray-500">
                  Please select at least one {variableType === VARIABLE_ENTRY_TYPES.FILE ? "file" : "directory"}.
                </p>
              )}
            </div>
          )}
          
          <div className="plasmo-flex plasmo-justify-end">
            <button
              type="submit"
              className="plasmo-inline-flex plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-border plasmo-border-transparent plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-shadow-sm plasmo-text-white plasmo-bg-blue-600 plasmo-hover:bg-blue-700 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-offset-2 focus:plasmo-ring-blue-500"
            >
              Create Variable
            </button>
          </div>
        </form>
      </div>
      
      {/* Variable List */}
      <h2 className="plasmo-text-md plasmo-font-medium plasmo-mb-3 plasmo-text-gray-800">Your Variables</h2>
      
      {isLoading ? (
        <div className="plasmo-text-center plasmo-py-4 plasmo-text-gray-500 plasmo-text-sm">Loading variables...</div>
      ) : variables && variables.length > 0 ? (
        <div className="plasmo-bg-white plasmo-shadow-sm plasmo-rounded-md plasmo-border plasmo-border-gray-200 plasmo-divide-y plasmo-divide-gray-200">
          {variables.map(variable => (
            <div key={variable.id} className="plasmo-p-4">
              {editingId === variable.id ? (
                /* Edit Form */
                <div className="plasmo-space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border-gray-300 plasmo-shadow-sm focus:plasmo-border-blue-500 focus:plasmo-ring-blue-500 plasmo-text-sm"
                  />
                  
                  {/* Text Entries Section */}
                  <div>
                    <label htmlFor="textEntries" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                      Text Entries
                    </label>
                    <textarea
                      id="textEntries"
                      value={editForm.textValue}
                      onChange={(e) => setEditForm({...editForm, textValue: e.target.value})}
                      rows={3}
                      className="plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border-gray-300 plasmo-shadow-sm focus:plasmo-border-blue-500 focus:plasmo-ring-blue-500 plasmo-text-sm"
                    />
                    <p className="plasmo-mt-1 plasmo-text-xs plasmo-text-gray-500">
                      Each line will be treated as a separate text entry.
                    </p>
                  </div>
                  
                  {/* File/Directory Entries Section */}
                  <div>
                    <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                      File/Directory Entries
                    </label>
                    
                    {/* File entry type selector */}
                    <div className="plasmo-mb-2">
                      <VariableTypeSelector
                        selectedType={editVariableType}
                        onChange={setEditVariableType}
                      />
                    </div>
                    
                    {/* File picker for edit mode */}
                    {(editVariableType === VARIABLE_ENTRY_TYPES.FILE || 
                      editVariableType === VARIABLE_ENTRY_TYPES.DIRECTORY) && (
                      <div className="plasmo-mb-3">
                        <FilePicker
                          onFileSelect={handleEditFileSelect}
                          allowDirectories={editVariableType === VARIABLE_ENTRY_TYPES.DIRECTORY}
                          allowMultiple={true}
                        />
                        <p className="plasmo-mt-1 plasmo-text-xs plasmo-text-gray-500">
                          Select files/directories to add to this variable.
                        </p>
                      </div>
                    )}
                    
                    {/* Display existing file/directory entries */}
                    {editForm.entries.some(entry => 
                      entry.type === VARIABLE_ENTRY_TYPES.FILE || 
                      entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY
                    ) && (
                      <div>
                        <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-2">
                          <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                            Existing Files/Directories
                          </label>
                          <button
                            type="button"
                            onClick={handleClearFileEntries}
                            className="plasmo-text-red-500 plasmo-hover:text-red-700 plasmo-text-xs plasmo-font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                        
                        <ul className="plasmo-border plasmo-border-gray-200 plasmo-rounded plasmo-divide-y plasmo-divide-gray-200 plasmo-max-h-48 plasmo-overflow-y-auto">
                          {editForm.entries
                            .filter(entry => 
                              entry.type === VARIABLE_ENTRY_TYPES.FILE || 
                              entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY
                            )
                            .map((entry, idx) => (
                              <li key={idx} className="plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-text-gray-800 plasmo-flex plasmo-justify-between plasmo-items-center">
                                <div className="plasmo-flex plasmo-items-center">
                                  {entry.type === VARIABLE_ENTRY_TYPES.FILE ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="plasmo-h-4 plasmo-w-4 plasmo-mr-1 plasmo-text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="plasmo-h-4 plasmo-w-4 plasmo-mr-1 plasmo-text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                  )}
                                  <div className="plasmo-flex plasmo-flex-col">
                                    <span className="plasmo-font-medium">{entry.name || entry.value.split('/').pop() || 'Unnamed file'}</span>
                                    {entry.metadata && (
                                      <span className="plasmo-text-xs plasmo-text-gray-500">
                                        {entry.metadata.size 
                                          ? `${(entry.metadata.size / 1024).toFixed(2)} KB` 
                                          : ''}
                                        {entry.metadata.type 
                                          ? ` · ${entry.metadata.type.split('/').pop()}` 
                                          : ''}
                                        {entry.metadata.path 
                                          ? ` · ${entry.metadata.path.split('/').pop()}` 
                                          : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Remove this entry from the entries array
                                    setEditForm({
                                      ...editForm,
                                      entries: editForm.entries.filter((_, i) => 
                                        i !== editForm.entries.findIndex(e => e === entry)
                                      )
                                    });
                                  }}
                                  className="plasmo-text-red-500 plasmo-hover:text-red-700 plasmo-text-xs"
                                >
                                  Remove
                                </button>
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="plasmo-flex plasmo-justify-end plasmo-space-x-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="plasmo-inline-flex plasmo-items-center plasmo-px-3 plasmo-py-1.5 plasmo-border plasmo-border-gray-300 plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-text-gray-700 plasmo-bg-white plasmo-hover:bg-gray-50 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-offset-2 focus:plasmo-ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="plasmo-inline-flex plasmo-items-center plasmo-px-3 plasmo-py-1.5 plasmo-border plasmo-border-transparent plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-shadow-sm plasmo-text-white plasmo-bg-blue-600 plasmo-hover:bg-blue-700 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-offset-2 focus:plasmo-ring-blue-500"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Variable Display */
                <div>
                  <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                    <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">{variable.name}</h3>
                    <div className="plasmo-flex plasmo-space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(variable)}
                        className="plasmo-inline-flex plasmo-items-center plasmo-px-2 plasmo-py-1 plasmo-border plasmo-border-gray-300 plasmo-text-xs plasmo-font-medium plasmo-rounded-md plasmo-text-gray-700 plasmo-bg-white plasmo-hover:bg-gray-50 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-offset-2 focus:plasmo-ring-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(variable.id, variable.name)}
                        className="plasmo-inline-flex plasmo-items-center plasmo-px-2 plasmo-py-1 plasmo-border plasmo-border-gray-300 plasmo-text-xs plasmo-font-medium plasmo-rounded-md plasmo-text-gray-700 plasmo-bg-white plasmo-hover:bg-gray-50 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-offset-2 focus:plasmo-ring-blue-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="plasmo-mt-2 plasmo-text-sm plasmo-text-gray-600">
                    {variable.value.map((entry, idx) => (
                      <div key={idx} className="plasmo-py-1">
                        {entry.type === VARIABLE_ENTRY_TYPES.TEXT ? (
                          <span>{entry.value}</span>
                        ) : entry.type === VARIABLE_ENTRY_TYPES.FILE ? (
                          <div className="plasmo-flex plasmo-items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="plasmo-h-4 plasmo-w-4 plasmo-mr-1 plasmo-text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="plasmo-flex plasmo-flex-col">
                              <span className="plasmo-font-medium">{entry.name || entry.value.split('/').pop()}</span>
                              {entry.metadata && (
                                <span className="plasmo-text-xs plasmo-text-gray-500">
                                  {entry.metadata.size 
                                    ? `${(entry.metadata.size / 1024).toFixed(2)} KB` 
                                    : ''}
                                  {entry.metadata.type 
                                    ? ` · ${entry.metadata.type.split('/').pop()}` 
                                    : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="plasmo-flex plasmo-items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="plasmo-h-4 plasmo-w-4 plasmo-mr-1 plasmo-text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <div className="plasmo-flex plasmo-flex-col">
                              <span className="plasmo-font-medium">{entry.name || entry.value.split('/').pop()}</span>
                              {entry.metadata && (
                                <span className="plasmo-text-xs plasmo-text-gray-500">
                                  {entry.metadata.path ? `${entry.metadata.path}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="plasmo-text-center plasmo-py-6 plasmo-bg-gray-50 plasmo-rounded-lg plasmo-border plasmo-border-gray-200">
          <p className="plasmo-text-sm plasmo-text-gray-500">No variables created yet</p>
        </div>
      )}
    </div>
  );
}

export default VariablesPage; 