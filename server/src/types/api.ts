/**
 * @description
 * This module defines TypeScript interfaces for API request bodies and responses
 * used in the Promptier server. It enhances type safety by providing explicit types
 * for chains and templates endpoints, ensuring compile-time checks for data structures.
 * 
 * Key features:
 * - Request Types: Defines expected shapes for POST/PUT request bodies.
 * - Response Types: Defines shapes for successful API responses and database rows.
 * - Error Types: Standardizes error response format for consistency.
 * 
 * @dependencies
 * - None (pure TypeScript type definitions).
 * 
 * @notes
 * - Reflects the database schema from `001_create_tables.sql` (e.g., `created_by` for ownership).
 * - `ChainStepRequest.data` and `ChainStepResponse.data` use `any` temporarily; refine in future steps if specific schemas emerge.
 * - Designed to be extensible for additional endpoints or fields.
 */

export interface ChainStepRequest {
    action: string; // Action name (e.g., 'execute_prompt')
    data: any; // JSONB field; to be refined based on action type in future iterations
    step_order: number;
  }
  
  export interface ChainRequest {
    name: string;
    steps: ChainStepRequest[];
  }
  
  export interface ChainStepResponse {
    id: number;
    chain_id: number;
    action_id: number;
    action: string; // Joined from `actions.name`
    data: any; // JSONB field
    step_order: number;
    created_at: string;
  }
  
  export interface ChainResponse {
    id: number;
    created_by: number;
    name: string;
    created_at: string;
    steps: ChainStepResponse[];
  }
  
  export interface TemplateRequest {
    name: string;
    category?: string | null;
    template_text: string;
    is_pinned?: boolean;
  }
  
  export interface TemplateResponse {
    id: number;
    created_by: number;
    name: string;
    category: string | null;
    template_text: string;
    is_pinned: boolean;
    created_at: string;
  }
  
  export interface SuccessResponse<T> {
    id?: number; // For POST responses
    message?: string; // For PUT/DELETE responses
    data?: T; // For GET responses
  }
  
  export interface ErrorResponse {
    error: string;
  }