const React = require("react");
const { useState, useRef, useEffect, useMemo } = React;
const reactRouterDom = require("react-router-dom");
const { useNavigate, useLocation } = reactRouterDom;

// Type imports
/** @typedef {import("shared/types/templates").Template} Template */
/** @typedef {import("shared/types/chains").PromptChain} PromptChain */

// Component imports using CommonJS requires
const { TemplateSection } = require("./TemplateSection");
const { ChainSection } = require("./ChainSection");
const { ResponseSection } = require("./ResponseSection");
const { ErrorBoundary } = require("../common/ErrorBoundary");
const { useFocusManagement } = require("../../hooks/useFocusManagement");
const { useKeyboardNavigation } = require("../../hooks/useKeyboardNavigation");
const { useTemplates } = require("../../hooks/useTemplates");
const { useToast } = require("../../hooks/useToast");

/**
 * Sidebar component for the extension
 * @returns {JSX.Element} Sidebar component
 */
function Sidebar() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fetchTemplatesRef = useRef(null);

  const options = useMemo(() => ({
    onError: (error) => {
      console.error("Template operation error:", error);
      toast.error("An error occurred with templates");
    },
    maxRetries: 3,
    debounceDelay: 300
  }), [toast]);

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
  } = useTemplates({ toast, options });

  useEffect(() => {
    if (!fetchTemplatesRef.current) {
      fetchTemplatesRef.current = fetchTemplates;
    }
  }, [fetchTemplates]);

  console.log("Sidebar render:", {
    templatesLength: templates?.length,
    pinnedTemplatesLength: favoriteTemplates?.length,
    isTemplatesLoading: operationStates["fetch"]?.isLoading,
    operationStates
  });

  useEffect(() => {
    console.log("Sidebar mounting, fetching templates");
    fetchTemplatesRef.current!().catch((error) => {
      console.error("Failed to fetch templates:", error);
    });
    return cleanup;
  }, [cleanup]);

  const [expandedSections, setExpandedSections] = useState({
    templates: false,
    chains: false,
    response: false
  });

  const containerRef = useRef(null);
  const { currentFocus, setFocus, focusNext, focusPrevious } = useFocusManagement({ itemCount: 3 });
  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEscape: () => {}
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isTemplatesLoading = operationStates?.fetch?.isLoading ?? false;
  const [chains, setChains] = useState([]);
  const [activeChain, setActiveChain] = useState();
  const [isChainsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    if (location.state?.editTemplate) {
      const template = location.state.editTemplate;
      console.log(`Found template to edit in location state: ${template.name} (ID: ${template.id})`);
      setEditingTemplate(template);
      setExpandedSections(prev => ({ ...prev, templates: true }));
      
      // Clear the edit state from location to prevent re-editing on refresh
      window.history.replaceState(
        { ...location.state, editTemplate: undefined }, 
        document.title
      );
    }
  }, [location.state]);

  const handlePinTemplate = (templateId) => {
    console.log(`[Sidebar] Pinning template ID: ${templateId}`);
    favoriteTemplate(templateId);
  };
  
  const handleUnpinTemplate = (templateId) => {
    console.log(`[Sidebar] Unpinning template ID: ${templateId}`);
    unfavoriteTemplate(templateId);
  };
  
  const handleSelectTemplate = (template) => {
    navigate(`/templates/${template.id}`, { 
      state: { 
        template
      } 
    });
  };
  
  const handleEditTemplate = (template) => {
    console.log(`[Sidebar] Editing template ID: ${template.id}`);
    setEditingTemplate(template);
    toggleSection("templates");
  };
  
  const handleDeleteTemplate = (templateId) => {
    console.log(`[Sidebar] Initiating delete for template ID: ${templateId}`);
    deleteTemplate(templateId).catch((error) => {
      console.error(`[Sidebar] Failed to delete template ID: ${templateId}`, error);
    });
  };

  const handleCreateChain = () => {};
  const handleSelectChain = (chain) => setActiveChain(chain);
  const handleExecuteStep = (chainId, stepId) => {};
  const handleResponseChange = (response) => setCurrentResponse(response);
  const handleToggleAutoSave = () => setIsAutoSaveEnabled(!isAutoSaveEnabled);
  const handleSaveResponse = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

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
            expanded={expandedSections.templates}
            onToggle={() => toggleSection("templates")}
            onFocus={() => setFocus(0)}
            isFocused={currentFocus === 0}
            templates={templates}
            favoriteTemplates={favoriteTemplates}
            isLoading={isTemplatesLoading}
            onPinTemplate={handlePinTemplate}
            onUnpinTemplate={handleUnpinTemplate}
            onSelectTemplate={handleSelectTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onEditTemplate={handleEditTemplate}
            editingTemplate={editingTemplate}
            onUpdateTemplate={updateTemplate}
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
}

module.exports = {
  Sidebar
};