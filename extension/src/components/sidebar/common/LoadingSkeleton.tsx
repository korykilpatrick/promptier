import React from "react"
import type { LoadingProps } from "../../../types/sidebar"
import "../../../styles/transitions.css"

interface LoadingSkeletonProps extends LoadingProps {
  count?: number
  variant?: 'text' | 'button' | 'input' | 'card'
  className?: string
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  size = "medium",
  count = 1,
  variant = 'text',
  className = ''
}) => {
  const getHeight = () => {
    switch (size) {
      case "small":
        return "h-4"
      case "large":
        return "h-8"
      default:
        return "h-6"
    }
  }

  const getWidth = () => {
    switch (variant) {
      case 'button':
        return 'w-24'
      case 'input':
        return 'w-full'
      case 'card':
        return 'w-full'
      default:
        return 'w-full'
    }
  }

  const getVariantClasses = () => {
    const baseClasses = "animate-pulse bg-gray-200 rounded"
    switch (variant) {
      case 'button':
        return `${baseClasses} rounded-md`
      case 'input':
        return `${baseClasses} rounded-md`
      case 'card':
        return `${baseClasses} p-4 space-y-2 rounded-md border border-gray-100`
      default:
        return baseClasses
    }
  }

  const renderSkeleton = (index: number) => {
    if (variant === 'card') {
      return (
        <div 
          key={index}
          className={`${getVariantClasses()} ${className}`}
          role="status"
          aria-label="Loading content..."
        >
          <div className="flex items-center justify-between">
            <div className={`${getHeight()} w-1/3 rounded`} />
            <div className={`h-4 w-16 rounded`} />
          </div>
          <div className="space-y-1">
            <div className={`h-3 w-full rounded`} />
            <div className={`h-3 w-5/6 rounded`} />
            <div className={`h-3 w-4/6 rounded`} />
          </div>
        </div>
      )
    }

    return (
      <div
        key={index}
        className={`${getVariantClasses()} ${getHeight()} ${getWidth()} ${className}`}
        role="status"
        aria-label="Loading content..."
      />
    )
  }

  return (
    <div 
      className="space-y-2 loading-fade"
      role="status"
      aria-label={`Loading ${count} items...`}
    >
      {Array.from({ length: count }).map((_, index) => renderSkeleton(index))}
      <span className="sr-only">Loading...</span>
    </div>
  )
} 