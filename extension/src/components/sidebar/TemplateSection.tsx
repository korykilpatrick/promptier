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
    React.createElement("section", {
      className: "plasmo-compact-section plasmo-animate-fade-in",
      "aria-expanded": expanded
    },
      expanded && (
        React.createElement("div", { className: "plasmo-px-3 plasmo-py-2" },
          isCreating || isEditing ? (
            React.createElement(TemplateForm, { 
              template: isEditing ? editingTemplate : undefined, 
              onSubmit: isEditing ? handleUpdate : handleSubmit, 
              onCancel: handleCancel 
            })
          ) : (
            React.createElement("div", { className: "plasmo-space-y-3" },
              React.createElement("div", { className: "plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-2" },
                React.createElement("h2", { className: "plasmo-text-base plasmo-font-medium plasmo-text-gray-900" }, "Your Templates"),
                React.createElement("button", {
                  className: "plasmo-btn-primary plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-xs",
                  onClick: handleCreateClick,
                  "aria-label": "Create new template"
                },
                  React.createElement("svg", {
                    className: "plasmo-w-3.5 plasmo-h-3.5",
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
                  "New"
                )
              ),
              
              // Template List
              isLoading ? (
                React.createElement(LoadingSkeleton, { count: 3, variant: "card", size: "large" })
              ) : (
                React.createElement("div", { className: "plasmo-mt-2" },
                  unifiedTemplates.length === 0 && unifiedFavoriteTemplates.length === 0 ? (
                    React.createElement("div", { className: "plasmo-empty-state" },
                      React.createElement("div", { className: "plasmo-text-gray-400 plasmo-mb-2" },
                        React.createElement("svg", { className: "plasmo-w-10 plasmo-h-10 plasmo-mx-auto", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                          React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" })
                        )
                      ),
                      React.createElement("h3", { className: "plasmo-text-base plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2" }, "No templates yet"),
                      React.createElement("p", { className: "plasmo-text-sm plasmo-text-gray-500 plasmo-mb-3" },
                        "Create your first template to get started with reusable prompts."
                      ),
                      React.createElement("button", {
                        className: "plasmo-btn-primary",
                        onClick: handleCreateClick
                      },
                        "Create Your First Template"
                      )
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