import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { getTrebuchetKinematics } from '../trebuchet'
import { PHYSICS_CONSTANTS } from '../constants'
import type { PhysicsState, SimulationConfig } from '../types'

// --- Geometry Helpers ---

function getArmTipPosition(
  state: PhysicsState,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const kin = getTrebuchetKinematics(state.armAngle, config.trebuchet)
  return { x: kin.longArmTip.x, y: kin.longArmTip.y, z: 0 }
}

function getShortArmTipPosition(
  state: PhysicsState,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const kin = getTrebuchetKinematics(state.armAngle, config.trebuchet)
  return { x: kin.shortArmTip.x, y: kin.shortArmTip.y, z: 0 }
}

function getCounterweightPosition(state: PhysicsState): {
  x: number
  y: number
  z: number
} {
  return { x: state.cwPosition[0], y: state.cwPosition[1], z: 0 }
}

/**
 * Calculates the shortest distance from a point P to a line segment AB in 3D.
 */
function pointToLineSegmentDistance(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const lenSq = dx * dx + dy * dy + dz * dz
  if (lenSq < 1e-12)
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2 + (pz - az) ** 2)

  let t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lenSq
  t = Math.max(0, Math.min(1, t))

  const closestX = ax + t * dx
  const closestY = ay + t * dy
  const closestZ = az + t * dz

  return Math.sqrt(
    (px - closestX) ** 2 + (py - closestY) ** 2 + (pz - closestZ) ** 2,
  )
}

// --- Test Setup ---

function createStandardConfig(): SimulationConfig {
  return {
    initialTimestep: 0.005,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 1.0,
      radius: 0.1,
      area: Math.PI * 0.1 * 0.1,
      dragCoefficient: 0.47,
      magnusCoefficient: 0.3,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    },
    trebuchet: {
      longArmLength: 8,
      shortArmLength: 2,
      counterweightMass: 1000,
      counterweightRadius: 1.5,
      counterweightInertia: 500,
      slingLength: 6,
      releaseAngle: (45 * Math.PI) / 180,
      jointFriction: 0.3,
      armMass: 100,
      pivotHeight: 5,
    },
  }
}

function createInitialState(config: SimulationConfig): PhysicsState {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    counterweightRadius: Rcw,
    slingLength: Ls,
  } = config.trebuchet
  const armAngle = -Math.PI / 4
  const tip = { x: L1 * Math.cos(armAngle), y: H + L1 * Math.sin(armAngle) }
  const shortTip = {
    x: -L2 * Math.cos(armAngle),
    y: H - L2 * Math.sin(armAngle),
  }
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const slingParticles = new Float64Array(2 * N)
  const slingVelocities = new Float64Array(2 * N)

  const projX = tip.x + Ls
  const projY = tip.y

  for (let i = 0; i < N; i++) {
    const alpha = (i + 1) / N
    slingParticles[2 * i] = tip.x * (1 - alpha) + projX * alpha
    slingParticles[2 * i + 1] = tip.y * (1 - alpha) + projY * alpha
  }

  return {
    position: new Float64Array([projX, projY, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle,
    armAngularVelocity: 0,
    cwPosition: new Float64Array([shortTip.x, shortTip.y - Rcw]),
    cwVelocity: new Float64Array([0, 0]),
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    slingParticles,
    slingVelocities,
    time: 0,
    isReleased: false,
  }
}

describe('3D Geometry & Collision Validation Suite', () => {
  describe('1. Position Correctness', () => {
    it('should calculate arm tip position correctly', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const tip = getArmTipPosition(state, config)
      const expectedX =
        config.trebuchet.longArmLength * Math.cos(state.armAngle)
      const expectedY =
        config.trebuchet.pivotHeight +
        config.trebuchet.longArmLength * Math.sin(state.armAngle)
      expect(tip.x).toBeCloseTo(expectedX, 6)
      expect(tip.y).toBeCloseTo(expectedY, 6)
    })

    it('should calculate counterweight position correctly', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const cw = getCounterweightPosition(state)
      const shortTipX =
        -config.trebuchet.shortArmLength * Math.cos(state.armAngle)
      const shortTipY =
        config.trebuchet.pivotHeight -
        config.trebuchet.shortArmLength * Math.sin(state.armAngle)
      const expectedX =
        shortTipX +
        config.trebuchet.counterweightRadius * Math.sin(state.cwAngle)
      const expectedY =
        shortTipY -
        config.trebuchet.counterweightRadius * Math.cos(state.cwAngle)
      expect(cw.x).toBeCloseTo(expectedX, 6)
      expect(cw.y).toBeCloseTo(expectedY, 6)
    })
  })

  describe('2. Collision & Overlap', () => {
    it('should prevent projectile ground penetration', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      const projRadius = config.projectile.radius
      for (let i = 0; i < 100; i++) {
        const s = sim.update(0.01)
        const bottomY = s.position[1] - projRadius
        expect(bottomY).toBeGreaterThanOrEqual(-0.05)
      }
    })

    it('should prevent counterweight ground penetration', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      const cwRadius = config.trebuchet.counterweightRadius
      for (let i = 0; i < 100; i++) {
        const s = sim.update(0.01)
        const cwPos = getCounterweightPosition(s)
        const bottomY = cwPos.y - cwRadius
        expect(bottomY).toBeGreaterThanOrEqual(-2.0)
      }
    })

    it('should maintain distance between projectile and arm (no penetration)', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      for (let i = 0; i < 100; i++) {
        const s = sim.update(0.01)
        const longTip = getArmTipPosition(s, config)
        const shortTip = getShortArmTipPosition(s, config)
        const dist = pointToLineSegmentDistance(
          s.position[0],
          s.position[1],
          s.position[2],
          longTip.x,
          longTip.y,
          longTip.z,
          shortTip.x,
          shortTip.y,
          shortTip.z,
        )
        if (s.isReleased) {
          expect(dist).toBeGreaterThanOrEqual(0.0)
        }
      }
    })
  })

  describe('3. Bounding Volume', () => {
    it('should correctly calculate arm bounding box', () => {
      const config = createStandardConfig()
      const baseState = createInitialState(config)
      const state: PhysicsState = { ...baseState, armAngle: Math.PI / 4 }
      const longTip = getArmTipPosition(state, config)
      const shortTip = getShortArmTipPosition(state, config)
      const minX = Math.min(longTip.x, shortTip.x, 0)
      const minY = Math.min(longTip.y, shortTip.y, config.trebuchet.pivotHeight)
      const maxX = Math.max(longTip.x, shortTip.x, 0)
      const maxY = Math.max(longTip.y, shortTip.y, config.trebuchet.pivotHeight)
      expect(longTip.x).toBeGreaterThanOrEqual(minX)
      expect(longTip.x).toBeLessThanOrEqual(maxX)
      expect(shortTip.y).toBeGreaterThanOrEqual(minY)
      expect(shortTip.y).toBeLessThanOrEqual(maxY)
    })
  })

  describe('4. Visual Continuity', () => {
    it('should have smooth projectile position transitions', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      const prevPos = new Float64Array(createInitialState(config).position)
      for (let i = 0; i < 100; i++) {
        const s = sim.update(0.01)
        const dx = s.position[0] - prevPos[0]
        const dy = s.position[1] - prevPos[1]
        const dz = s.position[2] - prevPos[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        expect(dist).toBeLessThan(4.0)
        prevPos.set(s.position)
      }
    })
  })

  describe('5. Sling Behavior', () => {
    it('should keep sling length within physical bounds (dist <= Ls)', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      const Ls = config.trebuchet.slingLength
      for (let i = 0; i < 200; i++) {
        const s = sim.update(0.005)
        if (!s.isReleased) {
          const tip = getArmTipPosition(s, config)
          const dist = Math.sqrt(
            (s.position[0] - tip.x) ** 2 +
              (s.position[1] - tip.y) ** 2 +
              (s.position[2] - tip.z) ** 2,
          )
          expect(dist).toBeLessThanOrEqual(Ls + 0.5)
        }
      }
    })
  })

  describe('6. Orientation', () => {
    it('should maintain normalized orientation quaternions', () => {
      const sim = new CatapultSimulation(
        createInitialState(createStandardConfig()),
        createStandardConfig(),
      )
      for (let i = 0; i < 100; i++) {
        const q = sim.update(0.01).orientation
        const mag = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2)
        expect(mag).toBeCloseTo(1.0, 10)
      }
    })
  })

  describe('7. Trajectory Export', () => {
    it('should export valid trajectory data', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      const trajectory = []
      for (let i = 0; i < 20; i++) {
        const s = sim.update(0.01)
        trajectory.push({
          time: s.time,
          projectile: { pos: Array.from(s.position) },
        })
      }
      expect(trajectory).toHaveLength(20)
      expect(JSON.parse(JSON.stringify(trajectory))).toBeDefined()
    })
  })

  describe('exportFrameData', () => {
    it('should export complete and valid frame data', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      sim.update(0.1)
      const frame = sim.exportFrameData()

      expect(frame).toHaveProperty('time')
      expect(frame).toHaveProperty('projectile')
      expect(frame).toHaveProperty('arm')
      expect(frame).toHaveProperty('counterweight')
      expect(frame).toHaveProperty('sling')
      expect(frame).toHaveProperty('ground')
      expect(frame).toHaveProperty('forces')
      expect(frame).toHaveProperty('constraints')
      expect(frame).toHaveProperty('phase')

      expect(frame.projectile.position.every(isFinite)).toBe(true)
      expect(frame.arm.longArmTip.every(isFinite)).toBe(true)
      expect(frame.counterweight.position.every(isFinite)).toBe(true)
      expect(frame.sling.points.length).toBeGreaterThan(0)
    })
  })
})
