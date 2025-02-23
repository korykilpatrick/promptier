import React, { useState, useCallback } from 'react';
import type {
  TemplateVariable,
  TemplateVariableState,
  VariableValidationOptions
} from '../../../../types/template-variables';
import { useDebounceValue } from '../../../../hooks/useDebounce';

interface VariableInputProps {
  variable: TemplateVariable;
  state: TemplateVariableState;
  onChange: (value: string) => void;
  validationOptions?: VariableValidationOptions;
  className?: string;
  multiline?: boolean;
}

export function VariableInput({
  variable,
  state,
  onChange,
  validationOptions,
  className = '',
  multiline = false
}: VariableInputProps) {
  const inputId = `var-${variable.name}`;
  const hasErrors = state.errors.length > 0;
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
  React.useEffect(() => {
    if (debouncedValue !== state.value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, state.value]);

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setLocalValue(e.target.value);
  }, []);

  // Handle focus events
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

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
      block w-full rounded-md shadow-sm sm:text-sm transition-all duration-200
      ${state.isValid
        ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        : 'border-red-300 focus:border-red-500 focus:ring-red-500'
      }
      ${state.isDirty ? 'bg-white' : 'bg-gray-50'}
      ${hasErrors ? 'pr-8' : ''}
      ${isPending ? 'italic' : ''}
      ${isFocused ? 'ring-2' : ''}
    `,
    'aria-invalid': !state.isValid,
    'aria-describedby': [
      variable.description ? `desc-${variable.name}` : null,
      errorId
    ].filter(Boolean).join(' ')
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {variable.name}
          {variable.isRequired && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
        <div className="flex items-center space-x-2">
          {validationOptions?.maxLength && (
            <span 
              className={`text-xs transition-colors duration-200 ${
                localValue.length > (validationOptions.maxLength * 0.9)
                  ? 'text-amber-500'
                  : 'text-gray-500'
              }`}
            >
              {localValue.length}/{validationOptions.maxLength}
            </span>
          )}
          {(state.isDirty || isPending) && (
            <span className="text-xs text-gray-500">
              {getStatusMessage()}
            </span>
          )}
        </div>
      </div>

      {variable.description && (
        <p className="text-xs text-gray-500" id={`desc-${variable.name}`}>
          {variable.description}
        </p>
      )}

      <div className="relative group">
        {multiline ? (
          <textarea
            {...inputProps}
            rows={3}
            className={`${inputProps.className} resize-y`}
          />
        ) : (
          <input
            type="text"
            {...inputProps}
          />
        )}

        {/* Error icon */}
        {hasErrors && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-red-500"
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

        {/* Loading spinner */}
        {isPending && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="animate-spin h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error messages */}
      {hasErrors && (
        <ul
          id={errorId}
          className="mt-1 text-sm text-red-600 list-disc list-inside"
          role="alert"
        >
          {state.errors.map((error, index) => (
            <li key={index}>{error.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
} 