/**
 * Common component types used across the application
 */

import type { Template } from './templates';
import type { PromptChain } from './chains';

// Common section interfaces
export interface BaseSection {
  isExpanded: boolean;
  onToggle: () => void;
}

export interface TemplateSectionProps extends BaseSection {
  templates?: Template[];
  favoriteTemplates?: Template[];
  isLoading?: boolean;
  onCreateTemplate?: () => void;
  onFavoriteTemplate?: (templateId: number) => void;
  onUnfavoriteTemplate?: (templateId: number) => void;
  onSelectTemplate?: (template: Template) => void;
  onEditTemplate?: (template: Template) => void;
  onDeleteTemplate?: (templateId: number) => void;
}

export interface ChainSectionProps extends BaseSection {
  chains: PromptChain[];
  activeChain?: PromptChain;
  isLoading?: boolean;
  onCreateChain?: () => void;
  onSelectChain?: (chain: PromptChain) => void;
  onExecuteStep?: (chainId: string, stepId: string) => void;
}

export interface ResponseSectionProps extends BaseSection {
  currentResponse: string;
  isAutoSaveEnabled: boolean;
  isSaving: boolean;
  onResponseChange: (response: string) => void;
  onToggleAutoSave: () => void;
  onSaveResponse: () => void;
}

// Common component props
export interface SectionHeaderProps extends BaseSection {
  title: string;
  id: string;
}

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
} 