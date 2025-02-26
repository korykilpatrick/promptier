/**
 * Shared types for user variables between frontend and backend
 */

// Variable entry type constants
export const VARIABLE_ENTRY_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  DIRECTORY: 'directory'
} as const;

// Type for variable entry types
export type VariableEntryType = typeof VARIABLE_ENTRY_TYPES[keyof typeof VARIABLE_ENTRY_TYPES];

// Base variable entry interface
export interface VariableEntry {
  id?: string;         // Optional identifier for the entry
  type: VariableEntryType;
  name?: string;       // Optional display name
  value: string;       // Value (text content or file/directory path)
  metadata?: {
    size?: number;     // File size in bytes
    type?: string;     // MIME type
    lastModified?: number; // Last modified timestamp
    handle?: any;      // Optional file system handle reference (serialized)
    path?: string;     // Original file path
  };
}

// Base variable interface
export interface BaseVariable {
  id: number;
  name: string;
  value: VariableEntry[];
  created_at: string;
  updated_at: string;
}

// Request type for creating/updating user variables
export interface VariableRequest {
  name: string;
  value: VariableEntry[];
}

// Response type for user variables
export interface VariableResponse {
  data: BaseVariable | BaseVariable[];
}

// Frontend-specific variable type
export interface UserVariable {
  id: number;
  name: string;
  value: VariableEntry[];
  createdAt: string;
  updatedAt: string;
}

// Functions to convert between backend and frontend variable formats
export function toFrontendVariable(backendVariable: BaseVariable): UserVariable {
  return {
    id: backendVariable.id,
    name: backendVariable.name,
    value: backendVariable.value || [],
    createdAt: backendVariable.created_at,
    updatedAt: backendVariable.updated_at
  };
}

export function toBackendVariable(frontendVariable: Partial<UserVariable>): VariableRequest {
  return {
    name: frontendVariable.name!,
    value: frontendVariable.value || []
  };
}

// Helper functions for working with variable entries

// Check if a variable contains any file entries
export function hasFileEntries(variable: BaseVariable | UserVariable): boolean {
  return variable.value.some(entry => entry.type === VARIABLE_ENTRY_TYPES.FILE);
}

// Check if a variable contains any directory entries
export function hasDirectoryEntries(variable: BaseVariable | UserVariable): boolean {
  return variable.value.some(entry => entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY);
}

// Check if a variable contains only text entries
export function hasOnlyTextEntries(variable: BaseVariable | UserVariable): boolean {
  return variable.value.every(entry => entry.type === VARIABLE_ENTRY_TYPES.TEXT);
}

// Get all file entries from a variable
export function getFileEntries(variable: BaseVariable | UserVariable): VariableEntry[] {
  return variable.value.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.FILE);
}

// Get all directory entries from a variable
export function getDirectoryEntries(variable: BaseVariable | UserVariable): VariableEntry[] {
  return variable.value.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY);
}

// Get all text entries from a variable
export function getTextEntries(variable: BaseVariable | UserVariable): VariableEntry[] {
  return variable.value.filter(entry => entry.type === VARIABLE_ENTRY_TYPES.TEXT);
}

// Create a simple text variable entry
export function createTextEntry(value: string, id?: string, name?: string): VariableEntry {
  return {
    id,
    type: VARIABLE_ENTRY_TYPES.TEXT,
    name,
    value
  };
}

// Create a file variable entry
export function createFileEntry(
  path: string, 
  id?: string, 
  name?: string, 
  metadata?: VariableEntry['metadata']
): VariableEntry {
  return {
    id,
    type: VARIABLE_ENTRY_TYPES.FILE,
    name: name || path.split('/').pop(),
    value: path,
    metadata
  };
}

// Create a directory variable entry
export function createDirectoryEntry(
  path: string, 
  id?: string, 
  name?: string,
  metadata?: VariableEntry['metadata']
): VariableEntry {
  return {
    id,
    type: VARIABLE_ENTRY_TYPES.DIRECTORY,
    name: name || path.split('/').pop(),
    value: path,
    metadata
  };
}

// Type checking utilities for entries
export function isTextEntry(entry: VariableEntry): boolean {
  return entry.type === VARIABLE_ENTRY_TYPES.TEXT;
}

export function isFileEntry(entry: VariableEntry): boolean {
  return entry.type === VARIABLE_ENTRY_TYPES.FILE;
}

export function isDirectoryEntry(entry: VariableEntry): boolean {
  return entry.type === VARIABLE_ENTRY_TYPES.DIRECTORY;
}

// Format a file path for display
export function formatFilePath(path: string): string {
  // Extract filename from path
  const filename = path.split('/').pop() || path;
  
  // If the path is too long, truncate the middle
  if (path.length > 40) {
    const start = path.substring(0, 15);
    const end = path.substring(path.length - 20);
    return `${start}...${end}`;
  }
  
  return path;
}

// Get display name for an entry
export function getEntryDisplayName(entry: VariableEntry): string {
  if (entry.name) {
    return entry.name;
  }
  
  if (isFileEntry(entry) || isDirectoryEntry(entry)) {
    return entry.value.split('/').pop() || entry.value;
  }
  
  return 'Unnamed entry';
}

// Get icon type for entry (can be used for UI display)
export function getEntryIconType(entry: VariableEntry): string {
  switch (entry.type) {
    case VARIABLE_ENTRY_TYPES.FILE:
      return 'file';
    case VARIABLE_ENTRY_TYPES.DIRECTORY:
      return 'folder';
    case VARIABLE_ENTRY_TYPES.TEXT:
    default:
      return 'text';
  }
} 