import React, { useRef, useEffect } from "react"
import type { TemplateSectionProps, Template } from "../../types/sidebar"
import { SectionHeader } from "./common/SectionHeader"
import { LoadingSkeleton } from "./common/LoadingSkeleton"
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation"
import { useFocusManagement } from "../../hooks/useFocusManagement"
import { ErrorBoundary } from "../common/ErrorBoundary"
import "../../styles/transitions.css"

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
  templates = [],
  pinnedTemplates = [],
  isLoading = false,
  onCreateTemplate,
  onPinTemplate,
  onUnpinTemplate,
  onSelectTemplate
}) => {
  const templateRefs = useRef<(HTMLDivElement | null)[]>([])
  const allTemplates = [...templates, ...pinnedTemplates]

  const { currentFocus, setFocus, focusNext, focusPrevious, resetFocus } = useFocusManagement({
    itemCount: allTemplates.length,
    onFocusChange: (index) => {
      if (index >= 0) {
        templateRefs.current[index]?.focus()
      }
    }
  })

  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEscape: resetFocus,
    disabled: !isExpanded || isLoading
  })

  useEffect(() => {
    if (!isExpanded) {
      resetFocus()
    }
  }, [isExpanded, resetFocus])

  const renderTemplateItem = (template: Template, isPinned: boolean = false, index: number) => (
    <div 
      key={template.id}
      ref={el => templateRefs.current[index] = el}
      className={`flex items-center justify-between p-2 hover-transition hover:bg-gray-50 rounded-md cursor-pointer ${
        currentFocus === index ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelectTemplate(template)}
      role="button"
      aria-label={`Select template: ${template.name}`}
      tabIndex={currentFocus === index ? 0 : -1}
      onFocus={() => setFocus(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelectTemplate(template)
        } else if (e.key === 'p') {
          isPinned ? onUnpinTemplate(template.id) : onPinTemplate(template.id)
        }
      }}
    >
      <span className="text-sm text-gray-700">{template.name}</span>
      <button
        className="text-gray-400 hover-transition hover:text-blue-600 scale-transition hover:scale-110"
        onClick={(e) => {
          e.stopPropagation()
          isPinned ? onUnpinTemplate(template.id) : onPinTemplate(template.id)
        }}
        aria-label={isPinned ? `Unpin template: ${template.name}` : `Pin template: ${template.name}`}
        tabIndex={-1}
      >
        {isPinned ? "📌" : "📍"}
      </button>
    </div>
  )

  return (
    <div 
      className="border-b border-gray-200"
      role="region"
      aria-labelledby="templates-header"
    >
      <SectionHeader 
        title="Templates"
        isExpanded={isExpanded}
        onToggle={onToggle}
        id="templates-header"
      />

      <div 
        id="templates-content"
        className={`section-content ${isExpanded ? "expanded" : ""}`}
        role="region"
        aria-labelledby="templates-header"
      >
        <div className="p-4 space-y-4">
          {/* Template List */}
          <div 
            className="space-y-2"
            role="region"
            aria-labelledby="my-templates-header"
          >
            <div className="flex justify-between items-center">
              <h3 
                id="my-templates-header"
                className="text-sm font-medium text-gray-600"
              >
                My Templates
              </h3>
              <button 
                className="text-sm text-blue-600 button-transition hover:text-blue-700 disabled:opacity-50"
                onClick={onCreateTemplate}
                disabled={isLoading}
                aria-label="Create new template"
              >
                + New Template
              </button>
            </div>
            <div 
              className="space-y-2"
              role="list"
              aria-label="Template list"
            >
              {isLoading ? (
                <LoadingSkeleton variant="card" size="small" count={3} />
              ) : templates.length > 0 ? (
                templates.map((template, index) => renderTemplateItem(template, false, index))
              ) : (
                <div 
                  className="text-sm text-gray-500 italic loading-fade"
                  role="status"
                  aria-label="No templates available"
                >
                  No templates yet
                </div>
              )}
            </div>
          </div>

          {/* Pinned Templates */}
          <div 
            className="space-y-2"
            role="region"
            aria-labelledby="pinned-templates-header"
          >
            <h3 
              id="pinned-templates-header"
              className="text-sm font-medium text-gray-600"
            >
              Pinned Templates
            </h3>
            <div 
              className="space-y-2"
              role="list"
              aria-label="Pinned template list"
            >
              {isLoading ? (
                <LoadingSkeleton variant="card" size="small" count={2} />
              ) : pinnedTemplates.length > 0 ? (
                pinnedTemplates.map((template, index) => 
                  renderTemplateItem(template, true, templates.length + index)
                )
              ) : (
                <div 
                  className="text-sm text-gray-500 italic loading-fade"
                  role="status"
                  aria-label="No pinned templates available"
                >
                  No pinned templates
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 