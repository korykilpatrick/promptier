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
      <div className="plasmo-p-4">
        <p className="plasmo-text-center plasmo-text-gray-600">Template not found</p>
        <button
          onClick={() => navigate(-1)}
          className="plasmo-mt-4 plasmo-text-blue-600 hover:plasmo-text-blue-800 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500"
          aria-label="Back to Templates"
        >
          ← Back to Templates
        </button>
      </div>
    );
  }

  return (
    <div className="plasmo-p-4 plasmo-h-full plasmo-flex plasmo-flex-col">
      <button
        onClick={() => navigate(-1)}
        className="plasmo-mb-4 plasmo-text-blue-600 hover:plasmo-text-blue-800 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-blue-500"
        aria-label="Back to Templates"
      >
        ← Back to Templates
      </button>
      <h2 className="plasmo-text-xl plasmo-font-semibold plasmo-mb-2">{template.name}</h2>
      {template.category && (
        <p className="plasmo-text-sm plasmo-text-gray-600 plasmo-mb-4">Category: {template.category}</p>
      )}
      <div className="plasmo-bg-gray-100 plasmo-p-4 plasmo-rounded-md plasmo-flex-1 plasmo-overflow-auto">
        <pre className="plasmo-whitespace-pre-wrap plasmo-text-sm">{template.content}</pre>
      </div>
    </div>
  );
}; 