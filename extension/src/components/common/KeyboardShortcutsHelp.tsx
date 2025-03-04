import React, { useState, useRef, useEffect } from "react"

interface Shortcut {
  key: string
  description: string
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[]
  className?: string
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }
    
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  return (
    <div className={`plasmo-relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="plasmo-action-btn plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-xs"
        aria-label="Keyboard shortcuts help"
        aria-expanded={isExpanded}
      >
        <svg className="plasmo-w-4 plasmo-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="plasmo-hidden sm:plasmo-inline">Shortcuts</span>
      </button>

      {isExpanded && (
        <div
          className="plasmo-absolute plasmo-right-0 plasmo-mt-2 plasmo-w-72 plasmo-bg-white plasmo-rounded-md plasmo-shadow-lg plasmo-z-50 plasmo-border plasmo-border-gray-200 plasmo-animate-scale-in"
          role="tooltip"
        >
          <div className="plasmo-p-4">
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-3">
              <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-gray-600 hover:plasmo-bg-gray-100"
              >
                <svg className="plasmo-w-4 plasmo-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="plasmo-space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-text-sm">
                  <kbd className="plasmo-px-2 plasmo-py-1 plasmo-bg-gray-100 plasmo-rounded plasmo-text-gray-800 plasmo-font-mono plasmo-text-xs plasmo-border plasmo-border-gray-200 plasmo-shadow-sm">
                    {shortcut.key}
                  </kbd>
                  <span className="plasmo-text-gray-600 plasmo-ml-2 plasmo-text-right">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 