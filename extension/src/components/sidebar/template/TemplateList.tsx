import React, { useCallback, useState, useMemo } from "react"
import type { Template } from "shared/types/templates"
import { VirtualList } from "../../common/VirtualList"
import { TemplateItem } from "./TemplateItem"
import { useTemplateKeyboardShortcuts } from "../../../hooks/useTemplateKeyboardShortcuts"

interface TemplateListProps {
  templates?: Template[]
  favoriteTemplates?: Template[]
  onSelectTemplate: (template: Template) => void
  onFavoriteTemplate: (templateId: number) => void
  onUnfavoriteTemplate: (templateId: number) => void
  onEditTemplate: (template: Template) => void
  onDeleteTemplate: (templateId: number) => void
  isCreating?: boolean
  onCreateTemplate?: () => void
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates = [],
  favoriteTemplates = [],
  onSelectTemplate,
  onFavoriteTemplate,
  onUnfavoriteTemplate,
  onEditTemplate,
  onDeleteTemplate,
  isCreating = false,
  onCreateTemplate
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Prepare a unified list with favorites at the top
  const allTemplates = useMemo(() => {
    // Mark favorites for display
    const favs = (favoriteTemplates || []).map(t => ({ ...t, isFavorite: true }));
    
    // Filter out templates that are already in favorites to avoid duplicates
    const nonFavs = (templates || [])
      .filter(template => !favs.some(f => f.id === template.id))
      .map(template => ({ ...template }));
    
    // Return unified list with favorites at top
    return [...favs, ...nonFavs];
  }, [templates, favoriteTemplates]);

  // Find the selected template
  const selectedTemplate = useMemo(() => {
    return allTemplates.find(t => t.id === selectedTemplateId);
  }, [allTemplates, selectedTemplateId]);

  // Handle keyboard navigation
  const handleItemFocus = useCallback((template: Template) => {
    setSelectedTemplateId(template.id)
  }, [])

  // Handle template editing
  const handleEditTemplate = useCallback((template: Template) => {
    setIsEditing(true)
    onEditTemplate(template)
  }, [onEditTemplate])

  // Handle template deletion
  const handleDeleteTemplate = useCallback((templateId: number) => {
    console.log(`[TemplateList] Deleting template ID: ${templateId}`)
    onDeleteTemplate(templateId)
  }, [onDeleteTemplate])

  // Setup keyboard shortcuts
  const { shortcuts } = useTemplateKeyboardShortcuts({
    onCreateTemplate,
    onEditTemplate: handleEditTemplate,
    onFavoriteTemplate,
    onUnfavoriteTemplate,
    onDeleteTemplate: handleDeleteTemplate,
    onSelectTemplate,
    selectedTemplate,
    isEditing,
    isCreating
  })

  // Render a template item
  const renderTemplateItem = useCallback((template: Template, index: number) => {
    return (
      <div className="plasmo-mb-0.5">
        <TemplateItem
          key={template.id}
          template={template}
          isFavorite={template.isFavorite}
          isSelected={template.id === selectedTemplateId}
          index={index}
          onSelect={(template) => {
            setSelectedTemplateId(template.id)
            onSelectTemplate(template)
          }}
          onFavorite={onFavoriteTemplate}
          onUnfavorite={onUnfavoriteTemplate}
          onEdit={onEditTemplate}
          onDelete={handleDeleteTemplate}
        />
      </div>
    )
  }, [selectedTemplateId, onSelectTemplate, onFavoriteTemplate, onUnfavoriteTemplate, onEditTemplate, handleDeleteTemplate])

  // If no templates
  if (allTemplates.length === 0) {
    return (
      <div className="plasmo-empty-state">
        <div className="plasmo-text-gray-400 plasmo-mb-2">
          <svg className="plasmo-w-10 plasmo-h-10 plasmo-mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2">No templates yet</h3>
        <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-3">
          Create your first template to get started with reusable prompts.
        </p>
        <button
          className="plasmo-btn-primary"
          onClick={onCreateTemplate}
        >
          Create Your First Template
        </button>
      </div>
    );
  }

  return (
    <div className="plasmo-space-y-1">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-1">
        <div className="plasmo-text-xs plasmo-text-gray-500">
          {allTemplates.length} template{allTemplates.length !== 1 ? 's' : ''}
        </div>
        <button
          className="plasmo-btn-primary plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-xs"
          onClick={onCreateTemplate}
          aria-label="Create new template"
        >
          <svg
            className="plasmo-w-3.5 plasmo-h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New
        </button>
      </div>
      
      {/* Unified template list */}
      <div className="plasmo-space-y-0.5">
        {allTemplates.map((template, index) => renderTemplateItem(template, index))}
      </div>
    </div>
  )
} 