try {
  const _React = require('react');
  const _VariableList = require('./variable/VariableList').VariableList;
  const { useNavigate } = require('react-router-dom');

  /**
   * @typedef {import('../../../../types/template-variables').TemplateVariable} TemplateVariable
   * @typedef {import('../../../../types/template-variables').TemplateVariableValues} TemplateVariableValues
   * @typedef {import('../../../../types/template-variables').VariableValidationOptions} VariableValidationOptions
   * @typedef {import('../../../../types/template-variables').TemplateParseResult} TemplateParseResult
   * @typedef {import('../../../../shared/types/variables').UserVariable} UserVariable
   */

  /**
   * @typedef {Object} VariableMappingProps
   * @property {TemplateVariable[]} variables - Template variables
   * @property {TemplateVariableValues} values - Variable values
   * @property {function(string, string): void} onVariableChange - Variable change handler
   * @property {function(): void} onReset - Reset handler
   * @property {function(string[]): Promise<void>} [onSaveToGlobal] - Save variables to global store
   * @property {Record<string, VariableValidationOptions>} [validationOptions] - Validation options
   * @property {string[]} [multilineVariables] - List of variables that should use multiline inputs
   * @property {string} [className] - Additional CSS class
   * @property {UserVariable[]} [globalVariables] - Global user variables from store
   * @property {boolean} [isLoadingGlobalVariables] - Whether global variables are loading
   * @property {TemplateParseResult} parseResult - Parse result including errors
   */

  /**
   * Component for mapping template variables to input fields
   * @param {VariableMappingProps} props - Component props
   * @returns {JSX.Element} Rendered component
   */
  function VariableMapping({
    variables,
    values,
    onVariableChange,
    onReset,
    onSaveToGlobal,
    validationOptions,
    multilineVariables = [],
    className = '',
    globalVariables = [],
    isLoadingGlobalVariables = false,
    parseResult
  }) {
    try {
      // Log received variables for debugging
      console.log('[VariableMapping] Received variables:', variables);
      
      console.log("VariableMapping rendering with", { 
        variablesCount: variables?.length || 0, 
        valuesCount: Object.keys(values || {}).length,
        globalVariablesCount: globalVariables?.length || 0,
        parseErrors: parseResult?.errors || []
      });
      
      const safeVariables = Array.isArray(variables) 
        ? variables.filter(v => v && typeof v.name === 'string')
        : [];
        
      const hasVariables = safeVariables.length > 0;
      
      const hasModifiedValues = Object.values(values || {}).some(
        varState => varState && varState.isDirty
      );

      const handleSaveToGlobal = async () => {
        if (onSaveToGlobal) {
          const modifiedVariables = Object.entries(values || {})
            .filter(([_, state]) => state && state.isDirty && state.isValid)
            .map(([name]) => name);
            
          if (modifiedVariables.length > 0) {
            await onSaveToGlobal(modifiedVariables);
          }
        }
      };
      
      const handleSaveSingleToGlobal = async (variableName) => {
        if (onSaveToGlobal) {
          await onSaveToGlobal([variableName]);
        }
      };

      const navigate = useNavigate();

      return (
        <div className={`${className}`}>
          <div className="plasmo-flex plasmo-flex-wrap plasmo-justify-between plasmo-items-center plasmo-mb-3">
            <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
              Template Variables
            </h3>
            <div className="plasmo-flex plasmo-space-x-2">
              {hasVariables && hasModifiedValues && (
                <>
                  {onSaveToGlobal && (
                    <button
                      onClick={handleSaveToGlobal}
                      className="plasmo-text-sm plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-focus:outline-none 
                                plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-50 plasmo-px-3 plasmo-py-1 
                                plasmo-rounded-md plasmo-transition-colors plasmo-duration-150 plasmo-inline-flex plasmo-items-center"
                      type="button"
                      title="Save all modified variables to your global variable store"
                    >
                      <svg className="plasmo-h-3.5 plasmo-w-3.5 plasmo-mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save to Global
                    </button>
                  )}
                  
                  <button
                    onClick={onReset}
                    className="plasmo-text-sm plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-focus:outline-none 
                              plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-50 plasmo-px-3 plasmo-py-1 
                              plasmo-rounded-md plasmo-transition-colors plasmo-duration-150 plasmo-inline-flex plasmo-items-center"
                    type="button"
                    title="Reset all variables to their default values"
                  >
                    <svg className="plasmo-h-3.5 plasmo-w-3.5 plasmo-mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset to Defaults
                  </button>
                </>
              )}
            </div>
          </div>

          {parseResult.errors.length > 0 && (
            <div className="plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md plasmo-p-4 plasmo-mb-4">
              <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-red-700 plasmo-mb-2">
                Template Parsing Errors
              </h4>
              <ul className="plasmo-text-xs plasmo-text-red-600 plasmo-list-disc plasmo-list-inside">
                {parseResult.errors.map((error, index) => (
                  <li key={index} className="plasmo-mb-0.5">
                    {error.message}
                    {error.position && ` (at position ${error.position.start}-${error.position.end})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasVariables ? (
            <div className="plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-p-4">
              <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
                <span className="plasmo-text-xs plasmo-text-gray-500">
                  {Object.keys(values || {}).length} variable{Object.keys(values || {}).length !== 1 ? 's' : ''}
                </span>
                {onSaveToGlobal && (
                  <button
                    onClick={() => navigate("/variables")}
                    className="plasmo-text-xs plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-focus:outline-none plasmo-flex plasmo-items-center"
                    type="button"
                  >
                    <svg className="plasmo-h-3.5 plasmo-w-3.5 plasmo-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Manage Global Variables
                    {isLoadingGlobalVariables ? (
                      <svg className="plasmo-animate-spin plasmo-h-3 plasmo-w-3 plasmo-ml-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="plasmo-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="plasmo-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="plasmo-ml-1 plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded-full plasmo-bg-gray-100 plasmo-text-gray-600 plasmo-text-xs">
                        {globalVariables.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
              <_VariableList
                variables={safeVariables}
                values={values || {}}
                onVariableChange={onVariableChange}
                validationOptions={validationOptions || {}}
                multilineVariables={multilineVariables}
                globalVariables={globalVariables}
                onSaveToGlobal={onSaveToGlobal ? handleSaveSingleToGlobal : undefined}
              />
            </div>
          ) : (
            <div className="plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-p-4 plasmo-flex plasmo-items-start plasmo-gap-3">
              <div className="plasmo-text-gray-400 plasmo-mt-0.5">
                <svg className="plasmo-h-5 plasmo-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="plasmo-flex-1">
                <p className="plasmo-text-sm plasmo-text-gray-600">
                  Add variables to your template using the syntax <code className="plasmo-bg-white plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded plasmo-border plasmo-border-gray-200 plasmo-font-mono">{"{{variableName}}"}</code>
                </p>
                <p className="plasmo-text-xs plasmo-text-gray-500 plasmo-mt-1">
                  Variables will appear here once detected in your template content
                </p>
                <div className="plasmo-mt-3 plasmo-text-xs">
                  <div className="plasmo-flex plasmo-items-center plasmo-mb-1">
                    <span className="plasmo-h-2 plasmo-w-2 plasmo-rounded-full plasmo-bg-blue-500 plasmo-mr-2"></span>
                    <span className="plasmo-text-gray-700">Required variables: <code className="plasmo-bg-white plasmo-px-1 plasmo-py-0.5 plasmo-rounded plasmo-border plasmo-border-gray-200 plasmo-font-mono">{"{{variableName}}"}</code></span>
                  </div>
                  <div className="plasmo-flex plasmo-items-center">
                    <span className="plasmo-h-2 plasmo-w-2 plasmo-rounded-full plasmo-bg-green-500 plasmo-mr-2"></span>
                    <span className="plasmo-text-gray-700">Optional variables: <code className="plasmo-bg-white plasmo-px-1 plasmo-py-0.5 plasmo-rounded plasmo-border plasmo-border-gray-200 plasmo-font-mono">{"{{variableName:default}}"}</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error("Error rendering VariableMapping:", error);
      return (
        <div className="plasmo-p-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md plasmo-text-red-600">
          <p>There was an error rendering the variable mapping. Please refresh and try again.</p>
          <p className="plasmo-text-xs plasmo-mt-1">{error?.message || 'Unknown error'}</p>
        </div>
      );
    }
  }

  module.exports = { VariableMapping };
} catch (error) {
  console.error("Error in VariableMapping module:", error);
  
  function FallbackVariableMapping() {
    return (
      <div className="plasmo-p-3 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md">
        <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-red-800">Error Loading Variables Component</h3>
        <p className="plasmo-text-red-600 plasmo-mt-1 plasmo-text-xs">{error?.message || 'Unknown error'}</p>
      </div>
    );
  }
  
  module.exports = { VariableMapping: FallbackVariableMapping };
}