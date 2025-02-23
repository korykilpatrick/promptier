import React, { useRef, useEffect } from "react";
import type { ChainSectionProps, PromptChain } from "../../types/sidebar";
import { SectionHeader } from "./common/SectionHeader";
import { LoadingSkeleton } from "./common/LoadingSkeleton";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { useFocusManagement } from "../../hooks/useFocusManagement";
import { ErrorBoundary } from "../common/ErrorBoundary";

export const ChainSection: React.FC<ChainSectionProps> = (props) => {
  return (
    <ErrorBoundary>
      <ChainSectionContent {...props} />
    </ErrorBoundary>
  );
};

const ChainSectionContent: React.FC<ChainSectionProps> = ({
  isExpanded,
  onToggle,
  chains = [],
  activeChain,
  isLoading = false,
  onCreateChain,
  onSelectChain,
  onExecuteStep,
}) => {
  const chainRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { currentFocus: chainFocus, setFocus: setChainFocus, focusNext: focusNextChain, focusPrevious: focusPreviousChain, resetFocus: resetChainFocus } = useFocusManagement({
    itemCount: chains.length,
    onFocusChange: (index) => {
      if (index >= 0) {
        chainRefs.current[index]?.focus();
      }
    },
  });

  const { currentFocus: stepFocus, setFocus: setStepFocus, focusNext: focusNextStep, focusPrevious: focusPreviousStep, resetFocus: resetStepFocus } = useFocusManagement({
    itemCount: activeChain?.steps.length || 0,
    onFocusChange: (index) => {
      if (index >= 0) {
        stepRefs.current[index]?.focus();
      }
    },
  });

  useKeyboardNavigation({
    onArrowDown: () => {
      if (chainFocus >= 0) {
        focusNextChain();
      } else if (stepFocus >= 0) {
        focusNextStep();
      }
    },
    onArrowUp: () => {
      if (chainFocus >= 0) {
        focusPreviousChain();
      } else if (stepFocus >= 0) {
        focusPreviousStep();
      }
    },
    onEscape: () => {
      resetChainFocus();
      resetStepFocus();
    },
    disabled: !isExpanded || isLoading,
  });

  useEffect(() => {
    if (!isExpanded) {
      resetChainFocus();
      resetStepFocus();
    }
  }, [isExpanded, resetChainFocus, resetStepFocus]);

  return (
    <section className="plasmo-p-4 plasmo-border-b plasmo-border-gray-200" aria-expanded={isExpanded}>
      <SectionHeader title="Prompt Chains" isExpanded={isExpanded} onToggle={onToggle} id="chains-header" />
      {isExpanded && (
        <div className="plasmo-animate-slide-down">
          {/* Chain Creation Button */}
          <div className="plasmo-mb-4">
            <button className="plasmo-btn-primary plasmo-w-full" onClick={onCreateChain} aria-label="Create new prompt chain">
              Create New Chain
            </button>
          </div>

          {/* Chain List */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="plasmo-space-y-2">
              {chains.length === 0 ? (
                <div className="plasmo-text-sm plasmo-text-gray-600">No chains yet</div>
              ) : (
                chains.map((chain, index) => (
                  <div
                    key={chain.id}
                    ref={(el) => (chainRefs.current[index] = el)}
                    className={`plasmo-p-2 plasmo-rounded plasmo-transition-colors ${activeChain?.id === chain.id ? "plasmo-bg-blue-50 plasmo-border plasmo-border-blue-200" : "plasmo-bg-white hover:plasmo-bg-gray-50"}`}
                  >
                    <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-2">
                      <button
                        className="plasmo-flex-1 plasmo-text-left plasmo-text-sm plasmo-font-medium plasmo-text-gray-800"
                        onClick={() => onSelectChain(chain)}
                        aria-label={`Select chain ${chain.name}`}
                      >
                        {chain.name}
                      </button>
                      {activeChain?.id === chain.id && (
                        <span className="plasmo-text-xs plasmo-text-blue-600 plasmo-font-medium">Active</span>
                      )}
                    </div>
                    {activeChain?.id === chain.id && chain.steps?.length > 0 && (
                      <div className="plasmo-mt-2 plasmo-space-y-1">
                        {chain.steps.map((step) => (
                          <button
                            key={step.id}
                            className="plasmo-w-full plasmo-text-left plasmo-text-xs plasmo-text-gray-600 hover:plasmo-text-gray-800 plasmo-py-1 plasmo-px-2 plasmo-rounded hover:plasmo-bg-gray-100 plasmo-transition-colors"
                            onClick={() => onExecuteStep(chain.id, step.id)}
                            aria-label={`Execute step ${step.type}`}
                          >
                            {step.type === "execute_prompt" && step.templateId && "🔄 Execute Template"}
                            {step.type === "save_to_disk" && "💾 Save to Disk"}
                            {step.type === "restart_chain" && "🔄 Restart Chain"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};