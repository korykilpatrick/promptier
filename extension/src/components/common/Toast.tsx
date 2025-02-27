import React, { useEffect } from "react"
import { createPortal } from "react-dom"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onDismiss(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500"
  }[toast.type]

  const icon = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠"
  }[toast.type]

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in`}
      role="alert"
    >
      <span className="font-bold">{icon}</span>
      <p className="flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white hover:text-gray-200 focus:outline-none"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const container = document.getElementById("toast-root") || document.body

  return createPortal(
    <div
      className="fixed top-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    container
  )
} 