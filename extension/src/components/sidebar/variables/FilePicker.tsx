const React = require("react");
const { useState, useCallback, useEffect } = React;
const { createFileEntry, createDirectoryEntry, VARIABLE_ENTRY_TYPES } = require("shared/types/variables");
const { useToast } = require("../../../hooks/useToast");
const { v4: uuidv4 } = require('uuid'); // Add uuid dependency if not already available

// Import needed types
import type { VariableEntry } from "shared/types/variables";

// File System Access API types (not yet fully included in standard TypeScript definitions)
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  // Add permission API which is part of the File System Access API but not fully typed in TS yet
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied'>;
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

/**
 * A registry to maintain references to file handles in memory and persist them in IndexedDB
 * This prevents handles from being serialized/deserialized and losing their functionality
 */
class FileHandleRegistry {
  private static instance: FileHandleRegistry;
  private handles: Map<string, FileSystemHandle> = new Map();
  private dbName = 'promptier-file-handles';
  private storeName = 'handles';
  private dbPromise: Promise<IDBDatabase> | null = null;

  private constructor() {
    // Initialize the database connection
    this.initDatabase();
    // Load saved handles when constructed
    this.loadHandlesFromDB();
  }

  public static getInstance(): FileHandleRegistry {
    if (!FileHandleRegistry.instance) {
      FileHandleRegistry.instance = new FileHandleRegistry();
    }
    return FileHandleRegistry.instance;
  }

  /**
   * Initialize IndexedDB database for storing file handles
   */
  private initDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.error('[FileHandleRegistry] IndexedDB not supported');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (event) => {
        console.error('[FileHandleRegistry] IndexedDB error:', event);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[FileHandleRegistry] IndexedDB opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
          console.log('[FileHandleRegistry] Created object store:', this.storeName);
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Load saved handles from IndexedDB
   */
  private async loadHandlesFromDB(): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = async () => {
        const items = request.result;
        console.log(`[FileHandleRegistry] Loaded ${items.length} handles from IndexedDB`);
        
        // Verify each handle and add to in-memory map
        for (const item of items) {
          try {
            if (await this.verifyPermission(item.handle)) {
              this.handles.set(item.id, item.handle);
              console.log(`[FileHandleRegistry] Restored handle: ${item.id}, name: ${item.handle.name}`);
            } else {
              console.log(`[FileHandleRegistry] Permission denied for handle: ${item.id}, removing from DB`);
              this.removeHandleFromDB(item.id);
            }
          } catch (error) {
            console.error(`[FileHandleRegistry] Error verifying handle ${item.id}:`, error);
            this.removeHandleFromDB(item.id);
          }
        }
      };

      request.onerror = (event) => {
        console.error('[FileHandleRegistry] Error loading handles from IndexedDB:', event);
      };
    } catch (error) {
      console.error('[FileHandleRegistry] Failed to load handles from IndexedDB:', error);
    }
  }

  /**
   * Verify permission for a file handle
   */
  private async verifyPermission(handle: FileSystemHandle): Promise<boolean> {
    if (!handle || typeof handle.requestPermission !== 'function') return false;
    
    try {
      // Check if we already have permission, or request it
      const permission = await handle.requestPermission({ mode: 'read' });
      return permission === 'granted';
    } catch (error) {
      console.error('[FileHandleRegistry] Permission verification error:', error);
      return false;
    }
  }

  /**
   * Save a handle to IndexedDB
   */
  private async saveHandleToDB(id: string, handle: FileSystemHandle): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put({ id, handle });
      
      request.onsuccess = () => {
        console.log(`[FileHandleRegistry] Saved handle to IndexedDB: ${id}`);
      };
      
      request.onerror = (event) => {
        console.error(`[FileHandleRegistry] Error saving handle to IndexedDB:`, event);
      };
    } catch (error) {
      console.error('[FileHandleRegistry] Failed to save handle to IndexedDB:', error);
    }
  }

  /**
   * Remove a handle from IndexedDB
   */
  private async removeHandleFromDB(id: string): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`[FileHandleRegistry] Removed handle from IndexedDB: ${id}`);
      };
      
      request.onerror = (event) => {
        console.error(`[FileHandleRegistry] Error removing handle from IndexedDB:`, event);
      };
    } catch (error) {
      console.error('[FileHandleRegistry] Failed to remove handle from IndexedDB:', error);
    }
  }

  /**
   * Register a file handle and get a unique ID
   */
  public registerHandle(handle: FileSystemHandle): string {
    const id = uuidv4(); // Generate a unique ID
    this.handles.set(id, handle);
    this.saveHandleToDB(id, handle);
    console.log(`[FileHandleRegistry] Registered handle with ID: ${id}, name: ${handle.name}, kind: ${handle.kind}`);
    return id;
  }

  /**
   * Get a file handle by ID
   */
  public getHandle(id: string): FileSystemHandle | undefined {
    const handle = this.handles.get(id);
    console.log(`[FileHandleRegistry] Retrieved handle with ID: ${id}, exists: ${!!handle}`);
    return handle;
  }

  /**
   * Remove a file handle from the registry
   */
  public removeHandle(id: string): boolean {
    const result = this.handles.delete(id);
    if (result) {
      this.removeHandleFromDB(id);
    }
    return result;
  }

  /**
   * Get all registered handles
   */
  public getAllHandles(): Map<string, FileSystemHandle> {
    return new Map(this.handles);
  }

  /**
   * Get the number of registered handles
   */
  public getHandleCount(): number {
    return this.handles.size;
  }
}

// Export the registry for use in other components
export const fileHandleRegistry = FileHandleRegistry.getInstance();

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
      
      console.log('[FilePicker] Opening file picker with options:', options);
      
      // Show file picker dialog
      const fileHandles = await window.showOpenFilePicker(options);
      console.log('[FilePicker] File picker returned handles:', fileHandles.length);
      
      // Process selected files
      const selectedEntries = await Promise.all(
        fileHandles.map(async (handle) => {
          console.log('[FilePicker] Processing file handle:', handle.name, 'kind:', handle.kind);
          
          try {
            // Try to get the file directly - this will trigger permission prompt if needed
            const file = await handle.getFile();
            console.log('[FilePicker] File info:', {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            });
            
            // Get the full path if possible
            let filePath = file.name;
            try {
              // Some browsers might support webkitRelativePath or other path properties
              if ('webkitRelativePath' in file && file.webkitRelativePath) {
                filePath = file.webkitRelativePath;
                console.log('[FilePicker] Using webkitRelativePath:', filePath);
              }
            } catch (pathError) {
              console.error('[FilePicker] Error getting file path:', pathError);
            }
            
            // Register the handle with our registry instead of trying to serialize it
            const handleId = fileHandleRegistry.registerHandle(handle);
            
            // Create file metadata - now using handleId instead of storing the actual handle
            const fileMetadata = {
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              // Store a serialized representation of the file path
              path: filePath,
              // Store the handle ID instead of the handle itself
              handleId: handleId
            };
            
            console.log('[FilePicker] Created file metadata:', JSON.stringify(fileMetadata));
            
            // Create the appropriate entry based on file type
            const entry = handle.kind === 'file' 
              ? createFileEntry(
                  filePath, // Use proper path as the value
                  undefined, // Let the backend assign an ID
                  file.name, // Use the filename as the display name
                  fileMetadata // Add metadata with handleId instead of handle
                )
              : createDirectoryEntry(
                  filePath, // Use proper path as the value
                  undefined, // Let the backend assign an ID
                  file.name, // Use the directory name as the display name
                  fileMetadata // Add metadata with handleId instead of handle
                );
                
            console.log('[FilePicker] Created entry:', JSON.stringify(entry));
            
            return entry;
          } catch (fileError) {
            console.error('[FilePicker] Error accessing file:', fileError);
            
            // Even on error, register the handle
            const handleId = fileHandleRegistry.registerHandle(handle);
            
            // Create an entry even if we can't access the file right now
            // The user might grant permission later
            const entry = handle.kind === 'file' 
              ? createFileEntry(
                  handle.name, 
                  undefined,
                  handle.name,
                  { handleId: handleId, path: handle.name }
                )
              : createDirectoryEntry(
                  handle.name,
                  undefined,
                  handle.name,
                  { handleId: handleId, path: handle.name }
                );
                
            console.warn('[FilePicker] Created fallback entry due to access error:', entry);
            return entry;
          }
        })
      );
      
      // Update state and call the callback
      setSelectedFiles(selectedEntries);
      if (onFileSelect) {
        onFileSelect(allowMultiple ? selectedEntries : selectedEntries[0]);
      }
      
      // Show success toast
      addToast({
        type: "success",
        title: "Files selected",
        message: `Selected ${selectedEntries.length} file(s)`
      });
      
    } catch (error: unknown) {
      console.error("Error selecting file:", error);
      
      // Handle errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.log("User cancelled file selection");
          // No need for an error toast when user cancels
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
   * Cleanup function to remove handles when component unmounts
   */
  useEffect(() => {
    // No cleanup needed for mounted component
    
    return () => {
      // When component unmounts, we could clean up unused handles
      // But it's better to keep them for the session in case they're referenced elsewhere
      console.log('[FilePicker] Component unmounting, handles remain in registry');
    };
  }, []);

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