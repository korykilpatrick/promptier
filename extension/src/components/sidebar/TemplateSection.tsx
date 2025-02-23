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
    <section 
      className="p-4 border-b border-gray-200"
      aria-expanded={isExpanded}
    >
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} templates section`}
      >
        <h2 className="text-lg font-medium text-gray-800">Templates</h2>
        <button 
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <svg 
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Template Creation Form */}
          <div className="mb-4">
            <button 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              onClick={onCreateTemplate}
              aria-label="Create new template"
            >
              Create New Template
            </button>
          </div>

          {/* Template List */}
          {isLoading ? (
            <div className="text-sm text-gray-600">Loading templates...</div>
          ) : (
            <div className="space-y-2">
              {pinnedTemplates.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Pinned Templates</h3>
                  {pinnedTemplates.map(template => (
                    <div 
                      key={template.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm text-gray-800">{template.name}</span>
                      <button
                        onClick={() => onUnpinTemplate(template.id)}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label={`Unpin template ${template.name}`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">All Templates</h3>
                {templates.length === 0 ? (
                  <div className="text-sm text-gray-600">No templates yet</div>
                ) : (
                  templates.map(template => (
                    <div 
                      key={template.id}
                      className="flex items-center justify-between p-2 bg-white rounded hover:bg-gray-50 transition-colors"
                    >
                      <button
                        className="flex-1 text-left text-sm text-gray-800"
                        onClick={() => onSelectTemplate(template)}
                        aria-label={`Select template ${template.name}`}
                      >
                        {template.name}
                      </button>
                      {!pinnedTemplates.some(pinned => pinned.id === template.id) && (
                        <button
                          onClick={() => onPinTemplate(template.id)}
                          className="text-gray-500 hover:text-gray-700"
                          aria-label={`Pin template ${template.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
} 