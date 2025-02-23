import React, { useEffect } from "react";
import type { ResponseSectionProps } from "../../types/sidebar";
import { SectionHeader } from "./common/SectionHeader";
import { LoadingSkeleton } from "./common/LoadingSkeleton";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { ErrorBoundary } from "../common/ErrorBoundary";

export const ResponseSection: React.FC<ResponseSectionProps> = (props) => {
  return (
    <ErrorBoundary>
      <ResponseSectionContent {...props} />
    </ErrorBoundary>
  );
};

const ResponseSectionContent: React.FC<ResponseSectionProps> = ({
  isExpanded,
  onToggle,
  currentResponse,
  isAutoSaveEnabled,
  isSaving = false,
  onResponseChange,
  onToggleAutoSave,
  onSaveResponse,
}) => {
  useKeyboardNavigation({
    onArrowDown: () => {
      if (isExpanded) {
        const textarea = document.querySelector<HTMLTextAreaElement>("#response-textarea");
        textarea?.focus();
      }
    },
    onEscape: () => {
      if (isExpanded) {
        const header = document.querySelector<HTMLDivElement>("#response-header");
        header?.focus();
      }
    },
    disabled: !isExpanded || isSaving,
  });

  useEffect(() => {
    if (!isExpanded) {
      const header = document.querySelector<HTMLDivElement>("#response-header");
      header?.focus();
    }
  }, [isExpanded]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (!isSaving && currentResponse.trim()) {
        onSaveResponse();
      }
    }
  };

  return (
    <section className="plasmo-p-4" aria-expanded={isExpanded}>
      <SectionHeader
        title="Save Response"
        isExpanded={isExpanded}
        onToggle={onToggle}
        id="response-header"
      />
      {isExpanded && (
        <div className="plasmo-animate-slide-down">
          {/* Response Text Area */}
          <div className="plasmo-mb-4">
            <textarea
              id="response-textarea"
              className="plasmo-w-full plasmo-h-32 plasmo-p-2 plasmo-border plasmo-border-gray-300 plasmo-rounded plasmo-resize-none focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500"
              placeholder="Paste AI response here..."
              value={currentResponse}
              onChange={(e) => onResponseChange(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="AI response content"
            />
          </div>

          {/* Save Controls */}
          <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
            <label className="plasmo-flex plasmo-items-center plasmo-space-x-2">
              <input
                type="checkbox"
                className="plasmo-form-checkbox plasmo-text-blue-600"
                checked={isAutoSaveEnabled}
                onChange={onToggleAutoSave}
                aria-label="Enable auto-save responses"
              />
              <span className="plasmo-text-sm plasmo-text-gray-700">Auto-save responses</span>
            </label>
            <button
              className={`plasmo-btn-primary ${isSaving ? "plasmo-opacity-75 plasmo-cursor-not-allowed" : ""}`}
              onClick={onSaveResponse}
              disabled={isSaving}
              aria-label="Save response"
              aria-busy={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};