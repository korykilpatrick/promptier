import React, { useState, useEffect } from "react";
import type { Template } from "../../types/sidebar";
import { SectionHeader } from "./common/SectionHeader";
import { LoadingSkeleton } from "./common/LoadingSkeleton";
import { ErrorState } from "../common/ErrorState";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { TemplateForm } from "./template/TemplateForm";
import { TemplateList } from "./template/TemplateList";
import { useTemplates } from "../../hooks/useTemplates";

interface TemplateSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  templates?: Template[];
  pinnedTemplates?: Template[];
  isLoading?: boolean;
  onCreateTemplate?: () => void;
  onPinTemplate?: (templateId: string) => void;
  onUnpinTemplate?: (templateId: string) => void;
  onSelectTemplate?: (template: Template) => void;
}

export const TemplateSection: React.FC<TemplateSectionProps> = (props) => (
  <ErrorBoundary>
    <TemplateSectionContent {...props} />
  </ErrorBoundary>
);

const TemplateSectionContent: React.FC<TemplateSectionProps> = ({
  isExpanded,
  onToggle,
  templates: externalTemplates,
  pinnedTemplates: externalPinnedTemplates,
  isLoading: externalIsLoading,
  onCreateTemplate: externalOnCreateTemplate,
  onPinTemplate: externalOnPinTemplate,
  onUnpinTemplate: externalOnUnpinTemplate,
  onSelectTemplate: externalOnSelectTemplate,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const { templates: internalTemplates, pinnedTemplates: internalPinnedTemplates, operationStates, createTemplate, updateTemplate, deleteTemplate, pinTemplate, unpinTemplate } = useTemplates({ maxRetries: 3, debounceDelay: 300 });

  const templates = externalTemplates ?? internalTemplates;
  const pinnedTemplates = externalPinnedTemplates ?? internalPinnedTemplates;
  const isLoading = externalIsLoading ?? operationStates["fetch"]?.isLoading;

  // Debug logging
  console.log('TemplateSection render:', {
    isExpanded,
    isLoading,
    templatesLength: templates?.length,
    pinnedTemplatesLength: pinnedTemplates?.length,
    isCreating,
    hasEditingTemplate: !!editingTemplate,
    operationStates
  });

  const handleCreateTemplate = async (data: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (externalOnCreateTemplate) {
        externalOnCreateTemplate();
      } else {
        await createTemplate(data);
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const handleUpdateTemplate = async (data: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
    if (!editingTemplate) return;
    try {
      await updateTemplate({ id: editingTemplate.id, ...data });
      setEditingTemplate(null);
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteTemplate(templateId);
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handlePinTemplate = async (templateId: string) => {
    try {
      if (externalOnPinTemplate) {
        externalOnPinTemplate(templateId);
      } else {
        await pinTemplate(templateId);
      }
    } catch (error) {
      console.error("Failed to pin template:", error);
    }
  };

  const handleUnpinTemplate = async (templateId: string) => {
    try {
      if (externalOnUnpinTemplate) {
        externalOnUnpinTemplate(templateId);
      } else {
        await unpinTemplate(templateId);
      }
    } catch (error) {
      console.error("Failed to unpin template:", error);
    }
  };

  return (
    <section className="plasmo-border-b plasmo-border-gray-200">
      <SectionHeader title="Templates" isExpanded={isExpanded} onToggle={onToggle} id="templates-header" />
      <div className={`plasmo-px-6 ${isExpanded ? "" : "plasmo-hidden"}`}>
        {isLoading ? (
          <LoadingSkeleton variant="card" count={2} size="large" />
        ) : operationStates["fetch"]?.error && !externalTemplates ? (
          <ErrorState
            title="Failed to load templates"
            message="There was an error loading your templates. Please try again."
            onRetry={() => Promise.resolve()}
          />
        ) : (templates.length === 0 && pinnedTemplates.length === 0 && !isCreating && !editingTemplate) ? (
          <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-italic plasmo-py-4">No templates yet</p>
        ) : (
          <>
            {(isCreating || editingTemplate) && (
              <div className="plasmo-mb-6">
                <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900 plasmo-mb-3">
                  {isCreating ? "Create New Template" : "Edit Template"}
                </h3>
                <TemplateForm
                  template={editingTemplate ?? undefined}
                  onSubmit={isCreating ? handleCreateTemplate : handleUpdateTemplate}
                  onCancel={() => {
                    setIsCreating(false);
                    setEditingTemplate(null);
                  }}
                />
              </div>
            )}
            {!isCreating && !editingTemplate && (
              <button
                className="plasmo-btn-primary plasmo-w-full plasmo-mb-6"
                onClick={() => setIsCreating(true)}
                disabled={operationStates["create"]?.isLoading}
              >
                {operationStates["create"]?.isLoading ? "Creating..." : "Create New Template"}
              </button>
            )}
            {(templates.length > 0 || pinnedTemplates.length > 0) && (
              <TemplateList
                templates={templates}
                pinnedTemplates={pinnedTemplates}
                onSelectTemplate={externalOnSelectTemplate ?? ((template) => console.log("Selected template:", template))}
                onPinTemplate={handlePinTemplate}
                onUnpinTemplate={handleUnpinTemplate}
                onEditTemplate={setEditingTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                isCreating={isCreating}
                onCreateTemplate={() => setIsCreating(true)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};