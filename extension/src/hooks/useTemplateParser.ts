import { useMemo, useCallback } from 'react';
import type { TemplateParseResult } from '../types/template-variables';
import { parseTemplate } from '../utils/template-parser';
import { templateCache } from '../utils/template-cache';

interface UseTemplateParserOptions {
  /** Whether to use the template cache */
  useCache?: boolean;
  /** Whether to skip parsing if the template hasn't changed */
  skipUnchanged?: boolean;
}

interface UseTemplateParserReturn {
  /** The parsed template result */
  parseResult: TemplateParseResult;
  /** Function to manually invalidate the cache for this template */
  invalidateCache: () => void;
  /** Cache statistics */
  cacheStats: {
    cacheHit: boolean;
    parseTime: number;
  };
}

/**
 * Hook for efficient template parsing with caching and memoization
 */
export function useTemplateParser(
  template: string,
  options: UseTemplateParserOptions = {}
): UseTemplateParserReturn {
  const {
    useCache = true,
    skipUnchanged = true
  } = options;

  // Memoize the parsing function to avoid recreating it
  const parseWithTiming = useCallback((template: string) => {
    const startTime = performance.now();
    const result = parseTemplate(template);
    const parseTime = performance.now() - startTime;
    return { result, parseTime };
  }, []);

  // Memoize the parse result
  const { parseResult, cacheHit, parseTime } = useMemo(() => {
    // Try to get from cache first
    if (useCache) {
      const cached = templateCache.get(template);
      if (cached) {
        return {
          parseResult: cached,
          cacheHit: true,
          parseTime: 0
        };
      }
    }

    // Parse the template
    const { result, parseTime } = parseWithTiming(template);

    // Cache the result if caching is enabled
    if (useCache) {
      templateCache.set(template, result);
    }

    return {
      parseResult: result,
      cacheHit: false,
      parseTime
    };
  }, [template, useCache, parseWithTiming]);

  // Function to manually invalidate the cache
  const invalidateCache = useCallback(() => {
    if (useCache) {
      templateCache.clear();
    }
  }, [useCache]);

  return {
    parseResult,
    invalidateCache,
    cacheStats: {
      cacheHit,
      parseTime
    }
  };
} 