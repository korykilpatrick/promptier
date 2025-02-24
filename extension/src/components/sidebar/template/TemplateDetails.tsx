import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Template } from "../../../../../shared/types/templates";

export const TemplateDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Safely retrieve template from state, defaulting to undefined if missing
  const template = location.state?.template as Template | undefined;

  // Handle missing template (e.g., direct navigation or state loss)
  if (!template) {
    return (
      <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-full plasmo-p-8">
        <p className="plasmo-text-gray-500 plasmo-text-lg plasmo-mb-4">Template not found</p>
        <button
          onClick={() => navigate(-1)}
          className="plasmo-group plasmo-flex plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors"
          aria-label="Back to Templates"
        >
          <span className="plasmo-transform plasmo-transition-transform group-hover:plasmo-translate-x-[-4px]">←</span>
          <span className="plasmo-ml-2">Back to Templates</span>
        </button>
      </div>
    );
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-h-full">
      {/* Header Section */}
      <div className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-px-6 plasmo-py-4 plasmo-shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="plasmo-group plasmo-flex plasmo-items-center plasmo-text-sm plasmo-text-gray-600 hover:plasmo-text-gray-900 plasmo-mb-3 plasmo-transition-colors"
          aria-label="Back to Templates"
        >
          <span className="plasmo-transform plasmo-transition-transform group-hover:plasmo-translate-x-[-4px]">←</span>
          <span className="plasmo-ml-2">Back to Templates</span>
        </button>
        <h2 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900 plasmo-tracking-tight">{template.name}</h2>
        {template.category && (
          <div className="plasmo-mt-1 plasmo-flex plasmo-items-center">
            <span className="plasmo-inline-flex plasmo-items-center plasmo-px-2.5 plasmo-py-0.5 plasmo-rounded-full plasmo-text-xs plasmo-font-medium plasmo-bg-blue-100 plasmo-text-blue-800">
              {template.category}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-p-6">
        <div className="plasmo-bg-gray-50 plasmo-rounded-lg plasmo-shadow-inner plasmo-p-6">
          <pre className="plasmo-whitespace-pre-wrap plasmo-text-sm plasmo-font-mono plasmo-text-gray-800 plasmo-leading-relaxed">
            {template.content}
          </pre>
        </div>
      </div>

      {/* Footer Section */}
      <div className="plasmo-bg-white plasmo-border-t plasmo-border-gray-200 plasmo-px-6 plasmo-py-4">
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-text-sm plasmo-text-gray-500">
          <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
          <div className="plasmo-flex plasmo-space-x-4">
            <button className="plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors">
              Edit
            </button>
            <button className="plasmo-text-blue-600 hover:plasmo-text-blue-800 plasmo-transition-colors">
              {template.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 