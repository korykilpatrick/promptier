/**
 * Cache module for filesystem operations
 * 
 * This module provides caching for frequently accessed files and directories
 * to improve performance of file operations.
 */
import { FileContent, FileMetadata } from './types';
import * as Errors from './errors';

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Expiration timestamp (milliseconds since epoch) */
  expiration: number;
  /** Last accessed timestamp (milliseconds since epoch) */
  lastAccessed: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Maximum size of the cache (number of entries) */
  maxSize?: number;
  /** Default time-to-live for cache entries in milliseconds */
  defaultTTL?: number;
  /** Whether to enable caching */
  enabled?: boolean;
}

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  enabled: true
};

/**
 * Filesystem cache for improving performance of frequently accessed files
 */
export class FilesystemCache {
  /** The actual cache storage: Map of cache keys to cache entries */
  private cache = new Map<string, CacheEntry<any>>();
  /** Cache statistics for monitoring */
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  /** Cache configuration */
  private options: Required<CacheOptions>;
  
  /**
   * Create a new filesystem cache
   * 
   * @param options - Cache configuration options
   */
  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
    
    // Log cache creation
    Errors.logError(
      Errors.LogLevel.DEBUG, 
      `Filesystem cache created with max size ${this.options.maxSize}, ` +
      `TTL ${this.options.defaultTTL}ms, enabled: ${this.options.enabled}`
    );
    
    // Set up automatic cache cleanup
    this.setupCleanupInterval();
  }
  
  /**
   * Generate a cache key for a file handle
   * 
   * @param handle - File handle to generate key for
   * @param options - Additional options for key generation
   * @returns Cache key string
   */
  public generateFileKey(handle: FileSystemFileHandle, options?: Record<string, any>): string {
    // Use handle name and other available identifiers
    const baseKey = `file:${handle.name}`;
    
    // If options are provided, include them in the key
    if (options) {
      const optionsStr = Object.entries(options)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
        .join(',');
      
      return optionsStr ? `${baseKey}(${optionsStr})` : baseKey;
    }
    
    return baseKey;
  }
  
  /**
   * Generate a cache key for a directory handle
   * 
   * @param handle - Directory handle to generate key for
   * @returns Cache key string
   */
  public generateDirectoryKey(handle: FileSystemDirectoryHandle): string {
    return `dir:${handle.name}`;
  }
  
  /**
   * Set a value in the cache
   * 
   * @template T - Type of the value to cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not specified)
   * @returns The cached value
   */
  public set<T>(key: string, value: T, ttl?: number): T {
    if (!this.options.enabled) {
      return value;
    }
    
    const now = Date.now();
    const expiration = now + (ttl || this.options.defaultTTL);
    
    // Ensure we don't exceed the max cache size
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }
    
    // Store the value in the cache
    this.cache.set(key, {
      value,
      expiration,
      lastAccessed: now
    });
    
    return value;
  }
  
  /**
   * Get a value from the cache
   * 
   * @template T - Type of the value to retrieve
   * @param key - Cache key
   * @returns The cached value or null if not found or expired
   */
  public get<T>(key: string): T | null {
    if (!this.options.enabled) {
      this.stats.misses++;
      return null;
    }
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // If no entry or entry is expired, return null
    if (!entry || entry.expiration < now) {
      if (entry) {
        // Remove expired entry
        this.cache.delete(key);
      }
      this.stats.misses++;
      return null;
    }
    
    // Update last accessed time
    entry.lastAccessed = now;
    this.stats.hits++;
    
    return entry.value as T;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param key - Cache key
   * @returns Whether the key exists and is not expired
   */
  public has(key: string): boolean {
    if (!this.options.enabled) {
      return false;
    }
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    return !!entry && entry.expiration >= now;
  }
  
  /**
   * Delete a value from the cache
   * 
   * @param key - Cache key
   * @returns Whether the key was found and deleted
   */
  public delete(key: string): boolean {
    if (!this.options.enabled) {
      return false;
    }
    
    return this.cache.delete(key);
  }
  
  /**
   * Clear all entries from the cache
   */
  public clear(): void {
    this.cache.clear();
    Errors.logError(Errors.LogLevel.DEBUG, 'Filesystem cache cleared');
  }
  
  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  public getStats(): { size: number } & typeof this.stats {
    return {
      ...this.stats,
      size: this.cache.size
    };
  }
  
  /**
   * Cache a file's content
   * 
   * @param handle - File handle
   * @param content - File content
   * @param options - Additional options used for key generation
   * @returns The cached content
   */
  public cacheFileContent(
    handle: FileSystemFileHandle, 
    content: FileContent,
    options?: Record<string, any>
  ): FileContent {
    const key = this.generateFileKey(handle, options);
    return this.set(key, content);
  }
  
  /**
   * Get cached file content
   * 
   * @param handle - File handle
   * @param options - Additional options used for key generation
   * @returns Cached file content or null if not found
   */
  public getCachedFileContent(
    handle: FileSystemFileHandle,
    options?: Record<string, any>
  ): FileContent | null {
    const key = this.generateFileKey(handle, options);
    return this.get<FileContent>(key);
  }
  
  /**
   * Evict the least recently used entry from the cache
   */
  private evictOldest(): void {
    if (this.cache.size === 0) {
      return;
    }
    
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    // Delete the oldest entry
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Set up an interval to clean up expired cache entries
   */
  private setupCleanupInterval(): void {
    // Clean up every 10 minutes
    const CLEANUP_INTERVAL = 10 * 60 * 1000;
    
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;
      
      // Check each entry for expiration
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiration < now) {
          this.cache.delete(key);
          expiredCount++;
        }
      }
      
      if (expiredCount > 0) {
        Errors.logError(
          Errors.LogLevel.DEBUG, 
          `Cleaned up ${expiredCount} expired cache entries`
        );
      }
    }, CLEANUP_INTERVAL);
  }
}

// Create a singleton instance of the cache
export const cache = new FilesystemCache();

/**
 * Wrap a function with caching
 * 
 * @template T Return type of the function
 * @param fn - Function to wrap
 * @param cacheKeyGenerator - Function to generate a cache key
 * @param cache - Cache instance to use
 * @returns Wrapped function with caching
 */
export function withCache<T>(
  fn: (...args: any[]) => Promise<T>,
  cacheKeyGenerator: (...args: any[]) => string,
  cacheInstance: FilesystemCache = cache
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    const key = cacheKeyGenerator(...args);
    
    // Check if value is in cache
    const cachedValue = cacheInstance.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Call the original function
    const result = await fn(...args);
    
    // Cache the result
    cacheInstance.set(key, result);
    
    return result;
  };
} 