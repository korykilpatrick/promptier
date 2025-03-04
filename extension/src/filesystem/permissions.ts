/**
 * Permission handling for filesystem operations
 */
import { FileAccessMode, FileSystemHandle, FileSystemFileHandle, FileSystemDirectoryHandle } from './types';
import * as Errors from './errors';
import { fs } from '../filesystem';

/**
 * Permission state from the File System Access API
 */
export type PermissionState = 'granted' | 'denied' | 'prompt';

/**
 * Permission mode options
 */
interface PermissionOptions {
  mode: FileAccessMode;
}

/**
 * Request permission for a file handle
 * 
 * @param handle - File system handle to request permission for
 * @param mode - Access mode to request
 * @returns Promise resolving to whether permission was granted
 * @throws PermissionDeniedError if permission is denied
 */
export async function requestPermission(
  handle: FileSystemHandle,
  mode: FileAccessMode = 'read'
): Promise<boolean> {
  try {
    // The File System Access API uses the PermissionState return type
    const options: PermissionOptions = { mode };
    
    // Check if requestPermission method exists on the handle
    if ('requestPermission' in handle && typeof handle.requestPermission === 'function') {
      // User activation may be required for requestPermission()
      // This needs to be triggered from a user gesture like a click
      const state = await handle.requestPermission(options) as PermissionState;
      return state === 'granted';
    }
    
    throw new Errors.CapabilityError(
      'requestPermission',
      'requestPermission method not available on the file handle'
    );
  } catch (error) {
    // Handle DOMException related to user activation
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new Errors.PermissionDeniedError(
        'Permission request requires user activation (like a click event)',
        error
      );
    }
    
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    
    throw new Errors.PermissionDeniedError('Permission request failed', error);
  }
}

/**
 * Query current permission state for a file handle without prompting the user
 * 
 * @param handle - File system handle to query permission for
 * @param mode - Access mode to query
 * @returns Promise resolving to the current permission state
 */
export async function queryPermission(
  handle: FileSystemHandle,
  mode: FileAccessMode = 'read'
): Promise<PermissionState> {
  try {
    const options: PermissionOptions = { mode };
    
    // Check if queryPermission method exists on the handle
    if ('queryPermission' in handle && typeof handle.queryPermission === 'function') {
      return await handle.queryPermission(options) as PermissionState;
    }
    
    throw new Errors.CapabilityError(
      'queryPermission',
      'queryPermission method not available on the file handle'
    );
  } catch (error) {
    if (error instanceof Errors.FileSystemError) {
      throw error;
    }
    
    throw new Errors.FileSystemError(
      'Failed to query permission state',
      'PERMISSION_QUERY_ERROR',
      error
    );
  }
}

/**
 * Verify if permission is granted for a file handle
 * 
 * @param handle - File system handle to verify permission for
 * @param mode - Access mode to verify
 * @param autoRequest - Whether to automatically request permission if not granted
 * @returns Promise resolving to whether permission is granted
 */
export async function verifyPermission(
  handle: FileSystemHandle,
  mode: FileAccessMode = 'read',
  autoRequest: boolean = true
): Promise<boolean> {
  try {
    // First query the current permission without prompting
    const state = await queryPermission(handle, mode);
    
    if (state === 'granted') {
      return true;
    }
    
    // Request permission if not already granted and autoRequest is true
    if (autoRequest) {
      return await requestPermission(handle, mode);
    }
    
    return false;
  } catch (error) {
    if (error instanceof Errors.CapabilityError) {
      // Fall back to requesting permission directly if query isn't supported
      if (autoRequest) {
        try {
          return await requestPermission(handle, mode);
        } catch (requestError) {
          console.error('Permission verification failed:', requestError);
          return false;
        }
      }
    }
    
    console.error('Permission verification failed:', error);
    return false;
  }
}

/**
 * Upgrade permission for a file handle from read to readwrite
 * 
 * @param handle - File system handle to upgrade permission for
 * @returns Promise resolving to whether permission was upgraded
 */
export async function upgradePermission(
  handle: FileSystemHandle
): Promise<boolean> {
  // Attempt to upgrade from read to readwrite
  return await requestPermission(handle, 'readwrite');
}

/**
 * Check if permission is needed for an operation
 * 
 * @param handle - File system handle to check
 * @param mode - Access mode to check
 * @returns Promise resolving to whether permission is needed
 */
export async function isPermissionNeeded(
  handle: FileSystemHandle,
  mode: FileAccessMode = 'read'
): Promise<boolean> {
  try {
    const state = await queryPermission(handle, mode);
    return state !== 'granted';
  } catch (error) {
    // If we can't query, assume permission is needed
    return true;
  }
}

/**
 * Ensure all handle permissions in an array of variables
 * 
 * @param variables - Array of variables that may contain file handles
 * @param mode - Access mode to verify
 * @returns Promise resolving to whether all permissions were granted
 */
export async function ensureVariablePermissions(
  variables: any[],
  mode: FileAccessMode = 'read'
): Promise<boolean> {
  // Process all variables that might contain handles
  for (const variable of variables) {
    if (!variable || typeof variable !== 'object') continue;
    
    // Check if it's a file handle itself
    if (variable.kind === 'file' || variable.kind === 'directory') {
      const hasPermission = await verifyPermission(variable, mode);
      if (!hasPermission) return false;
      continue;
    }
    
    // Check if it has a handle property
    if (variable.handle && (variable.handle.kind === 'file' || variable.handle.kind === 'directory')) {
      const hasPermission = await verifyPermission(variable.handle, mode);
      if (!hasPermission) return false;
      continue;
    }
    
    // Check if it has a metadata property with a handleId
    if (variable.metadata && variable.metadata.handleId) {
      // Get the handle from the registry
      const handle = fs.registry.getHandle(variable.metadata.handleId);
      if (handle) {
        const hasPermission = await verifyPermission(handle, mode);
        if (!hasPermission) return false;
      }
    }
  }
  
  return true;
} 