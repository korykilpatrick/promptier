import React, { useEffect } from "react"
import type { ResponseSectionProps } from "../../types/sidebar"
import { SectionHeader } from "./common/SectionHeader"
import { LoadingSkeleton } from "./common/LoadingSkeleton"
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation"
import { ErrorBoundary } from "../common/ErrorBoundary"
import "../../styles/transitions.css"

export const ResponseSection: React.FC<ResponseSectionProps> = (props) => {
  return (
    <ErrorBoundary>
      <ResponseSectionContent {...props} />
    </ErrorBoundary>
  )
}

const ResponseSectionContent: React.FC<ResponseSectionProps> = ({
  isExpanded,
  onToggle,
  currentResponse,
  isAutoSaveEnabled,
  isSaving = false,
  onResponseChange,
  onToggleAutoSave,
  onSaveResponse
}) => {
  useKeyboardNavigation({
    onArrowDown: () => {
      if (isExpanded) {
        const textarea = document.querySelector<HTMLTextAreaElement>('#response-textarea')
        textarea?.focus()
      }
    },
    onEscape: () => {
      if (isExpanded) {
        const header = document.querySelector<HTMLDivElement>('#response-header')
        header?.focus()
      }
    },
    disabled: !isExpanded || isSaving
  })

  useEffect(() => {
    if (!isExpanded) {
      const header = document.querySelector<HTMLDivElement>('#response-header')
      header?.focus()
    }
  }, [isExpanded])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (!isSaving && currentResponse.trim()) {
        onSaveResponse()
      }
    }
  }

  return (
    <section 
      className="p-4"
      aria-expanded={isExpanded}
    >
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} response section`}
      >
        <h2 className="text-lg font-medium text-gray-800">Save Response</h2>
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
          {/* Response Text Area */}
          <div className="mb-4">
            <textarea
              className="w-full h-32 p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste AI response here..."
              value={currentResponse}
              onChange={(e) => onResponseChange(e.target.value)}
              aria-label="AI response content"
            />
          </div>

          {/* Save Controls */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                className="form-checkbox text-blue-600"
                checked={isAutoSaveEnabled}
                onChange={onToggleAutoSave}
                aria-label="Enable auto-save responses"
              />
              <span className="text-sm text-gray-700">Auto-save responses</span>
            </label>
            <button 
              className={`bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors ${
                isSaving ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              onClick={onSaveResponse}
              disabled={isSaving}
              aria-label="Save response"
              aria-busy={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      )}
    </section>
  )
} 