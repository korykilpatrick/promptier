import React from "react";
import type { LoadingProps } from "../../../types/sidebar";

interface LoadingSkeletonProps extends LoadingProps {
  count?: number;
  variant?: "text" | "button" | "input" | "card";
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  size = "medium",
  count = 1,
  variant = "text",
  className = "",
}) => {
  const getHeight = () => {
    switch (size) {
      case "small":
        return "plasmo-h-4";
      case "large":
        return "plasmo-h-8";
      default:
        return "plasmo-h-6";
    }
  };

  const getWidth = () => {
    switch (variant) {
      case "button":
        return "plasmo-w-24";
      case "input":
        return "plasmo-w-full";
      case "card":
        return "plasmo-w-full";
      default:
        return "plasmo-w-full";
    }
  };

  const getVariantClasses = () => {
    const baseClasses = "plasmo-animate-pulse plasmo-bg-gray-200 plasmo-rounded";
    switch (variant) {
      case "button":
        return `${baseClasses} plasmo-rounded-md`;
      case "input":
        return `${baseClasses} plasmo-rounded-md`;
      case "card":
        return `${baseClasses} plasmo-p-4 plasmo-space-y-2 plasmo-rounded-md plasmo-border plasmo-border-gray-100`;
      default:
        return baseClasses;
    }
  };

  const renderSkeleton = (index: number) => {
    if (variant === "card") {
      return (
        <div
          key={index}
          className={`${getVariantClasses()} ${className}`}
          role="status"
          aria-label="Loading content..."
        >
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
            <div className={`${getHeight()} plasmo-w-1/3 plasmo-rounded`} />
            <div className="plasmo-h-4 plasmo-w-16 plasmo-rounded" />
          </div>
          <div className="plasmo-space-y-1">
            <div className="plasmo-h-3 plasmo-w-full plasmo-rounded" />
            <div className="plasmo-h-3 plasmo-w-5/6 plasmo-rounded" />
            <div className="plasmo-h-3 plasmo-w-4/6 plasmo-rounded" />
          </div>
        </div>
      );
    }

    return (
      <div
        key={index}
        className={`${getVariantClasses()} ${getHeight()} ${getWidth()} ${className}`}
        role="status"
        aria-label="Loading content..."
      />
    );
  };

  return (
    <div
      className={`plasmo-space-y-2 plasmo-animate-fade-in`}
      role="status"
      aria-label={`Loading ${count} items...`}
    >
      {Array.from({ length: count }).map((_, index) => renderSkeleton(index))}
      <span className="plasmo-sr-only">Loading...</span>
    </div>
  );
};