const React = require("react");
const { useState, useEffect } = React;
const reactRouterDom = require("react-router-dom");
const { useNavigate } = reactRouterDom;

/** @typedef {import("shared/types/templates").Template} Template */

const { LoadingSkeleton } = require("./common/LoadingSkeleton");
const { ErrorBoundary } = require("../common/ErrorBoundary");
const { TemplateList } = require("./template/TemplateList");
const { TemplateForm } = require("./template/TemplateForm");

/**
 * @typedef {Object} TemplateSectionProps
 * @property {boolean} expanded - Whether the section is expanded
 * @property {Function} onToggle - Function to toggle section expansion
 * @property {Function} [onFocus] - Function to focus the section
 * @property {boolean} [isFocused] - Whether the section is focused
 * @property {Template[]} [templates] - List of templates
 * @property {Template[]} [favoriteTemplates] - List of favorite templates
 * @property {boolean} [isLoading] - Whether templates are loading
 * @property {Function} [onPinTemplate] - Function to pin a template
 * @property {Function} [onUnpinTemplate] - Function to unpin a template
 * @property {Function} [onSelectTemplate] - Function to select a template
 * @property {Function} [onEditTemplate] - Function to edit a template
 * @property {Function} [onDeleteTemplate] - Function to delete a template
 * @property {Template|null} [editingTemplate] - Template being edited
 * @property {Function} [onUpdateTemplate] - Function to update a template
 */

/**
 * Template section component with error boundary
 * @param {TemplateSectionProps} props - Component props
 * @returns {JSX.Element} Component JSX
 */
function TemplateSection(props) {
  return (
    React.createElement(ErrorBoundary, null,
      React.createElement(TemplateSectionContent, props)
    )
  );
}

/**
 * Template section content component
 * @param {TemplateSectionProps} props - Component props
 * @returns {JSX.Element} Component JSX
 */
function TemplateSectionContent({
  expanded,
  onToggle,
  onFocus,
  isFocused,
  templates = [],
  favoriteTemplates = [],
  isLoading = false,
  onPinTemplate,
  onUnpinTemplate,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
  editingTemplate,
  onUpdateTemplate,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  
  // Watch for editingTemplate changes
  useEffect(() => {
    if (editingTemplate) {
      setIsEditing(true);
    }
  }, [editingTemplate]);

  const handleCreateClick = () => {
    // Navigate to the template details view in create mode
    navigate("/templates/new", { 
      state: { 
        createTemplate: true
      } 
    });
  };

  const handleCancel = () => {
    // This is no longer needed but kept for compatibility
  };

  const handleSubmit = async (data) => {
    // This is no longer needed but kept for compatibility
  };
  
  const handleUpdate = async (data) => {
    // This is no longer needed but kept for compatibility
  };

  // Prepare a unified template list with favorited templates at the top
  const unifiedTemplates = [...templates];
  const unifiedFavoriteTemplates = [...favoriteTemplates];

  return (
    React.createElement("section", { className: "plasmo-mb-4", "aria-expanded": expanded },
      expanded && (
        React.createElement("div", { className: "plasmo-p-0" },
          isCreating || isEditing ? (
            React.createElement(TemplateForm, { 
              template: isEditing ? editingTemplate : undefined, 
              onSubmit: isEditing ? handleUpdate : handleSubmit, 
              onCancel: handleCancel 
            })
          ) : (
            React.createElement("div", { className: "plasmo-space-y-4" },
              React.createElement("button", {
                className: "plasmo-flex plasmo-items-center plasmo-justify-center plasmo-px-4 plasmo-py-2 plasmo-w-full plasmo-rounded-md plasmo-text-subheading plasmo-font-medium plasmo-text-white plasmo-bg-blue-500 hover:plasmo-bg-blue-600 plasmo-transition-colors plasmo-shadow-sm",
                onClick: handleCreateClick,
                "aria-label": "Create new template"
              }, 
                React.createElement("svg", { 
                  className: "plasmo-w-4 plasmo-h-4 plasmo-mr-2",
                  fill: "none", 
                  stroke: "currentColor", 
                  viewBox: "0 0 24 24"
                },
                  React.createElement("path", { 
                    strokeLinecap: "round", 
                    strokeLinejoin: "round", 
                    strokeWidth: "2", 
                    d: "M12 6v6m0 0v6m0-6h6m-6 0H6" 
                  })
                ),
                "Create New Template"
              ),
              
              // Template List
              isLoading ? (
                React.createElement(LoadingSkeleton)
              ) : (
                React.createElement("div", { className: "plasmo-mt-4" },
                  unifiedTemplates.length === 0 && unifiedFavoriteTemplates.length === 0 ? (
                    React.createElement("div", { className: "plasmo-text-sm plasmo-text-gray-600 plasmo-p-4 plasmo-bg-gray-50 plasmo-rounded-lg plasmo-text-center" }, 
                      "No templates yet. Create your first template to get started."
                    )
                  ) : (
                    React.createElement(TemplateList, {
                      templates: unifiedTemplates,
                      favoriteTemplates: unifiedFavoriteTemplates,
                      onSelectTemplate: onSelectTemplate,
                      onFavoriteTemplate: onPinTemplate,
                      onUnfavoriteTemplate: onUnpinTemplate,
                      onEditTemplate: onEditTemplate,
                      onDeleteTemplate: onDeleteTemplate
                    })
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}

module.exports = {
  TemplateSection
};