import React, { useCallback, useState, useMemo } from "react"
import type { Template } from "shared/types/templates"
import { VirtualList } from "../../common/VirtualList"
import { TemplateItem } from "./TemplateItem"
import { KeyboardShortcutsHelp } from "../../common/KeyboardShortcutsHelp"
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

const ITEM_HEIGHT = 96 // Adjusted height for proper line height and spacing
const CONTAINER_HEIGHT = 400 // Maximum height of the list container

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

  // Memoize the combined templates array - favorites first, then regular templates
  const allTemplates = useMemo(() => {
    // Create a Set of favorite template IDs for quick lookup
    const favoriteIds = new Set((favoriteTemplates || []).map(t => t.id))
    
    // Filter out templates that are already in favorites to avoid duplicates
    const nonFavoriteTemplates = (templates || [])
      .filter(template => !favoriteIds.has(template.id))
      .map(template => ({ ...template }))
    
    // Combine favorites (marked as favorite) followed by non-favorites
    return [
      ...(favoriteTemplates || []).map(template => ({ ...template, isFavorite: true })),
      ...nonFavoriteTemplates
    ]
  }, [templates, favoriteTemplates])

  // Find the selected template
  const selectedTemplate = useMemo(() => 
    allTemplates.find(t => t.id === selectedTemplateId),
    [allTemplates, selectedTemplateId]
  )

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

  // Memoize the render function for template items
  const renderTemplateItem = useCallback((template: Template, index: number) => {
    return (
      <div className="plasmo-mb-4">
        <TemplateItem
          key={template.id}
          template={template}
          isFavorite={template.isFavorite}
          isSelected={template.id === selectedTemplateId}
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

  return (
    <div className="plasmo-space-y-4">
      <div>
        <div className="plasmo-flex plasmo-justify-end plasmo-items-center plasmo-mb-3">
          <KeyboardShortcutsHelp shortcuts={shortcuts} />
        </div>
        {!allTemplates.length ? (
          <p className="plasmo-text-body plasmo-text-gray-500 plasmo-italic">No templates yet</p>
        ) : (
          <div className="plasmo-grid plasmo-grid-cols-1 plasmo-gap-4">
            {allTemplates.map((template, index) => renderTemplateItem(template, index))}
          </div>
        )}
      </div>
    </div>
  )
} 