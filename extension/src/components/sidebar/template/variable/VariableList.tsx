const React = require('react');
const { VariableInput } = require('./VariableInput');

/**
 * @typedef {import('../../../../types/template-variables').TemplateVariable} TemplateVariable
 * @typedef {import('../../../../types/template-variables').TemplateVariableValues} TemplateVariableValues
 * @typedef {import('../../../../types/template-variables').VariableValidationOptions} VariableValidationOptions
 */

/**
 * @typedef {Object} VariableListProps
 * @property {TemplateVariable[]} variables - Template variables
 * @property {TemplateVariableValues} values - Variable values
 * @property {function(string, string): void} onVariableChange - Variable change handler
 * @property {Record<string, VariableValidationOptions>} [validationOptions] - Validation options
 * @property {string[]} [multilineVariables] - List of variables that should use multiline inputs
 * @property {string} [className] - Additional CSS class
 */

/**
 * Component for displaying a list of variable inputs
 * @param {VariableListProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
function VariableList({
  variables,
  values,
  onVariableChange,
  validationOptions = {},
  multilineVariables = [],
  className = ''
}) {
  if (variables.length === 0) {
    return (
      <div className="plasmo-text-sm plasmo-text-gray-500 plasmo-italic">
        No variables defined in this template
      </div>
    );
  }

  // Group variables by required status
  const requiredVars = variables.filter(v => v.isRequired);
  const optionalVars = variables.filter(v => !v.isRequired);

  // Helper function to render variable input
  const renderVariableInput = (variable) => (
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
    <div className={`${className}`}>
      {/* Required Variables Section */}
      {requiredVars.length > 0 && (
        <div className="plasmo-mb-5">
          <div className="plasmo-flex plasmo-items-center plasmo-mb-2">
            <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-800">
              Required Variables
            </h4>
            <span className="plasmo-ml-2 plasmo-px-1.5 plasmo-py-0.5 plasmo-bg-red-100 plasmo-text-red-700 plasmo-text-xs plasmo-rounded-md plasmo-font-medium">
              Required
            </span>
          </div>
          <div className="plasmo-space-y-4 plasmo-bg-white plasmo-p-3 plasmo-rounded-md plasmo-border plasmo-border-gray-200">
            {requiredVars.map(renderVariableInput)}
          </div>
        </div>
      )}

      {/* Optional Variables Section */}
      {optionalVars.length > 0 && (
        <div>
          <div className="plasmo-flex plasmo-items-center plasmo-mb-2">
            <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-800">
              Optional Variables
            </h4>
            <span className="plasmo-ml-2 plasmo-px-1.5 plasmo-py-0.5 plasmo-bg-gray-100 plasmo-text-gray-700 plasmo-text-xs plasmo-rounded-md plasmo-font-medium">
              With defaults
            </span>
          </div>
          <div className="plasmo-space-y-4 plasmo-bg-white plasmo-p-3 plasmo-rounded-md plasmo-border plasmo-border-gray-200">
            {optionalVars.map(renderVariableInput)}
          </div>
        </div>
      )}
    </div>
  );
}

module.exports = { VariableList }; 