import React from 'react';

/**
 * Regex pattern to match template variables - copied from template-parser.ts
 * This matches {{variableName}}, {{variableName:default}}, and {{variableName:default:description}}
 */
const VARIABLE_PATTERN = /\{\{([^{}:]+)(?::([^{}:]+))?(?::([^{}]+))?\}\}/g;

interface StyledTemplateTextProps {
  content: string;
  className?: string;
}

/**
 * Component that renders template text with styled variables
 * It highlights template variables with a special styling
 */
export const StyledTemplateText: React.FC<StyledTemplateTextProps> = ({ content, className = '' }) => {
  // If the content is empty, just return an empty div
  if (!content) {
    return <div className={className}></div>;
  }

  // Split the content based on variable pattern
  const parts: React.ReactNode[] = [];
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;
  
  while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex, match.index)}
        </span>
      );
    }
    
    // Extract variable name, default value, and description
    const [fullMatch, name] = match;
    const trimmedName = name.trim();
    
    // Add the variable with special styling
    parts.push(
      <span key={`var-${match.index}`} className="plasmo-template-variable">
        {fullMatch}
      </span>
    );
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add any remaining text after the last match
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {content.substring(lastIndex)}
      </span>
    );
  }
  
  return <div className={className}>{parts}</div>;
};

/**
 * A read-only content viewer for templates that highlights variables
 */
export const TemplateContentViewer: React.FC<{content: string; className?: string}> = ({ 
  content, 
  className = ''
}) => {
  return (
    <div className={`plasmo-p-3 plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded-md plasmo-font-mono plasmo-text-sm ${className}`}>
      <StyledTemplateText content={content} />
    </div>
  );
}; 