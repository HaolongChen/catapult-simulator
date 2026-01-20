import { useRef, useCallback } from 'react'

export interface CanvasTransformApi {
  zoomRef: React.MutableRefObject<number>
  offsetRef: React.MutableRefObject<{ x: number; y: number }>
  toCanvasX: (x: number) => number
  toCanvasY: (y: number) => number
  toWorldX: (screenX: number) => number
  toWorldY: (screenY: number) => number
}

export function useCanvasTransform(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  opts: {
    defaultZoom?: number
    groundAnchorFactor?: number
  } = {},
): CanvasTransformApi {
  const { defaultZoom = 30, groundAnchorFactor = 0.8 } = opts

  const zoomRef = useRef(defaultZoom)
  const offsetRef = useRef({ x: 0, y: 0 })

  const toCanvasX = useCallback(
    (x: number) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      return canvas.width / 2 + (x + offsetRef.current.x) * zoomRef.current
    },
    [canvasRef],
  )

  const toCanvasY = useCallback(
    (y: number) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      return (
        canvas.height * groundAnchorFactor +
        offsetRef.current.y -
        y * zoomRef.current
      )
    },
    [canvasRef, groundAnchorFactor],
  )

  const toWorldX = useCallback(
    (screenX: number) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      return (
        (screenX - canvas.width / 2) / zoomRef.current - offsetRef.current.x
      )
    },
    [canvasRef],
  )

  const toWorldY = useCallback(
    (screenY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      return (
        (canvas.height * groundAnchorFactor + offsetRef.current.y - screenY) /
        zoomRef.current
      )
    },
    [canvasRef, groundAnchorFactor],
  )

  return {
    zoomRef,
    offsetRef,
    toCanvasX,
    toCanvasY,
    toWorldX,
    toWorldY,
  }
}
