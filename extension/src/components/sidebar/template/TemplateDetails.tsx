// Import libraries as CommonJS modules
const reactDom = require("react-router-dom");
const useLocation = reactDom.useLocation;
const useNavigate = reactDom.useNavigate;
const useParams = reactDom.useParams;
const React = require("react");

// Import additional components and hooks
const { TemplateForm } = require("./TemplateForm");
const { useTemplates } = require("../../../hooks/useTemplates");
const { useToast } = require("../../../hooks/useToast");

// Import type interface only
/** @typedef {import("shared/types/templates").Template} Template */

/**
 * Template details component
 * @returns {JSX.Element} Component JSX
 */
function TemplateDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const toast = useToast();
  
  // State for tracking viewing/editing mode
  const [isEditing, setIsEditing] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  
  // Get template operations
  const { createTemplate, updateTemplate } = useTemplates({ toast });
  
  // Safely retrieve template from state, defaulting to undefined if missing
  /** @type {Template|undefined} */
  const template = location.state?.template;
  
  // Check if we're on the new template route or if edit mode is requested
  React.useEffect(() => {
    console.log("Current pathname:", location.pathname);
    console.log("Params:", params);
    
    // Handle create mode: check for /templates/new path or createTemplate state
    if (location.pathname === "/templates/new" || params.id === "new" || location.state?.createTemplate) {
      console.log("Setting create mode to true");
      setIsCreating(true);
    } else {
      setIsCreating(false);
    }
    
    // Handle edit mode via editMode state flag
    if (location.state?.editMode && template) {
      setIsEditing(true);
    } else if (!location.state?.editMode) {
      setIsEditing(false);
    }
  }, [location.state, location.pathname, params, template]);

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

  // Toggle edit mode
  const handleEdit = () => {
    if (!template) return;
    setIsEditing(true);
  };
  
  // Handle canceling edit or create
  const handleCancel = () => {
    if (isCreating) {
      // When canceling creation, go back to main view
      navigate("/");
    } else {
      // When canceling edit, just turn off edit mode
      setIsEditing(false);
    }
  };
  
  // Handle form submission for create or update
  const handleSubmit = async (data) => {
    try {
      if (isCreating) {
        console.log("Creating new template:", data);
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
        console.log("Updating template:", { id: template.id, ...data });
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
        // Update the template in location state to reflect changes
        navigate(`/templates/${template.id}`, { 
          state: { 
            template: { ...template, ...data }
          },
          replace: true
        });
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  };

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
                <span className="plasmo-transform plasmo-transition-transform group-hover:plasmo-translate-x-[-4px]">←</span>
                <span className="plasmo-ml-2">Back to Templates</span>
              </button>
              <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
                Create New Template
              </h2>
            </div>
          </div>
        </div>

        {/* Form in Content Section */}
        <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6">
          <TemplateForm 
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  // Handle missing template (e.g., direct navigation or state loss)
  if (!template) {
    return (
      <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-p-8">
        <p className="plasmo-text-gray-500 plasmo-text-lg plasmo-mb-4">Template not found</p>
        <button
          onClick={() => navigate("/")}
          className="plasmo-group plasmo-flex plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors"
          aria-label="Back to Templates"
        >
          <span className="plasmo-transform plasmo-transition-transform group-hover:plasmo-translate-x-[-4px]">←</span>
          <span className="plasmo-ml-2">Back to Templates</span>
        </button>
      </div>
    );
  }

  // When in edit mode with an existing template, show the form
  if (isEditing) {
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
                <span className="plasmo-transform plasmo-transition-transform group-hover:plasmo-translate-x-[-4px]">←</span>
                <span className="plasmo-ml-2">Back to Templates</span>
              </button>
              <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">
                Edit Template
              </h2>
            </div>
          </div>
        </div>

        {/* Form in Content Section */}
        <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6">
          <TemplateForm 
            template={template}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  // Regular view mode for existing template
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
              <span className="plasmo-transform plasmo-transition-transform group-hover:plasmo-translate-x-[-4px]">←</span>
              <span className="plasmo-ml-2">Back to Templates</span>
            </button>
            <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">{template.name}</h2>
            {template.category && (
              <div className="plasmo-mt-1 plasmo-flex plasmo-items-center">
                <span className="plasmo-inline-flex plasmo-items-center plasmo-px-2.5 plasmo-py-0.5 plasmo-rounded-full plasmo-text-xs plasmo-font-medium plasmo-bg-blue-100 plasmo-text-blue-800">
                  {template.category}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="plasmo-inline-flex plasmo-items-center plasmo-px-3 plasmo-py-2 plasmo-border plasmo-border-gray-300 plasmo-shadow-sm plasmo-text-sm plasmo-font-medium plasmo-rounded-md plasmo-text-gray-700 plasmo-bg-white hover:plasmo-bg-gray-50 plasmo-transition-colors"
            aria-label="Copy template"
          >
            <svg className="plasmo-w-5 plasmo-h-5 plasmo-mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6">
        <div className="plasmo-bg-gray-50 plasmo-rounded-lg plasmo-shadow-inner plasmo-p-6">
          <pre className="plasmo-whitespace-pre-wrap plasmo-text-sm plasmo-font-mono plasmo-text-gray-800 plasmo-leading-relaxed">
            {template.content}
          </pre>
        </div>
      </div>

      {/* Footer Section */}
      <div className="plasmo-bg-white plasmo-border-t plasmo-border-gray-200 plasmo-px-6 plasmo-py-4">
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-text-sm plasmo-text-gray-500">
          <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
          <div className="plasmo-flex plasmo-space-x-4">
            <button 
              className="plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors"
              onClick={handleEdit}
            >
              Edit
            </button>
            <button className="plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors">
              {template.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

module.exports = {
  TemplateDetails
}; 