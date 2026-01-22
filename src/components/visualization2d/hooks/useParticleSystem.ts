import { useRef, useCallback } from 'react'
import type { Particle } from '../types'

export function useParticleSystem() {
  const particlesRef = useRef<Particle[]>([])
  const particlePoolRef = useRef<Particle[]>([])
  const lastImpactYRef = useRef<number>(-Infinity)

  const createParticle = useCallback(
    (
      x: number,
      y: number,
      vx: number,
      vy: number,
      size: number,
      color: string,
    ): Particle => {
      const pooled = particlePoolRef.current.pop()
      if (pooled) {
        pooled.x = x
        pooled.y = y
        pooled.vx = vx
        pooled.vy = vy
        pooled.size = size
        pooled.color = color
        pooled.alpha = 1
        pooled.life = 0
        pooled.maxLife = 60
        return pooled
      }
      return {
        x,
        y,
        vx,
        vy,
        size,
        color,
        alpha: 1,
        life: 0,
        maxLife: 60,
      }
    },
    [],
  )

  const triggerImpact = useCallback(
    (x: number, y: number, impactVelocity: number) => {
      const particleCount = 12
      const colors = ['#d4af37', '#fbbf24', '#f59e0b', '#b45309', '#ffffff']

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3
        const speed = (impactVelocity * 0.3 + Math.random() * 2) * 0.1
        const size = 2 + Math.random() * 4
        const color = colors[Math.floor(Math.random() * colors.length)]

        particlesRef.current.push(
          createParticle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            size,
            color,
          ),
        )
      }
    },
    [createParticle],
  )

  const updateParticles = useCallback(() => {
    const particles = particlesRef.current
    if (particles.length === 0) return

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.005
      p.life++
      p.alpha = 1 - p.life / p.maxLife

      if (p.life >= p.maxLife) {
        particles.splice(i, 1)
        particlePoolRef.current.push(p)
      }
    }
  }, [])

  const drawParticles = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      toCanvasX: (x: number) => number,
      toCanvasY: (y: number) => number,
    ) => {
      const particles = particlesRef.current
      if (particles.length === 0) return

      for (const p of particles) {
        const canvasX = toCanvasX(p.x)
        const canvasY = toCanvasY(p.y)

        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.globalAlpha = 1
      }
    },
    [],
  )

  return {
    triggerImpact,
    updateParticles,
    drawParticles,
    lastImpactYRef,
  }
}
