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

const ITEM_HEIGHT = 72 // Height of each template item in pixels
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

  // Memoize the combined templates array
  const allTemplates = useMemo(() => {
    const favorites = (favoriteTemplates || []).map(template => ({ ...template }))
    const regular = (templates || []).map(template => ({ ...template }))
    return [...favorites, ...regular]
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

  // Setup keyboard shortcuts
  const { shortcuts } = useTemplateKeyboardShortcuts({
    onCreateTemplate,
    onEditTemplate: handleEditTemplate,
    onFavoriteTemplate,
    onUnfavoriteTemplate,
    onDeleteTemplate,
    onSelectTemplate,
    selectedTemplate,
    isEditing,
    isCreating
  })

  // Memoize the render function for template items
  const renderTemplateItem = useCallback((template: Template, index: number) => {
    return (
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
        onEdit={(template) => {
          setIsEditing(true)
          onEditTemplate(template)
        }}
        onDelete={onDeleteTemplate}
      />
    )
  }, [selectedTemplateId, onSelectTemplate, onFavoriteTemplate, onUnfavoriteTemplate, onEditTemplate, onDeleteTemplate])

  // Render favorite templates section if there are any
  const renderFavoriteSection = () => {
    if (!favoriteTemplates?.length) return null

    return (
      <div>
        <h2 className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500 plasmo-uppercase plasmo-tracking-wider plasmo-mb-3">
          Favorite Templates
        </h2>
        <VirtualList
          items={favoriteTemplates}
          renderItem={renderTemplateItem}
          itemHeight={ITEM_HEIGHT}
          containerHeight={Math.min(CONTAINER_HEIGHT, favoriteTemplates.length * ITEM_HEIGHT)}
          className="plasmo-mb-6"
          onItemFocus={(index) => handleItemFocus(favoriteTemplates[index])}
        />
      </div>
    )
  }

  // Render all templates section
  const renderAllTemplatesSection = () => {
    return (
      <div>
        <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
          <h2 className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500 plasmo-uppercase plasmo-tracking-wider">
            All Templates
          </h2>
          <KeyboardShortcutsHelp shortcuts={shortcuts} />
        </div>
        {!templates?.length ? (
          <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-italic">No templates yet</p>
        ) : (
          <VirtualList
            items={templates}
            renderItem={renderTemplateItem}
            itemHeight={ITEM_HEIGHT}
            containerHeight={Math.min(CONTAINER_HEIGHT, templates.length * ITEM_HEIGHT)}
            onItemFocus={(index) => handleItemFocus(templates[index])}
          />
        )}
      </div>
    )
  }

  return (
    <div className="plasmo-space-y-6">
      {renderFavoriteSection()}
      {renderAllTemplatesSection()}
    </div>
  )
} 