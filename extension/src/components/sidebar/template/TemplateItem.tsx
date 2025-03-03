import React, { useState } from 'react';
import { replaceVariables, parseTemplate } from '../../../utils/template-parser';
import { ensureFilePermissions, activeFetchFileContent, activeResolveAllFileContents, reacquireFileHandles, fileHandleRegistry } from '../../../utils/file-content-resolver';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateVariables } from '../../../hooks/useTemplateVariables';
import { Template } from 'shared/types/templates';
import { useToast } from '../../../hooks/useToast';

/**
 * @typedef {Object} TemplateItemProps
 * @property {Template} template - The template object
 * @property {boolean} isFavorite - Whether the template is a favorite
 * @property {boolean} isSelected - Whether the template is selected
 * @property {Function} onSelect - Function to select the template
 * @property {Function} onFavorite - Function to favorite the template
 * @property {Function} onUnfavorite - Function to unfavorite the template
 * @property {Function} onEdit - Function to edit the template
 * @property {Function} onDelete - Function to delete the template
 */

type MouseEvent = {
  stopPropagation: () => void;
};

type TemplateItemProps = {
  template: any;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: (template: any) => void;
  onFavorite: (id: number) => void;
  onUnfavorite: (id: number) => void;
  onEdit: (template: any) => void;
  onDelete: (id: number) => void;
};

/**
 * Template item component
 * @param {TemplateItemProps} props - Component props
 * @returns {JSX.Element} Component JSX
 */
const TemplateItem = memo(({
  template,
  isFavorite,
  isSelected,
  onSelect,
  onFavorite,
  onUnfavorite,
  onEdit,
  onDelete,
}: TemplateItemProps) => {
  const navigate = useNavigate();
  const [isCopying, setIsCopying] = useState(false);
  const { addToast, success, error } = useToast();

  // Add template variables hook
  const {
    values,
    globalVariables
  } = useTemplateVariables({
    template: template.content,
    initialValues: template.variables,
    useGlobalVariables: true
  });

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    isFavorite ? onUnfavorite(template.id) : onFavorite(template.id);
  };

  const handleEditClick = (e: MouseEvent) => {
    e.stopPropagation();
    // Navigate to the template details view with edit mode active
    navigate(`/templates/${template.id}`, {
      state: {
        template,
        editMode: true
      }
    });
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    console.log(`[TemplateItem] Delete clicked for template ID: ${template.id}`);
    onDelete(template.id);
  };

  const handleCopyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsCopying(true);
      console.log(`[TemplateItem] Copy clicked for template ID: ${template.id}`);
      
      // Process the template
      let processedContent = template.content;
      
      // Parse the template to find which variables are actually used
      const parseResult = parseTemplate(template.content);
      const usedVariableNames = new Set(parseResult.variables.map(v => v.name));
      
      console.log(`[TemplateItem] Template uses these variables:`, Array.from(usedVariableNames));
      
      // Identify file variables that are used in this specific template
      if (globalVariables && Array.isArray(globalVariables)) {
        const fileVars = globalVariables.filter((v) => 
          v && 
          usedVariableNames.has(v.name) && // Only include variables used in this template
          Array.isArray(v.value) && 
          v.value.some((entry: any) => entry && entry.type === 'file')
        );
        
        if (fileVars.length > 0) {
          console.log(`[TemplateItem] Template contains ${fileVars.length} used file variables - resolving content`);
          
          // Create a filtered global variables array with only the used file variables
          const usedFileGlobalVariables = globalVariables.filter(v => 
            v && usedVariableNames.has(v.name)
          );
          
          // Actively resolve only the file contents for variables used in this template
          try {
            const resolved = await activeResolveAllFileContents(usedFileGlobalVariables, { 
              autoReacquireHandles: true,
              // Don't force reacquisition on every copy - only if we have missing handles
            });
            
            console.log(`[TemplateItem] File content resolution ${resolved ? 'successful' : 'failed'}`);
            
            if (!resolved) {
              console.warn('Some file contents could not be resolved. The template may be incomplete.');
              
              // If resolution failed, try once more with forced reacquisition
              const forcedResolved = await activeResolveAllFileContents(usedFileGlobalVariables, {
                autoReacquireHandles: true,
                forceReacquire: true
              });
              
              if (!forcedResolved) {
                console.error(`[TemplateItem] Even forced reacquisition failed`);
                error('Unable to access file contents. Please try again.');
              }
            }
          } catch (err) {
            console.error(`[TemplateItem] Error resolving file contents:`, err);
            error(err instanceof Error ? err.message : 'Unknown error');
          }
        }
      }
      
      // Process the template with variable replacement
      processedContent = replaceVariables(processedContent, values, globalVariables);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(processedContent);
      console.log(`[TemplateItem] Successfully copied template to clipboard`);
      
      success('Template copied to clipboard with all variables resolved');
    } catch (err) {
      console.error('Failed to copy template:', err);
      error(err instanceof Error ? err.message : 'Failed to copy template');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(template)}
      className={`
        plasmo-group plasmo-px-4 plasmo-py-3 
        hover:plasmo-bg-gray-50 
        plasmo-transition-colors 
        plasmo-cursor-pointer
        ${isSelected ? "plasmo-bg-blue-50" : ""}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(template);
        }
      }}
    >
      <div className="plasmo-flex plasmo-items-start plasmo-justify-between">
        <div className="plasmo-flex-1 plasmo-min-w-0">
          <div className="plasmo-flex plasmo-items-center">
            <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900 plasmo-truncate">
              {template.name}
            </h4>
            {template.category && (
              <span className="plasmo-ml-2 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full plasmo-text-xs plasmo-font-medium plasmo-bg-blue-100 plasmo-text-blue-800">
                {template.category}
              </span>
            )}
          </div>
          <div className="plasmo-mt-1">
            <p 
              className="plasmo-text-xs plasmo-text-gray-500 plasmo-break-words"
              style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: '2.5rem'
              }}
            >
              {template.content}
            </p>
          </div>
        </div>
        
        <div className="plasmo-flex plasmo-items-center plasmo-space-x-2 plasmo-opacity-0 group-hover:plasmo-opacity-100 plasmo-transition-opacity plasmo-ml-2">
          <button
            onClick={handleCopyClick}
            className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-gray-500 plasmo-transition-colors"
            aria-label="Copy template"
            disabled={isCopying}
          >
            {isCopying ? (
              <span className="plasmo-animate-pulse">Copying...</span>
            ) : (
              <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
          <button
            onClick={handleFavoriteClick}
            className={`
              plasmo-p-1 plasmo-rounded-full 
              ${isFavorite 
                ? "plasmo-text-yellow-500 hover:plasmo-text-yellow-600" 
                : "plasmo-text-gray-400 hover:plasmo-text-gray-500"
              }
              plasmo-transition-colors
            `}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg className="plasmo-w-5 plasmo-h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
          <button
            onClick={handleEditClick}
            className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-gray-500 plasmo-transition-colors"
            aria-label="Edit template"
          >
            <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className="plasmo-p-1 plasmo-rounded-full plasmo-text-gray-400 hover:plasmo-text-red-500 plasmo-transition-colors"
            aria-label="Delete template"
          >
            <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

module.exports = {
  TemplateItem
}; 