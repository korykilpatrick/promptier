import { useState, useEffect, useCallback, useRef } from "react"

interface DebounceOptions {
  /** Delay in milliseconds */
  delay?: number;
  /** Whether to update the value immediately on first change */
  immediate?: boolean;
  /** Maximum time to wait before forcing an update */
  maxWait?: number;
  /** Callback to run before the debounced value updates */
  onPending?: () => void;
  /** Callback to run after the debounced value updates */
  onComplete?: () => void;
}

/**
 * Hook that debounces a value with configurable options
 */
export function useDebounceValue<T>(
  value: T,
  options: DebounceOptions = {}
): T {
  const {
    delay = 300,
    immediate = false,
    maxWait = delay * 2,
    onPending,
    onComplete
  } = options;

  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<number | null>(null);
  const maxTimeoutRef = useRef<number | null>(null);
  const lastValueRef = useRef(value);
  const lastUpdateTimeRef = useRef(Date.now());

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) window.clearTimeout(maxTimeoutRef.current);
    };
  }, []);

  // Update the debounced value when the input value changes
  useEffect(() => {
    // Skip if the value hasn't changed
    if (value === lastValueRef.current) return;

    // Call onPending callback
    onPending?.();

    // Update immediately if immediate is true and this is the first change
    if (immediate && lastValueRef.current === debouncedValue) {
      setDebouncedValue(value);
      lastValueRef.current = value;
      lastUpdateTimeRef.current = Date.now();
      onComplete?.();
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Set up max wait timeout if not already set
    if (!maxTimeoutRef.current) {
      maxTimeoutRef.current = window.setTimeout(() => {
        if (lastValueRef.current !== debouncedValue) {
          setDebouncedValue(lastValueRef.current);
          lastUpdateTimeRef.current = Date.now();
          onComplete?.();
        }
        maxTimeoutRef.current = null;
      }, maxWait);
    }

    // Set up normal timeout
    timeoutRef.current = window.setTimeout(() => {
      setDebouncedValue(value);
      lastValueRef.current = value;
      lastUpdateTimeRef.current = Date.now();
      if (maxTimeoutRef.current) {
        window.clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
      onComplete?.();
    }, delay);

    // Update last value
    lastValueRef.current = value;
  }, [value, delay, maxWait, immediate, onPending, onComplete]);

  return debouncedValue;
}

/**
 * Hook that debounces a callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  options: DebounceOptions = {}
): [T, () => void] {
  const {
    delay = 300,
    maxWait = delay * 2,
    onPending,
    onComplete
  } = options;

  const timeoutRef = useRef<number | null>(null);
  const maxTimeoutRef = useRef<number | null>(null);
  const lastArgsRef = useRef<any[]>([]);
  const lastCallTimeRef = useRef(Date.now());

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) window.clearTimeout(maxTimeoutRef.current);
    };
  }, []);

  // Create the debounced function
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    // Call onPending callback
    onPending?.();

    // Clear existing timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Set up max wait timeout if not already set
    if (!maxTimeoutRef.current) {
      maxTimeoutRef.current = window.setTimeout(() => {
        callback(...lastArgsRef.current);
        lastCallTimeRef.current = Date.now();
        maxTimeoutRef.current = null;
        onComplete?.();
      }, maxWait);
    }

    // Set up normal timeout
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
      lastCallTimeRef.current = Date.now();
      if (maxTimeoutRef.current) {
        window.clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
      onComplete?.();
    }, delay);

    // Update last args
    lastArgsRef.current = args;
  }, [callback, delay, maxWait, onPending, onComplete]);

  // Function to cancel pending debounced calls
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      window.clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  return [debouncedCallback as T, cancel];
} 