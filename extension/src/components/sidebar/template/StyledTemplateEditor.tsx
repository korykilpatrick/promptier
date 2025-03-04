import React, { useState, useRef, useEffect } from 'react';
import { StyledTemplateText } from './StyleTemplateVariable';

interface StyledTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  required?: boolean;
}

/**
 * A component that provides a template editor with styled variable highlighting.
 * It uses a textarea for editing but renders a styled preview of the variables.
 */
export const StyledTemplateEditor: React.FC<StyledTemplateEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your prompt template here...',
  rows = 12,
  className = '',
  id = 'template-editor',
  required = false
}) => {
  // Track if the editor is focused
  const [isFocused, setIsFocused] = useState(false);
  // Track if the user is actively editing
  const [isEditing, setIsEditing] = useState(false);
  // Ref to the textarea element
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // When the component mounts, apply any necessary initialization
  useEffect(() => {
    if (textareaRef.current) {
      // Set initial height if needed
      adjustTextareaHeight();
    }
  }, []);
  
  // Adjust the textarea height based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to the scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };
  
  // Handle textarea input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Adjust height after content change
    setTimeout(adjustTextareaHeight, 0);
  };
  
  return (
    <div className="plasmo-relative">
      {/* The actual textarea for editing */}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleInput}
        onFocus={() => {
          setIsFocused(true);
          setIsEditing(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          // Small delay to allow for better UX when clicking elsewhere
          setTimeout(() => setIsEditing(false), 200);
        }}
        rows={rows}
        className={`plasmo-block plasmo-w-full plasmo-rounded-md plasmo-border plasmo-border-gray-300 
                   plasmo-shadow-sm plasmo-focus:border-blue-500 plasmo-focus:ring-2 
                   plasmo-focus:ring-blue-500 plasmo-focus:ring-opacity-20
                   plasmo-font-mono plasmo-text-sm plasmo-p-3 plasmo-resize-y 
                   plasmo-transition-all plasmo-duration-150 ${className}`}
        required={required}
        placeholder={placeholder}
      />
      
      {/* Overlay for displaying styled variables when not actively editing */}
      {!isEditing && value && (
        <div 
          className="plasmo-absolute plasmo-inset-0 plasmo-pointer-events-none plasmo-p-3 plasmo-overflow-auto"
          onClick={() => {
            // Focus the textarea when clicking on the overlay
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }}
        >
          <StyledTemplateText content={value} />
        </div>
      )}
      
      {/* Character count */}
      <div className="plasmo-absolute plasmo-right-2 plasmo-bottom-2 plasmo-text-xs plasmo-text-gray-500 plasmo-px-1.5 plasmo-py-0.5 plasmo-bg-white plasmo-border plasmo-border-gray-100 plasmo-rounded-md">
        {value.length} characters
      </div>
    </div>
  );
}; 