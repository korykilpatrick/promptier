import { useState, useCallback } from "react"
import type { Toast, ToastType } from "../components/common/Toast"

interface UseToastOptions {
  defaultDuration?: number
}

export function useToast(options: UseToastOptions = {}) {
  const { defaultDuration = 3000 } = options
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = "info", duration: number = defaultDuration) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      message,
      type,
      duration
    }
    
    setToasts(prev => [...prev, newToast])
    return id
  }, [defaultDuration])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    return addToast(message, "success", duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    return addToast(message, "error", duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    return addToast(message, "info", duration)
  }, [addToast])

  const clear = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    clear
  }
} 