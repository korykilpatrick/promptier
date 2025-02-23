import { useEffect, useCallback } from "react"
import type { Template } from "../types/sidebar"

interface UseTemplateKeyboardShortcutsProps {
  onCreateTemplate?: () => void
  onEditTemplate?: (template: Template) => void
  onPinTemplate?: (templateId: string) => void
  onUnpinTemplate?: (templateId: string) => void
  onDeleteTemplate?: (templateId: string) => void
  onSelectTemplate?: (template: Template) => void
  selectedTemplate?: Template | null
  isEditing?: boolean
  isCreating?: boolean
}

export function useTemplateKeyboardShortcuts({
  onCreateTemplate,
  onEditTemplate,
  onPinTemplate,
  onUnpinTemplate,
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

      // Pin/Unpin template: Ctrl/Cmd + P
      if (ctrlKey && event.key === "p") {
        event.preventDefault()
        if (selectedTemplate.isPinned) {
          onUnpinTemplate?.(selectedTemplate.id)
        } else {
          onPinTemplate?.(selectedTemplate.id)
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
    onPinTemplate,
    onUnpinTemplate,
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
      { key: "Ctrl/⌘ + P", description: "Pin/unpin selected template" },
      { key: "Ctrl/⌘ + Delete", description: "Delete selected template" },
      { key: "Esc", description: "Clear selection" }
    ]
  }
} 