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
  onToggle
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const {
    templates,
    pinnedTemplates,
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

  useEffect(() => {
    if (isExpanded) {
      debouncedFetch()
    }
    return () => {
      cancelFetch()
      cleanup()
    }
  }, [isExpanded, debouncedFetch, cancelFetch, cleanup])

  const handleCreateTemplate = async (data: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
    try {
      await createTemplate(data)
      setIsCreating(false)
      // Refresh the list after creating
      debouncedFetch()
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
      debouncedFetch()
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return
    
    try {
      await deleteTemplate(templateId)
      // Refresh the list after deleting
      debouncedFetch()
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handlePinTemplate = async (templateId: string) => {
    try {
      await pinTemplate(templateId)
      // Refresh the list after pinning
      debouncedFetch()
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const handleUnpinTemplate = async (templateId: string) => {
    try {
      await unpinTemplate(templateId)
      // Refresh the list after unpinning
      debouncedFetch()
    } catch (error) {
      // Error is handled by the hook and shown in toast
    }
  }

  const renderContent = () => {
    const fetchState = operationStates["fetch"]

    if (fetchState?.isLoading) {
      return <LoadingSkeleton />
    }

    if (fetchState?.error) {
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
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
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
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
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
            // Handle template selection - this will be implemented in a later step
            console.log("Selected template:", template)
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
    <section className="p-4 border-b border-gray-200">
      <SectionHeader
        title="Templates"
        isExpanded={isExpanded}
        onToggle={onToggle}
      />

      {isExpanded && (
        <div className="mt-4">
          {renderContent()}
        </div>
      )}
    </section>
  )
} 