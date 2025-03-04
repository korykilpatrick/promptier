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
  const { parseTemplate } = _templateParser
  
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
  const { copyWithResolvedFileContents, ensureFilePermissions, activeResolveAllFileContents } = require("../../../utils/file-content-resolver");
  const { replaceVariables } = require("../../../utils/template-parser");

  /**
   * Helper function to conditionally join class names
   * @param {...string} classes - CSS class names to conditionally join
   * @returns {string} Joined class names
   */
  function cn(...classes: string[]) {
    return classes.filter(Boolean).join(" ")
  }

  /**
   * Helper function to show a toast notification
   * @param {Object} options - Toast options
   */
  function toast(options: { type?: string; message: string }) {
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
  toast.success = function(message: string) {
    return toast({ type: "success", message })
  }
  // Error toast shorthand
  toast.error = function(message: string) {
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
    const [isEditingCategory, setIsEditingCategory] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCopying, setIsCopying] = useState(false)
    const [name, setName] = useState(template?.name || "")
    const [content, setContent] = useState(template?.content || "")
    const [category, setCategory] = useState(template?.category || "")
    const [editingVariable, setEditingVariable] = useState<string | null>(null)

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
      setVariableValue: originalSetVariableValue,
      resetValues,
      saveToGlobalVariables,
      globalVariables,
      isLoadingGlobalVariables
    } = useTemplateVariables({
      template: content,
      initialValues: template?.variables,
      useGlobalVariables: true
    })

    // Override setVariableValue with a no-op function
    const setVariableValue = (name: string, value: string) => {
      console.log(`Variables are read-only, cannot set ${name} to ${value}`);
      // No-op - variables are read-only
    };

    // Extract variables from parse result
    const variables = parseResult?.variables || []
    console.log("TemplateDetails: Variables parsed:", { 
      variablesCount: variables.length,
      variableNames: variables.map((v: any) => v.name).join(', ')
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
    const handleEdit = function(field: string) {
      if (field === "name") {
        setIsEditingName(true)
      } else if (field === "category") {
        setIsEditingCategory(true)
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
        const validValues = Object.entries(values).reduce((acc: Record<string, any>, [name, state]: [string, any]) => {
          if (state?.isValid) {
            acc[name] = state
          }
          return acc
        }, {})
        
        // Parse the template to find which variables are actually used
        const parseResult = parseTemplate(template.content);
        const usedVariableNames = new Set(parseResult.variables.map((v: any) => v.name));
        
        console.log(`[TemplateDetails] Template uses these variables:`, Array.from(usedVariableNames));
        
        let fileResolutionAttempted = false;
        let fileResolutionSucceeded = true;
        
        // Check if we have any file variables that need permission
        if (globalVariables?.some((v: any) => v?.value?.some?.((entry: any) => entry?.type === 'file' || entry?.type === 'directory'))) {
          fileResolutionAttempted = true;
          console.log(`[TemplateDetails] Template contains file variables - resolving content`);
          
          // Create a filtered global variables array with only the used file variables
          const usedFileGlobalVariables = globalVariables.filter((v: any) => 
            v && usedVariableNames.has(v.name)
          );
          
          // Ensure file permissions are granted before proceeding
          const permissionsGranted = await ensureFilePermissions(globalVariables);
          
          if (!permissionsGranted) {
            addToast({
              type: "warning",
              title: "Permission denied",
              message: "Could not access one or more files. Please grant permission when prompted."
            });
            fileResolutionSucceeded = false;
          }
          
          // Actively resolve file contents
          try {
            console.log('[TemplateDetails] Starting file content resolution');
            const resolved = await activeResolveAllFileContents(usedFileGlobalVariables, { 
              useCache: true,
              forceReacquire: true,
              autoReacquireHandles: true
            });
            
            if (!resolved) {
              console.warn('[TemplateDetails] Failed to resolve file contents, template may be incomplete');
              fileResolutionSucceeded = false;
            } else {
              console.log('[TemplateDetails] File content resolution completed successfully');
            }
          } catch (err) {
            console.error(`[TemplateDetails] Error resolving file contents:`, err);
            fileResolutionSucceeded = false;
          }
        }
        
        // Use our enhanced copy function with file content resolution
        // Note: This internally uses replaceVariables, so we don't need to call it separately
        const copySuccess = await copyWithResolvedFileContents(processedContent, validValues, globalVariables);
        
        if (copySuccess) {
          if (fileResolutionAttempted && !fileResolutionSucceeded) {
            addToast({
              type: "warning",
              title: "Template copied",
              message: "Template copied but some file variables may not be fully resolved."
            });
          } else {
            addToast({
              type: "success",
              title: "Template copied",
              message: "Template copied to clipboard with variables filled in"
            });
          }
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
    const handleSaveToGlobal = async (variableNames: string[]) => {
      // No-op since variables are read-only
      console.log('Variables are read-only, cannot save to global variables');
      
      // Show a notification to the user
      addToast({
        type: "info",
        title: "Read-only mode",
        message: "Variables are in read-only mode and cannot be saved to global variables."
      });
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
          variables: Object.entries(values).reduce((acc: Record<string, any>, [varName, varState]) => {
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
          // Navigate back after creation only
          if (onTemplateChange) onTemplateChange()
          onBack()
        } else if (template) {
          // Update existing template
          await updateTemplate(template.id, templateData)
          addToast({
            type: "success",
            title: "Template updated",
            message: "Template was updated successfully"
          })
          // Just notify about the change but stay on the page
          if (onTemplateChange) onTemplateChange()
          
          // Exit editing mode
          setIsEditingContent(false)
          setIsEditingName(false)
          setIsEditingCategory(false)
        }
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

    // Cancel editing and reset to original content
    const handleCancelEdit = function() {
      setIsEditingContent(false)
      setIsEditingName(false)
      setIsEditingCategory(false)
      // Reset content and category to original template content
      if (template) {
        setContent(template.content)
        setCategory(template.category || "")
        setName(template.name)
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

    // New function to handle editing a variable
    const handleEditVariable = (variableName: string) => {
      // No longer allowing variables to be edited
      console.log('Variables are read-only');
    }

    // New function to handle closing the variable edit interface
    const handleCloseVariableEdit = () => {
      setEditingVariable(null);
    }

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

        {/* Category Section */}
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
            <div className="plasmo-flex plasmo-items-center">
              <label className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">
                Category <span className="plasmo-text-gray-500 plasmo-text-xs">(optional)</span>
              </label>
            </div>
            {!isCreate && !isEditingCategory && (
              <button
                onClick={() => handleEdit("category")}
                className="plasmo-text-gray-500 hover:plasmo-text-gray-700"
              >
                <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
          {isEditingCategory || isCreate ? (
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Code Generation, Writing, Research"
              className="plasmo-block plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-border plasmo-border-gray-300 plasmo-rounded plasmo-focus:outline-none plasmo-focus:ring-1 plasmo-focus:ring-blue-500 plasmo-focus:border-blue-500"
            />
          ) : (
            <div className="plasmo-block plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-border plasmo-border-gray-200 plasmo-rounded plasmo-bg-gray-50">
              {category || <span className="plasmo-text-gray-400">No category</span>}
            </div>
          )}
        </div>

        {/* Variables Section - Now above the template content */}
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-3">
          {/* Variable Inputs */}
          {variables.length > 0 && (
            <div 
              className="plasmo-mt-4 plasmo-space-y-3"
            >
              <div className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">Variables</div>
              <div className="plasmo-space-y-3">
                {/* Read-only indicator */}
                <div className="plasmo-text-xs plasmo-text-gray-500 plasmo-italic plasmo-flex plasmo-items-center plasmo-gap-1">
                  <svg className="plasmo-h-3 plasmo-w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Read-only mode
                </div>
                {variables.map((variable: any, index: number) => {
                  const globalVariable = Array.isArray(globalVariables) && globalVariables.find(g => g && typeof g === 'object' && 'name' in g && g.name === variable.name);
                  const state = values[variable.name] || { value: '', isDirty: false, isValid: true, errors: [] };
                  const isGlobalValue = !!globalVariable;
                  
                  // Check if this variable is currently being edited
                  const isEditing = false; // Never allow editing
                  
                  return (
                    <div key={index} className="plasmo-flex plasmo-flex-col plasmo-gap-2">
                      <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
                        <div className="plasmo-flex plasmo-items-center">
                          <label className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                            {variable.name}
                          </label>
                        </div>
                        {/* Edit button removed - variables are read-only */}
                      </div>
                      
                      <div className="plasmo-relative plasmo-group">
                        <input
                          type="text"
                          value={state.value}
                          readOnly={true}
                          placeholder={variable.defaultValue || ''}
                          className="plasmo-block plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-border plasmo-border-gray-300 plasmo-rounded plasmo-bg-gray-50 plasmo-cursor-not-allowed"
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
          )}
          {variables.length === 0 && (
            <div className="plasmo-mt-4">
              <div className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">Variables</div>
              {/* Read-only indicator */}
              <div className="plasmo-text-xs plasmo-text-gray-500 plasmo-italic plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-mt-1 plasmo-mb-2">
                <svg className="plasmo-h-3 plasmo-w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read-only mode
              </div>
              <div className="plasmo-mt-2 plasmo-text-sm plasmo-text-gray-500 plasmo-italic">
                No variables
              </div>
            </div>
          )}
        </div>

        {/* Template Content Section - Now below variables */}
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
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
          {isEditingContent && (
            <button
              onClick={handleCancelEdit}
              className="plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-text-gray-600 hover:plasmo-text-gray-700 plasmo-bg-gray-100 hover:plasmo-bg-gray-200 plasmo-rounded-md plasmo-transition-colors plasmo-duration-150"
            >
              Cancel
            </button>
          )}
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
  interface TemplateDetailsProps {
    template?: {
      id: number;
      name: string;
      content: string;
      category?: string;
      variables?: Record<string, string>;
    };
    onBack: () => void;
    onTemplateChange?: (template: any) => void;
  }
  
  function FallbackTemplateDetails(props: TemplateDetailsProps) {
    const errorMessage = error instanceof Error ? error.message : 'Component failed to load';
    
    return (
      <div className="plasmo-p-4 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md plasmo-text-red-600">
        <h3 className="plasmo-text-sm plasmo-font-medium">Error Loading Template Details</h3>
        <p className="plasmo-mt-2 plasmo-text-sm">
          There was an error loading the template details component. Please try refreshing the page.
        </p>
        <p className="plasmo-mt-1 plasmo-text-xs">{errorMessage}</p>
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