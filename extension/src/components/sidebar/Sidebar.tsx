import React, { useState, useRef, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import type { Template } from "shared/types/templates"
import type { PromptChain } from "shared/types/chains"
import { TemplateSection } from "./TemplateSection"
import { ChainSection } from "./ChainSection"
import { ResponseSection } from "./ResponseSection"
import { ErrorBoundary } from "../common/ErrorBoundary"
import { useFocusManagement } from "../../hooks/useFocusManagement"
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation"
import { useTemplates } from "../../hooks/useTemplates"
import { useToast } from "../../hooks/useToast"

export const Sidebar: React.FC = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const fetchTemplatesRef = useRef<(() => Promise<Template[]>) | null>(null)

  const options = useMemo(() => ({
    onError: (error: Error) => {
      console.error("Template operation error:", error)
      toast.error("An error occurred with templates")
    },
    maxRetries: 3,
    debounceDelay: 300
  }), [toast])

  const {
    templates,
    favoriteTemplates,
    operationStates,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    favoriteTemplate,
    unfavoriteTemplate,
    cleanup
  } = useTemplates({ toast, options })

  useEffect(() => {
    if (!fetchTemplatesRef.current) {
      fetchTemplatesRef.current = fetchTemplates
    }
  }, [fetchTemplates])

  console.log("Sidebar render:", {
    templatesLength: templates?.length,
    pinnedTemplatesLength: favoriteTemplates?.length,
    isTemplatesLoading: operationStates["fetch"]?.isLoading,
    operationStates
  })

  useEffect(() => {
    console.log("Sidebar mounting, fetching templates")
    fetchTemplatesRef.current!().catch((error) => {
      console.error("Failed to fetch templates:", error)
    })
    return cleanup
  }, [cleanup])

  const [expandedSections, setExpandedSections] = useState({
    templates: false,
    chains: false,
    response: false
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const { currentFocus, setFocus, focusNext, focusPrevious } = useFocusManagement({ itemCount: 3 })
  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEscape: () => {}
  })

  const toggleSection = (section: "templates" | "chains" | "response") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const isTemplatesLoading = operationStates?.fetch?.isLoading ?? false
  const [chains, setChains] = useState<PromptChain[]>([])
  const [activeChain, setActiveChain] = useState<PromptChain | undefined>()
  const [isChainsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handlePinTemplate = (templateId: number) => {
    console.log(`[Sidebar] Pinning template ID: ${templateId}`)
    favoriteTemplate(templateId)
  }
  
  const handleUnpinTemplate = (templateId: number) => {
    console.log(`[Sidebar] Unpinning template ID: ${templateId}`)
    unfavoriteTemplate(templateId)
  }
  
  const handleSelectTemplate = (template: Template) => {
    navigate(`/templates/${template.id}`, { state: { template } })
  }
  
  const handleEditTemplate = (template: Template) => {
    console.log(`[Sidebar] Editing template ID: ${template.id}`)
    // Add editing logic if needed
  }
  
  const handleDeleteTemplate = (templateId: number) => {
    console.log(`[Sidebar] Initiating delete for template ID: ${templateId}`)
    deleteTemplate(templateId).catch((error) => {
      console.error(`[Sidebar] Failed to delete template ID: ${templateId}`, error)
    })
  }

  const handleCreateChain = () => {}
  const handleSelectChain = (chain: PromptChain) => setActiveChain(chain)
  const handleExecuteStep = (chainId: string, stepId: string) => {}
  const handleResponseChange = (response: string) => setCurrentResponse(response)
  const handleToggleAutoSave = () => setIsAutoSaveEnabled(!isAutoSaveEnabled)
  const handleSaveResponse = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div
      ref={containerRef}
      className="plasmo-h-full plasmo-w-full plasmo-bg-white plasmo-flex plasmo-flex-col plasmo-overflow-y-auto"
      role="complementary"
      aria-label="Promptier Sidebar"
      tabIndex={0}
    >
      <div className="plasmo-flex-1 plasmo-overflow-y-auto">
        <ErrorBoundary>
          <TemplateSection
            isExpanded={expandedSections.templates}
            onToggle={() => toggleSection("templates")}
            templates={templates}
            pinnedTemplates={favoriteTemplates}
            isLoading={isTemplatesLoading}
            createTemplate={createTemplate}
            onPinTemplate={handlePinTemplate}
            onUnfavoriteTemplate={handleUnpinTemplate}
            onSelectTemplate={handleSelectTemplate}
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
          <ChainSection
            isExpanded={expandedSections.chains}
            onToggle={() => toggleSection("chains")}
            chains={chains}
            activeChain={activeChain}
            isLoading={isChainsLoading}
            onCreateChain={handleCreateChain}
            onSelectChain={handleSelectChain}
            onExecuteStep={handleExecuteStep}
          />
          <ResponseSection
            isExpanded={expandedSections.response}
            onToggle={() => toggleSection("response")}
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