import React, { useCallback, useEffect, useRef, useState } from "react"
import { useFocusManagement } from "../../hooks/useFocusManagement"
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation"

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  containerHeight: number
  overscan?: number
  className?: string
  onItemFocus?: (index: number) => void
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  className = "",
  onItemFocus
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const { currentFocus, setFocus, focusNext, focusPrevious, resetFocus } = useFocusManagement({
    itemCount: items.length,
    onFocusChange: (index) => {
      if (index >= 0) {
        // Scroll the focused item into view
        const itemTop = index * itemHeight
        const itemBottom = itemTop + itemHeight
        const containerTop = scrollTop
        const containerBottom = containerTop + containerHeight

        if (itemTop < containerTop) {
          setScrollTop(itemTop)
        } else if (itemBottom > containerBottom) {
          setScrollTop(itemBottom - containerHeight)
        }

        onItemFocus?.(index)
      }
    }
  })

  useKeyboardNavigation({
    onArrowDown: focusNext,
    onArrowUp: focusPrevious,
    onEscape: resetFocus
  })

  const totalHeight = items.length * itemHeight
  const visibleItems = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  // Update scroll position when items change
  useEffect(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [items])

  const visibleItemsStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    transform: `translateY(${startIndex * itemHeight}px)`
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: "auto", position: "relative" }}
      className={className}
      tabIndex={-1}
      role="listbox"
      aria-label="Template list"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={visibleItemsStyle}>
          {items.slice(startIndex, endIndex + 1).map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              role="option"
              aria-selected={currentFocus === startIndex + index}
              tabIndex={currentFocus === startIndex + index ? 0 : -1}
              onFocus={() => setFocus(startIndex + index)}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 