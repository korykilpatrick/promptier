// Import using a try/catch pattern to avoid redeclaration issues
try {
  // Use consistent CommonJS requires
  const _React = require("react")
  const { useState, useEffect } = _React

  // For icons, we'll just use simple text or HTML symbols 
  // instead of lucide-react
  // You can replace with actual icons later

  // Import custom components and utilities
  const _VariableInput = require("./variable/VariableInput").VariableInput
  const _templates = require("../../../utils/templates")
  const { createTemplate, updateTemplate, deleteTemplate } = _templates

  // Import API utilities for variables
  const _apiUtils = require("../../../utils/api")
  const _templateParser = require("../../../utils/template-parser")
  const { TemplateVariable } = require("shared/types/template-variables")
  const { Template } = require("shared/types/templates")
  
  // Try to import potentially missing hooks with fallbacks
  let useGlobalVariables;
  try {
    useGlobalVariables = require("../../../hooks/useGlobalVariables").useGlobalVariables;
  } catch (error) {
    console.warn("useGlobalVariables not available, using fallback:", error);
    // Simple fallback implementation if the hook is missing
    useGlobalVariables = function(options = {}) {
      return {
        variables: [],
        isLoading: false,
        getVariableByName: () => undefined,
        getValueByName: () => undefined,
        variableMap: {},
        refreshVariables: async () => {},
      };
    };
  }
  
  const { useTemplateVariables } = require("../../../hooks/useTemplateVariables")
  const { useTemplateParser } = require("../../../hooks/useTemplateParser")
  const { useToast } = require("../../../hooks/useToast")
  const { useNavigate } = require("react-router-dom")

  // Import file content resolver utilities
  const { copyWithResolvedFileContents, ensureFilePermissions } = require("../../../utils/file-content-resolver");

  /**
   * Helper function to conditionally join class names
   * @param {...string} classes - CSS class names to conditionally join
   * @returns {string} Joined class names
   */
  function cn(...classes) {
    return classes.filter(Boolean).join(" ")
  }

  /**
   * Helper function to show a toast notification
   * @param {Object} options - Toast options
   */
  function toast(options) {
    // Simple toast implementation
    console.log(`TOAST: ${options.type || "info"} - ${options.message}`)
    
    // You can replace this with your actual toast implementation
    const toastContainer = document.getElementById("toast-container")
    if (toastContainer) {
      const toastEl = document.createElement("div")
      toastEl.className = `fixed top-4 right-4 px-4 py-2 rounded ${
        options.type === "error" ? "bg-red-500" : "bg-green-500"
      } text-white z-50`
      toastEl.textContent = options.message
      toastContainer.appendChild(toastEl)
      setTimeout(() => toastEl.remove(), 3000)
    }
  }

  // Success toast shorthand
  toast.success = function(message) {
    return toast({ type: "success", message })
  }
  // Error toast shorthand
  toast.error = function(message) {
    return toast({ type: "error", message })
  }

  /**
   * Template details component for viewing, editing, and creating templates
   * @param {Object} props - Component props
   * @param {Template} [props.template] - Template data, undefined for create mode
   * @param {Function} props.onBack - Callback when navigating back
   * @param {Function} [props.onTemplateChange] - Callback when template is modified
   */
  function TemplateDetails(props: {
    template?: {
      id: number;
      name: string;
      content: string;
      category?: string;
      variables?: Record<string, string>;
    };
    onBack: () => void;
    onTemplateChange?: () => void;
  }): JSX.Element {
    console.log("TemplateDetails: Rendering with props:", JSON.stringify(props, null, 2));
    const { template, onBack, onTemplateChange } = props
    const { addToast } = useToast()
    const navigate = useNavigate()
    
    const [isEditingName, setIsEditingName] = useState(false)
    const [isEditingContent, setIsEditingContent] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCopying, setIsCopying] = useState(false)
    const [name, setName] = useState(template?.name || "")
    const [content, setContent] = useState(template?.content || "")
    const [category, setCategory] = useState(template?.category || "")

    const isCreate = !template
    const [initialLoad, setInitialLoad] = useState(true)

    console.log("TemplateDetails: Initial state values:", { 
      isCreate, 
      name, 
      hasContent: !!content, 
      contentLength: content?.length,
      category
    });

    // Use the template variables hook for better variable management
    const {
      parseResult,
      values,
      setVariableValue,
      resetValues,
      saveToGlobalVariables,
      globalVariables,
      isLoadingGlobalVariables
    } = useTemplateVariables({
      template: content,
      initialValues: template?.variables,
      useGlobalVariables: true
    })

    // Extract variables from parse result
    const variables = parseResult?.variables || []
    console.log("TemplateDetails: Variables parsed:", { 
      variablesCount: variables.length,
      variableNames: variables.map(v => v.name).join(', ')
    });

    useEffect(() => {
      if (template && initialLoad) {
        console.log("TemplateDetails: Initializing from template:", {
          id: template.id,
          name: template.name,
          contentLength: template.content?.length,
          hasVariables: !!template.variables
        });
        setName(template.name)
        setContent(template.content) 
        setCategory(template.category || "")
        setInitialLoad(false)
      }
    }, [template, initialLoad])

    // Handlers for editing, saving, copying, and deleting templates
    const handleEdit = function(field) {
      if (field === "name") {
        setIsEditingName(true)
      } else {
        setIsEditingContent(true)
      }
    }

    const handleCopy = async function() {
      if (!template) return

      setIsCopying(true)

      try {
        let processedContent = template.content || ""
        
        // Get valid values for variables
        const validValues = Object.entries(values).reduce((acc, [name, state]) => {
          if (state?.isValid) {
            acc[name] = state
          }
          return acc
        }, {})
        
        // Check if we have any file variables that need permission
        if (globalVariables?.some(v => v?.value?.some?.(entry => entry?.type === 'file' || entry?.type === 'directory'))) {
          // Ensure file permissions are granted before proceeding
          const permissionsGranted = await ensureFilePermissions(globalVariables);
          
          if (!permissionsGranted) {
            addToast({
              type: "warning",
              title: "Permission denied",
              message: "Could not access one or more files. Please grant permission when prompted."
            });
          }
        }
        
        // Use our enhanced copy function with file content resolution
        // Note: This internally uses replaceVariables, so we don't need to call it separately
        const copySuccess = await copyWithResolvedFileContents(processedContent, validValues, globalVariables);
        
        if (copySuccess) {
          addToast({
            type: "success",
            title: "Template copied",
            message: "Template copied to clipboard with variables filled in"
          });
        } else {
          throw new Error("Failed to copy with resolved file contents");
        }
      } catch (e) {
        console.error("Error copying template:", e)
        addToast({
          type: "error",
          title: "Failed to copy",
          message: "Could not copy template to clipboard"
        })
      } finally {
        setIsCopying(false)
      }
    }

    // Handle saving a variable to global store
    const handleSaveToGlobal = async (variableNames) => {
      try {
        await saveToGlobalVariables(variableNames)
        addToast({
          type: "success",
          title: "Variables saved",
          message: "Variables were saved to your global store"
        })
      } catch (error) {
        console.error("Error saving variables:", error)
        addToast({
          type: "error",
          title: "Failed to save",
          message: "There was an error saving variables to global store"
        })
      }
    }

    // Template saving and management logic
    const handleSave = async function() {
      try {
        setIsSaving(true)

        // Validate fields
        if (!name) {
          addToast({
            type: "error",
            title: "Missing name",
            message: "Please enter a template name"
          })
          return
        }

        if (!content) {
          addToast({
            type: "error",
            title: "Missing content",
            message: "Please enter template content"
          })
          return
        }

        // Create template object with variables from the hook
        const templateData = {
          name,
          content,
          category,
          variables: Object.entries(values).reduce((acc, [varName, varState]) => {
            if (varState && typeof varState === 'object' && 'value' in varState) {
              acc[varName] = varState.value;
            }
            return acc;
          }, {})
        }

        if (isCreate) {
          // Create new template
          await createTemplate(templateData)
          addToast({
            type: "success",
            title: "Template created",
            message: "Template was created successfully"
          })
        } else if (template) {
          // Update existing template
          await updateTemplate(template.id, templateData)
          addToast({
            type: "success",
            title: "Template updated",
            message: "Template was updated successfully"
          })
        }

        if (onTemplateChange) onTemplateChange()
        onBack()
      } catch (e) {
        console.error("Error saving template:", e)
        addToast({
          type: "error",
          title: "Failed to save",
          message: "There was an error saving the template"
        })
      } finally {
        setIsSaving(false)
      }
    }

    // Delete template logic
    const handleDelete = async function() {
      if (!template) return

      try {
        setIsDeleting(true)
        await deleteTemplate(template.id)
        addToast({
          type: "success",
          title: "Template deleted",
          message: "Template was deleted successfully"
        })
        if (onTemplateChange) onTemplateChange()
        onBack()
      } catch (e) {
        console.error("Error deleting template:", e)
        addToast({
          type: "error",
          title: "Failed to delete",
          message: "There was an error deleting the template"
        })
      } finally {
        setIsDeleting(false)
      }
    }

    // Check if any variable is using a global value
    const hasGlobalValues = Object.entries(values).some(([name]) => {
      return Array.isArray(globalVariables) && globalVariables.some(v => v && typeof v === 'object' && 'name' in v && v.name === name)
    })

    // Check if any variable has been modified
    const hasModifiedValues = Object.values(values).some(state => state && typeof state === 'object' && 'isDirty' in state && state.isDirty)

    return (
      <div className="plasmo-flex plasmo-flex-col plasmo-gap-4 plasmo-p-4">
        {/* Template Name Section */}
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
            <div className="plasmo-flex plasmo-items-center">
              <button
                onClick={onBack}
                className="plasmo-mr-2 plasmo-text-gray-500 hover:plasmo-text-gray-700"
              >
                <svg className="plasmo-h-5 plasmo-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {isEditingName || isCreate ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name"
                  className="plasmo-text-lg plasmo-font-medium plasmo-px-2 plasmo-py-1 plasmo-border plasmo-border-gray-300 plasmo-rounded plasmo-focus:outline-none plasmo-focus:ring-1 plasmo-focus:ring-blue-500 plasmo-focus:border-blue-500"
                />
              ) : (
                <h2 className="plasmo-text-lg plasmo-font-medium">{name}</h2>
              )}
            </div>
            {!isCreate && !isEditingName && (
              <button
                onClick={() => handleEdit("name")}
                className="plasmo-text-gray-500 hover:plasmo-text-gray-700"
              >
                <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Variables Section - Now above the template content */}
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-3">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
            <div className="plasmo-flex plasmo-items-center">
              <label className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">Template Variables</label>
              
              {/* Show count of variables */}
              {variables.length > 0 && (
                <span className="plasmo-ml-2 plasmo-text-xs plasmo-bg-gray-100 plasmo-text-gray-700 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">
                  {variables.length} {variables.length === 1 ? 'variable' : 'variables'}
                </span>
              )}
              
              {/* Show indicator if using global values */}
              {hasGlobalValues && (
                <span className="plasmo-ml-2 plasmo-text-xs plasmo-bg-green-100 plasmo-text-green-700 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full plasmo-flex plasmo-items-center">
                  <span className="plasmo-h-1.5 plasmo-w-1.5 plasmo-rounded-full plasmo-bg-green-500 plasmo-mr-1"></span>
                  Using global values
                </span>
              )}
            </div>

            {/* Variable actions */}
            {variables.length > 0 && (
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                {hasModifiedValues && (
                  <button
                    onClick={() => handleSaveToGlobal(Object.keys(values).filter(name => values[name].isDirty))}
                    className="plasmo-text-xs plasmo-text-green-600 hover:plasmo-text-green-800 plasmo-flex plasmo-items-center"
                  >
                    <svg className="plasmo-h-3.5 plasmo-w-3.5 plasmo-mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save to Global
                  </button>
                )}
                
                <button
                  onClick={() => navigate("/variables")}
                  className="plasmo-text-xs plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-flex plasmo-items-center"
                >
                  <svg className="plasmo-h-3.5 plasmo-w-3.5 plasmo-mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Manage Variables
                  {isLoadingGlobalVariables ? (
                    <svg className="plasmo-animate-spin plasmo-h-3 plasmo-w-3 plasmo-ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="plasmo-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="plasmo-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <span className="plasmo-ml-1 plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded-full plasmo-bg-gray-100 plasmo-text-gray-600 plasmo-text-xs">
                      {globalVariables.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Variable Inputs */}
          {variables.length > 0 ? (
            <div className="plasmo-rounded-lg plasmo-border plasmo-border-gray-200 plasmo-bg-white plasmo-shadow-sm">
              {/* Info about global variables */}
              {globalVariables.length > 0 && (
                <div className="plasmo-p-3 plasmo-bg-gray-50 plasmo-rounded-t-lg plasmo-border-b plasmo-border-gray-200">
                  <div className="plasmo-flex plasmo-items-center plasmo-text-xs plasmo-text-gray-600">
                    <svg className="plasmo-h-4 plasmo-w-4 plasmo-mr-1.5 plasmo-text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Variables with a <span className="plasmo-text-green-600 plasmo-font-medium">green background</span> are using values from your global variables.</span>
                  </div>
                </div>
              )}
              
              <div className="plasmo-p-4 plasmo-space-y-4">
                {variables.map((variable: typeof TemplateVariable, index: number) => {
                  const globalVariable = Array.isArray(globalVariables) && globalVariables.find(g => g && typeof g === 'object' && 'name' in g && g.name === variable.name);
                  const state = values[variable.name] || { value: '', isDirty: false, isValid: true, errors: [] };
                  const isGlobalValue = !!globalVariable;
                  
                  return (
                    <div key={index} className="plasmo-flex plasmo-flex-col plasmo-gap-2">
                      <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
                        <div className="plasmo-flex plasmo-items-center">
                          <label className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                            {variable.name}
                            {variable.isRequired && <span className="plasmo-text-red-500 plasmo-ml-0.5">*</span>}
                          </label>
                          
                          {/* Status badges */}
                          {state.isDirty && (
                            <span className="plasmo-ml-2 plasmo-inline-flex plasmo-items-center plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded-md plasmo-text-xs plasmo-font-medium plasmo-bg-blue-100 plasmo-text-blue-800">
                              Modified
                            </span>
                          )}
                          
                          {isGlobalValue && (
                            <span className="plasmo-ml-2 plasmo-inline-flex plasmo-items-center plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded-md plasmo-text-xs plasmo-font-medium plasmo-bg-green-100 plasmo-text-green-800">
                              Global
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="plasmo-relative plasmo-group">
                        <input
                          type="text"
                          value={state.value}
                          onChange={(e) => setVariableValue(variable.name, e.target.value)}
                          placeholder={variable.defaultValue || ''}
                          className={`
                            plasmo-block plasmo-w-full plasmo-rounded-md plasmo-shadow-sm plasmo-px-3 plasmo-py-2 plasmo-text-sm
                            ${!state.isValid ? 'plasmo-border-red-300 plasmo-bg-red-50' : isGlobalValue ? 'plasmo-border-green-300 plasmo-bg-green-50' : state.isDirty ? 'plasmo-border-blue-300 plasmo-bg-white' : 'plasmo-border-gray-300 plasmo-bg-gray-50'}
                            plasmo-focus:outline-none plasmo-focus:ring-2 ${!state.isValid ? 'plasmo-focus:ring-red-500 plasmo-focus:ring-opacity-30' : 'plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-30'}
                            plasmo-transition-colors plasmo-duration-150
                          `}
                        />
                      </div>
                      
                      {/* Error messages */}
                      {state.errors && state.errors.length > 0 && (
                        <ul className="plasmo-mt-1 plasmo-text-xs plasmo-text-red-600 plasmo-list-disc plasmo-list-inside">
                          {state.errors.map((error: { message: string }, i: number) => (
                            <li key={i}>{error.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="plasmo-text-sm plasmo-text-gray-500 plasmo-italic plasmo-p-4 plasmo-bg-gray-50 plasmo-rounded-lg plasmo-border plasmo-border-gray-200">
              No variables defined in this template
            </div>
          )}
        </div>

        {/* Template Content Section - Now below variables */}
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
            <label className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">Template Content</label>
            {!isCreate && !isEditingContent && (
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                <button
                  onClick={() => handleEdit("content")}
                  className="plasmo-text-gray-500 hover:plasmo-text-gray-700"
                >
                  <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={handleCopy}
                  disabled={isCopying}
                  className={`plasmo-text-gray-500 hover:plasmo-text-gray-700 ${isCopying ? 'plasmo-opacity-50 plasmo-cursor-not-allowed' : ''}`}
                >
                  <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {isEditingContent || isCreate ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter template content"
              className="plasmo-min-h-[200px] plasmo-text-sm plasmo-px-3 plasmo-py-2 plasmo-border plasmo-border-gray-300 plasmo-rounded-lg plasmo-focus:outline-none plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-30 plasmo-focus:border-blue-500 plasmo-bg-white plasmo-shadow-sm plasmo-transition-colors plasmo-duration-150"
            />
          ) : (
            <div className="plasmo-whitespace-pre-wrap plasmo-rounded-lg plasmo-border plasmo-border-gray-200 plasmo-bg-gray-50 plasmo-p-4 plasmo-text-sm plasmo-shadow-sm">
              {content}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="plasmo-flex plasmo-justify-end plasmo-gap-2 plasmo-mt-4">
          {!isCreate && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-text-red-600 hover:plasmo-text-red-700 plasmo-bg-red-50 hover:plasmo-bg-red-100 plasmo-rounded-md plasmo-transition-colors plasmo-duration-150"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-text-white plasmo-bg-blue-600 hover:plasmo-bg-blue-700 plasmo-rounded-md plasmo-transition-colors plasmo-duration-150"
          >
            {isSaving ? 'Saving...' : isCreate ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // Export using CommonJS module syntax
  module.exports = TemplateDetails
  
  // Also export as a named export for ESM compatibility
  module.exports.TemplateDetails = TemplateDetails
} catch (error) {
  console.error("Error in TemplateDetails component initialization:", error);
  
  // Provide a fallback component if the main one fails to load
  function FallbackTemplateDetails(props) {
    return (
      <div className="plasmo-p-4 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md plasmo-text-red-600">
        <h3 className="plasmo-text-sm plasmo-font-medium">Error Loading Template Details</h3>
        <p className="plasmo-mt-2 plasmo-text-sm">
          There was an error loading the template details component. Please try refreshing the page.
        </p>
        {error && <p className="plasmo-mt-1 plasmo-text-xs">{String(error)}</p>}
        <button 
          className="plasmo-mt-3 plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-text-white plasmo-bg-blue-500 plasmo-rounded" 
          onClick={props.onBack}
        >
          Go Back
        </button>
      </div>
    );
  }
  
  module.exports = FallbackTemplateDetails;
  
  // Also export as a named export for ESM compatibility
  module.exports.TemplateDetails = FallbackTemplateDetails;
} 