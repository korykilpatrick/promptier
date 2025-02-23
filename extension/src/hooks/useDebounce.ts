import { useState, useEffect, useCallback, useRef } from "react"

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

type AsyncFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => Promise<ReturnType<T>>

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): [AsyncFunction<T>, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef<T>(callback)

  // Update the callback ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    return new Promise<ReturnType<T>>((resolve, reject) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await callbackRef.current(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }, [delay])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return cancel
  }, [cancel])

  return [debouncedCallback, cancel]
} 