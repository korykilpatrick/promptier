/**
 * Shared types for user variables between frontend and backend
 */

// Base variable interface
export interface BaseVariable {
  id: number;
  name: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// Request type for creating/updating user variables
export interface VariableRequest {
  name: string;
  value: string;
}

// Response type for user variables
export interface VariableResponse {
  data: BaseVariable | BaseVariable[];
}

// Frontend-specific variable type
export interface UserVariable {
  id: number;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

// Functions to convert between backend and frontend variable formats
export function toFrontendVariable(backendVariable: BaseVariable): UserVariable {
  return {
    id: backendVariable.id,
    name: backendVariable.name,
    value: backendVariable.value,
    createdAt: backendVariable.created_at,
    updatedAt: backendVariable.updated_at
  };
}

export function toBackendVariable(frontendVariable: Partial<UserVariable>): VariableRequest {
  return {
    name: frontendVariable.name!,
    value: frontendVariable.value!
  };
} 