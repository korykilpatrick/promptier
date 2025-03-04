import React from "react";

// Variable entry types
const VARIABLE_ENTRY_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  DIRECTORY: 'directory'
};

interface VariableTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
}

export function VariableTypeSelector({ selectedType, onChange }: VariableTypeSelectorProps) {
  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      <label className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-2">
        Variable Type
      </label>
      <div className="plasmo-grid plasmo-grid-cols-3 plasmo-gap-3">
        {/* Text Type */}
        <div
          className={`
            plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center
            plasmo-py-2 plasmo-px-3 plasmo-border plasmo-rounded-md
            plasmo-cursor-pointer plasmo-transition-colors plasmo-duration-150
            ${selectedType === VARIABLE_ENTRY_TYPES.TEXT
              ? 'plasmo-border-primary-500 plasmo-bg-primary-50 plasmo-text-primary-700'
              : 'plasmo-border-gray-200 plasmo-bg-white hover:plasmo-bg-gray-50 plasmo-text-gray-700'}
          `}
          onClick={() => onChange(VARIABLE_ENTRY_TYPES.TEXT)}
        >
          <input
            type="radio"
            name="variableType"
            id="variableTypeText"
            value={VARIABLE_ENTRY_TYPES.TEXT}
            checked={selectedType === VARIABLE_ENTRY_TYPES.TEXT}
            onChange={handleTypeChange}
            className="plasmo-sr-only"
          />
          <svg className="plasmo-w-5 plasmo-h-5 plasmo-mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <label htmlFor="variableTypeText" className="plasmo-text-xs plasmo-font-medium">
            Text
          </label>
        </div>
        
        {/* File Type */}
        <div
          className={`
            plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center
            plasmo-py-2 plasmo-px-3 plasmo-border plasmo-rounded-md
            plasmo-cursor-pointer plasmo-transition-colors plasmo-duration-150
            ${selectedType === VARIABLE_ENTRY_TYPES.FILE
              ? 'plasmo-border-primary-500 plasmo-bg-primary-50 plasmo-text-primary-700'
              : 'plasmo-border-gray-200 plasmo-bg-white hover:plasmo-bg-gray-50 plasmo-text-gray-700'}
          `}
          onClick={() => onChange(VARIABLE_ENTRY_TYPES.FILE)}
        >
          <input
            type="radio"
            name="variableType"
            id="variableTypeFile"
            value={VARIABLE_ENTRY_TYPES.FILE}
            checked={selectedType === VARIABLE_ENTRY_TYPES.FILE}
            onChange={handleTypeChange}
            className="plasmo-sr-only"
          />
          <svg className="plasmo-w-5 plasmo-h-5 plasmo-mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <label htmlFor="variableTypeFile" className="plasmo-text-xs plasmo-font-medium">
            File
          </label>
        </div>
        
        {/* Directory Type */}
        <div
          className={`
            plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center
            plasmo-py-2 plasmo-px-3 plasmo-border plasmo-rounded-md
            plasmo-cursor-pointer plasmo-transition-colors plasmo-duration-150
            ${selectedType === VARIABLE_ENTRY_TYPES.DIRECTORY
              ? 'plasmo-border-primary-500 plasmo-bg-primary-50 plasmo-text-primary-700'
              : 'plasmo-border-gray-200 plasmo-bg-white hover:plasmo-bg-gray-50 plasmo-text-gray-700'}
          `}
          onClick={() => onChange(VARIABLE_ENTRY_TYPES.DIRECTORY)}
        >
          <input
            type="radio"
            name="variableType"
            id="variableTypeDirectory"
            value={VARIABLE_ENTRY_TYPES.DIRECTORY}
            checked={selectedType === VARIABLE_ENTRY_TYPES.DIRECTORY}
            onChange={handleTypeChange}
            className="plasmo-sr-only"
          />
          <svg className="plasmo-w-5 plasmo-h-5 plasmo-mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <label htmlFor="variableTypeDirectory" className="plasmo-text-xs plasmo-font-medium">
            Directory
          </label>
        </div>
      </div>
    </div>
  );
}