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

  // Get appropriate styling based on toast type
  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return "plasmo-bg-success-500 plasmo-text-white plasmo-border-success-700";
      case "error":
        return "plasmo-bg-error-500 plasmo-text-white plasmo-border-error-700";
      case "info":
      default:
        return "plasmo-bg-primary-500 plasmo-text-white plasmo-border-primary-700";
    }
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg className="plasmo-w-5 plasmo-h-5 plasmo-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        ${getToastStyles()}
        plasmo-flex plasmo-items-center plasmo-shadow-lg plasmo-rounded-lg plasmo-border
        plasmo-px-4 plasmo-py-3 plasmo-mb-3 plasmo-max-w-sm plasmo-animate-fade-in plasmo-animate-slide-down
      `}
      role="alert"
    >
      <div className="plasmo-flex-shrink-0 plasmo-mr-3">
        {getToastIcon()}
      </div>
      <div className="plasmo-flex-1 plasmo-text-sm plasmo-mr-2">
        {toast.message}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="plasmo-flex-shrink-0 plasmo-p-1 plasmo-rounded-full plasmo-text-white plasmo-opacity-70 hover:plasmo-opacity-100 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-white"
        aria-label="Dismiss notification"
      >
        <svg className="plasmo-w-4 plasmo-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
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
      className="plasmo-space-y-2"
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