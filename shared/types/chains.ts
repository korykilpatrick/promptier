/**
 * Types for prompt chains and responses, shared between frontend and backend
 */

// Chain related interfaces
export interface ChainStep {
  id: number;
  type: 'execute_prompt' | 'save_to_disk' | 'restart_chain';
  templateId?: number;
  content?: string;
  order: number;
}

export interface PromptChain {
  id: number;
  name: string;
  steps: ChainStep[];
  createdAt: string;
  updatedAt: string;
}

// API request/response types
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

// Response related interfaces
export interface SavedResponse {
  id: number;
  content: string;
  sourceType: 'template' | 'chain';
  sourceId: number;
  createdAt: string;
}

// Common API response types
export interface SuccessResponse<T> {
  id?: number; // For POST responses
  message?: string; // For PUT/DELETE responses
  data?: T; // For GET responses
}

export interface ErrorResponse {
  error: string;
} 