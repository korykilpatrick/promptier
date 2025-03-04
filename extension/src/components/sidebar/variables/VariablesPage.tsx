import React, { useState, useEffect, useCallback } from "react";
import { useUserVariables } from "../../../hooks/useUserVariables";
import { useToast } from "../../../hooks/useToast";
import { UserVariable } from "../../../../shared/types/variables";
import { VariableTypeSelector } from "./VariableTypeSelector";
import { FilePicker } from "./FilePicker";
import { VariableItem } from "./VariableItem";
import { LoadingState } from "../../common/LoadingState";
import { ErrorState } from "../../common/ErrorState";

const VARIABLE_ENTRY_TYPES = {
  TEXT: "text",
  FILE: "file"
};

const getTextEntries = (variable: UserVariable) => {
  if (!variable || !variable.value || !Array.isArray(variable.value)) {
    return [];
  }
  return variable.value.filter((entry: any) => entry && entry.type === VARIABLE_ENTRY_TYPES.TEXT);
};

const createTextEntry = (value: string) => ({
  type: VARIABLE_ENTRY_TYPES.TEXT,
  value
});

function VariablesPage() {
  const { addToast } = useToast();
  
  const {
    variables,
    isLoading,
    error,
    fetchVariables,
    createVariable,
    updateVariable,
    deleteVariable
  } = useUserVariables({
    autoFetch: true
  });

  const [showCreationForm, setShowCreationForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<UserVariable | null>(null);
  
  const [editForm, setEditForm] = useState({
    id: null as number | null,
    name: "",
    type: VARIABLE_ENTRY_TYPES.TEXT,
    textValue: "",
    entries: [] as any[]
  });

  // Reset form when not editing or creating
  useEffect(() => {
    if (!editingVariable && !showCreationForm) {
      setEditForm({
        id: null,
        name: "",
        type: VARIABLE_ENTRY_TYPES.TEXT,
        textValue: "",
        entries: []
      });
    }
  }, [editingVariable, showCreationForm]);

  const handleCreateClick = useCallback(() => {
    setEditingVariable(null);
    setShowCreationForm(true);
    setEditForm({
      id: null,
      name: "",
      type: VARIABLE_ENTRY_TYPES.TEXT,
      textValue: "",
      entries: []
    });
  }, []);

  const handleEdit = useCallback((variable: UserVariable) => {
    const textEntries = getTextEntries(variable);
    const textValue = textEntries.length > 0 
      ? textEntries.map((entry: any) => entry.value).join('\n')
      : '';
    
    setEditingVariable(variable);
    setShowCreationForm(false);
    setEditForm({
      id: variable.id,
      name: variable.name,
      type: textEntries.length > 0 ? VARIABLE_ENTRY_TYPES.TEXT : VARIABLE_ENTRY_TYPES.FILE,
      textValue,
      entries: Array.isArray(variable.value) ? variable.value : []
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingVariable(null);
    setShowCreationForm(false);
  }, []);

  const handleClearFileEntries = useCallback(() => {
    setEditForm(prev => ({
      ...prev,
      entries: prev.entries.filter((entry: any) => entry.type === VARIABLE_ENTRY_TYPES.TEXT)
    }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    try {
      const textValueArray = editForm.textValue.trim()
        ? editForm.textValue.split('\n').map((value: string) => createTextEntry(value))
        : [];
      
      const nonTextEntries = editForm.entries.filter((entry: any) =>
        entry.type !== VARIABLE_ENTRY_TYPES.TEXT
      );
      
      const combinedEntries = [...textValueArray, ...nonTextEntries];
      
      if (editForm.id) {
        await updateVariable(editForm.id, {
          name: editForm.name,
          value: combinedEntries
        });
        addToast({
          type: "success",
          title: "Variable updated",
          message: `Variable "${editForm.name}" has been updated`
        });
      } else {
        await createVariable({
          name: editForm.name,
          value: combinedEntries
        });
        addToast({
          type: "success",
          title: "Variable created",
          message: `Variable "${editForm.name}" has been created`
        });
      }
      
      setEditingVariable(null);
      setShowCreationForm(false);
    } catch (error) {
      console.error("Failed to save variable:", error);
      addToast({
        type: "error",
        title: "Error",
        message: `Failed to save variable: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [editForm, updateVariable, createVariable, addToast]);

  const handleDelete = useCallback(async (id: number, name: string) => {
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
        title: "Error",
        message: `Failed to delete variable: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [deleteVariable, addToast]);

  const handleVariableTypeChange = useCallback((type: string) => {
    setEditForm(prev => ({
      ...prev,
      type
    }));
  }, []);

  const handleFileSelect = useCallback((entries: any) => {
    const entriesArray = Array.isArray(entries) ? entries : [entries];
    setEditForm(prev => ({
      ...prev,
      entries: [...prev.entries, ...entriesArray]
    }));
  }, []);

  const handleEditFileSelect = useCallback((entries: any) => {
    const entriesArray = Array.isArray(entries) ? entries : [entries];
    setEditForm(prev => ({
      ...prev,
      entries: [...prev.entries, ...entriesArray]
    }));
  }, []);

  const isFormValid = !!editForm.name.trim() && (
    (editForm.type === VARIABLE_ENTRY_TYPES.TEXT && editForm.textValue.trim()) ||
    (editForm.type === VARIABLE_ENTRY_TYPES.FILE && editForm.entries.some(entry => entry.type === VARIABLE_ENTRY_TYPES.FILE))
  );

  if (isLoading) {
    return <LoadingState message="Loading variables..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={`Failed to load variables: ${error instanceof Error ? error.message : 'Unknown error'}`}
        onRetry={fetchVariables}
      />
    );
  }

  return (
    <div className="plasmo-p-4 plasmo-w-full">
      {/* Variable Creation/Editing Form */}
      {(showCreationForm || editingVariable) && (
        <div className="plasmo-mb-6 plasmo-p-4 plasmo-bg-white plasmo-rounded-lg plasmo-border plasmo-border-gray-200 plasmo-shadow-sm plasmo-animate-fade-in">
          <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-800 plasmo-mb-4">
            {editingVariable ? "Edit Variable" : "Create New Variable"}
          </h2>
          
          <div className="plasmo-space-y-4">
            <div>
              <label htmlFor="variableName" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                Variable Name
              </label>
              <input
                id="variableName"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-border plasmo-border-gray-300 plasmo-rounded-md plasmo-shadow-sm plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-primary-500"
                placeholder="Enter variable name"
              />
            </div>
            
            <div>
              <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                Variable Type
              </label>
              <VariableTypeSelector
                selectedType={editForm.type}
                onChange={handleVariableTypeChange}
              />
            </div>
            
            {editForm.type === VARIABLE_ENTRY_TYPES.TEXT && (
              <div>
                <label htmlFor="variableValue" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                  Text Value
                </label>
                <textarea
                  id="variableValue"
                  value={editForm.textValue}
                  onChange={(e) => setEditForm(prev => ({ ...prev, textValue: e.target.value }))}
                  className="plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-border plasmo-border-gray-300 plasmo-rounded-md plasmo-shadow-sm plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-primary-500 plasmo-h-32 plasmo-resize-y"
                  placeholder="Enter variable value (one entry per line)"
                />
              </div>
            )}
            
            {editForm.type === VARIABLE_ENTRY_TYPES.FILE && (
              <div>
                <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
                  File Selection
                </label>
                <FilePicker
                  onSelect={editingVariable ? handleEditFileSelect : handleFileSelect}
                  selectedEntries={editForm.entries.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.FILE)}
                  onClear={handleClearFileEntries}
                />
              </div>
            )}
            
            <div className="plasmo-flex plasmo-justify-end plasmo-space-x-3 plasmo-mt-4">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-bg-white plasmo-border plasmo-border-gray-300
                        plasmo-rounded-md plasmo-shadow-sm hover:plasmo-bg-gray-50 plasmo-focus:outline-none plasmo-focus:ring-2
                        plasmo-focus:ring-offset-2 plasmo-focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!isFormValid}
                className="plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-white plasmo-bg-primary-600 plasmo-border plasmo-border-transparent
                        plasmo-rounded-md plasmo-shadow-sm hover:plasmo-bg-primary-700 plasmo-focus:outline-none plasmo-focus:ring-2
                        plasmo-focus:ring-offset-2 plasmo-focus:ring-primary-500 disabled:plasmo-opacity-50
                        disabled:plasmo-cursor-not-allowed"
              >
                {editingVariable ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variables List with Card Design */}
      <div className="plasmo-space-y-4">
        <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-4">
          <div className="plasmo-text-xs plasmo-text-gray-500">
            {variables.length} variable{variables.length !== 1 ? 's' : ''}
          </div>
          <button
            className="plasmo-btn-primary plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-xs"
            onClick={handleCreateClick}
            aria-label="Create new variable"
          >
            <svg
              className="plasmo-w-3.5 plasmo-h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New
          </button>
        </div>
        
        {variables.length === 0 ? (
          <div className="plasmo-empty-state plasmo-w-full">
            <div className="plasmo-text-gray-400 plasmo-mb-2">
              <svg className="plasmo-w-10 plasmo-h-10 plasmo-mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2">No variables yet</h3>
            <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-3">
              Create your first variable to get started with reusable content.
            </p>
            <button
              className="plasmo-btn-primary"
              onClick={handleCreateClick}
            >
              Create Your First Variable
            </button>
          </div>
        ) : (
          <div className="plasmo-space-y-2 plasmo-w-full">
            {variables.map((variable, index) => (
              <VariableItem
                key={variable.id}
                variable={variable}
                index={index}
                onEdit={() => handleEdit(variable)}
                onDelete={(id) => handleDelete(id, variable.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VariablesPage; 