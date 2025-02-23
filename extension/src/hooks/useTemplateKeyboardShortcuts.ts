import { useEffect, useCallback } from "react"
import type { Template } from "shared/types/templates"

interface UseTemplateKeyboardShortcutsProps {
  onCreateTemplate?: () => void
  onEditTemplate?: (template: Template) => void
  onFavoriteTemplate?: (templateId: number) => void
  onUnfavoriteTemplate?: (templateId: number) => void
  onDeleteTemplate?: (templateId: number) => void
  onSelectTemplate?: (template: Template) => void
  selectedTemplate?: Template | null
  isEditing?: boolean
  isCreating?: boolean
}

export function useTemplateKeyboardShortcuts({
  onCreateTemplate,
  onEditTemplate,
  onFavoriteTemplate,
  onUnfavoriteTemplate,
  onDeleteTemplate,
  onSelectTemplate,
  selectedTemplate,
  isEditing,
  isCreating
}: UseTemplateKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts if we're editing or creating
    if (isEditing || isCreating) return

    // Don't handle shortcuts if we're in an input or textarea
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey

    // Create new template: Ctrl/Cmd + N
    if (ctrlKey && event.key === "n") {
      event.preventDefault()
      onCreateTemplate?.()
      return
    }

    // Handle shortcuts that require a selected template
    if (selectedTemplate) {
      // Edit template: Ctrl/Cmd + E
      if (ctrlKey && event.key === "e") {
        event.preventDefault()
        onEditTemplate?.(selectedTemplate)
        return
      }

      // Favorite/Unfavorite template: Ctrl/Cmd + F
      if (ctrlKey && event.key === "f") {
        event.preventDefault()
        if (selectedTemplate.isFavorite) {
          onUnfavoriteTemplate?.(selectedTemplate.id)
        } else {
          onFavoriteTemplate?.(selectedTemplate.id)
        }
        return
      }

      // Delete template: Ctrl/Cmd + Delete or Ctrl/Cmd + Backspace
      if (ctrlKey && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault()
        onDeleteTemplate?.(selectedTemplate.id)
        return
      }
    }
  }, [
    onCreateTemplate,
    onEditTemplate,
    onFavoriteTemplate,
    onUnfavoriteTemplate,
    onDeleteTemplate,
    selectedTemplate,
    isEditing,
    isCreating
  ])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Return keyboard shortcut information for displaying in UI
  return {
    shortcuts: [
      { key: "↑/↓", description: "Navigate templates" },
      { key: "Enter", description: "Select template" },
      { key: "Ctrl/⌘ + N", description: "Create new template" },
      { key: "Ctrl/⌘ + E", description: "Edit selected template" },
      { key: "Ctrl/⌘ + F", description: "Favorite/unfavorite selected template" },
      { key: "Ctrl/⌘ + Delete", description: "Delete selected template" },
      { key: "Esc", description: "Clear selection" }
    ]
  }
} 