// Use a different pattern that avoids redeclaration errors
// Start with a try/catch to provide better error reporting
try {
  /** @typedef {import("../../../../shared/types/templates").Template} Template */

  // Assign imports to unique variable names to avoid redeclaration
  const _reactRouterDom = require("react-router-dom");
  const _useLocation = _reactRouterDom.useLocation;
  const _useNavigate = _reactRouterDom.useNavigate;
  const _useParams = _reactRouterDom.useParams;
  const _React = require("react");
  const _useState = _React.useState;
  const _useEffect = _React.useEffect;

  // Import with unique names
  const _TemplateForm = require("./TemplateForm").TemplateForm;
  const _useTemplates = require("../../../hooks/useTemplates").useTemplates;
  const _useToast = require("../../../hooks/useToast").useToast;

  /**
   * Template details component for creating, editing, and viewing templates
   * @returns {JSX.Element} Component JSX
   */
  function TemplateDetails() {
    console.log("TemplateDetails function invoked");
    
    try {
      const location = _useLocation();
      const navigate = _useNavigate();
      const params = _useParams();
      const toast = _useToast();
      
      // State for tracking viewing/editing mode
      const [isEditing, setIsEditing] = _useState(false);
      const [isCreating, setIsCreating] = _useState(false);
      
      // Get template operations
      const { getTemplate, createTemplate, updateTemplate } = _useTemplates({ toast });
      
      // Safely retrieve template from state, defaulting to undefined if missing
      /** @type {Template|undefined} */
      const [template, setTemplate] = _useState(location.state?.template);
      
      // Log state for debugging
      console.log("TemplateDetails initial state:", { 
        locationPathname: location.pathname,
        locationState: location.state,
        params,
        template,
        isEditing,
        isCreating
      });
      
      // Load template from params if not in state
      _useEffect(() => {
        const loadTemplate = async () => {
          // Skip if we're in create mode
          if (location.pathname === "/templates/new" || params.id === "new") {
            return;
          }
          
          // Skip if we already have the template
          if (template) {
            return;
          }
          
          // If we have an ID but no template, try to load it
          if (params.id && params.id !== "new") {
            try {
              console.log("Loading template by ID:", params.id);
              const loadedTemplate = await getTemplate(params.id);
              if (loadedTemplate) {
                console.log("Template loaded:", loadedTemplate);
                setTemplate(loadedTemplate);
              }
            } catch (err) {
              console.error("Error loading template:", err);
              toast.error("Failed to load template");
            }
          }
        };
        
        loadTemplate();
      }, [params.id, template, getTemplate, location.pathname, toast]);
      
      // Check if we're on the new template route or if edit mode is requested
      _useEffect(() => {
        // Handle create mode: check for /templates/new path or createTemplate state
        if (location.pathname === "/templates/new" || params.id === "new" || location.state?.createTemplate) {
          console.log("Setting create mode to true");
          setIsCreating(true);
          setIsEditing(false);
        } else {
          setIsCreating(false);
        }
        
        // Handle edit mode via editMode state flag
        if (location.state?.editMode && template) {
          console.log("Setting edit mode to true");
          setIsEditing(true);
        } else if (!location.state?.editMode) {
          setIsEditing(false);
        }
      }, [location.state, location.pathname, params, template]);

      /**
       * Copy template content to clipboard
       */
      const handleCopy = async () => {
        if (!template) return;
        try {
          await navigator.clipboard.writeText(template.content);
          toast.success("Template copied to clipboard");
        } catch (error) {
          console.error("Failed to copy template:", error);
          toast.error("Failed to copy template");
        }
      };

      /**
       * Toggle edit mode
       */
      const handleEdit = () => {
        if (!template) return;
        setIsEditing(true);
      };
      
      /**
       * Handle canceling edit or create
       */
      const handleCancel = () => {
        if (isCreating) {
          // When canceling creation, go back to main view
          navigate("/");
        } else {
          // When canceling edit, just turn off edit mode
          setIsEditing(false);
        }
      };
      
      /**
       * Handle form submission for create or update
       * @param {any} data - Form data to submit
       */
      const handleSubmit = async (data) => {
        try {
          if (isCreating) {
            console.log("Creating template with data:", data);
            // Use the createTemplate function from useTemplates
            await createTemplate({
              name: data.name,
              category: data.category,
              content: data.content,
              isFavorite: data.isFavorite,
              variables: data.variables
            });
            toast.success("Template created successfully");
            // After creating, we should navigate to the main view
            navigate("/");
          } else if (isEditing && template) {
            console.log("Updating template with data:", data);
            // Use the updateTemplate function from useTemplates
            await updateTemplate({
              id: template.id,
              name: data.name,
              category: data.category,
              content: data.content,
              isFavorite: data.isFavorite,
              variables: data.variables
            });
            toast.success("Template updated successfully");
            // After updating, turn off edit mode but stay on details page
            setIsEditing(false);
            // Update the local template state
            setTemplate({
              ...template,
              ...data
            });
          }
        } catch (error) {
          console.error("Failed to save template:", error);
          toast.error("Failed to save template");
        }
      };

      // Output for debugging
      console.log("TemplateDetails rendering:", { 
        isCreating, 
        isEditing, 
        hasTemplate: !!template,
        pathname: location.pathname,
        params,
        template
      });

      // When in create mode, show the form even without a template
      if (isCreating) {
        console.log("Rendering create template form");
        return (
          <div className="plasmo-flex plasmo-flex-col plasmo-h-full">
            {/* Header Section */}
            <div className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-px-6 plasmo-py-4 plasmo-shadow-sm">
              <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                <div>
                  <button
                    onClick={() => navigate("/")}
                    className="plasmo-group plasmo-flex plasmo-items-center plasmo-text-sm plasmo-text-gray-600 hover:plasmo-text-gray-900 plasmo-mb-3 plasmo-transition-colors"
                    aria-label="Back to Templates"
                  >
                    <span className="plasmo-transform plasmo-transition-transform plasmo-group-hover:plasmo-translate-x-[-4px]">←</span>
                    <span className="plasmo-ml-2">Back to Templates</span>
                  </button>
                  <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
                    Create New Template
                  </h2>
                  <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mt-1">
                    Create a new prompt template with variables to use in your prompts
                  </p>
                </div>
              </div>
            </div>

            {/* Form in Content Section */}
            <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6 plasmo-bg-gray-50">
              <_TemplateForm 
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          </div>
        );
      }

      // Handle missing template (e.g., direct navigation or state loss)
      if (!template && !isCreating) {
        console.log("Template not found, showing error page");
        return (
          <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-p-8 plasmo-bg-gray-50">
            <div className="plasmo-bg-white plasmo-rounded-lg plasmo-shadow-sm plasmo-border plasmo-border-gray-200 plasmo-p-8 plasmo-max-w-md plasmo-w-full plasmo-text-center">
              <svg 
                className="plasmo-w-12 plasmo-h-12 plasmo-mx-auto plasmo-text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mt-4">Template not found</h3>
              <p className="plasmo-text-gray-500 plasmo-mt-2 plasmo-mb-6">The template you're looking for doesn't exist or couldn't be loaded.</p>
              <button
                onClick={() => navigate("/")}
                className="plasmo-group plasmo-inline-flex plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors plasmo-border plasmo-border-blue-100 plasmo-rounded-md plasmo-bg-blue-50"
                aria-label="Back to Templates"
              >
                <span className="plasmo-transform plasmo-transition-transform plasmo-group-hover:plasmo-translate-x-[-4px]">←</span>
                <span className="plasmo-ml-2">Back to Templates</span>
              </button>
            </div>
          </div>
        );
      }

      // When in edit mode with an existing template, show the form
      if (isEditing && template) {
        console.log("Rendering edit template form");
        return (
          <div className="plasmo-flex plasmo-flex-col plasmo-h-full">
            {/* Header Section */}
            <div className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-px-6 plasmo-py-4 plasmo-shadow-sm">
              <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                <div>
                  <button
                    onClick={() => navigate("/")}
                    className="plasmo-group plasmo-flex plasmo-items-center plasmo-text-sm plasmo-text-gray-600 hover:plasmo-text-gray-900 plasmo-mb-3 plasmo-transition-colors"
                    aria-label="Back to Templates"
                  >
                    <span className="plasmo-transform plasmo-transition-transform plasmo-group-hover:plasmo-translate-x-[-4px]">←</span>
                    <span className="plasmo-ml-2">Back to Templates</span>
                  </button>
                  <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
                    Edit Template
                  </h2>
                  <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mt-1">
                    Update your template content and variables
                  </p>
                </div>
              </div>
            </div>

            {/* Form in Content Section */}
            <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6 plasmo-bg-gray-50">
              <_TemplateForm 
                template={template}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          </div>
        );
      }

      // Regular view mode for existing template
      if (template) {
        console.log("Rendering template view");
        return (
          <div className="plasmo-flex plasmo-flex-col plasmo-h-full">
            {/* Header Section */}
            <div className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-px-6 plasmo-py-4 plasmo-shadow-sm">
              <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                <div>
                  <button
                    onClick={() => navigate("/")}
                    className="plasmo-group plasmo-flex plasmo-items-center plasmo-text-sm plasmo-text-gray-600 hover:plasmo-text-gray-900 plasmo-mb-3 plasmo-transition-colors"
                    aria-label="Back to Templates"
                  >
                    <span className="plasmo-transform plasmo-transition-transform plasmo-group-hover:plasmo-translate-x-[-4px]">←</span>
                    <span className="plasmo-ml-2">Back to Templates</span>
                  </button>
                  <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
                    {template.name}
                  </h2>
                  {template.category && (
                    <div className="plasmo-mt-1 plasmo-flex plasmo-items-center">
                      <span className="plasmo-inline-flex plasmo-items-center plasmo-px-2.5 plasmo-py-0.5 plasmo-rounded-md plasmo-text-xs plasmo-font-medium plasmo-bg-blue-100 plasmo-text-blue-800">
                        {template.category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="plasmo-flex plasmo-space-x-2">
                  <button
                    onClick={handleEdit}
                    className="plasmo-inline-flex plasmo-items-center plasmo-px-3 plasmo-py-2 plasmo-border plasmo-border-gray-300 plasmo-shadow-sm plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-text-gray-700 plasmo-bg-white hover:plasmo-bg-gray-50 plasmo-transition-colors"
                    aria-label="Edit template"
                  >
                    <svg className="plasmo-w-4 plasmo-h-4 plasmo-mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={handleCopy}
                    className="plasmo-inline-flex plasmo-items-center plasmo-px-3 plasmo-py-2 plasmo-border plasmo-border-gray-300 plasmo-shadow-sm plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-text-gray-700 plasmo-bg-white hover:plasmo-bg-gray-50 plasmo-transition-colors"
                    aria-label="Copy template"
                  >
                    <svg className="plasmo-w-4 plasmo-h-4 plasmo-mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6 plasmo-bg-gray-50">
              <div className="plasmo-max-w-3xl plasmo-mx-auto">
                {/* Template Content Card */}
                <div className="plasmo-bg-white plasmo-rounded-lg plasmo-shadow-sm plasmo-border plasmo-border-gray-200 plasmo-p-6 plasmo-mb-6">
                  <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mb-3">Template Content</h3>
                  <div className="plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-p-4 plasmo-font-mono plasmo-text-sm plasmo-whitespace-pre-wrap plasmo-break-words">
                    {template.content}
                  </div>
                </div>

                {/* Variables Section - if any variables detected */}
                {template.variables && Object.keys(template.variables).length > 0 && (
                  <div className="plasmo-bg-white plasmo-rounded-lg plasmo-shadow-sm plasmo-border plasmo-border-gray-200 plasmo-p-6">
                    <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mb-3">Template Variables</h3>
                    <div className="plasmo-space-y-4">
                      {Object.entries(template.variables).map(([name, valueObj]) => {
                        // Ensure value is an object with expected properties
                        const varValue = typeof valueObj === 'object' && valueObj !== null 
                          ? valueObj 
                          : { value: String(valueObj || ''), description: '' };
                        
                        return (
                          <div key={name} className="plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-p-4">
                            <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                              <div className="plasmo-flex plasmo-items-center">
                                <span className="plasmo-font-medium plasmo-text-gray-700">{name}</span>
                                {!varValue.value || varValue.value === '' ? (
                                  <span className="plasmo-ml-2 plasmo-text-xs plasmo-bg-red-100 plasmo-text-red-800 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-md">Required</span>
                                ) : (
                                  <span className="plasmo-ml-2 plasmo-text-xs plasmo-bg-blue-100 plasmo-text-blue-800 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-md">Has Default</span>
                                )}
                              </div>
                              {varValue.description && (
                                <span className="plasmo-text-xs plasmo-text-gray-500">{varValue.description}</span>
                              )}
                            </div>
                            {varValue.value && varValue.value !== '' && (
                              <div className="plasmo-mt-2 plasmo-text-sm plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded plasmo-px-3 plasmo-py-1.5 plasmo-font-mono">
                                {varValue.value}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Fallback if none of the above conditions are met
      console.log("Rendering fallback view");
      return (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-p-8 plasmo-bg-gray-50">
          <p className="plasmo-text-gray-500 plasmo-text-lg">Loading template...</p>
        </div>
      );
    } catch (error) {
      console.error("Error in TemplateDetails render:", error);
      return (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-p-8 plasmo-bg-gray-50">
          <div className="plasmo-bg-white plasmo-rounded-lg plasmo-shadow-sm plasmo-border plasmo-border-red-200 plasmo-p-8 plasmo-max-w-md plasmo-w-full plasmo-text-center plasmo-bg-red-50">
            <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-red-800 plasmo-mt-4">Error Rendering Template</h3>
            <p className="plasmo-text-red-600 plasmo-mt-2 plasmo-mb-2">There was an error rendering the template view.</p>
            <pre className="plasmo-text-xs plasmo-text-red-700 plasmo-bg-white plasmo-p-2 plasmo-rounded plasmo-overflow-auto plasmo-max-h-32 plasmo-text-left">
              {error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => _useNavigate()("/")}
              className="plasmo-mt-6 plasmo-inline-flex plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-red-600 hover:plasmo-text-red-800 plasmo-transition-colors plasmo-border plasmo-border-red-100 plasmo-rounded-md"
              aria-label="Back to Templates"
            >
              <span className="plasmo-transform plasmo-transition-transform plasmo-group-hover:plasmo-translate-x-[-4px]">←</span>
              <span className="plasmo-ml-2">Back to Templates</span>
            </button>
          </div>
        </div>
      );
    }
  }

  // New export pattern to avoid conflicts
  module.exports = { TemplateDetails };
} catch (error) {
  console.error("Error in TemplateDetails module:", error);
  
  // Provide a fallback component that shows the error
  function FallbackTemplateDetails() {
    return (
      <div className="plasmo-p-8 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md">
        <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-red-800">Error Loading Template Component</h2>
        <p className="plasmo-text-red-600 plasmo-mt-2">{error?.message || 'Unknown error'}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="plasmo-mt-4 plasmo-px-4 plasmo-py-2 plasmo-bg-red-100 plasmo-text-red-800 plasmo-rounded-md plasmo-border plasmo-border-red-200"
        >
          Return to Home
        </button>
      </div>
    );
  }
  
  module.exports = { TemplateDetails: FallbackTemplateDetails };
} 