import React, { useState, useRef, useEffect, useMemo } from "react";
import type { Template, PromptChain } from "../../types/sidebar";
import { TemplateSection } from "./TemplateSection";
import { ChainSection } from "./ChainSection";
import { ResponseSection } from "./ResponseSection";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { useFocusManagement } from "../../hooks/useFocusManagement";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { useTemplates } from "../../hooks/useTemplates";
import { useToast } from "../../hooks/useToast";

export const Sidebar: React.FC = () => {
  const toast = useToast();
  const fetchTemplatesRef = useRef<(() => Promise<Template[]>) | null>(null);

  const options = useMemo(() => ({
    onError: (error: Error) => {
      console.error("Template operation error:", error);
      toast.error("An error occurred with templates");
    },
    maxRetries: 3,
    debounceDelay: 300
  }), [toast]);

  const { templates, pinnedTemplates, operationStates, fetchTemplates, cleanup } = useTemplates({ toast, options });

  // Store fetchTemplates in a ref on first render
  useEffect(() => {
    if (!fetchTemplatesRef.current) {
      fetchTemplatesRef.current = fetchTemplates;
    }
  }, [fetchTemplates]);

  console.log("Sidebar render:", {
    templatesLength: templates?.length,
    pinnedTemplatesLength: pinnedTemplates?.length,
    isTemplatesLoading: operationStates["fetch"]?.isLoading,
    operationStates
  });

  useEffect(() => {
    console.log("Sidebar mounting, fetching templates");
    fetchTemplatesRef.current!().catch((error) => {
      console.error("Failed to fetch templates:", error);
    });
    return cleanup;
  }, [cleanup]); // Only depend on cleanup, not fetchTemplates

  const [expandedSections, setExpandedSections] = useState({
    templates: true,
    chains: true,
    response: true
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const { currentFocus, setFocus, focusNext, focusPrevious } = useFocusManagement({ itemCount: 3 });
  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEscape: () => {}
  });

  const toggleSection = (section: "templates" | "chains" | "response") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isTemplatesLoading = operationStates?.fetch?.isLoading ?? false;
  const [chains, setChains] = useState<PromptChain[]>([]);
  const [activeChain, setActiveChain] = useState<PromptChain | undefined>();
  const [isChainsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateTemplate = () => {};
  const handlePinTemplate = (templateId: string) => {};
  const handleUnpinTemplate = (templateId: string) => {};
  const handleSelectTemplate = (template: Template) => {};
  const handleCreateChain = () => {};
  const handleSelectChain = (chain: PromptChain) => setActiveChain(chain);
  const handleExecuteStep = (chainId: string, stepId: string) => {};
  const handleResponseChange = (response: string) => setCurrentResponse(response);
  const handleToggleAutoSave = () => setIsAutoSaveEnabled(!isAutoSaveEnabled);
  const handleSaveResponse = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div ref={containerRef} className="plasmo-sidebar" role="complementary" aria-label="Promptier Sidebar" tabIndex={0}>
      <div className="plasmo-flex-1 plasmo-overflow-y-auto">
        <ErrorBoundary>
          <TemplateSection
            isExpanded={expandedSections.templates}
            onToggle={() => toggleSection("templates")}
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
  );
};