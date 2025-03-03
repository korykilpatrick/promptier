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

  // Group templates by category
  const categorizedTemplates = useMemo(() => {
    const grouped: Record<string, Template[]> = {
      "Favorites": favoriteTemplates,
      "Uncategorized": []
    };

    // Group non-favorite templates by their category
    templates.forEach(template => {
      if (!favoriteTemplates.some(ft => ft.id === template.id)) {
        const category = template.category || "Uncategorized";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(template);
      }
    });

    // Filter out empty categories
    return Object.entries(grouped)
      .filter(([_, templates]) => templates && templates.length > 0)
      .sort(([a], [b]) => {
        // Ensure Favorites is first, Uncategorized is last
        if (a === "Favorites") return -1;
        if (b === "Favorites") return 1;
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
      });
  }, [templates, favoriteTemplates]);

  // Render a template item
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

  // If no templates
  if (allTemplates.length === 0) {
    return (
      <div className="plasmo-empty-state">
        <div className="plasmo-text-gray-400 plasmo-mb-3">
          <svg className="plasmo-w-12 plasmo-h-12 plasmo-mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2">No templates yet</h3>
        <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-4">
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
    <div className="plasmo-space-y-6">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
        <div className="plasmo-text-sm plasmo-text-gray-500">
          {allTemplates.length} template{allTemplates.length !== 1 ? 's' : ''}
        </div>
        <KeyboardShortcutsHelp shortcuts={shortcuts} />
      </div>

      {/* Categorized Templates */}
      {categorizedTemplates.map(([category, templates]) => (
        <div key={category} className="plasmo-space-y-4">
          {/* Category Header */}
          {category !== "Uncategorized" && (
            <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
              <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
                {category}
              </h3>
              <div className="plasmo-flex-1 plasmo-h-px plasmo-bg-gray-200"></div>
              <span className="plasmo-text-xs plasmo-text-gray-500 plasmo-bg-gray-100 plasmo-rounded-full plasmo-px-2 plasmo-py-0.5">
                {templates.length}
              </span>
            </div>
          )}
          
          {/* Templates in this category */}
          <div className="plasmo-grid plasmo-grid-cols-1 plasmo-gap-4">
            {templates.map((template, index) => renderTemplateItem(template, index))}
          </div>
        </div>
      ))}
    </div>
  )
} 