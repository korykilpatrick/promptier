const React = require("react");
const { useState, useCallback } = React;
const { createFileEntry, createDirectoryEntry, VARIABLE_ENTRY_TYPES } = require("shared/types/variables");
const { useToast } = require("../../../hooks/useToast");

// Import needed types
import type { VariableEntry } from "shared/types/variables";

// File System Access API types (not yet fully included in standard TypeScript definitions)
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

/**
 * Props for the FilePicker component
 */
interface FilePickerProps {
  onFileSelect: (files: VariableEntry | VariableEntry[]) => void;
  allowDirectories?: boolean;
  allowMultiple?: boolean;
  acceptTypes?: string[];
}

// Add the File System Access API to the window type
declare global {
  interface Window {
    showOpenFilePicker(options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
      excludeAcceptAllOption?: boolean;
    }): Promise<FileSystemFileHandle[]>;
  }
}

/**
 * FilePicker component that uses the File System Access API to select files or directories
 */
function FilePicker({ 
  onFileSelect, 
  allowDirectories = false, 
  allowMultiple = false,
  acceptTypes = []
}: FilePickerProps) {
  const { addToast } = useToast();
  const [permissionState, setPermissionState] = useState<"pending" | "granted" | "denied">("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<VariableEntry[]>([]);

  /**
   * Open the file picker dialog
   */
  const openFilePicker = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Check if File System Access API is available
      if (!window.showOpenFilePicker) {
        throw new Error("File System Access API is not supported in this browser");
      }
      
      // Set up options for file picker
      const options = {
        multiple: allowMultiple,
        types: acceptTypes.length > 0 ? [
          {
            description: "Accepted Files",
            accept: acceptTypes.reduce((acc: Record<string, string[]>, type: string) => {
              // Map file extensions to MIME types
              const mimeType = type.startsWith('.') 
                ? `application/${type.substring(1)}` 
                : type;
              acc[mimeType] = [type];
              return acc;
            }, {})
          }
        ] : undefined,
      };
      
      // Show file picker dialog
      const fileHandles = await window.showOpenFilePicker(options);
      
      // Set permission state to granted if we got this far
      setPermissionState("granted");
      
      // Process selected files
      const selectedEntries = await Promise.all(
        fileHandles.map(async (handle) => {
          const file = await handle.getFile();
          
          // Instead of reading file content, just create an entry with metadata
          const fileMetadata = {
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            // Store a serialized representation of the file path
            path: file.name
          };
          
          // Create the appropriate entry based on file type
          return handle.kind === 'file' 
            ? createFileEntry(
                file.name, // Use file name as the value
                undefined, // Let the backend assign an ID
                file.name, // Use the filename as the display name
                fileMetadata // Add metadata
              )
            : createDirectoryEntry(
                file.name, // Use directory name as the value
                undefined, // Let the backend assign an ID
                file.name, // Use the directory name as the display name
                fileMetadata // Add metadata
              );
        })
      );
      
      // Update state and call the callback
      setSelectedFiles(selectedEntries);
      if (onFileSelect) {
        onFileSelect(allowMultiple ? selectedEntries : selectedEntries[0]);
      }
      
    } catch (error: unknown) {
      console.error("Error selecting file:", error);
      
      // Handle permission denied
      if (error instanceof Error) {
        if (error.name === "AbortError" || error.name === "SecurityError") {
          setPermissionState("denied");
          addToast({
            type: "error",
            title: "Permission denied",
            message: "Please grant permission to access files"
          });
        } else {
          addToast({
            type: "error",
            title: "File selection error",
            message: error.message || "Failed to select file"
          });
        }
      } else {
        addToast({
          type: "error",
          title: "File selection error",
          message: "An unknown error occurred"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [allowMultiple, acceptTypes, allowDirectories, onFileSelect, addToast]);

  /**
   * Render the file picker UI
   */
  return (
    <div className="plasmo-mb-4">
      <button
        type="button"
        onClick={openFilePicker}
        disabled={isLoading}
        className="plasmo-bg-blue-500 plasmo-text-white plasmo-px-4 plasmo-py-2 plasmo-rounded plasmo-text-sm plasmo-font-medium plasmo-hover:bg-blue-600 plasmo-transition-colors plasmo-disabled:opacity-50 plasmo-disabled:cursor-not-allowed"
      >
        {isLoading ? "Selecting..." : "Select File"}
      </button>
      
      {permissionState === "denied" && (
        <div className="plasmo-mt-2 plasmo-text-sm plasmo-text-red-500">
          Permission denied. Please grant file access permission.
        </div>
      )}
      
      {selectedFiles.length > 0 && (
        <div className="plasmo-mt-3">
          <h4 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-700 plasmo-mb-2">
            Selected {selectedFiles.length > 1 ? `Files (${selectedFiles.length})` : "File"}:
          </h4>
          <ul className="plasmo-border plasmo-border-gray-200 plasmo-rounded plasmo-divide-y plasmo-divide-gray-200">
            {selectedFiles.map((file: VariableEntry, index: number) => (
              <li key={index} className="plasmo-px-3 plasmo-py-2 plasmo-text-sm plasmo-text-gray-800">
                {file.name || file.value.split('/').pop() || 'Unnamed file'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FilePicker; 