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

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { maxRetries = 3, debounceDelay = 300 } = options
  const [templates, setTemplates] = useState<Template[]>([])
  const [pinnedTemplates, setPinnedTemplates] = useState<Template[]>([])
  const [operationStates, setOperationStates] = useState<Record<string, OperationState>>({})
  const toast = useToast()

  // Create request instances for each operation type
  const fetchRequest = useRequest<Template[]>({ timeout: 5000, retries: maxRetries })
  const createRequest = useRequest<Template>({ timeout: 5000, retries: maxRetries })
  const updateRequest = useRequest<Template>({ timeout: 5000, retries: maxRetries })
  const deleteRequest = useRequest<void>({ timeout: 5000, retries: maxRetries })

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
    fetchRequest.cleanup()
    createRequest.cleanup()
    updateRequest.cleanup()
    deleteRequest.cleanup()
  }, [fetchRequest, createRequest, updateRequest, deleteRequest])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const fetchTemplates = useCallback(async () => {
    try {
      setOperationState("fetch", { isLoading: true, error: null })
      const allTemplates = await fetchRequest.execute(async (signal) => {
        const response = await fetch("/api/templates", { signal })
        if (!response.ok) throw new Error("Failed to fetch templates")
        const data = await response.json()
        return data.templates as Template[]
      })
      
      setTemplates(allTemplates.filter(t => !t.isPinned))
      setPinnedTemplates(allTemplates.filter(t => t.isPinned))
      setOperationState("fetch", { isLoading: false, error: null })
      return allTemplates
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load templates")
      setOperationState("fetch", { isLoading: false, error })
      options.onError?.(error)
      toast.error("Failed to load templates")
      throw error
    }
  }, [fetchRequest, setOperationState, options, toast])

  // Debounced version of fetchTemplates
  const [debouncedFetch, cancelFetch] = useDebouncedCallback(fetchTemplates, debounceDelay)

  const createTemplate = useCallback(async (data: CreateTemplateData) => {
    try {
      setOperationState("create", { isLoading: true, error: null })
      const newTemplate = await createRequest.execute(async () => {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) throw new Error("Failed to create template")
        return response.json()
      })

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
  }, [createRequest, setOperationState, options, toast])

  const updateTemplate = useCallback(async (data: UpdateTemplateData) => {
    try {
      setOperationState("update", { isLoading: true, error: null })
      const updatedTemplate = await updateRequest.execute(async () => {
        const response = await fetch(`/api/templates/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) throw new Error("Failed to update template")
        return response.json()
      })

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
  }, [updateRequest, setOperationState, options, toast])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setOperationState("delete", { isLoading: true, error: null })
      await deleteRequest.execute(async () => {
        const response = await fetch(`/api/templates/${id}`, {
          method: "DELETE"
        })
        
        if (!response.ok) throw new Error("Failed to delete template")
      })
      
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
  }, [deleteRequest, setOperationState, options, toast])

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