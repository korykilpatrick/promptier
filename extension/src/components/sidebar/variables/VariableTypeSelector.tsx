const React = require("react");
const { useState } = React;
const { VARIABLE_ENTRY_TYPES } = require("shared/types/variables");

/**
 * Props for the VariableTypeSelector component
 */
interface VariableTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
  allowDirectories?: boolean;
}

/**
 * Component that lets users select the type of variable (text, file, directory)
 */
function VariableTypeSelector({ 
  selectedType, 
  onChange, 
  allowDirectories = true 
}: VariableTypeSelectorProps) {
  
  const handleTypeChange = (e: any) => {
    onChange(e.target.value);
  };

  return (
    <div className="plasmo-mb-4">
      <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-2">
        Variable Type
      </label>
      <div className="plasmo-flex plasmo-space-x-4">
        <label className="plasmo-flex plasmo-items-center">
          <input
            type="radio"
            name="variableType"
            value={VARIABLE_ENTRY_TYPES.TEXT}
            checked={selectedType === VARIABLE_ENTRY_TYPES.TEXT}
            onChange={handleTypeChange}
            className="plasmo-mr-2 plasmo-h-4 plasmo-w-4 plasmo-text-blue-600"
          />
          <span className="plasmo-text-sm plasmo-text-gray-700">Text</span>
        </label>
        
        <label className="plasmo-flex plasmo-items-center">
          <input
            type="radio"
            name="variableType"
            value={VARIABLE_ENTRY_TYPES.FILE}
            checked={selectedType === VARIABLE_ENTRY_TYPES.FILE}
            onChange={handleTypeChange}
            className="plasmo-mr-2 plasmo-h-4 plasmo-w-4 plasmo-text-blue-600"
          />
          <span className="plasmo-text-sm plasmo-text-gray-700">File</span>
        </label>
        
        {allowDirectories && (
          <label className="plasmo-flex plasmo-items-center">
            <input
              type="radio"
              name="variableType"
              value={VARIABLE_ENTRY_TYPES.DIRECTORY}
              checked={selectedType === VARIABLE_ENTRY_TYPES.DIRECTORY}
              onChange={handleTypeChange}
              className="plasmo-mr-2 plasmo-h-4 plasmo-w-4 plasmo-text-blue-600"
            />
            <span className="plasmo-text-sm plasmo-text-gray-700">Directory</span>
          </label>
        )}
      </div>
    </div>
  );
}

export default VariableTypeSelector; 