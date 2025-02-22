/**
 * @description
 * This TypeScript file contains the logic for the Promptier extension’s sidebar.
 * It will interact with the sidebar.html DOM, managing user inputs, template operations,
 * and prompt chain execution, compiled to JavaScript for inclusion in the extension.
 * 
 * Key features:
 * - Type Definitions: Initial interfaces for templates and chains.
 * - Future Role: Will manage template creation, variable mapping, and prompt generation.
 * 
 * @dependencies
 * - None currently (DOM dependencies added later).
 * 
 * @notes
 * - Types align with server schema (templates, prompt_chains tables).
 * - Interfaces will evolve as features are implemented.
 */
// Interface for a prompt template
export interface Template {
  id: number;
  name: string;
  category?: string;
  templateText: string;
  isPinned: boolean;
}

// Interface for a prompt chain
export interface PromptChain {
  id: number;
  name: string;
  steps: ChainStep[];
}

// Interface for a chain step
export interface ChainStep {
  id: number;
  action: 'execute_prompt' | 'save_to_disk' | 'restart_chain';
  data: { [key: string]: any }; // e.g., { templateId: number } or { fileNamePattern: string }
  stepOrder: number;
}

// Logic for the sidebar
// Manages template creation, variable mapping, and prompt generation
// To be implemented in later steps
