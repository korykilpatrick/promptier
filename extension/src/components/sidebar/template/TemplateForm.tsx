// Import dependencies using CommonJS pattern
const React = require("react");
const { useState, useEffect } = React;
const { useTemplateVariables } = require("../../../hooks/useTemplateVariables");
const { VariableMapping } = require("./VariableMapping");

/**
 * @typedef {import("../../../../shared/types/templates").Template} Template
 * 
 * @typedef {Object} TemplateFormProps
 * @property {Template} [template] - Template to edit (undefined for create mode)
 * @property {function(Omit<Template, "id" | "createdAt" | "updatedAt">): void} onSubmit - Submit handler
 * @property {function(): void} onCancel - Cancel handler
 */

/**
 * Form component for creating and editing templates
 * @param {TemplateFormProps} props - Component props
 * @returns {JSX.Element} Component JSX
 */
const TemplateForm = ({ template, onSubmit, onCancel }) => {
  try {
    const [formData, setFormData] = useState({
      name: template?.name ?? "",
      category: template?.category ?? "",
      content: template?.content ?? "",
      isFavorite: template?.isFavorite ?? false,
    });

    // Add template variables management
    const {
      variables,
      values,
      setVariableValue,
      resetValues,
      hasAllRequiredValues
    } = useTemplateVariables({
      template: formData.content,
      initialValues: template?.variables
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        name: formData.name,
        content: formData.content,
        category: formData.category,
        isFavorite: formData.isFavorite,
        variables: values // Include variable values in the submission
      });
    };

    useEffect(() => {
      console.log("TemplateForm rendered with template:", template ? "present" : "not present");
    }, [template]);

    return (
      <form onSubmit={handleSubmit} className="plasmo-w-full">
        {/* Form fields are directly in the page without cards for better mobile compatibility */}
        <div className="plasmo-space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-800">
              Template Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-rounded-md plasmo-border plasmo-border-gray-300 plasmo-shadow-sm 
                       plasmo-focus:border-blue-500 plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20 
                       plasmo-text-sm plasmo-transition-all plasmo-duration-150"
              required
              placeholder="Enter a descriptive name"
            />
          </div>

          {/* Category Field */}
          <div>
            <label htmlFor="category" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-800">
              Category <span className="plasmo-text-gray-500 plasmo-text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="plasmo-mt-1 plasmo-block plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-rounded-md plasmo-border plasmo-border-gray-300 plasmo-shadow-sm 
                       plasmo-focus:border-blue-500 plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20 
                       plasmo-text-sm plasmo-transition-all plasmo-duration-150"
              placeholder="e.g., Code Generation, Writing, Research"
            />
          </div>

          {/* Template Content Field */}
          <div>
            <label htmlFor="content" className="plasmo-block plasmo-text-sm plasmo-font-medium plasmo-text-gray-800">
              Template Content
            </label>
            <div className="plasmo-mt-1 plasmo-relative">
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-gray-300 plasmo-shadow-sm 
                        plasmo-focus:border-blue-500 plasmo-focus:ring-2 plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20
                        plasmo-font-mono plasmo-text-sm plasmo-p-3 plasmo-resize-y plasmo-transition-all plasmo-duration-150"
                required
                placeholder="Write your prompt template here..."
              />
              <div className="plasmo-absolute plasmo-right-2 plasmo-bottom-2 plasmo-text-xs plasmo-text-gray-500 plasmo-px-1.5 plasmo-py-0.5 plasmo-bg-white plasmo-border plasmo-border-gray-100 plasmo-rounded-md">
                {formData.content.length} characters
              </div>
            </div>
            
            {/* Variable Syntax Info - Integrated into Content Section */}
            <div className="plasmo-mt-3 plasmo-flex plasmo-flex-col plasmo-sm:flex-row plasmo-items-start plasmo-gap-2 plasmo-text-xs plasmo-bg-blue-50 plasmo-p-3 plasmo-rounded-md plasmo-border plasmo-border-blue-100">
              <div className="plasmo-flex plasmo-items-center plasmo-text-blue-700 plasmo-font-medium plasmo-whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" className="plasmo-h-4 plasmo-w-4 plasmo-mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Variable Syntax:
              </div>
              <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-2">
                <code className="plasmo-bg-white plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded plasmo-border plasmo-border-gray-200 plasmo-font-mono plasmo-text-gray-600">
                  {"{{variableName}}"}
                </code>
                <code className="plasmo-bg-white plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded plasmo-border plasmo-border-gray-200 plasmo-font-mono plasmo-text-gray-600">
                  {"{{variableName:default}}"}
                </code>
                <code className="plasmo-bg-white plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded plasmo-border plasmo-border-gray-200 plasmo-font-mono plasmo-text-gray-600">
                  {"{{variableName:default:description}}"}
                </code>
              </div>
            </div>
          </div>

          {/* Variables section */}
          <div className="plasmo-mt-4">
            <VariableMapping
              variables={variables}
              values={values}
              onVariableChange={setVariableValue}
              onReset={resetValues}
            />
          </div>

          {/* Form Actions */}
          <div className="plasmo-flex plasmo-justify-end plasmo-space-x-3 plasmo-pt-2 plasmo-mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-bg-white plasmo-border plasmo-border-gray-300 
                      plasmo-rounded-md plasmo-shadow-sm hover:plasmo-bg-gray-50 plasmo-focus:outline-none plasmo-focus:ring-2 
                      plasmo-focus:ring-offset-2 plasmo-focus:ring-blue-500 plasmo-transition-colors plasmo-duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasAllRequiredValues}
              className="plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-text-white plasmo-bg-blue-600 plasmo-border plasmo-border-transparent 
                      plasmo-rounded-md plasmo-shadow-sm hover:plasmo-bg-blue-700 plasmo-focus:outline-none plasmo-focus:ring-2 
                      plasmo-focus:ring-offset-2 plasmo-focus:ring-blue-500 disabled:plasmo-opacity-50 
                      disabled:plasmo-cursor-not-allowed plasmo-transition-all plasmo-duration-150"
            >
              {template ? "Update" : "Create"} Template
            </button>
          </div>
        </div>
      </form>
    );
  } catch (error) {
    console.error("Error rendering TemplateForm:", error);
    return (
      <div className="plasmo-p-4 plasmo-bg-red-50 plasmo-border plasmo-border-red-200 plasmo-rounded-md plasmo-text-red-600">
        <p>There was an error rendering the form. Please refresh and try again.</p>
        <p className="plasmo-text-xs plasmo-mt-1">{error.message}</p>
      </div>
    );
  }
};

// Use exports assigned to module.exports pattern
module.exports = { TemplateForm }; 