// CommonJS version of useTemplateParser hook
try {
  // Import with unique names to avoid redeclaration errors
  const _React = require("react");
  const { useMemo, useCallback } = _React;
  const { parseTemplate } = require("../utils/template-parser");
  const { templateCache } = require("../utils/template-cache");

  /**
   * Hook for efficient template parsing with caching and memoization
   * @param {string} template - Template content to parse
   * @param {Object} options - Parser options
   * @param {boolean} [options.useCache=true] - Whether to use the template cache
   * @param {boolean} [options.skipUnchanged=true] - Whether to skip parsing if template hasn't changed
   * @returns {Object} Parse result and cache information
   */
  function useTemplateParser(template, options = {}) {
    const {
      useCache = true,
      skipUnchanged = true
    } = options;

    // Memoize the parsing function to avoid recreating it
    const parseWithTiming = useCallback((templateText) => {
      const startTime = performance.now();
      const result = parseTemplate(templateText);
      const parseTime = performance.now() - startTime;
      return { result, parseTime };
    }, []);

    // Memoize the parse result
    const { parseResult, cacheHit, parseTime } = useMemo(() => {
      try {
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
        if (useCache && result) {
          templateCache.set(template, result);
        }

        return {
          parseResult: result || { variables: [] },
          cacheHit: false,
          parseTime
        };
      } catch (error) {
        console.error("Error parsing template:", error);
        return {
          parseResult: { variables: [] },
          cacheHit: false,
          parseTime: 0
        };
      }
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

  // Export as CommonJS
  module.exports = { useTemplateParser };
} catch (error) {
  console.error("Error in useTemplateParser.js:", error);
  
  // Provide fallback implementation
  function fallbackUseTemplateParser(template) {
    console.warn("Using fallback implementation of useTemplateParser");
    return {
      parseResult: { variables: [] },
      invalidateCache: () => {},
      cacheStats: {
        cacheHit: false,
        parseTime: 0
      }
    };
  }
  
  module.exports = { useTemplateParser: fallbackUseTemplateParser };
} 