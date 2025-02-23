import { useState, useCallback, useEffect } from "react"
import type { Template } from "../types/sidebar"
import { useToast } from "./useToast"
import { useRequest } from "./useRequest"
import { useDebouncedCallback } from "./useDebounce"

interface UseTemplatesOptions {
  onError?: (error: Error) => void
  maxRetries?: number
  debounceDelay?: number
}

interface CreateTemplateData {
  name: string
  content: string
  category?: string
  isPinned?: boolean
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {
  id: string
}

interface OperationState {
  isLoading: boolean
  error: Error | null
  retryCount: number
}

// Mock data store
let mockTemplates: Template[] = []
let nextId = 1

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { maxRetries = 3, debounceDelay = 300 } = options
  const [templates, setTemplates] = useState<Template[]>([])
  const [pinnedTemplates, setPinnedTemplates] = useState<Template[]>([])
  const [operationStates, setOperationStates] = useState<Record<string, OperationState>>({})
  const toast = useToast()

  const setOperationState = useCallback((operation: string, state: Partial<OperationState>) => {
    setOperationStates(prev => ({
      ...prev,
      [operation]: {
        ...prev[operation],
        ...state
      }
    }))
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    // No cleanup needed for mock data
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const fetchTemplates = useCallback(async () => {
    try {
      setOperationState("fetch", { isLoading: true, error: null })
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTemplates(mockTemplates.filter(t => !t.isPinned))
      setPinnedTemplates(mockTemplates.filter(t => t.isPinned))
      setOperationState("fetch", { isLoading: false, error: null })
      return mockTemplates
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load templates")
      setOperationState("fetch", { isLoading: false, error })
      options.onError?.(error)
      toast.error("Failed to load templates")
      throw error
    }
  }, [setOperationState, options, toast])

  // Debounced version of fetchTemplates
  const [debouncedFetch, cancelFetch] = useDebouncedCallback(fetchTemplates, { delay: debounceDelay })

  const createTemplate = useCallback(async (data: CreateTemplateData) => {
    try {
      setOperationState("create", { isLoading: true, error: null })
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const newTemplate: Template = {
        id: String(nextId++),
        name: data.name,
        content: data.content,
        category: data.category,
        isPinned: data.isPinned ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      mockTemplates = [...mockTemplates, newTemplate]

      if (newTemplate.isPinned) {
        setPinnedTemplates(prev => [...prev, newTemplate])
      } else {
        setTemplates(prev => [...prev, newTemplate])
      }
      
      setOperationState("create", { isLoading: false, error: null })
      toast.success("Template created successfully")
      return newTemplate
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create template")
      setOperationState("create", { isLoading: false, error })
      options.onError?.(error)
      toast.error("Failed to create template")
      throw error
    }
  }, [setOperationState, options, toast])

  const updateTemplate = useCallback(async (data: UpdateTemplateData) => {
    try {
      setOperationState("update", { isLoading: true, error: null })
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const templateIndex = mockTemplates.findIndex(t => t.id === data.id)
      if (templateIndex === -1) throw new Error("Template not found")

      const updatedTemplate: Template = {
        ...mockTemplates[templateIndex],
        ...data,
        isPinned: data.isPinned ?? mockTemplates[templateIndex].isPinned,
        updatedAt: new Date().toISOString()
      }

      mockTemplates[templateIndex] = updatedTemplate

      const updateTemplateList = (list: Template[]) =>
        list.map(t => t.id === data.id ? updatedTemplate : t)
      
      if (updatedTemplate.isPinned) {
        setPinnedTemplates(prev => updateTemplateList(prev))
        setTemplates(prev => prev.filter(t => t.id !== data.id))
      } else {
        setTemplates(prev => updateTemplateList(prev))
        setPinnedTemplates(prev => prev.filter(t => t.id !== data.id))
      }
      
      setOperationState("update", { isLoading: false, error: null })
      toast.success("Template updated successfully")
      return updatedTemplate
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update template")
      setOperationState("update", { isLoading: false, error })
      options.onError?.(error)
      toast.error("Failed to update template")
      throw error
    }
  }, [setOperationState, options, toast])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setOperationState("delete", { isLoading: true, error: null })
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      mockTemplates = mockTemplates.filter(t => t.id !== id)
      
      setTemplates(prev => prev.filter(t => t.id !== id))
      setPinnedTemplates(prev => prev.filter(t => t.id !== id))
      setOperationState("delete", { isLoading: false, error: null })
      toast.success("Template deleted successfully")
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete template")
      setOperationState("delete", { isLoading: false, error })
      options.onError?.(error)
      toast.error("Failed to delete template")
      throw error
    }
  }, [setOperationState, options, toast])

  const pinTemplate = useCallback(async (id: string) => {
    const template = [...templates, ...pinnedTemplates].find(t => t.id === id)
    if (!template) throw new Error("Template not found")
    
    await updateTemplate({ id, isPinned: true })
  }, [templates, pinnedTemplates, updateTemplate])

  const unpinTemplate = useCallback(async (id: string) => {
    const template = [...templates, ...pinnedTemplates].find(t => t.id === id)
    if (!template) throw new Error("Template not found")
    
    await updateTemplate({ id, isPinned: false })
  }, [templates, pinnedTemplates, updateTemplate])

  return {
    templates,
    pinnedTemplates,
    operationStates,
    fetchTemplates,
    debouncedFetch,
    cancelFetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    pinTemplate,
    unpinTemplate,
    cleanup
  }
} 