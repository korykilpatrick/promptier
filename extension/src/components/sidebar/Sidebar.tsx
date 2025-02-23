import React, { useState } from "react"
import type { Template, PromptChain } from "../../types/sidebar"
import { TemplateSection } from "./TemplateSection"
import { ChainSection } from "./ChainSection"
import { ResponseSection } from "./ResponseSection"

export const Sidebar: React.FC = () => {
  // Section expansion states
  const [templateExpanded, setTemplateExpanded] = useState(true)
  const [chainExpanded, setChainExpanded] = useState(true)
  const [responseExpanded, setResponseExpanded] = useState(true)

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([])
  const [pinnedTemplates, setPinnedTemplates] = useState<Template[]>([])
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false)

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
    <div className="w-80 h-screen bg-white shadow-lg flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Promptier</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto sidebar-scrollbar">
        <TemplateSection 
          isExpanded={templateExpanded}
          onToggle={() => setTemplateExpanded(!templateExpanded)}
          templates={templates}
          pinnedTemplates={pinnedTemplates}
          isLoading={isTemplatesLoading}
          onCreateTemplate={handleCreateTemplate}
          onPinTemplate={handlePinTemplate}
          onUnpinTemplate={handleUnpinTemplate}
          onSelectTemplate={handleSelectTemplate}
        />
        <ChainSection 
          isExpanded={chainExpanded}
          onToggle={() => setChainExpanded(!chainExpanded)}
          chains={chains}
          activeChain={activeChain}
          isLoading={isChainsLoading}
          onCreateChain={handleCreateChain}
          onSelectChain={handleSelectChain}
          onExecuteStep={handleExecuteStep}
        />
        <ResponseSection 
          isExpanded={responseExpanded}
          onToggle={() => setResponseExpanded(!responseExpanded)}
          currentResponse={currentResponse}
          isAutoSaveEnabled={isAutoSaveEnabled}
          isSaving={isSaving}
          onResponseChange={handleResponseChange}
          onToggleAutoSave={handleToggleAutoSave}
          onSaveResponse={handleSaveResponse}
        />
      </div>
    </div>
  )
} 