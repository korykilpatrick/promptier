import React from 'react';
import type {
  TemplateVariable,
  TemplateVariableValues,
  VariableValidationOptions
} from '../../../types/template-variables';
import { VariableList } from './variable/VariableList';

interface VariableMappingProps {
  variables: TemplateVariable[];
  values: TemplateVariableValues;
  onVariableChange: (name: string, value: string) => void;
  onReset: () => void;
  validationOptions?: Record<string, VariableValidationOptions>;
  multilineVariables?: string[];
  className?: string;
}

export function VariableMapping({
  variables,
  values,
  onVariableChange,
  onReset,
  validationOptions,
  multilineVariables = [],
  className = ''
}: VariableMappingProps) {
  const safeVariables = variables ?? []; // Default to empty array if undefined
  const hasVariables = safeVariables.length > 0;
  const hasModifiedValues = Object.values(values).some(state => state.isDirty);
  const hasValidationErrors = Object.values(values).some(state => !state.isValid);

  // Count modified and total variables
  const modifiedCount = Object.values(values).filter(state => state.isDirty).length;
  const totalCount = safeVariables.length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Template Variables
            {hasValidationErrors && (
              <span className="ml-2 text-xs text-red-600">
                (Some variables have errors)
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {modifiedCount > 0 && (
              <span>
                {modifiedCount} of {totalCount} variables modified
              </span>
            )}
          </p>
        </div>
        {hasVariables && hasModifiedValues && (
          <button
            onClick={onReset}
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            title="Reset all variables to their default values"
          >
            Reset to Defaults
          </button>
        )}
      </div>

      <VariableList
        variables={safeVariables}
        values={values}
        onVariableChange={onVariableChange}
        validationOptions={validationOptions}
        multilineVariables={multilineVariables}
      />
    </div>
  );
}