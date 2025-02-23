import React from 'react';
import type {
  TemplateVariable,
  TemplateVariableValues,
  VariableValidationOptions
} from '../../../../types/template-variables';
import { VariableInput } from './VariableInput';

interface VariableListProps {
  variables: TemplateVariable[];
  values: TemplateVariableValues;
  onVariableChange: (name: string, value: string) => void;
  validationOptions?: Record<string, VariableValidationOptions>;
  multilineVariables?: string[];
  className?: string;
}

export function VariableList({
  variables,
  values,
  onVariableChange,
  validationOptions = {},
  multilineVariables = [],
  className = ''
}: VariableListProps) {
  if (variables.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No variables defined in this template
      </div>
    );
  }

  // Group variables by required status
  const requiredVars = variables.filter(v => v.isRequired);
  const optionalVars = variables.filter(v => !v.isRequired);

  // Helper function to render variable input
  const renderVariableInput = (variable: TemplateVariable) => (
    <VariableInput
      key={variable.name}
      variable={variable}
      state={values[variable.name] || {
        value: '',
        isDirty: false,
        isValid: true,
        errors: []
      }}
      onChange={(value) => onVariableChange(variable.name, value)}
      validationOptions={validationOptions[variable.name]}
      multiline={multilineVariables.includes(variable.name)}
    />
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Required Variables Section */}
      {requiredVars.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            Required Variables
            <span className="ml-2 text-xs text-red-500">*required</span>
          </h4>
          <div className="space-y-4">
            {requiredVars.map(renderVariableInput)}
          </div>
        </div>
      )}

      {/* Optional Variables Section */}
      {optionalVars.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            Optional Variables
            <span className="ml-2 text-xs text-gray-500">(defaults provided)</span>
          </h4>
          <div className="space-y-4">
            {optionalVars.map(renderVariableInput)}
          </div>
        </div>
      )}
    </div>
  );
} 