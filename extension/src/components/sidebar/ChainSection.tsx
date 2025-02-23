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
    <section 
      className="p-4 border-b border-gray-200"
      aria-expanded={isExpanded}
    >
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} prompt chains section`}
      >
        <h2 className="text-lg font-medium text-gray-800">Prompt Chains</h2>
        <button 
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <svg 
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Chain Creation Button */}
          <div className="mb-4">
            <button 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              onClick={onCreateChain}
              aria-label="Create new prompt chain"
            >
              Create New Chain
            </button>
          </div>

          {/* Chain List */}
          {isLoading ? (
            <div className="text-sm text-gray-600">Loading chains...</div>
          ) : (
            <div className="space-y-2">
              {chains.length === 0 ? (
                <div className="text-sm text-gray-600">No chains yet</div>
              ) : (
                chains.map(chain => (
                  <div 
                    key={chain.id}
                    className={`p-2 rounded transition-colors ${
                      activeChain?.id === chain.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        className="flex-1 text-left text-sm font-medium text-gray-800"
                        onClick={() => onSelectChain(chain)}
                        aria-label={`Select chain ${chain.name}`}
                      >
                        {chain.name}
                      </button>
                      {activeChain?.id === chain.id && (
                        <span className="text-xs text-blue-600 font-medium">Active</span>
                      )}
                    </div>
                    {activeChain?.id === chain.id && chain.steps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {chain.steps.map(step => (
                          <button
                            key={step.id}
                            className="w-full text-left text-xs text-gray-600 hover:text-gray-800 py-1 px-2 rounded hover:bg-gray-100 transition-colors"
                            onClick={() => onExecuteStep(chain.id, step.id)}
                            aria-label={`Execute step ${step.type}`}
                          >
                            {step.type === 'execute_prompt' && step.templateId && '🔄 Execute Template'}
                            {step.type === 'save_to_disk' && '💾 Save to Disk'}
                            {step.type === 'restart_chain' && '🔄 Restart Chain'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
} 