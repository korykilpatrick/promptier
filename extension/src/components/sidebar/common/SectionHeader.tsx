import React from "react"
import type { SectionHeaderProps } from "../../../types/sidebar"
import "../../../styles/transitions.css"

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  isExpanded,
  onToggle,
  id
}) => {
  return (
    <div 
      id={id}
      className="p-4 flex justify-between items-center cursor-pointer hover-transition hover:bg-gray-50"
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      aria-controls={`${title.toLowerCase()}-content`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onToggle()
        }
      }}
    >
      <h2 className="text-lg font-medium text-gray-700">{title}</h2>
      <span 
        className={`text-gray-500 rotate-transition ${isExpanded ? "rotate-180" : "rotate-0"}`}
        aria-hidden="true"
      >
        ▼
      </span>
    </div>
  )
} 