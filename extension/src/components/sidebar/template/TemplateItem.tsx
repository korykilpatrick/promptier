import React, { memo } from "react"
import type { Template } from "../../../types/sidebar"

interface TemplateItemProps {
  template: Template
  isPinned: boolean
  isSelected: boolean
  onSelect: (template: Template) => void
  onPin: (templateId: string) => void
  onUnpin: (templateId: string) => void
  onEdit: (template: Template) => void
  onDelete: (templateId: string) => void
}

export const TemplateItem = memo(function TemplateItem({
  template,
  isPinned,
  isSelected,
  onSelect,
  onPin,
  onUnpin,
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
        if (e.key === 'p') isPinned ? onUnpin(template.id) : onPin(template.id)
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
            isPinned ? onUnpin(template.id) : onPin(template.id)
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label={isPinned ? `Unpin template: ${template.name}` : `Pin template: ${template.name}`}
        >
          <svg className="w-4 h-4" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.template.id === nextProps.template.id &&
    prevProps.template.name === nextProps.template.name &&
    prevProps.template.category === nextProps.template.category &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isSelected === nextProps.isSelected
  )
}) 