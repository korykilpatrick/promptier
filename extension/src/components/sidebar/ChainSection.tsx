import React, { useRef, useEffect } from "react"
import type { ChainSectionProps, PromptChain } from "../../types/sidebar"
import { SectionHeader } from "./common/SectionHeader"
import { LoadingSkeleton } from "./common/LoadingSkeleton"
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation"
import { useFocusManagement } from "../../hooks/useFocusManagement"
import { ErrorBoundary } from "../common/ErrorBoundary"
import "../../styles/transitions.css"

export const ChainSection: React.FC<ChainSectionProps> = (props) => {
  return (
    <ErrorBoundary>
      <ChainSectionContent {...props} />
    </ErrorBoundary>
  )
}

const ChainSectionContent: React.FC<ChainSectionProps> = ({
  isExpanded,
  onToggle,
  chains = [],
  activeChain,
  isLoading = false,
  onCreateChain,
  onSelectChain,
  onExecuteStep
}) => {
  const chainRefs = useRef<(HTMLDivElement | null)[]>([])
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  const { currentFocus: chainFocus, setFocus: setChainFocus, focusNext: focusNextChain, focusPrevious: focusPreviousChain, resetFocus: resetChainFocus } = useFocusManagement({
    itemCount: chains.length,
    onFocusChange: (index) => {
      if (index >= 0) {
        chainRefs.current[index]?.focus()
      }
    }
  })

  const { currentFocus: stepFocus, setFocus: setStepFocus, focusNext: focusNextStep, focusPrevious: focusPreviousStep, resetFocus: resetStepFocus } = useFocusManagement({
    itemCount: activeChain?.steps.length || 0,
    onFocusChange: (index) => {
      if (index >= 0) {
        stepRefs.current[index]?.focus()
      }
    }
  })

  useKeyboardNavigation({
    onArrowDown: () => {
      if (chainFocus >= 0) {
        focusNextChain()
      } else if (stepFocus >= 0) {
        focusNextStep()
      }
    },
    onArrowUp: () => {
      if (chainFocus >= 0) {
        focusPreviousChain()
      } else if (stepFocus >= 0) {
        focusPreviousStep()
      }
    },
    onEscape: () => {
      resetChainFocus()
      resetStepFocus()
    },
    disabled: !isExpanded || isLoading
  })

  useEffect(() => {
    if (!isExpanded) {
      resetChainFocus()
      resetStepFocus()
    }
  }, [isExpanded, resetChainFocus, resetStepFocus])

  const renderChainItem = (chain: PromptChain, index: number) => (
    <div 
      key={chain.id}
      ref={el => chainRefs.current[index] = el}
      className={`flex items-center justify-between p-2 hover-transition hover:bg-gray-50 rounded-md cursor-pointer ${
        chainFocus === index ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelectChain(chain)}
      role="button"
      aria-label={`Select chain: ${chain.name}`}
      tabIndex={chainFocus === index ? 0 : -1}
      onFocus={() => setChainFocus(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelectChain(chain)
        }
      }}
    >
      <span className="text-sm text-gray-700">{chain.name}</span>
      <span className="text-xs text-gray-500" aria-label={`Contains ${chain.steps.length} steps`}>
        {chain.steps.length} steps
      </span>
    </div>
  )

  return (
    <div 
      className="border-b border-gray-200"
      role="region"
      aria-labelledby="chains-header"
    >
      <SectionHeader 
        title="Prompt Chains"
        isExpanded={isExpanded}
        onToggle={onToggle}
        id="chains-header"
      />

      <div 
        id="chains-content"
        className={`section-content ${isExpanded ? "expanded" : ""}`}
        role="region"
        aria-labelledby="chains-header"
      >
        <div className="p-4 space-y-4">
          {/* Chain List */}
          <div 
            className="space-y-2"
            role="region"
            aria-labelledby="my-chains-header"
          >
            <div className="flex justify-between items-center">
              <h3 
                id="my-chains-header"
                className="text-sm font-medium text-gray-600"
              >
                My Chains
              </h3>
              <button 
                className="text-sm text-blue-600 button-transition hover:text-blue-700 disabled:opacity-50"
                onClick={onCreateChain}
                disabled={isLoading}
                aria-label="Create new chain"
              >
                + New Chain
              </button>
            </div>
            <div 
              className="space-y-2"
              role="list"
              aria-label="Chain list"
            >
              {isLoading ? (
                <LoadingSkeleton variant="card" size="small" count={2} />
              ) : chains.length > 0 ? (
                chains.map((chain, index) => renderChainItem(chain, index))
              ) : (
                <div 
                  className="text-sm text-gray-500 italic loading-fade"
                  role="status"
                  aria-label="No chains available"
                >
                  No chains yet
                </div>
              )}
            </div>
          </div>

          {/* Active Chain */}
          <div 
            className="space-y-2"
            role="region"
            aria-labelledby="active-chain-header"
          >
            <h3 
              id="active-chain-header"
              className="text-sm font-medium text-gray-600"
            >
              Active Chain
            </h3>
            <div 
              className="p-3 bg-gray-50 rounded-md transition-base"
              role="region"
              aria-label="Active chain details"
            >
              {isLoading ? (
                <div className="space-y-2">
                  <LoadingSkeleton variant="text" size="small" count={1} />
                  <div className="space-y-1">
                    <LoadingSkeleton variant="text" size="small" count={3} />
                  </div>
                </div>
              ) : activeChain ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{activeChain.name}</span>
                    <span 
                      className="text-xs text-gray-500"
                      aria-label={`Contains ${activeChain.steps.length} steps`}
                    >
                      {activeChain.steps.length} steps
                    </span>
                  </div>
                  <div 
                    className="space-y-1"
                    role="list"
                    aria-label="Chain steps"
                  >
                    {activeChain.steps.map((step, index) => (
                      <div 
                        key={step.id}
                        ref={el => stepRefs.current[index] = el}
                        className={`text-xs text-gray-600 flex justify-between items-center hover-transition hover:bg-white rounded p-1 ${
                          stepFocus === index ? 'ring-2 ring-blue-500' : ''
                        }`}
                        role="listitem"
                        tabIndex={stepFocus === index ? 0 : -1}
                        onFocus={() => setStepFocus(index)}
                      >
                        <span>{step.type}</span>
                        <button
                          className="text-blue-600 button-transition hover:text-blue-700 scale-transition hover:scale-105"
                          onClick={() => onExecuteStep(activeChain.id, step.id)}
                          aria-label={`Execute ${step.type} step`}
                          tabIndex={-1}
                        >
                          Execute
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div 
                  className="text-sm text-gray-500 italic loading-fade"
                  role="status"
                  aria-label="No active chain selected"
                >
                  No active chain
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 