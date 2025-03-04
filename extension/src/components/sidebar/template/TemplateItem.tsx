import React, { useState, memo } from 'react';
import { replaceVariables, parseTemplate } from '../../../utils/template-parser';
import { ensureFilePermissions, activeResolveAllFileContents, diagnoseFileHandles } from '../../../utils/file-content-resolver';
import { useNavigate } from 'react-router-dom';
// Use require for modules exported as CommonJS
const { useTemplateVariables } = require('../../../hooks/useTemplateVariables');
import { useToast } from '../../../hooks/useToast';
import * as fs from '../../../filesystem';
import { Template } from 'shared/types/templates';
import { FileHandleRegistry } from '../../../filesystem/registry';
import { getCategoryClasses } from '../../../utils/category-colors';
import { StyledTemplateText } from './StyleTemplateVariable';

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
 * @property {number} index - Index for alternating backgrounds
 * @property {string} [searchQuery] - Current search query for highlighting
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
  index?: number;
  searchQuery?: string;
};

// Helper function to highlight text based on search query
const HighlightText = ({ text, searchQuery }: { text: string, searchQuery: string }) => {
  if (!searchQuery || !text) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ?
          <span key={i} className="plasmo-bg-yellow-100 plasmo-text-gray-900">{part}</span> :
          <span key={i}>{part}</span>
      )}
    </>
  );
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
  index = 0,
  searchQuery = ""
}: TemplateItemProps) => {
  const navigate = useNavigate();
  const [isCopying, setIsCopying] = useState(false);
  const { addToast, success, error, warn } = useToast();

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
    if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      onDelete(template.id);
    }
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
      
      let fileResolutionAttempted = false;
      let fileResolutionSucceeded = true;
      
      // Identify file variables that are used in this specific template
      if (globalVariables && Array.isArray(globalVariables)) {
        const fileVars = globalVariables.filter((v) => 
          v && 
          usedVariableNames.has(v.name) && // Only include variables used in this template
          Array.isArray(v.value) && 
          v.value.some((entry: any) => entry && entry.type === 'file')
        );
        
        if (fileVars.length > 0) {
          fileResolutionAttempted = true;
          console.log(`[TemplateItem] Template contains ${fileVars.length} used file variables - resolving content`);
          
          // Create a filtered global variables array with only the used file variables
          const usedFileGlobalVariables = globalVariables.filter(v => 
            v && usedVariableNames.has(v.name)
          );
          
          // Log details about file variables for debugging
          console.log(`[TemplateItem] File variables to resolve:`, usedFileGlobalVariables.map(v => ({
            name: v.name,
            fileEntries: v.value.filter((entry: any) => entry && entry.type === 'file').length
          })));
          
          // Ensure file registry is fully loaded and initialized
          const registry = FileHandleRegistry.getInstance();
          await registry.ensureRegistryLoaded();
          
          // Ensure file permissions are granted
          try {
            const permissionsGranted = await ensureFilePermissions(usedFileGlobalVariables);
            if (!permissionsGranted) {
              console.warn('[TemplateItem] File permissions were not granted');
              fileResolutionSucceeded = false;
              throw new Error('Permission denied for accessing files. Please try again.');
            }
            console.log('[TemplateItem] File permissions granted successfully');
          } catch (permErr) {
            console.error('[TemplateItem] Error checking permissions:', permErr);
            fileResolutionSucceeded = false;
            throw new Error('Failed to verify file permissions');
          }
          
          // Actively resolve file contents
          try {
            console.log('[TemplateItem] Starting file content resolution');
            const resolved = await activeResolveAllFileContents(usedFileGlobalVariables, { 
              useCache: true,
              forceReacquire: true,
              autoReacquireHandles: true
            });
            
            if (!resolved) {
              console.warn('[TemplateItem] Failed to resolve file contents, template may be incomplete');
              
              // Run diagnostics to get more info about what went wrong
              const diagnostics = diagnoseFileHandles(usedFileGlobalVariables);
              console.error('[TemplateItem] File handle diagnostics:', diagnostics);
              
              fileResolutionSucceeded = false;
              throw new Error('Unable to access file contents. Please try again.');
            } else {
              console.log('[TemplateItem] File content resolution completed successfully');
            }
          } catch (err) {
            console.error(`[TemplateItem] Error resolving file contents:`, err);
            
            // Run diagnostics to get more info about what went wrong
            const diagnostics = diagnoseFileHandles(usedFileGlobalVariables);
            console.error('[TemplateItem] File handle diagnostics:', diagnostics);
            
            fileResolutionSucceeded = false;
            throw new Error('Error accessing file contents');
          }
        }
      }
      
      // Process the template with variable replacement - this integrates the resolved file contents
      try {
        console.log('[TemplateItem] Replacing variables in template content');
        processedContent = replaceVariables(processedContent, values, globalVariables);
        console.log(`[TemplateItem] Template processed successfully (${processedContent.length} characters)`);
      } catch (replaceErr) {
        console.error('[TemplateItem] Error during variable replacement:', replaceErr);
        throw new Error('Error processing template variables');
      }
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(processedContent);
        console.log(`[TemplateItem] Successfully copied template to clipboard`);
        
        if (fileResolutionAttempted && !fileResolutionSucceeded) {
          warn('Template copied to clipboard but file content resolution failed. Some variables may not be fully resolved.');
        } else {
          success('Template copied to clipboard with all variables resolved');
        }
      } catch (clipboardErr) {
        console.error('[TemplateItem] Clipboard write error:', clipboardErr);
        error('Failed to copy to clipboard');
      }
    } catch (err) {
      console.error('[TemplateItem] Failed to copy template:', err);
      error(err instanceof Error ? err.message : 'Failed to copy template');
    } finally {
      setIsCopying(false);
    }
  };

  // Determine background color based on index (for alternating)
  const bgClass = index % 2 === 0 ? 'plasmo-template-item-even' : 'plasmo-template-item-odd';

  // Extract first 150 characters (increased from 100) of content for preview
  const contentPreview = template.content.substring(0, 150) + (template.content.length > 150 ? '...' : '');

  return (
    <div
      onClick={() => onSelect(template)}
      className={`
        plasmo-template-item-compact ${bgClass}
        plasmo-group plasmo-relative plasmo-w-full
        ${isSelected ? "plasmo-template-item-selected" : ""}
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
      <div className="plasmo-py-2 plasmo-px-3">
        {/* Template Header with Actions */}
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
          <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-flex-1 plasmo-min-w-0">
            {/* Star icon for favorite templates removed as requested */}
            <h3 className="plasmo-template-name plasmo-truncate">
              {searchQuery ? (
                <HighlightText text={template.name} searchQuery={searchQuery} />
              ) : (
                template.name
              )}
            </h3>
            {template.category && (
              <span className={`plasmo-badge plasmo-flex-shrink-0 plasmo-font-medium ${getCategoryClasses(template.category)}`}>
                {searchQuery ? (
                  <HighlightText text={template.category} searchQuery={searchQuery} />
                ) : (
                  template.category
                )}
              </span>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="plasmo-flex plasmo-items-center plasmo-ml-1 plasmo-flex-shrink-0 plasmo-space-x-0.5">
            <button
              onClick={handleCopyClick}
              className="plasmo-action-btn-compact plasmo-template-action-btn"
              aria-label="Copy template"
              disabled={isCopying}
            >
              {isCopying ? (
                <svg className="plasmo-w-5 plasmo-h-5 plasmo-animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="plasmo-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="plasmo-opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
            <button
              onClick={handleFavoriteClick}
              className={`plasmo-action-btn-compact plasmo-template-action-btn ${isFavorite ? 'plasmo-text-accent-500' : 'plasmo-text-gray-400'}`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className="plasmo-w-5 plasmo-h-5" viewBox="0 0 20 20">
                {isFavorite ? (
                  <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                ) : (
                  <path stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                )}
              </svg>
            </button>
            <button
              onClick={handleEditClick}
              className="plasmo-action-btn-compact plasmo-template-action-btn"
              aria-label="Edit template"
            >
              <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="plasmo-action-btn-compact plasmo-template-action-btn plasmo-text-error-500 hover:plasmo-text-error-700"
              aria-label="Delete template"
            >
              <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Template Content Preview */}
        <div className="plasmo-template-description-compact plasmo-mt-1.5">
          {searchQuery && template.content ? (
            <HighlightText
              text={contentPreview}
              searchQuery={searchQuery}
            />
          ) : (
            <StyledTemplateText content={contentPreview} />
          )}
        </div>
      </div>
    </div>
  );
});

module.exports = {
  TemplateItem
}; 