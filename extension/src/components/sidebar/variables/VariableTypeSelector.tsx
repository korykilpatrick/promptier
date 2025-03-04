import React from "react";

interface VariableTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
}

export function VariableTypeSelector({ selectedType, onChange }: VariableTypeSelectorProps) {
  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="plasmo-flex plasmo-space-x-4">
      <label className="plasmo-flex plasmo-items-center">
        <input
          type="radio"
          name="variableType"
          value="text"
          checked={selectedType === "text"}
          onChange={handleTypeChange}
          className="plasmo-h-4 plasmo-w-4 plasmo-text-primary-600 plasmo-focus:ring-primary-500 plasmo-border-gray-300"
        />
        <span className="plasmo-ml-2 plasmo-text-sm plasmo-text-gray-700">Text</span>
      </label>
      
      <label className="plasmo-flex plasmo-items-center">
        <input
          type="radio"
          name="variableType"
          value="file"
          checked={selectedType === "file"}
          onChange={handleTypeChange}
          className="plasmo-h-4 plasmo-w-4 plasmo-text-primary-600 plasmo-focus:ring-primary-500 plasmo-border-gray-300"
        />
        <span className="plasmo-ml-2 plasmo-text-sm plasmo-text-gray-700">File</span>
      </label>
    </div>
  );
}