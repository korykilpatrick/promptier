import React, { useState, useEffect } from "react"
import type { Template } from "../../types/sidebar"
import { SectionHeader } from "./common/SectionHeader"
import { LoadingSkeleton } from "./common/LoadingSkeleton"
import { ErrorState } from "../common/ErrorState"
import { ErrorBoundary } from "../common/ErrorBoundary"
import { TemplateForm } from "./template/TemplateForm"
import { TemplateList } from "./template/TemplateList"
import { useTemplates } from "../../hooks/useTemplates"
import "../../styles/transitions.css"

interface TemplateSectionProps {
  isExpanded: boolean
  onToggle: () => void
  templates?: Template[]
  pinnedTemplates?: Template[]
  isLoading?: boolean
  onCreateTemplate?: () => void
  onPinTemplate?: (templateId: string) => void
  onUnpinTemplate?: (templateId: string) => void
  onSelectTemplate?: (template: Template) => void
}

export const TemplateSection: React.FC<TemplateSectionProps> = (props) => {
  return (
    <ErrorBoundary>
      <TemplateSectionContent {...props} />
    </ErrorBoundary>
  )
}

const TemplateSectionContent: React.FC<TemplateSectionProps> = ({
  isExpanded,
  onToggle,
  templates: externalTemplates,
  pinnedTemplates: externalPinnedTemplates,
  isLoading: externalIsLoading,
  onCreateTemplate: externalOnCreateTemplate,
  onPinTemplate: externalOnPinTemplate,
  onUnpinTemplate: externalOnUnpinTemplate,
  onSelectTemplate: externalOnSelectTemplate
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const {
    templates: internalTemplates,
    pinnedTemplates: internalPinnedTemplates,
    operationStates,
    debouncedFetch,
    cancelFetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    pinTemplate,
    unpinTemplate,
    cleanup
  } = useTemplates({
    maxRetries: 3,
    debounceDelay: 300
  })

  // Use external state if provided, otherwise fall back to internal state
  const templates = externalTemplates ?? internalTemplates
  const pinnedTemplates = externalPinnedTemplates ?? internalPinnedTemplates
  const isLoading = externalIsLoading ?? operationStates["fetch"]?.isLoading

  useEffect(() => {
    if (isExpanded && !externalTemplates) {
      debouncedFetch()
    }
    return () => {
      cancelFetch()
      cleanup()
    }
  }, [isExpanded, debouncedFetch, cancelFetch, cleanup, externalTemplates])

  const handleCreateTemplate = async (data: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (externalOnCreateTemplate) {
        externalOnCreateTemplate()
      } else {
        await createTemplate(data)
        setIsCreating(false)
        debouncedFetch()
      }
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handleUpdateTemplate = async (data: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
    if (!editingTemplate) return
    
    try {
      await updateTemplate({ id: editingTemplate.id, ...data })
      setEditingTemplate(null)
      // Refresh the list after updating
      if (!externalTemplates) {
        debouncedFetch()
      }
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return
    
    try {
      await deleteTemplate(templateId)
      // Refresh the list after deleting
      if (!externalTemplates) {
        debouncedFetch()
      }
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handlePinTemplate = async (templateId: string) => {
    try {
      if (externalOnPinTemplate) {
        externalOnPinTemplate(templateId)
      } else {
        await pinTemplate(templateId)
        if (!externalTemplates) {
          debouncedFetch()
        }
      }
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handleUnpinTemplate = async (templateId: string) => {
    try {
      if (externalOnUnpinTemplate) {
        externalOnUnpinTemplate(templateId)
      } else {
        await unpinTemplate(templateId)
        if (!externalTemplates) {
          debouncedFetch()
        }
      }
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />
    }

    if (operationStates["fetch"]?.error && !externalTemplates) {
      return (
        <ErrorState
          title="Failed to load templates"
          message="There was an error loading your templates. Please try again."
          onRetry={debouncedFetch}
        />
      )
    }

    return (
      <>
        {/* Create/Edit Form */}
        {(isCreating || editingTemplate) && (
          <div className="plasmo-mb-6">
            <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900 plasmo-mb-3">
              {isCreating ? "Create New Template" : "Edit Template"}
            </h3>
            <TemplateForm
              template={editingTemplate ?? undefined}
              onSubmit={isCreating ? handleCreateTemplate : handleUpdateTemplate}
              onCancel={() => {
                setIsCreating(false)
                setEditingTemplate(null)
              }}
            />
          </div>
        )}

        {/* Create Button */}
        {!isCreating && !editingTemplate && (
          <button
            className="plasmo-w-full plasmo-bg-blue-600 plasmo-text-white plasmo-py-2 plasmo-px-4 plasmo-rounded plasmo-hover:bg-blue-700 plasmo-transition-colors plasmo-disabled:opacity-50 plasmo-disabled:cursor-not-allowed plasmo-mb-6"
            onClick={() => setIsCreating(true)}
            disabled={operationStates["create"]?.isLoading}
          >
            {operationStates["create"]?.isLoading ? "Creating..." : "Create New Template"}
          </button>
        )}

        {/* Template List */}
        <TemplateList
          templates={templates}
          pinnedTemplates={pinnedTemplates}
          onSelectTemplate={(template) => {
            if (externalOnSelectTemplate) {
              externalOnSelectTemplate(template)
            } else {
              // Handle template selection - this will be implemented in a later step
              console.log("Selected template:", template)
            }
          }}
          onPinTemplate={handlePinTemplate}
          onUnpinTemplate={handleUnpinTemplate}
          onEditTemplate={setEditingTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          isCreating={isCreating}
          onCreateTemplate={() => setIsCreating(true)}
        />
      </>
    )
  }

  return (
    <section className="plasmo-p-4 plasmo-border-b plasmo-border-gray-200">
      <SectionHeader
        title="Templates"
        isExpanded={isExpanded}
        onToggle={onToggle}
      />

      {isExpanded && (
        <div className="plasmo-mt-4">
          {renderContent()}
        </div>
      )}
    </section>
  )
} 