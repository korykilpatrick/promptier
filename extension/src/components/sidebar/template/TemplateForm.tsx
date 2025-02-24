import React, { useState } from "react"
import type { Template } from "../../../../shared/types/templates"
import { useTemplateVariables } from "../../../hooks/useTemplateVariables"
import { VariableMapping } from "./VariableMapping"

interface TemplateFormProps {
  template?: Template
  onSubmit: (template: Omit<Template, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSubmit,
  onCancel
}) => {
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
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: formData.name,
      content: formData.content,
      category: formData.category,
      isFavorite: formData.isFavorite,
      variables: values // Include variable values in the submission
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category (optional)
        </label>
        <input
          type="text"
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Template Content
        </label>
        <textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={5}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Use {`{{variableName}}`} for required variables, {`{{variableName:default}}`} for variables with defaults,
          and {`{{variableName:default:description}}`} to add descriptions.
        </p>
      </div>

      {/* Add variable mapping section */}
      <VariableMapping
        variables={variables}
        values={values}
        onVariableChange={setVariableValue}
        onReset={resetValues}
        className="mt-4"
      />

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!hasAllRequiredValues}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {template ? "Update" : "Create"} Template
        </button>
      </div>
    </form>
  )
} 