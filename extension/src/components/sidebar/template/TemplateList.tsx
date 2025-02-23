import React, { useCallback, useState, useMemo } from "react"
import type { Template } from "../../../types/sidebar"
import { VirtualList } from "../../common/VirtualList"
import { TemplateItem } from "./TemplateItem"
import { KeyboardShortcutsHelp } from "../../common/KeyboardShortcutsHelp"
import { useTemplateKeyboardShortcuts } from "../../../hooks/useTemplateKeyboardShortcuts"

interface TemplateListProps {
  templates: Template[]
  pinnedTemplates: Template[]
  onSelectTemplate: (template: Template) => void
  onPinTemplate: (templateId: string) => void
  onUnpinTemplate: (templateId: string) => void
  onEditTemplate: (template: Template) => void
  onDeleteTemplate: (templateId: string) => void
  isCreating?: boolean
  onCreateTemplate?: () => void
}

const ITEM_HEIGHT = 72 // Height of each template item in pixels
const CONTAINER_HEIGHT = 400 // Maximum height of the list container

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  pinnedTemplates,
  onSelectTemplate,
  onPinTemplate,
  onUnpinTemplate,
  onEditTemplate,
  onDeleteTemplate,
  isCreating = false,
  onCreateTemplate
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Memoize the combined templates array
  const allTemplates = useMemo(() => {
    const pinned = pinnedTemplates.map(template => ({ ...template, isPinned: true }))
    const unpinned = templates.map(template => ({ ...template, isPinned: false }))
    return [...pinned, ...unpinned]
  }, [templates, pinnedTemplates])

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
    onPinTemplate,
    onUnpinTemplate,
    onDeleteTemplate,
    onSelectTemplate,
    selectedTemplate,
    isEditing,
    isCreating
  })

  // Memoize the render function for template items
  const renderTemplateItem = useCallback((template: Template & { isPinned: boolean }, index: number) => {
    return (
      <TemplateItem
        key={template.id}
        template={template}
        isPinned={template.isPinned}
        isSelected={template.id === selectedTemplateId}
        onSelect={(template) => {
          setSelectedTemplateId(template.id)
          onSelectTemplate(template)
        }}
        onPin={onPinTemplate}
        onUnpin={onUnpinTemplate}
        onEdit={(template) => {
          setIsEditing(true)
          onEditTemplate(template)
        }}
        onDelete={onDeleteTemplate}
      />
    )
  }, [selectedTemplateId, onSelectTemplate, onPinTemplate, onUnpinTemplate, onEditTemplate, onDeleteTemplate])

  // Render pinned templates section if there are any
  const renderPinnedSection = () => {
    if (pinnedTemplates.length === 0) return null

    return (
      <div>
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Pinned Templates
        </h2>
        <VirtualList
          items={pinnedTemplates.map(template => ({ ...template, isPinned: true }))}
          renderItem={renderTemplateItem}
          itemHeight={ITEM_HEIGHT}
          containerHeight={Math.min(CONTAINER_HEIGHT, pinnedTemplates.length * ITEM_HEIGHT)}
          className="mb-6"
          onItemFocus={(index) => handleItemFocus(pinnedTemplates[index])}
        />
      </div>
    )
  }

  // Render all templates section
  const renderAllTemplatesSection = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            All Templates
          </h2>
          <KeyboardShortcutsHelp shortcuts={shortcuts} />
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No templates yet</p>
        ) : (
          <VirtualList
            items={templates.map(template => ({ ...template, isPinned: false }))}
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
    <div className="space-y-6">
      {renderPinnedSection()}
      {renderAllTemplatesSection()}
    </div>
  )
} 