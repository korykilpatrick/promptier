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
    <div 
      className="border-b border-gray-200"
      role="region"
      aria-labelledby="response-header"
      onKeyDown={handleKeyDown}
    >
      <SectionHeader 
        title="Response"
        isExpanded={isExpanded}
        onToggle={onToggle}
        id="response-header"
      />

      <div 
        id="response-content"
        className={`section-content ${isExpanded ? "expanded" : ""}`}
        role="region"
        aria-labelledby="response-header"
      >
        <div className="p-4 space-y-4">
          {/* Response Text Area */}
          <div 
            className="space-y-2"
            role="group"
            aria-label="Response editor"
          >
            {isSaving ? (
              <LoadingSkeleton variant="input" size="large" count={1} />
            ) : (
              <textarea
                id="response-textarea"
                className="w-full h-32 p-2 border border-gray-300 rounded-md text-sm resize-none focus-ring hover-transition"
                placeholder="AI response will appear here..."
                value={currentResponse}
                onChange={(e) => onResponseChange(e.target.value)}
                disabled={isSaving}
                aria-label="AI response text"
                aria-disabled={isSaving}
              />
            )}
          </div>

          {/* Save Controls */}
          <div 
            className="flex justify-between items-center"
            role="group"
            aria-label="Save controls"
          >
            {isSaving ? (
              <div className="flex justify-between items-center w-full">
                <LoadingSkeleton variant="button" size="small" count={1} className="w-32" />
                <LoadingSkeleton variant="button" size="small" count={1} className="w-20" />
              </div>
            ) : (
              <>
                <label 
                  className="flex items-center space-x-2 hover-transition"
                  role="checkbox"
                  aria-checked={isAutoSaveEnabled}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!isSaving) {
                        onToggleAutoSave()
                      }
                    }
                  }}
                >
                  <input 
                    type="checkbox" 
                    className="form-checkbox text-blue-600 transition-colors"
                    checked={isAutoSaveEnabled}
                    onChange={onToggleAutoSave}
                    disabled={isSaving}
                    aria-label="Enable auto-save"
                  />
                  <span 
                    className={`text-sm transition-colors ${isSaving ? "text-gray-400" : "text-gray-600"}`}
                    aria-hidden="true"
                  >
                    Auto-save responses
                  </span>
                </label>
                <button 
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md button-transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed scale-transition hover:scale-105"
                  disabled={!currentResponse.trim() || isSaving}
                  onClick={onSaveResponse}
                  aria-label={isSaving ? "Saving response..." : "Save response"}
                  aria-busy={isSaving}
                  title="Press Ctrl+S or ⌘+S to save"
                >
                  <span className="flex items-center">
                    {isSaving && (
                      <svg 
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isSaving ? "Saving..." : "Save"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 