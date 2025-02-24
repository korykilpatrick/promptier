import React, { useState } from "react";
import type { Template } from "shared/types/templates";
import { SectionHeader } from "./common/SectionHeader";
import { LoadingSkeleton } from "./common/LoadingSkeleton";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { TemplateList } from "./template/TemplateList";

interface TemplateSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  templates?: Template[];
  favoriteTemplates?: Template[];
  isLoading?: boolean;
  onCreateTemplate?: () => void;
  onFavoriteTemplate?: (templateId: number) => void;
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
  favoriteTemplates = [],
  isLoading = false,
  onCreateTemplate,
  onFavoriteTemplate,
  onUnfavoriteTemplate,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
}) => {
  const [isCreating, setIsCreating] = useState(false);

  // Debug logging
  console.log('TemplateSection render:', {
    isExpanded,
    templatesLength: templates?.length,
    favoriteTemplatesLength: favoriteTemplates?.length,
    isLoading
  });

  return (
    <section className="plasmo-border-b plasmo-border-gray-200" aria-expanded={isExpanded}>
      <SectionHeader title="Templates" isExpanded={isExpanded} onToggle={onToggle} id="templates-header" />
      {isExpanded && (
        <div className="plasmo-animate-slide-down">
          {/* Template Creation Button */}
          <div className="plasmo-px-4 plasmo-py-3 plasmo-bg-gray-50">
            <button 
              className="plasmo-w-full plasmo-bg-blue-600 plasmo-text-white plasmo-px-4 plasmo-py-2 plasmo-rounded-md hover:plasmo-bg-blue-700 plasmo-transition-colors plasmo-shadow-sm plasmo-text-sm plasmo-font-medium focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500 focus:plasmo-ring-offset-2" 
              onClick={() => onCreateTemplate?.()}
              aria-label="Create new template"
            >
              Create New Template
            </button>
          </div>

          {/* Template Lists */}
          <div className="plasmo-px-2 plasmo-py-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="plasmo-space-y-4">
                {templates.length === 0 && favoriteTemplates.length === 0 ? (
                  <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-py-8 plasmo-px-4 plasmo-text-center">
                    <p className="plasmo-text-gray-500 plasmo-text-sm">No templates yet</p>
                    <p className="plasmo-text-gray-400 plasmo-text-xs plasmo-mt-1">Create your first template to get started</p>
                  </div>
                ) : (
                  <>
                    {favoriteTemplates.length > 0 && (
                      <div className="plasmo-mb-6">
                        <h3 className="plasmo-px-3 plasmo-mb-2 plasmo-text-xs plasmo-font-medium plasmo-text-gray-500 plasmo-uppercase plasmo-tracking-wider">
                          Favorite Templates
                        </h3>
                        <div className="plasmo-bg-white plasmo-rounded-lg plasmo-shadow-sm">
                          <TemplateList
                            templates={favoriteTemplates}
                            onSelectTemplate={onSelectTemplate}
                            onFavoriteTemplate={onFavoriteTemplate}
                            onUnfavoriteTemplate={onUnfavoriteTemplate}
                            onEditTemplate={onEditTemplate}
                            onDeleteTemplate={onDeleteTemplate}
                            isCreating={isCreating}
                            onCreateTemplate={onCreateTemplate}
                          />
                        </div>
                      </div>
                    )}
                    {templates.length > 0 && (
                      <div>
                        <div className="plasmo-bg-white plasmo-rounded-lg plasmo-shadow-sm">
                          <TemplateList
                            templates={templates}
                            onSelectTemplate={onSelectTemplate}
                            onFavoriteTemplate={onFavoriteTemplate}
                            onUnfavoriteTemplate={onUnfavoriteTemplate}
                            onEditTemplate={onEditTemplate}
                            onDeleteTemplate={onDeleteTemplate}
                            isCreating={isCreating}
                            onCreateTemplate={onCreateTemplate}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};