const React = require("react");
const { useState, useEffect } = React;

/** @typedef {import("shared/types/templates").Template} Template */

const { SectionHeader } = require("./common/SectionHeader");
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
  
  // Watch for editingTemplate changes
  useEffect(() => {
    if (editingTemplate) {
      setIsEditing(true);
    }
  }, [editingTemplate]);

  const handleCreateClick = () => {
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleSubmit = async (data) => {
    try {
      console.log("Creating new template:", data);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create template:", error);
      // Optionally show error message
    }
  };
  
  const handleUpdate = async (data) => {
    if (!editingTemplate || !onUpdateTemplate) return;
    
    try {
      await onUpdateTemplate({
        id: editingTemplate.id,
        ...data
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update template:", error);
      // Optionally show error message
    }
  };

  return (
    React.createElement("section", { className: "plasmo-p-4 plasmo-border-b plasmo-border-gray-200", "aria-expanded": expanded },
      React.createElement(SectionHeader, { title: "Templates", isExpanded: expanded, onToggle: onToggle, id: "templates-header" }),
      expanded && (
        React.createElement("div", { className: "plasmo-animate-slide-down" },
          isCreating ? (
            React.createElement(TemplateForm, { onSubmit: handleSubmit, onCancel: handleCancel })
          ) : isEditing && editingTemplate ? (
            React.createElement(TemplateForm, { 
              template: editingTemplate, 
              onSubmit: handleUpdate, 
              onCancel: handleCancel })
          ) : (
            React.createElement("div", { className: "plasmo-mb-4" },
              React.createElement("button", {
                className: "plasmo-btn-primary plasmo-w-full",
                onClick: handleCreateClick,
                "aria-label": "Create new template"
              }, "Create New Template"),
              // Template List
              isLoading ? (
                React.createElement(LoadingSkeleton)
              ) : (
                React.createElement("div", { className: "plasmo-space-y-2" },
                  templates.length === 0 && favoriteTemplates.length === 0 ? (
                    React.createElement("div", { className: "plasmo-text-sm plasmo-text-gray-600" }, "No templates yet")
                  ) : (
                    React.createElement("div", null,
                      favoriteTemplates.length > 0 && (
                        React.createElement("div", { className: "plasmo-mb-4" },
                          React.createElement("h3", { className: "plasmo-text-sm plasmo-font-medium plasmo-mb-2" }, "Pinned Templates"),
                          React.createElement(TemplateList, {
                            templates: favoriteTemplates,
                            onSelectTemplate: onSelectTemplate,
                            onFavoriteTemplate: onPinTemplate,
                            onUnfavoriteTemplate: onUnpinTemplate,
                            onEditTemplate: onEditTemplate,
                            onDeleteTemplate: onDeleteTemplate
                          })
                        )
                      ),
                      templates.length > 0 && (
                        React.createElement("div", null,
                          React.createElement("h3", { className: "plasmo-text-sm plasmo-font-medium plasmo-mb-2" }, "All Templates"),
                          React.createElement(TemplateList, {
                            templates: templates,
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
        )
      )
    )
  );
}

module.exports = {
  TemplateSection
};