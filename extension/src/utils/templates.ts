import { makeApiRequest } from "./api"
import type { Template } from "../../../shared/types/templates"

// Types used locally
interface TemplateRequestData {
  name: string
  category: string | null
  template_text: string
}

interface ApiTemplate {
  id: number
  name: string
  template_text: string
  category?: string | null
  is_favorite: boolean
  created_at?: string
}

/**
 * Create a new template
 */
export async function createTemplate(template: Partial<Template>): Promise<Template> {
  const requestData: TemplateRequestData = {
    name: template.name || "",
    category: template.category || null,
    template_text: template.content || ""
  }

  const response = await makeApiRequest<ApiTemplate>({
    url: "/templates",
    method: "POST",
    body: requestData
  })

  if (response.error) {
    throw new Error(`Failed to create template: ${response.error}`)
  }

  return transformApiTemplate(response.data as ApiTemplate)
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: number | string, template: Partial<Template>): Promise<Template> {
  const requestData: TemplateRequestData = {
    name: template.name || "",
    category: template.category || null,
    template_text: template.content || ""
  }

  const response = await makeApiRequest<ApiTemplate>({
    url: `/templates/${id}`,
    method: "PUT",
    body: requestData
  })

  if (response.error) {
    throw new Error(`Failed to update template: ${response.error}`)
  }

  return transformApiTemplate(response.data as ApiTemplate)
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: number | string): Promise<boolean> {
  const response = await makeApiRequest({
    url: `/templates/${id}`,
    method: "DELETE"
  })

  if (response.error) {
    throw new Error(`Failed to delete template: ${response.error}`)
  }

  return true
}

/**
 * Transform API template response to frontend template format
 */
function transformApiTemplate(apiTemplate: ApiTemplate): Template {
  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    content: apiTemplate.template_text,
    category: apiTemplate.category || "",
    isFavorite: apiTemplate.is_favorite || false,
    createdAt: apiTemplate.created_at ? new Date(apiTemplate.created_at).toISOString() : new Date().toISOString()
  }
} 