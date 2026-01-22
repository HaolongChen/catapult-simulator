import { useEffect, useRef } from 'react'
import type { CanvasTransformApi } from './useCanvasTransform'

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  transformApi: CanvasTransformApi,
  callbacks?: {
    onMouseMoveWorld?: (x: number, y: number) => void
  },
) {
  const { zoomRef, offsetRef, toWorldX, toWorldY } = transformApi
  const isDraggingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = 1.1
      const mouseWorldX = toWorldX(e.clientX)
      const mouseWorldY = toWorldY(e.clientY)

      if (e.deltaY < 0) {
        zoomRef.current *= zoomFactor
      } else {
        zoomRef.current /= zoomFactor
      }

      zoomRef.current = Math.max(10, Math.min(200, zoomRef.current))

      const newScreenX =
        canvas.width / 2 + (mouseWorldX + offsetRef.current.x) * zoomRef.current
      const newScreenY =
        canvas.height * 0.8 +
        offsetRef.current.y -
        mouseWorldY * zoomRef.current

      offsetRef.current.x += (e.clientX - newScreenX) / zoomRef.current
      offsetRef.current.y += (newScreenY - e.clientY) / zoomRef.current

      if (callbacks?.onMouseMoveWorld) {
        callbacks.onMouseMoveWorld(mouseWorldX, mouseWorldY)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const worldX = toWorldX(e.clientX)
      const worldY = toWorldY(e.clientY)

      if (callbacks?.onMouseMoveWorld) {
        callbacks.onMouseMoveWorld(worldX, worldY)
      }

      if (isDraggingRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x
        const dy = e.clientY - lastMousePosRef.current.y

        offsetRef.current.x += dx / zoomRef.current
        offsetRef.current.y -= dy / zoomRef.current

        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [canvasRef, zoomRef, offsetRef, toWorldX, toWorldY, callbacks])
}
