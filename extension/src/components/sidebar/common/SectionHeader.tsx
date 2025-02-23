import React from "react";
import type { SectionHeaderProps } from "../../../types/sidebar";

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  isExpanded,
  onToggle,
  id,
}) => {
  return (
    <div
      id={id}
      className="plasmo-section-header"
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      aria-controls={`${title.toLowerCase()}-content`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-700">{title}</h2>
      <span
        className={`plasmo-text-gray-500 plasmo-transition-transform ${
          isExpanded ? "plasmo-rotate-180" : "plasmo-rotate-0"
        }`}
        aria-hidden="true"
      >
        ▼
      </span>
    </div>
  );
};