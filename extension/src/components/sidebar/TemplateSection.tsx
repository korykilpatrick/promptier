import React, { useState } from "react";
import type { Template } from "shared/types/templates";
import { SectionHeader } from "./common/SectionHeader";
import { LoadingSkeleton } from "./common/LoadingSkeleton";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { TemplateList } from "./template/TemplateList";
import { TemplateForm } from "./template/TemplateForm";

interface TemplateSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  templates?: Template[];
  pinnedTemplates?: Template[];
  isLoading?: boolean;
  createTemplate: (data: Omit<Template, "id" | "createdAt" | "isFavorite">) => Promise<Template>;
  onPinTemplate?: (templateId: number) => void;
  onUnfavoriteTemplate?: (templateId: number) => void;
  onSelectTemplate?: (template: Template) => void;
  onEditTemplate?: (template: Template) => void;
  onDeleteTemplate?: (templateId: number) => void;
}

export const TemplateSection: React.FC<TemplateSectionProps> = (props) => (
  <ErrorBoundary>
    <TemplateSectionContent {...props} />
  </ErrorBoundary>
);

const TemplateSectionContent: React.FC<TemplateSectionProps> = ({
  isExpanded,
  onToggle,
  templates = [],
  pinnedTemplates = [],
  isLoading = false,
  createTemplate,
  onPinTemplate,
  onUnfavoriteTemplate,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
}) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateClick = () => {
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
  };

  const handleSubmit = async (data: Omit<Template, "id" | "createdAt" | "isFavorite">) => {
    try {
      await createTemplate(data);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create template:", error);
      // Optionally show error message
    }
  };

  return (
    <section className="plasmo-p-4 plasmo-border-b plasmo-border-gray-200" aria-expanded={isExpanded}>
      <SectionHeader title="Templates" isExpanded={isExpanded} onToggle={onToggle} id="templates-header" />
      {isExpanded && (
        <div className="plasmo-animate-slide-down">
          {isCreating ? (
            <TemplateForm onSubmit={handleSubmit} onCancel={handleCancel} />
          ) : (
            <>
              <div className="plasmo-mb-4">
                <button
                  className="plasmo-btn-primary plasmo-w-full"
                  onClick={handleCreateClick}
                  aria-label="Create new template"
                >
                  Create New Template
                </button>
              </div>
              {/* Template List */}
              {isLoading ? (
                <LoadingSkeleton />
              ) : (
                <div className="plasmo-space-y-2">
                  {templates.length === 0 && pinnedTemplates.length === 0 ? (
                    <div className="plasmo-text-sm plasmo-text-gray-600">No templates yet</div>
                  ) : (
                    <>
                      {pinnedTemplates.length > 0 && (
                        <div className="plasmo-mb-4">
                          <h3 className="plasmo-text-sm plasmo-font-medium plasmo-mb-2">Pinned Templates</h3>
                          <TemplateList
                            templates={pinnedTemplates}
                            onSelectTemplate={onSelectTemplate}
                            onFavoriteTemplate={onPinTemplate}
                            onUnfavoriteTemplate={onUnfavoriteTemplate}
                            onEditTemplate={onEditTemplate}
                            onDeleteTemplate={onDeleteTemplate}
                          />
                        </div>
                      )}
                      {templates.length > 0 && (
                        <div>
                          <h3 className="plasmo-text-sm plasmo-font-medium plasmo-mb-2">All Templates</h3>
                          <TemplateList
                            templates={templates}
                            onSelectTemplate={onSelectTemplate}
                            onFavoriteTemplate={onPinTemplate}
                            onUnfavoriteTemplate={onUnfavoriteTemplate}
                            onEditTemplate={onEditTemplate}
                            onDeleteTemplate={onDeleteTemplate}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};