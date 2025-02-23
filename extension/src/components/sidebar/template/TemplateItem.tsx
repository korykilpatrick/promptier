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

export const TemplateItem = memo(function TemplateItem({
  template,
  isFavorite,
  isSelected,
  onSelect,
  onFavorite,
  onUnfavorite,
  onEdit,
  onDelete
}: TemplateItemProps) {
  return (
    <div
      className={`group flex items-center justify-between p-3 hover:bg-gray-50 rounded-md cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelect(template)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect(template)
        if (e.key === 'e') onEdit(template)
        if (e.key === 'f') isFavorite ? onUnfavorite(template.id) : onFavorite(template.id)
        if (e.key === 'Delete') onDelete(template.id)
      }}
    >
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
        {template.category && (
          <p className="text-xs text-gray-500">{template.category}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(template)
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label={`Edit template: ${template.name}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            isFavorite ? onUnfavorite(template.id) : onFavorite(template.id)
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label={isFavorite ? `Remove from favorites: ${template.name}` : `Add to favorites: ${template.name}`}
        >
          <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(template.id)
          }}
          className="p-1 text-gray-400 hover:text-red-600"
          aria-label={`Delete template: ${template.name}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
},
  // Custom comparison function for memoization
  (prevProps, nextProps) => (
    prevProps.template.id === nextProps.template.id &&
    prevProps.template.name === nextProps.template.name &&
    prevProps.template.category === nextProps.template.category &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isSelected === nextProps.isSelected
  )
) 