import React from "react"

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading...",
  fullScreen = false 
}) => {
  const containerClasses = fullScreen 
    ? "flex items-center justify-center h-screen"
    : "flex items-center justify-center h-full min-h-[200px]"

  return (
    <div 
      className={containerClasses}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
} 