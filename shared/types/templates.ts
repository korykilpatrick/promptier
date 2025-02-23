/**
 * Shared types for templates between frontend and backend
 */

// Base template interface matching database schema
export interface BaseTemplate {
  id: number;
  created_by: number;
  name: string;
  category: string | null;
  template_text: string;
  created_at: string;
}

// User's relationship to a template
export interface UserTemplate {
  template_id: number;
  user_id: number;
  is_favorite: boolean;
  associated_at: string;
}

// Request type for creating/updating templates
export interface TemplateRequest {
  name: string;
  category?: string | null;
  template_text: string;
}

// Response type from the API - includes template and user relationship
export interface TemplateResponse extends BaseTemplate {
  is_favorite: boolean; // Computed from user_templates join
}

// Frontend-specific template type
export interface Template {
  id: number;
  name: string;
  content: string;  // Maps to template_text
  isFavorite: boolean;  // Maps to user_templates.is_favorite
  category?: string;
  createdAt: string;  // Maps to created_at
  variables?: Record<string, string>;  // Frontend-only field
}

// Type guard to check if a value is a Template
export function isTemplate(value: unknown): value is Template {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'content' in value &&
    'isFavorite' in value
  );
}

// Conversion functions
export function toFrontendTemplate(dbTemplate: TemplateResponse): Template {
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    content: dbTemplate.template_text,
    isFavorite: dbTemplate.is_favorite,
    category: dbTemplate.category ?? undefined,
    createdAt: dbTemplate.created_at,
  };
}

export function toBackendTemplate(frontendTemplate: Partial<Template>): TemplateRequest {
  return {
    name: frontendTemplate.name!,
    category: frontendTemplate.category ?? null,
    template_text: frontendTemplate.content!,
  };
} 