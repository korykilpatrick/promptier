const React = require('react');
const { useState, useCallback, useEffect } = React;
const { useDebounceValue } = require('../../../../hooks/useDebounce');

/**
 * @typedef {import('../../../../types/template-variables').TemplateVariable} TemplateVariable
 * @typedef {import('../../../../types/template-variables').TemplateVariableState} TemplateVariableState
 * @typedef {import('../../../../types/template-variables').VariableValidationOptions} VariableValidationOptions
 */

/**
 * @typedef {Object} VariableInputProps
 * @property {TemplateVariable} variable - The template variable
 * @property {TemplateVariableState} state - Current state of the variable
 * @property {function(string): void} onChange - Change handler
 * @property {VariableValidationOptions} [validationOptions] - Validation options
 * @property {boolean} [multiline=false] - Whether to use multiline input
 * @property {string} [className] - Additional CSS class
 * @property {boolean} [isGlobalValue=false] - Whether this variable has a value from global variables
 * @property {function(string): void} [onSaveToGlobal] - Function to save this variable to global variables
 */

/**
 * Component for rendering a variable input field
 * @param {VariableInputProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
function VariableInput({
  variable,
  state,
  onChange,
  validationOptions,
  className = '',
  multiline = false,
  isGlobalValue = false,
  onSaveToGlobal
}) {
  const inputId = `var-${variable.name}`;
  const hasErrors = state.errors && state.errors.length > 0;
  const errorId = hasErrors ? `error-${variable.name}` : undefined;

  // Local state for immediate feedback
  const [localValue, setLocalValue] = useState(state.value);
  const [isPending, setIsPending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Debounce the value changes
  const debouncedValue = useDebounceValue(localValue, {
    delay: 300,
    maxWait: 1000,
    onPending: () => setIsPending(true),
    onComplete: () => setIsPending(false)
  });

  // Update parent when debounced value changes
  useEffect(() => {
    if (debouncedValue !== state.value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, state.value]);

  // Handle input changes
  const handleChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  // Handle focus events
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Handle saving to global variables
  const handleSaveToGlobal = useCallback(() => {
    if (onSaveToGlobal) {
      onSaveToGlobal(variable.name);
    }
  }, [onSaveToGlobal, variable.name]);

  // Calculate status message
  const getStatusMessage = () => {
    if (isPending) return 'Typing...';
    if (state.isDirty) return 'Modified';
    if (validationOptions?.maxLength) {
      const remaining = validationOptions.maxLength - localValue.length;
      return `${remaining} characters remaining`;
    }
    return '';
  };

  // Get appropriate border color based on state
  const getBorderColorClass = () => {
    if (!state.isValid) return 'plasmo-border-error-300 plasmo-focus:plasmo-border-error-500 plasmo-focus:plasmo-ring-error-500 plasmo-focus:plasmo-ring-opacity-30';
    if (isFocused) return 'plasmo-border-primary-400 plasmo-ring-2 plasmo-ring-primary-500 plasmo-ring-opacity-20';
    if (isGlobalValue) return 'plasmo-border-success-300 plasmo-focus:plasmo-border-success-500 plasmo-focus:plasmo-ring-success-500 plasmo-focus:plasmo-ring-opacity-20';
    return 'plasmo-border-gray-300 plasmo-focus:plasmo-border-primary-500 plasmo-focus:plasmo-ring-primary-500 plasmo-focus:plasmo-ring-opacity-20';
  };

  // Get background color based on state
  const getBackgroundColorClass = () => {
    if (!state.isValid) return 'plasmo-bg-error-50';
    if (isGlobalValue) return 'plasmo-bg-success-50';
    if (state.isDirty) return 'plasmo-bg-white';
    return 'plasmo-bg-gray-50';
  };

  // Common input props
  const inputProps = {
    id: inputId,
    value: localValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    placeholder: variable.defaultValue || '',
    maxLength: validationOptions?.maxLength,
    className: `
      plasmo-input
      ${getBorderColorClass()}
      ${getBackgroundColorClass()}
      ${isPending ? 'plasmo-italic' : ''}
      ${hasErrors && !multiline ? 'plasmo-pr-8' : ''}
    `,
    'aria-invalid': !state.isValid,
    'aria-describedby': [
      variable.description ? `desc-${variable.name}` : null,
      errorId
    ].filter(Boolean).join(' ')
  };

  return (
    <div className={`plasmo-rounded-md ${className}`}>
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-1.5">
        <div className="plasmo-flex plasmo-items-center">
          <label
            htmlFor={inputId}
            className="plasmo-label plasmo-flex plasmo-items-center plasmo-mb-0"
          >
            {variable.name}
            {variable.isRequired && (
              <span className="plasmo-text-error-500 plasmo-ml-1 plasmo-font-bold" aria-label="required">*</span>
            )}
          </label>
          
          {/* Status badges */}
          {state.isDirty && (
            <span className="plasmo-badge plasmo-badge-blue plasmo-ml-2">
              Modified
            </span>
          )}
          
          {isGlobalValue && (
            <span className="plasmo-badge plasmo-badge-green plasmo-ml-2">
              Global
            </span>
          )}
        </div>
        
        <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
          {validationOptions?.maxLength && (
            <span 
              className={`plasmo-text-xs plasmo-transition-colors plasmo-duration-200 ${
                localValue.length > (validationOptions.maxLength * 0.9)
                  ? localValue.length >= validationOptions.maxLength 
                    ? 'plasmo-text-error-500 plasmo-font-medium'
                    : 'plasmo-text-accent-500'
                  : 'plasmo-text-gray-500'
              }`}
            >
              {localValue.length}/{validationOptions.maxLength}
            </span>
          )}
          {isPending && (
            <span className="plasmo-text-xs plasmo-text-gray-500 plasmo-flex plasmo-items-center">
              <svg
                className="plasmo-animate-spin plasmo-h-3 plasmo-w-3 plasmo-text-gray-400 plasmo-mr-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="plasmo-opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="plasmo-opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Typing...
            </span>
          )}
        </div>
      </div>

      {variable.description && (
        <p className="plasmo-text-caption plasmo-mb-1.5" id={`desc-${variable.name}`}>
          {variable.description}
        </p>
      )}

      <div className="plasmo-relative plasmo-group">
        {multiline ? (
          <textarea
            {...inputProps}
            rows={3}
            className={`${inputProps.className} plasmo-resize-y`}
          />
        ) : (
          <input
            type="text"
            {...inputProps}
          />
        )}

        {/* Error icon */}
        {hasErrors && !multiline && (
          <div className="plasmo-absolute plasmo-inset-y-0 plasmo-right-0 plasmo-pr-3 plasmo-flex plasmo-items-center plasmo-pointer-events-none">
            <svg
              className="plasmo-h-5 plasmo-w-5 plasmo-text-error-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        
        {/* Save to global button for valid variables */}
        {state.isValid && state.isDirty && onSaveToGlobal && !isGlobalValue && !hasErrors && (
          <div className="plasmo-absolute plasmo-inset-y-0 plasmo-right-0 plasmo-pr-2 plasmo-flex plasmo-items-center plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-transition-opacity">
            <button
              type="button"
              onClick={handleSaveToGlobal}
              className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-success-600 plasmo-focus:plasmo-outline-none plasmo-transition-colors"
              title="Save to global variables"
            >
              <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Error messages */}
      {hasErrors && (
        <ul
          id={errorId}
          className="plasmo-mt-1.5 plasmo-text-xs plasmo-text-error-600 plasmo-list-disc plasmo-list-inside"
          role="alert"
        >
          {state.errors.map((error, index) => (
            <li key={index} className="plasmo-mb-0.5">{error.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

module.exports = { VariableInput }; 