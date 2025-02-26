/**
 * Utility functions for the filesystem module
 */

/**
 * Format file size to human-readable format
 * 
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places to include
 * @returns Formatted file size string (e.g. "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get a file's extension from its name
 * 
 * @param filename - The file name
 * @returns The file extension (without the dot) or empty string if no extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Check if a filename is valid
 * 
 * @param filename - The filename to validate
 * @returns Whether the filename is valid
 */
export function isValidFilename(filename: string): boolean {
  // Check for common invalid characters in filenames
  const invalid = /[<>:"/\\|?*\x00-\x1F]/g;
  return !invalid.test(filename) && filename.trim() !== '';
}

/**
 * Get MIME type from file extension
 * 
 * @param filename - The filename or extension
 * @returns The MIME type or 'application/octet-stream' if unknown
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'video/webm',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'jsx': 'text/javascript',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Create a unique ID for file handles
 * 
 * @param prefix - Optional prefix for the ID
 * @returns A unique ID string
 */
export function generateUniqueId(prefix: string = 'file'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sanitize a path by removing invalid characters and normalizing separators
 * 
 * @param path - The path to sanitize
 * @returns The sanitized path
 */
export function sanitizePath(path: string): string {
  // Replace backslashes with forward slashes
  let sanitized = path.replace(/\\/g, '/');
  
  // Remove multiple consecutive slashes
  sanitized = sanitized.replace(/\/+/g, '/');
  
  // Remove trailing slash
  sanitized = sanitized.replace(/\/$/, '');
  
  return sanitized;
}

/**
 * Join path segments safely
 * 
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  const parts = segments.map(segment => 
    sanitizePath(segment).replace(/^\//, '').replace(/\/$/, '')
  ).filter(Boolean);
  
  return parts.join('/');
}

/**
 * Get the parent directory path
 * 
 * @param path - The path to get the parent of
 * @returns The parent directory path
 */
export function getParentPath(path: string): string {
  const sanitized = sanitizePath(path);
  const lastSlashIndex = sanitized.lastIndexOf('/');
  
  if (lastSlashIndex <= 0) {
    return '';
  }
  
  return sanitized.substring(0, lastSlashIndex);
}

/**
 * Get the name from a path
 * 
 * @param path - The path to extract the name from
 * @returns The name (last segment) of the path
 */
export function getNameFromPath(path: string): string {
  const sanitized = sanitizePath(path);
  const lastSlashIndex = sanitized.lastIndexOf('/');
  
  if (lastSlashIndex < 0) {
    return sanitized;
  }
  
  return sanitized.substring(lastSlashIndex + 1);
} 