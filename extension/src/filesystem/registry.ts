/**
 * Registry for file handles
 */
import { generateUniqueId } from './utils';

/**
 * Registry entry for IndexedDB storage
 */
interface RegistryEntry {
  /** Unique ID for the handle */
  id: string;
  /** Serialized file handle (if available) */
  serializedHandle?: any;
  /** File/directory name */
  name: string;
  /** File/directory kind */
  kind: 'file' | 'directory';
  /** Timestamp when the handle was registered */
  timestamp: number;
}

/**
 * Registry for storing and retrieving file handles
 */
export class FileHandleRegistry {
  private static instance: FileHandleRegistry;
  private handles: Map<string, FileSystemHandle> = new Map();
  private dbName = 'promptier-file-system';
  private storeName = 'handles';
  private dbPromise: Promise<IDBDatabase> | null = null;

  private constructor() {
    this.initDatabase();
    this.loadHandlesFromDB();
  }

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): FileHandleRegistry {
    if (!FileHandleRegistry.instance) {
      FileHandleRegistry.instance = new FileHandleRegistry();
    }
    return FileHandleRegistry.instance;
  }

  /**
   * Initialize the IndexedDB database
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
   * Register a file handle with the registry
   * 
   * @param handle - File handle to register
   * @param id - Optional ID for the handle (generated if not provided)
   * @returns The ID of the registered handle
   */
  public registerHandle(handle: FileSystemHandle, id?: string): string {
    const handleId = id || generateUniqueId(handle.kind);
    this.handles.set(handleId, handle);
    this.saveHandleToDB(handleId, handle);
    return handleId;
  }

  /**
   * Get a file handle by ID
   * 
   * @param id - ID of the handle to get
   * @returns The file handle, or undefined if not found
   */
  public getHandle(id: string): FileSystemHandle | undefined {
    return this.handles.get(id);
  }

  /**
   * Remove a file handle from the registry
   * 
   * @param id - ID of the handle to remove
   * @returns Whether the handle was removed
   */
  public removeHandle(id: string): boolean {
    const exists = this.handles.has(id);
    if (exists) {
      this.handles.delete(id);
      this.removeHandleFromDB(id);
    }
    return exists;
  }

  /**
   * Get all file handles in the registry
   * 
   * @returns Promise resolving to a map of all handles
   */
  public async getAllHandles(): Promise<Map<string, FileSystemHandle>> {
    await this.loadHandlesFromDB();
    return new Map(this.handles);
  }

  /**
   * Save a file handle to the IndexedDB database
   * 
   * @param id - ID of the handle
   * @param handle - File handle to save
   */
  private async saveHandleToDB(id: string, handle: FileSystemHandle): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // We can't directly store FileSystemHandles in IndexedDB
      // For now, we store metadata and rely on memory cache
      const entry: RegistryEntry = {
        id,
        name: handle.name,
        kind: handle.kind,
        timestamp: Date.now()
      };
      
      store.put(entry);
      console.log(`[FileHandleRegistry] Saved handle metadata to DB: ${id}`);
    } catch (error) {
      console.error(`[FileHandleRegistry] Failed to save handle to DB: ${id}`, error);
    }
  }

  /**
   * Remove a file handle from the IndexedDB database
   * 
   * @param id - ID of the handle to remove
   */
  private async removeHandleFromDB(id: string): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(id);
      console.log(`[FileHandleRegistry] Removed handle from DB: ${id}`);
    } catch (error) {
      console.error(`[FileHandleRegistry] Failed to remove handle from DB: ${id}`, error);
    }
  }

  /**
   * Load file handles from the IndexedDB database
   * Note: This can only load the metadata, not the actual handles
   * which will need to be re-acquired through user interaction
   */
  private async loadHandlesFromDB(): Promise<void> {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const records = request.result as RegistryEntry[];
        console.log(`[FileHandleRegistry] Loaded ${records.length} handle records from DB`);
        
        // We can't restore actual handles from DB, just log the IDs
        for (const record of records) {
          if (!this.handles.has(record.id)) {
            console.log(`[FileHandleRegistry] Found handle record: ${record.id} (${record.kind}:${record.name})`);
          }
        }
      };
      
      request.onerror = (event) => {
        console.error('[FileHandleRegistry] Failed to load handles from DB', event);
      };
    } catch (error) {
      console.error('[FileHandleRegistry] Error loading handles from DB', error);
    }
  }

  /**
   * Ensures the registry is fully loaded before performing operations
   * This can be called before any operation that requires the registry to be ready
   */
  public async ensureRegistryLoaded(): Promise<void> {
    // Wait for the database to be initialized
    if (!this.dbPromise) {
      this.initDatabase();
    }
    
    try {
      await this.dbPromise;
      // Force a reload of handles if needed
      await this.loadHandlesFromDB();
      console.log('[FileHandleRegistry] Registry fully loaded and ready for use');
    } catch (error) {
      console.error('[FileHandleRegistry] Failed to ensure registry is loaded', error);
      throw new Error('Failed to load file registry');
    }
  }

  /**
   * Clear all handles from the registry
   */
  public async clearHandles(): Promise<void> {
    this.handles.clear();
    
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();
      console.log('[FileHandleRegistry] Cleared all handles from DB');
    } catch (error) {
      console.error('[FileHandleRegistry] Failed to clear handles from DB', error);
    }
  }
}

// Export singleton instance
export const registry = FileHandleRegistry.getInstance(); 