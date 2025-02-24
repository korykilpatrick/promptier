import React, { memo } from "react"
import type { Template } from "shared/types/templates"

interface TemplateItemProps {
  template: Template
  isFavorite: boolean
  isSelected: boolean
  onSelect: (template: Template) => void
  onFavorite: (templateId: number) => void
  onUnfavorite: (templateId: number) => void
  onEdit: (template: Template) => void
  onDelete: (templateId: number) => void
}

export const TemplateItem: React.FC<TemplateItemProps> = memo(({
  template,
  isFavorite,
  isSelected,
  onSelect,
  onFavorite,
  onUnfavorite,
  onEdit,
  onDelete,
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    isFavorite ? onUnfavorite(template.id) : onFavorite(template.id)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(template)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(template.id)
  }

  return (
    <div
      onClick={() => onSelect(template)}
      className={`
        plasmo-group plasmo-px-4 plasmo-py-3 
        hover:plasmo-bg-gray-50 
        plasmo-transition-colors 
        plasmo-cursor-pointer
        ${isSelected ? "plasmo-bg-blue-50" : ""}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(template)
        }
      }}
    >
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
        <div className="plasmo-flex-1 plasmo-min-w-0">
          <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900 plasmo-truncate">
            {template.name}
          </h4>
          <div className="plasmo-mt-1 plasmo-flex plasmo-items-center plasmo-space-x-2">
            {template.category && (
              <span className="plasmo-text-xs plasmo-text-gray-500">
                {template.category}
              </span>
            )}
            <span className="plasmo-text-xs plasmo-text-gray-400">
              {new Date(template.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-transition-opacity">
          <button
            onClick={handleFavoriteClick}
            className={`
              plasmo-p-1 plasmo-rounded-full 
              ${isFavorite 
                ? "plasmo-text-yellow-500 hover:plasmo-text-yellow-600" 
                : "plasmo-text-gray-400 hover:plasmo-text-gray-500"
              }
              plasmo-transition-colors
            `}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg className="plasmo-w-5 plasmo-h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
          <button
            onClick={handleEditClick}
            className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-gray-500 plasmo-transition-colors"
            aria-label="Edit template"
          >
            <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-red-500 plasmo-transition-colors"
            aria-label="Delete template"
          >
            <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}) 