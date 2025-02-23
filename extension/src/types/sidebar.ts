// Common interfaces
export interface BaseSection {
  isExpanded: boolean
  onToggle: () => void
}

// Template related interfaces
export interface Template {
  id: string
  name: string
  content: string
  isPinned: boolean
  category?: string
  createdAt: string
  updatedAt: string
  variables?: Record<string, string>
}

export interface TemplateSectionProps extends BaseSection {
  templates: Template[]
  pinnedTemplates: Template[]
  isLoading?: boolean
  onCreateTemplate: () => void
  onPinTemplate: (templateId: string) => void
  onUnpinTemplate: (templateId: string) => void
  onSelectTemplate: (template: Template) => void
}

// Chain related interfaces
export interface ChainStep {
  id: string
  type: 'execute_prompt' | 'save_to_disk' | 'restart_chain'
  templateId?: string
  content?: string
  order: number
}

export interface PromptChain {
  id: string
  name: string
  steps: ChainStep[]
  createdAt: string
  updatedAt: string
}

export interface ChainSectionProps extends BaseSection {
  chains: PromptChain[]
  activeChain?: PromptChain
  isLoading?: boolean
  onCreateChain: () => void
  onSelectChain: (chain: PromptChain) => void
  onExecuteStep: (chainId: string, stepId: string) => void
}

// Response related interfaces
export interface SavedResponse {
  id: string
  content: string
  sourceType: 'template' | 'chain'
  sourceId: string
  createdAt: string
}

export interface ResponseSectionProps extends BaseSection {
  currentResponse: string
  isAutoSaveEnabled: boolean
  isSaving?: boolean
  onResponseChange: (response: string) => void
  onToggleAutoSave: () => void
  onSaveResponse: () => void
}

// Common component props
export interface SectionHeaderProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  id?: string
}

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large'
} 