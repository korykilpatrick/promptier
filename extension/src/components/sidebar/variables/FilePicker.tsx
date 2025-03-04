import React, { useState, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

// Variable entry types
const VARIABLE_ENTRY_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  DIRECTORY: 'directory'
};

// File handle registry for later access
export const fileHandleRegistry = new class FileHandleRegistry {
  private handles = new Map<string, FileSystemHandle>();

  constructor() {
    this.loadHandlesFromStorage();
  }

  registerHandle(handle: FileSystemHandle, id?: string): string {
    const handleId = id || uuidv4();
    this.handles.set(handleId, handle);
    this.saveHandlesToStorage();
    return handleId;
  }

  getHandle(id: string): FileSystemHandle | undefined {
    return this.handles.get(id);
  }

  removeHandle(id: string): boolean {
    const result = this.handles.delete(id);
    this.saveHandlesToStorage();
    return result;
  }

  getHandleCount(): number {
    return this.handles.size;
  }

  private async loadHandlesFromStorage() {
    try {
      // In a real implementation, we might load persistent handles here
      console.log('FileHandleRegistry: Would load handles from storage here');
    } catch (err) {
      console.error('Error loading handles from storage:', err);
    }
  }

  private saveHandlesToStorage() {
    try {
      // In a real implementation, we might save persistent handles here
      console.log('FileHandleRegistry: Would save handles to storage here');
    } catch (err) {
      console.error('Error saving handles to storage:', err);
    }
  }
}();

interface FilePickerProps {
  type: 'file' | 'directory';
  onSelect: (entries: any[]) => void;
  multiple?: boolean;
  className?: string;
}

export const FilePicker: React.FC<FilePickerProps> = ({
  type = 'file',
  onSelect,
  multiple = false,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if File System Access API is available
  const hasFileSystemAccess = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  // Handle button click to open file picker
  const handleButtonClick = useCallback(async () => {
    try {
      setError(null);
      
      // Use File System Access API if available
      if (hasFileSystemAccess) {
        let handles: FileSystemHandle[];
        
        if (type === 'file') {
          // Show file picker
          handles = await window.showOpenFilePicker({
            multiple,
            types: [
              {
                description: 'All Files',
                accept: {'*/*': []}
              }
            ]
          });
          
          // Process file handles
          const entries = await Promise.all(handles.map(async (handle) => {
            if (handle.kind === 'file') {
              const fileHandle = handle as FileSystemFileHandle;
              
              try {
                // Get file info
                const file = await fileHandle.getFile();
                
                // Register file handle in registry
                const handleId = fileHandleRegistry.registerHandle(fileHandle);
                
                return {
                  type: VARIABLE_ENTRY_TYPES.FILE,
                  value: file.name,
                  metadata: {
                    path: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    handleId: handleId
                  }
                };
              } catch (err) {
                console.error('Error accessing file:', err);
                return null;
              }
            }
            return null;
          }));
          
          const validEntries = entries.filter(entry => entry !== null);
          if (validEntries.length > 0) {
            setSelectedItems(validEntries.map(entry => entry.value));
            onSelect(validEntries);
          }
        } else {
          // Show directory picker
          try {
            const dirHandle = await window.showDirectoryPicker();
            
            // Register directory handle in registry
            const handleId = fileHandleRegistry.registerHandle(dirHandle);
            
            // Create directory entry
            const entry = {
              type: VARIABLE_ENTRY_TYPES.DIRECTORY,
              value: dirHandle.name,
              metadata: {
                path: dirHandle.name,
                isDirectory: true,
                handleId: handleId
              }
            };
            
            setSelectedItems([dirHandle.name]);
            onSelect([entry]);
          } catch (err) {
            if (err.name !== 'AbortError') {
              console.error('Error selecting directory:', err);
              setError('Failed to select directory');
            }
          }
        }
      } else {
        // Fallback to standard file input for browsers without File System Access API
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting file/directory:', err);
        setError('Failed to access file system');
      }
    }
  }, [type, multiple, hasFileSystemAccess, onSelect]);

  // Handle file selection (fallback method)
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const entries = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        entries.push({
          type: VARIABLE_ENTRY_TYPES.FILE,
          value: file.name,
          metadata: {
            path: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          }
        });
      }
      
      setSelectedItems(entries.map(entry => entry.value));
      onSelect(entries);
      
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error selecting file:', err);
      setError('Failed to select file');
    }
  }, [onSelect]);

  // Handle directory selection (fallback method)
  const handleDirectorySelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      if (!e.target.files || e.target.files.length === 0) return;
      
      // For directories, we get all files within the directory
      const entries = [];
      const fileList = Array.from(e.target.files);
      
      // Group files by directory
      const dirMap = new Map<string, string[]>();
      
      for (const file of fileList) {
        const path = file.webkitRelativePath;
        const parts = path.split('/');
        
        if (parts.length > 1) {
          const dirPath = parts[0];
          if (!dirMap.has(dirPath)) {
            dirMap.set(dirPath, []);
          }
          dirMap.get(dirPath)!.push(path);
        }
      }
      
      // Create entries for each directory
      for (const [dirPath, filePaths] of dirMap.entries()) {
        entries.push({
          type: VARIABLE_ENTRY_TYPES.DIRECTORY,
          value: dirPath,
          metadata: {
            path: dirPath,
            fileCount: filePaths.length
          }
        });
      }
      
      setSelectedItems(entries.map(entry => entry.value));
      onSelect(entries);
      
      // Reset input value to allow selecting the same directory again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error selecting directory:', err);
      setError('Failed to select directory');
    }
  }, [onSelect]);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    
    try {
      if (e.dataTransfer.items) {
        const entries = [];
        
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          
          // Check if we can get it as a FileSystemHandle (modern browsers)
          if (item.getAsFileSystemHandle) {
            try {
              const handle = await item.getAsFileSystemHandle();
              
              if ((type === 'file' && handle.kind === 'file') ||
                  (type === 'directory' && handle.kind === 'directory')) {
                
                // Register handle in registry
                const handleId = fileHandleRegistry.registerHandle(handle);
                
                // For files, get more metadata
                if (handle.kind === 'file') {
                  const fileHandle = handle as FileSystemFileHandle;
                  const file = await fileHandle.getFile();
                  
                  entries.push({
                    type: VARIABLE_ENTRY_TYPES.FILE,
                    value: file.name,
                    metadata: {
                      path: file.name,
                      size: file.size,
                      type: file.type,
                      lastModified: file.lastModified,
                      handleId: handleId
                    }
                  });
                } else {
                  // Directory entry
                  entries.push({
                    type: VARIABLE_ENTRY_TYPES.DIRECTORY,
                    value: handle.name,
                    metadata: {
                      path: handle.name,
                      isDirectory: true,
                      handleId: handleId
                    }
                  });
                }
              }
            } catch (err) {
              console.error('Error handling dropped file as FileSystemHandle:', err);
              
              // Fallback to legacy method
              const entry = item.webkitGetAsEntry();
              if (entry) {
                if ((type === 'file' && entry.isFile) || (type === 'directory' && entry.isDirectory)) {
                  entries.push({
                    type: entry.isFile ? VARIABLE_ENTRY_TYPES.FILE : VARIABLE_ENTRY_TYPES.DIRECTORY,
                    value: entry.name,
                    metadata: {
                      path: entry.name,
                      isFile: entry.isFile,
                      isDirectory: entry.isDirectory
                    }
                  });
                }
              }
            }
          } else {
            // Legacy method
            const entry = item.webkitGetAsEntry();
            if (entry) {
              if ((type === 'file' && entry.isFile) || (type === 'directory' && entry.isDirectory)) {
                entries.push({
                  type: entry.isFile ? VARIABLE_ENTRY_TYPES.FILE : VARIABLE_ENTRY_TYPES.DIRECTORY,
                  value: entry.name,
                  metadata: {
                    path: entry.name,
                    isFile: entry.isFile,
                    isDirectory: entry.isDirectory
                  }
                });
              }
            }
          }
        }
        
        if (entries.length > 0) {
          setSelectedItems(entries.map(entry => entry.value));
          onSelect(entries);
        }
      }
    } catch (err) {
      console.error('Error handling dropped files:', err);
      setError('Failed to process dropped items');
    }
  };

  return (
    <div className={className}>
      <div
        className={`
          plasmo-border-2 plasmo-border-dashed plasmo-rounded-md plasmo-p-6
          plasmo-transition-colors plasmo-duration-200 plasmo-text-center
          ${isDragging
            ? 'plasmo-border-primary-500 plasmo-bg-primary-50'
            : 'plasmo-border-gray-300 plasmo-bg-gray-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center">
          <svg
            className={`plasmo-w-10 plasmo-h-10 plasmo-mb-3 ${isDragging ? 'plasmo-text-primary-600' : 'plasmo-text-gray-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {type === 'file' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            )}
          </svg>
          
          <p className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
            {type === 'file' ? 'Select file' : 'Select directory'}
          </p>
          
          <p className="plasmo-text-xs plasmo-text-gray-500 plasmo-mb-3">
            {hasFileSystemAccess
              ? `Drag and drop ${type === 'file' ? 'files' : 'directories'} here, or click to browse`
              : `Click to browse ${type === 'file' ? 'files' : 'directories'}`
            }
          </p>
          
          <button
            type="button"
            onClick={handleButtonClick}
            className="plasmo-btn-primary"
          >
            Browse {type === 'file' ? 'Files' : 'Directories'}
          </button>
          
          {/* Fallback file input for browsers without File System Access API */}
          <input
            ref={fileInputRef}
            type="file"
            className="plasmo-hidden"
            multiple={multiple}
            {...(type === 'directory' ? { webkitdirectory: '', directory: '' } : {})}
            onChange={type === 'file' ? handleFileSelect : handleDirectorySelect}
            aria-hidden="true"
          />
        </div>
        
        {error && (
          <div className="plasmo-mt-3 plasmo-text-sm plasmo-text-error-600">
            {error}
          </div>
        )}
        
        {selectedItems.length > 0 && (
          <div className="plasmo-mt-3 plasmo-text-left">
            <p className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-700 plasmo-mb-1">
              Selected {type === 'file' ? 'files' : 'directories'} ({selectedItems.length}):
            </p>
            <ul className="plasmo-max-h-20 plasmo-overflow-y-auto plasmo-text-xs plasmo-text-gray-600 plasmo-bg-white plasmo-border plasmo-border-gray-200 plasmo-rounded plasmo-p-2">
              {selectedItems.map((item, index) => (
                <li key={index} className="plasmo-mb-1 plasmo-truncate">
                  {type === 'file' ? '📄 ' : '📁 '}{item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};