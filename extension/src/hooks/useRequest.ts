import { useState, useCallback, useRef, useEffect } from "react"

interface RequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface RequestState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  abortController: AbortController | null
}

export function useRequest<T>(options: RequestOptions = {}) {
  const {
    timeout = 10000, // 10 seconds default timeout
    retries = 3,
    retryDelay = 1000
  } = options

  const [state, setState] = useState<RequestState<T>>({
    data: null,
    isLoading: false,
    error: null,
    abortController: null
  })

  const timeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (state.abortController) {
      state.abortController.abort()
    }
  }, [state.abortController])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const execute = useCallback(async <R extends T>(
    requestFn: (signal: AbortSignal) => Promise<R>
  ): Promise<R> => {
    cleanup()

    const abortController = new AbortController()
    setState(prev => ({ ...prev, isLoading: true, error: null, abortController }))

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error("Request timed out"))
        }, timeout)
      })

      // Execute request with timeout
      const result = await Promise.race([
        requestFn(abortController.signal),
        timeoutPromise
      ])

      setState(prev => ({
        ...prev,
        data: result,
        isLoading: false,
        error: null,
        abortController: null
      }))

      retryCountRef.current = 0
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Request failed")

      // Handle retries
      if (retryCountRef.current < retries && !abortController.signal.aborted) {
        retryCountRef.current++
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return execute(requestFn)
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
        abortController: null
      }))

      throw error
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [cleanup, retries, retryDelay, timeout])

  return {
    ...state,
    execute,
    cleanup
  }
} 