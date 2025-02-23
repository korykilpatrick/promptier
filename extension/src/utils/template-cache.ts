import type { TemplateParseResult } from '../types/template-variables';

interface CacheEntry {
  result: TemplateParseResult;
  timestamp: number;
}

class TemplateCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 100, ttlMinutes = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(template: string): TemplateParseResult | null {
    const entry = this.cache.get(template);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(template);
      return null;
    }

    return entry.result;
  }

  set(template: string, result: TemplateParseResult): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(template, {
      result,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
}

// Create a singleton instance
export const templateCache = new TemplateCache();

// Run cleanup periodically (every minute)
setInterval(() => templateCache.cleanup(), 60 * 1000); 