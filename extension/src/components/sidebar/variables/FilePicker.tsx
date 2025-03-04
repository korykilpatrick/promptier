import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Constants for variable types
const VARIABLE_ENTRY_TYPES = {
  TEXT: 'text',
  FILE: 'file'
};

// Registry to keep file handles
export const fileHandleRegistry = {
  handles: new Map(),
  
  getHandle(id) {
    return this.handles.get(id);
  },
  
  setHandle(id, handle) {
    this.handles.set(id, handle);
    return id;
  },
  
  registerHandle(handle, id = null) {
    const handleId = id || uuidv4();
    this.setHandle(handleId, handle);
    return handleId;
  },
  
  removeHandle(id) {
    if (this.handles.has(id)) {
      this.handles.delete(id);
      return true;
    }
    return false;
  },
  
  getHandleCount() {
    return this.handles.size;
  }
};

interface FilePickerProps {
  onSelect: (entries: any) => void;
  selectedEntries?: any[];
  onClear?: () => void;
}

export function FilePicker({ onSelect, selectedEntries = [], onClear }: FilePickerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  
  // Update selected files when props change
  useEffect(() => {
    setSelectedFiles(selectedEntries || []);
  }, [selectedEntries]);
  
  // Handle file picker open
  const handleFileSelect = useCallback(async () => {
    try {
      // Use showOpenFilePicker API
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: 'Text Files',
            accept: {
              'text/*': ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.csv']
            }
          },
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg']
            }
          },
          {
            description: 'All Files',
            accept: {
              '*/*': ['.*']
            }
          }
        ]
      });
      
      // Process selected files
      const entries = await Promise.all(
        handles.map(async (handle) => {
          try {
            const file = await handle.getFile();
            const handleId = fileHandleRegistry.registerHandle(handle);
            
            return {
              type: VARIABLE_ENTRY_TYPES.FILE,
              value: file.name,
              metadata: {
                path: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                handle,
                handleId
              }
            };
          } catch (error) {
            console.error("Error processing file handle:", error);
            return null;
          }
        })
      );
      
      // Filter out null entries and update state
      const validEntries = entries.filter(entry => entry !== null);
      setSelectedFiles(prev => [...prev, ...validEntries]);
      onSelect(validEntries);
      
    } catch (error) {
      // User cancelled or API not supported
      if (error.name !== 'AbortError') {
        console.error("Error selecting files:", error);
      }
    }
  }, [onSelect]);
  
  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  // Handle drop event
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      
      const entries = files.map(file => ({
        type: VARIABLE_ENTRY_TYPES.FILE,
        value: file.name,
        metadata: {
          path: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      }));
      
      setSelectedFiles(prev => [...prev, ...entries]);
      onSelect(entries);
    }
  }, [onSelect]);
  
  // Handle remove file
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);
  
  // Handle clear all files
  const handleClearAll = useCallback(() => {
    setSelectedFiles([]);
    if (onClear) onClear();
  }, [onClear]);
  
  return (
    <div className="plasmo-space-y-3">
      <div
        className={`plasmo-border-2 plasmo-border-dashed plasmo-rounded-md plasmo-p-4 plasmo-text-center ${
          dragActive ? 'plasmo-border-primary-500 plasmo-bg-primary-50' : 'plasmo-border-gray-300 hover:plasmo-border-primary-300'
        } plasmo-transition-colors plasmo-duration-200`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="plasmo-space-y-2">
          <svg className="plasmo-mx-auto plasmo-h-12 plasmo-w-12 plasmo-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <div className="plasmo-text-sm plasmo-text-gray-600">
            <button
              type="button"
              className="plasmo-font-medium plasmo-text-primary-600 hover:plasmo-text-primary-500 plasmo-focus:outline-none plasmo-focus:underline"
              onClick={handleFileSelect}
            >
              Choose files
            </button>
            <span className="plasmo-px-1">or drag and drop</span>
          </div>
          <p className="plasmo-text-xs plasmo-text-gray-500">
            Files will be stored as variables in your prompt templates
          </p>
        </div>
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="plasmo-mt-3">
          <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-2">
            <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              type="button"
              onClick={handleClearAll}
              className="plasmo-text-xs plasmo-text-primary-600 hover:plasmo-text-primary-500 plasmo-focus:outline-none plasmo-focus:underline"
            >
              Clear All
            </button>
          </div>
          
          <ul className="plasmo-space-y-1 plasmo-max-h-40 plasmo-overflow-y-auto plasmo-bg-gray-50 plasmo-rounded-md plasmo-border plasmo-border-gray-200 plasmo-p-2">
            {selectedFiles.map((file, index) => (
              <li key={index} className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-py-1 plasmo-px-2 plasmo-text-sm plasmo-text-gray-700 plasmo-rounded hover:plasmo-bg-gray-100">
                <div className="plasmo-flex plasmo-items-center plasmo-truncate">
                  <svg className="plasmo-h-4 plasmo-w-4 plasmo-mr-2 plasmo-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="plasmo-truncate">{file.metadata?.path || file.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="plasmo-ml-2 plasmo-text-gray-400 hover:plasmo-text-error-500"
                  aria-label="Remove file"
                >
                  <svg className="plasmo-h-4 plasmo-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}