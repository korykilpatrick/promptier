import React, { useState, useRef, useEffect } from "react"
import type { Template, PromptChain } from "../../types/sidebar"
import { TemplateSection } from "./TemplateSection"
import { ChainSection } from "./ChainSection"
import { ResponseSection } from "./ResponseSection"
import { ErrorBoundary } from "../common/ErrorBoundary"
import { useFocusManagement } from "../../hooks/useFocusManagement"
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation"
import { useTemplates } from "../../hooks/useTemplates"

export const Sidebar: React.FC = () => {
  // Initialize templates hook
  const {
    templates,
    pinnedTemplates,
    operationStates,
    fetchTemplates,
    createTemplate,
    pinTemplate,
    unpinTemplate,
    cleanup
  } = useTemplates()

  // Fetch templates once on mount
  useEffect(() => {
    fetchTemplates()
    return cleanup
  }, []) // Empty dependency array to run only once on mount

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    templates: true,
    chains: true,
    response: true
  })

  // Container ref for focus management
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus and keyboard navigation
  const { currentFocus, setFocus, focusNext, focusPrevious } = useFocusManagement({
    itemCount: 3, // Three sections: templates, chains, response
    onFocusChange: (index) => {
      // Handle focus change if needed
    }
  })

  // Setup keyboard navigation
  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEscape: () => {
      // TODO: Implement close sidebar
    }
  })

  const toggleSection = (section: 'templates' | 'chains' | 'response') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Templates state
  const isTemplatesLoading = operationStates["fetch"]?.isLoading ?? false

  // Chains state
  const [chains, setChains] = useState<PromptChain[]>([])
  const [activeChain, setActiveChain] = useState<PromptChain | undefined>()
  const [isChainsLoading, setIsChainsLoading] = useState(false)

  // Response state
  const [currentResponse, setCurrentResponse] = useState("")
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Template handlers
  const handleCreateTemplate = () => {
    // TODO: Implement template creation
  }

  const handlePinTemplate = (templateId: string) => {
    // TODO: Implement template pinning
  }

  const handleUnpinTemplate = (templateId: string) => {
    // TODO: Implement template unpinning
  }

  const handleSelectTemplate = (template: Template) => {
    // TODO: Implement template selection
  }

  // Chain handlers
  const handleCreateChain = () => {
    // TODO: Implement chain creation
  }

  const handleSelectChain = (chain: PromptChain) => {
    setActiveChain(chain)
  }

  const handleExecuteStep = (chainId: string, stepId: string) => {
    // TODO: Implement step execution
  }

  // Response handlers
  const handleResponseChange = (response: string) => {
    setCurrentResponse(response)
  }

  const handleToggleAutoSave = () => {
    setIsAutoSaveEnabled(!isAutoSaveEnabled)
  }

  const handleSaveResponse = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement response saving
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulated delay
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div 
      ref={containerRef}
      className="plasmo-h-full plasmo-bg-white plasmo-flex plasmo-flex-col"
      role="complementary"
      aria-label="Promptier Sidebar"
      tabIndex={0}
    >      
      <div className="plasmo-flex-1 plasmo-overflow-y-auto">
        <ErrorBoundary>
          <TemplateSection 
            isExpanded={expandedSections.templates}
            onToggle={() => toggleSection('templates')}
            templates={templates}
            pinnedTemplates={pinnedTemplates}
            isLoading={isTemplatesLoading}
            onCreateTemplate={handleCreateTemplate}
            onPinTemplate={handlePinTemplate}
            onUnpinTemplate={handleUnpinTemplate}
            onSelectTemplate={handleSelectTemplate}
          />
          <ChainSection 
            isExpanded={expandedSections.chains}
            onToggle={() => toggleSection('chains')}
            chains={chains}
            activeChain={activeChain}
            isLoading={isChainsLoading}
            onCreateChain={handleCreateChain}
            onSelectChain={handleSelectChain}
            onExecuteStep={handleExecuteStep}
          />
          <ResponseSection 
            isExpanded={expandedSections.response}
            onToggle={() => toggleSection('response')}
            currentResponse={currentResponse}
            isAutoSaveEnabled={isAutoSaveEnabled}
            isSaving={isSaving}
            onResponseChange={handleResponseChange}
            onToggleAutoSave={handleToggleAutoSave}
            onSaveResponse={handleSaveResponse}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
} 