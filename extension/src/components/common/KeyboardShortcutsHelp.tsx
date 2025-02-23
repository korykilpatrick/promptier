import React, { useState } from "react"

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

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-gray-400 hover:text-gray-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Keyboard shortcuts help"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>

      {isExpanded && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 border border-gray-200"
          role="tooltip"
        >
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Keyboard Shortcuts</h3>
            <ul className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-800 font-mono text-xs">
                    {shortcut.key}
                  </kbd>
                  <span className="text-gray-600">{shortcut.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
} 