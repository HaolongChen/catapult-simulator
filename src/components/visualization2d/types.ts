import type { FrameData } from '@/physics/types'

export interface TrebuchetVisualization2DProps {
  frameData?: FrameData
  showForces?: boolean
  showTrajectory?: boolean
  showVelocity?: boolean
  showGrid?: boolean
  showTrebuchet?: boolean
  showParticles?: boolean
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
}
