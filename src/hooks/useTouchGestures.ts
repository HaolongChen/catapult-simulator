import { useEffect, useRef } from 'react'

interface TouchGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinch?: (scale: number) => void
  threshold?: number
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions,
) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  )
  const initialPinchDistance = useRef<number | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const threshold = options.threshold || 50

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const scale = distance / initialPinchDistance.current

        if (options.onPinch) {
          options.onPinch(scale)
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now(),
      }

      const dx = touchEnd.x - touchStartRef.current.x
      const dy = touchEnd.y - touchStartRef.current.y
      const dt = touchEnd.time - touchStartRef.current.time

      // Only trigger if swipe is fast enough (< 300ms)
      if (dt > 300) {
        touchStartRef.current = null
        return
      }

      // Determine swipe direction
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (Math.abs(dx) > threshold) {
          if (dx > 0 && options.onSwipeRight) {
            options.onSwipeRight()
          } else if (dx < 0 && options.onSwipeLeft) {
            options.onSwipeLeft()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(dy) > threshold) {
          if (dy > 0 && options.onSwipeDown) {
            options.onSwipeDown()
          } else if (dy < 0 && options.onSwipeUp) {
            options.onSwipeUp()
          }
        }
      }

      touchStartRef.current = null
      initialPinchDistance.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [elementRef, options])
}
