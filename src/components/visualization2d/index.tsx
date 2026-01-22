import { useEffect, useRef, useState } from 'react'
import type { TrebuchetVisualization2DProps } from './types'
import { useCanvasTransform } from './hooks/useCanvasTransform'
import { useCanvasInteraction } from './hooks/useCanvasInteraction'
import { useParticleSystem } from './hooks/useParticleSystem'
import { renderGrid } from './renderers/grid'
import { renderTrebuchet } from './renderers/trebuchet'
import {
  renderProjectile,
  renderVelocityVector,
  renderForceVectors,
} from './renderers/projectile'
import { renderTrajectory } from './renderers/telemetry'

export function TrebuchetVisualization2D({
  frameData,
  showForces = true,
  showTrajectory = true,
  showVelocity = true,
}: TrebuchetVisualization2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trajectoryRef = useRef<[number, number][]>([])
  const requestRef = useRef<number | undefined>(undefined)
  const frameDataRef = useRef(frameData)
  const optionsRef = useRef({ showForces, showTrajectory, showVelocity })
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  )

  const transformApi = useCanvasTransform(canvasRef, {
    defaultZoom: 25,
    groundAnchorFactor: 0.85,
    defaultOffsetX: -15,
  })
  const { toCanvasX, toCanvasY, zoomRef } = transformApi

  useCanvasInteraction(canvasRef, transformApi, {
    onMouseMoveWorld: (x, y) => {
      setMousePos({ x, y })
    },
  })

  const { triggerImpact, updateParticles, drawParticles, lastImpactYRef } =
    useParticleSystem()

  const rotationAngleRef = useRef(0)

  useEffect(() => {
    frameDataRef.current = frameData
    optionsRef.current = { showForces, showTrajectory, showVelocity }
  }, [frameData, showForces, showTrajectory, showVelocity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    const render = () => {
      requestRef.current = requestAnimationFrame(render)

      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      renderGrid(ctx, canvas, toCanvasX, toCanvasY, zoomRef)

      const groundY = toCanvasY(0)
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(canvas.width, groundY)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.stroke()

      const currentFrameData = frameDataRef.current
      if (!currentFrameData) return

      renderTrajectory(
        ctx,
        trajectoryRef.current,
        toCanvasX,
        toCanvasY,
        optionsRef.current.showTrajectory,
      )

      renderTrebuchet(ctx, currentFrameData, toCanvasX, toCanvasY, zoomRef)

      const { projectile } = currentFrameData

      if (currentFrameData.time === 0) {
        trajectoryRef.current = []
      }

      trajectoryRef.current.push([
        projectile.position[0],
        projectile.position[1],
      ])

      if (trajectoryRef.current.length > 500) {
        trajectoryRef.current = trajectoryRef.current.slice(-500)
      }

      const projWorldY = projectile.position[1]
      const projVelocityY = projectile.velocity[1]
      const impactVelocity = Math.sqrt(
        projectile.velocity[0] ** 2 + projVelocityY ** 2,
      )

      if (
        projWorldY <= projectile.radius &&
        Math.abs(projWorldY - lastImpactYRef.current) > 0.5 &&
        projVelocityY < 0
      ) {
        triggerImpact(projectile.position[0], projectile.radius, impactVelocity)
        lastImpactYRef.current = projWorldY
      }

      renderProjectile(
        ctx,
        currentFrameData,
        toCanvasX,
        toCanvasY,
        zoomRef,
        rotationAngleRef,
      )
      updateParticles()
      drawParticles(ctx, toCanvasX, toCanvasY)

      renderForceVectors(
        ctx,
        currentFrameData,
        toCanvasX,
        toCanvasY,
        optionsRef.current.showForces,
      )
      renderVelocityVector(
        ctx,
        currentFrameData,
        toCanvasX,
        toCanvasY,
        optionsRef.current.showVelocity,
      )
    }

    requestRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [
    toCanvasX,
    toCanvasY,
    zoomRef,
    triggerImpact,
    updateParticles,
    drawParticles,
    lastImpactYRef,
  ])

  return (
    <div className="absolute w-full h-full overflow">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full bg-[#050505]"
        style={{ display: 'block', zIndex: 0 }}
        onMouseLeave={() => setMousePos(null)}
      />
      {mousePos && (
        <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-xs pointer-events-none select-none z-10">
          <span className="text-blue-400">X:</span> {mousePos.x.toFixed(2)}m
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-blue-400">Y:</span> {mousePos.y.toFixed(2)}m
        </div>
      )}
    </div>
  )
}
