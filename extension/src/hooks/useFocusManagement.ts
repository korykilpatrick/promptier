import { useRef, useCallback } from 'react'

interface FocusManagementOptions {
  itemCount: number
  onFocusChange?: (index: number) => void
  loop?: boolean
}

export const useFocusManagement = ({
  itemCount,
  onFocusChange,
  loop = true
}: FocusManagementOptions) => {
  const currentFocusRef = useRef<number>(-1)

  const setFocus = useCallback((index: number) => {
    currentFocusRef.current = index
    onFocusChange?.(index)
  }, [onFocusChange])

  const focusNext = useCallback(() => {
    if (itemCount === 0) return

    const nextIndex = currentFocusRef.current + 1
    if (nextIndex >= itemCount) {
      if (loop) {
        setFocus(0)
      }
    } else {
      setFocus(nextIndex)
    }
  }, [itemCount, loop, setFocus])

  const focusPrevious = useCallback(() => {
    if (itemCount === 0) return

    const prevIndex = currentFocusRef.current - 1
    if (prevIndex < 0) {
      if (loop) {
        setFocus(itemCount - 1)
      }
    } else {
      setFocus(prevIndex)
    }
  }, [itemCount, loop, setFocus])

  const resetFocus = useCallback(() => {
    currentFocusRef.current = -1
    onFocusChange?.(-1)
  }, [onFocusChange])

  return {
    currentFocus: currentFocusRef.current,
    setFocus,
    focusNext,
    focusPrevious,
    resetFocus
  }
} 