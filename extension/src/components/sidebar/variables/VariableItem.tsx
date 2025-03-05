import React, { useState } from 'react';
import { UserVariable } from '../../../../shared/types/variables';
import {
  activeResolveAllFileContents,
  reacquireFileHandles
} from '../../../utils/file-content-resolver';
import { useToast } from '../../../hooks/useToast';
import { fs } from '../../../filesystem';

interface VariableItemProps {
  variable: UserVariable;
  index: number;
  onEdit: () => void;
  onDelete: (id: number) => void;
}

export const VariableItem: React.FC<VariableItemProps> = ({
  variable,
  index,
  onEdit,
  onDelete
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const { success, error } = useToast();

  // Determine if this is a file variable
  const isFileVariable = Array.isArray(variable.value) &&
    variable.value.some(entry => entry && entry.type === 'file');

  // Determine background color based on index (for alternating)
  const bgClass = index % 2 === 0 ? 'plasmo-template-item-even' : 'plasmo-template-item-odd';

  // Get preview text
  const getPreviewText = () => {
    if (Array.isArray(variable.value)) {
      // Look for text entries first
      const textEntries = variable.value.filter(entry => entry && entry.type === 'text');
      if (textEntries.length > 0) {
        return textEntries.map(entry => entry.value).join(', ');
      }
      
      // If no text entries, look for file entries
      const fileEntries = variable.value.filter(entry => entry && entry.type === 'file');
      if (fileEntries.length > 0) {
        return fileEntries.map(entry => {
          const fileName = entry.metadata?.path || entry.value;
          return `File: ${typeof fileName === 'string' ? fileName.split('/').pop() : 'Unknown'}`;
        }).join(', ');
      }
    }
    
    // Fallback for string values or empty arrays
    return typeof variable.value === 'string' ? variable.value : '';
  };

  // Get preview text
  const previewText = getPreviewText();

  // Get file content for a file entry
  const getFileContent = async (fileEntry: any) => {
    console.log("[VariableItem] Getting file content for:", fileEntry);
    
    // If entry has XML content already (from previous resolution), extract it
    if (typeof fileEntry.value === 'string' && fileEntry.value.includes('</')) {
      const tagName = fileEntry.metadata?.tagName;
      if (tagName) {
        // Try to extract content between tags
        const tagPattern = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`);
        const match = fileEntry.value.match(tagPattern);
        if (match) {
          return fileEntry.value;
        }
      }
    }
    
    // If we have a handle, try to fetch content directly
    console.log("[VariableItem] File entry metadata:", fileEntry.metadata);
    console.log("[VariableItem] File entry handleId:", fileEntry.metadata?.handleId);
    
    if (fileEntry.metadata?.handleId) {
      try {
        console.log("[VariableItem] Attempting to fetch content using the file handle");
        const handleId = fileEntry.metadata.handleId;
        const handle = fs.registry.getHandle(handleId);
        if (handle && handle.kind === 'file') {
          try {
            const fileContent = await fs.readFile(handle as FileSystemFileHandle, { encoding: 'utf-8' });
            console.log("[VariableItem] Successfully fetched file content:",
              fileContent.substring(0, 100) + (fileContent.length > 100 ? '...' : ''));
            return fileContent;
          } catch (err) {
            console.error("[VariableItem] Error reading file:", err);
          }
        } else {
          console.log("[VariableItem] Handle not found or not a file handle:", handle);
        }
      } catch (err) {
        console.error("[VariableItem] Error fetching file content:", err);
      }
    }
    
    // If we couldn't get content directly, try reacquiring handles
    try {
      console.log("[VariableItem] Reacquiring file handles and resolving content");
      const variableCopy = {
        ...variable,
        value: [fileEntry]
      };
      
      const resolved = await activeResolveAllFileContents([variableCopy], {
        autoReacquireHandles: true,
        forceReacquire: true
      });
      
      if (resolved && variableCopy.value[0].value) {
        const newValue = variableCopy.value[0].value;
        console.log("[VariableItem] Successfully resolved file content:",
          typeof newValue === 'string' ?
          (newValue.substring(0, 100) + (newValue.length > 100 ? '...' : '')) :
          'Not a string');
        return newValue;
      }
    } catch (err) {
      console.error("[VariableItem] Error resolving file content:", err);
    }
    
    // If all else fails, return the file path or name
    return fileEntry.metadata?.path || fileEntry.value || 'Unable to resolve file content';
  };

  // Handle copy to clipboard
  const handleCopyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopying(true);
    
    try {
      let textToCopy = '';
      
      if (Array.isArray(variable.value)) {
        // Check for file entries
        const fileEntries = variable.value.filter(entry => entry && entry.type === 'file');
        if (fileEntries.length > 0) {
          console.log(`[VariableItem] Found ${fileEntries.length} file entries to resolve`);
          
          // Create an array to hold all content promises
          const contentPromises = fileEntries.map(entry => getFileContent(entry));
          
          // Resolve all content promises
          const resolvedContents = await Promise.all(contentPromises);
          textToCopy = resolvedContents.join('\n\n');
          
          console.log(`[VariableItem] Successfully resolved ${resolvedContents.length} file contents`);
        } else {
          // For text variables, join all text entries
          const textEntries = variable.value.filter(entry => entry && entry.type === 'text');
          textToCopy = textEntries.map(entry => entry.value).join('\n');
        }
      } else if (typeof variable.value === 'string') {
        textToCopy = variable.value;
      }
      
      await navigator.clipboard.writeText(textToCopy);
      console.log(`[VariableItem] Copied to clipboard: ${textToCopy.substring(0, 50)}${textToCopy.length > 50 ? '...' : ''}`);
      success('Content copied to clipboard');
    } catch (err) {
      console.error('[VariableItem] Failed to copy:', err);
      error(err instanceof Error ? err.message : 'Failed to copy variable content');
    } finally {
      setIsCopying(false);
    }
  };

  // Handle edit
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  // Handle delete
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the variable "${variable.name}"?`)) {
      onDelete(variable.id);
    }
  };

  return (
    <div
      className={`plasmo-template-item-compact ${bgClass} plasmo-group plasmo-relative plasmo-w-full`}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onEdit();
        }
      }}
    >
      <div className="plasmo-py-2 plasmo-px-3">
        {/* Variable Header with Actions */}
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
          <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-flex-1 plasmo-min-w-0">
            <h3 className="plasmo-template-name plasmo-truncate">
              {variable.name}
            </h3>
            <span className={`plasmo-badge ${isFileVariable ? 'plasmo-badge-amber' : 'plasmo-badge-blue'} plasmo-flex-shrink-0`}>
              {isFileVariable ? 'File' : 'Text'}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="plasmo-flex plasmo-items-center plasmo-ml-1 plasmo-flex-shrink-0 plasmo-space-x-0.5">
            <button
              onClick={handleCopyClick}
              className="plasmo-action-btn-compact plasmo-template-action-btn"
              aria-label="Copy variable"
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
              onClick={handleEditClick}
              className="plasmo-action-btn-compact plasmo-template-action-btn"
              aria-label="Edit variable"
            >
              <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="plasmo-action-btn-compact plasmo-template-action-btn plasmo-text-error-500 hover:plasmo-text-error-700"
              aria-label="Delete variable"
            >
              <svg className="plasmo-w-5 plasmo-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Variable Content Preview */}
        <div className="plasmo-template-description-compact plasmo-mt-1.5">
          {previewText}
        </div>
      </div>
    </div>
  );
};