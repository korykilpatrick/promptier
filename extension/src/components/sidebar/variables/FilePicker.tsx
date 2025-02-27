import { useState, useCallback } from "react";
import { createFileEntry, createDirectoryEntry, VARIABLE_ENTRY_TYPES } from "shared/types/variables";
import { useToast } from "../../../hooks/useToast";
import { fs } from '../../../filesystem';
import type { FileEntry, DirectoryEntry } from '../../../filesystem/types';

// Import needed types
import type { VariableEntry } from "shared/types/variables";

// Export registry reference for legacy support - points to the filesystem module's registry
// This allows existing code to keep working while we transition
export const fileHandleRegistry = {
  getHandle: (id: string) => fs.registry.getHandle(id),
  registerHandle: (handle: any) => fs.registry.registerHandle(handle),
  getHandleCount: async () => {
    const handles = await fs.registry.getAllHandles();
    return handles.size;
  }
};

/**
 * Props for the FilePicker component
 */
interface FilePickerProps {
  onFileSelect: (files: VariableEntry | VariableEntry[]) => void;
  allowDirectories?: boolean;
  allowMultiple?: boolean;
  acceptTypes?: string[];
}

/**
 * A component that allows users to pick files or directories from their device
 * Using the enhanced filesystem module for file operations
 */
function FilePicker({ 
  onFileSelect, 
  allowDirectories = false, 
  allowMultiple = false,
  acceptTypes = []
}: FilePickerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<VariableEntry[]>([]);
  const { addToast } = useToast();

  /**
   * Converts a filesystem entry to a variable entry
   */
  const convertToVariableEntry = useCallback((fsEntry: FileEntry | DirectoryEntry): VariableEntry => {
    if (fsEntry.kind === 'file') {
      // Store handle ID
      const handleId = fs.registry.registerHandle(fsEntry.handle);
      
      // Convert file entry to a variable entry
      return createFileEntry(
        fsEntry.name,  // path
        undefined,     // id (optional)
        fsEntry.name,  // name
        {             // metadata
          path: fsEntry.name,
          size: fsEntry.size,
          type: fsEntry.type,
          lastModified: fsEntry.lastModified,
          handleId: handleId    // Only store handleId, no backward compatibility
        }
      );
    } else {
      // Store handle ID
      const handleId = fs.registry.registerHandle(fsEntry.handle);
      
      // Convert directory entry to a variable entry
      return createDirectoryEntry(
        fsEntry.name,  // path
        undefined,     // id (optional)
        fsEntry.name,  // name
        {             // metadata
          path: fsEntry.name,
          handleId: handleId    // Only store handleId, no backward compatibility
        }
      );
    }
  }, []);

  /**
   * Opens the file or directory picker
   */
  const openFilePicker = useCallback(async () => {
    setIsLoading(true);
    
    try {
      let entries;
      
      if (allowDirectories) {
        // Use filesystem module to pick a directory
        const dirEntry = await fs.showDirectoryPicker();
        entries = [dirEntry];
      } else {
        // Use filesystem module to pick files
        entries = await fs.showFilePicker({
          multiple: allowMultiple,
          acceptTypes: acceptTypes,
          directory: false
        });
      }
      
      if (entries && entries.length > 0) {
        // Convert filesystem entries to variable entries
        const variableEntries = entries.map(entry => convertToVariableEntry(entry));
        
        // Update state and call the callback
        setSelectedFiles(variableEntries);
        onFileSelect(allowMultiple ? variableEntries : variableEntries[0]);
        
        // Show success toast
        addToast(
          `Selected ${variableEntries.length} ${variableEntries.length === 1 ? 'file' : 'files'}`,
          "success"
        );
      }
    } catch (error: unknown) {
      // Handle errors
      if (error instanceof fs.errors.FileSystemError && error.code === 'USER_CANCELLED') {
        console.log("User cancelled file selection");
      } else {
        // Show error toast
        addToast(
          error instanceof Error ? error.message : "An unknown error occurred",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [allowMultiple, acceptTypes, allowDirectories, onFileSelect, addToast, convertToVariableEntry]);

  return (
    <div className="plasmo-file-picker plasmo-flex plasmo-flex-col plasmo-gap-2">
      <button
        className="plasmo-btn plasmo-btn-primary plasmo-w-full"
        onClick={openFilePicker}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="plasmo-loading plasmo-loading-spinner plasmo-loading-xs"></span>
        ) : (
          <>
            {allowDirectories
              ? "Choose Directory"
              : allowMultiple
              ? "Choose Files"
              : "Choose File"}
          </>
        )}
      </button>
      
      {selectedFiles.length > 0 && (
        <div className="plasmo-selected-files plasmo-mt-2">
          <h3 className="plasmo-text-sm plasmo-font-semibold plasmo-mb-1">Selected:</h3>
          <ul className="plasmo-text-xs plasmo-text-gray-300">
            {selectedFiles.map((file: VariableEntry, index: number) => (
              <li key={index} className="plasmo-truncate">
                {file.type === VARIABLE_ENTRY_TYPES.FILE ? "📄" : "📁"} {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FilePicker; 