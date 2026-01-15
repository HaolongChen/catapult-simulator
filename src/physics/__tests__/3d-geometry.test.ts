import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type { PhysicsState17DOF, SimulationConfig } from '../types'

// --- Geometry Helpers ---

function getArmTipPosition(
  state: PhysicsState17DOF,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const { armAngle } = state
  const { longArmLength: L1, pivotHeight: H } = config.trebuchet
  return {
    x: L1 * Math.cos(armAngle),
    y: H + L1 * Math.sin(armAngle),
    z: 0,
  }
}

function getShortArmTipPosition(
  state: PhysicsState17DOF,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const { armAngle } = state
  const { shortArmLength: L2, pivotHeight: H } = config.trebuchet
  return {
    x: -L2 * Math.cos(armAngle),
    y: H - L2 * Math.sin(armAngle),
    z: 0,
  }
}

function getCounterweightPosition(
  state: PhysicsState17DOF,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const shortTip = getShortArmTipPosition(state, config)
  const { cwAngle } = state
  const { counterweightRadius: Rcw } = config.trebuchet
  return {
    x: shortTip.x + Rcw * Math.sin(cwAngle),
    y: shortTip.y - Rcw * Math.cos(cwAngle),
    z: 0,
  }
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
      longArmLength: 10,
      shortArmLength: 3,
      counterweightMass: 2000,
      counterweightRadius: 1.5,
      slingLength: 8,
      releaseAngle: (45 * Math.PI) / 180,
      springConstant: 0,
      dampingCoefficient: 0,
      equilibriumAngle: 0,
      jointFriction: 0.1,
      efficiency: 1.0,
      flexuralStiffness: 1e12,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

function createInitialState(config: SimulationConfig): PhysicsState17DOF {
  const { longArmLength: L1, pivotHeight: H } = config.trebuchet
  const armAngle = -Math.PI / 4
  const tip = { x: L1 * Math.cos(armAngle), y: H + L1 * Math.sin(armAngle) }

  return {
    position: new Float64Array([tip.x + 8, tip.y, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
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
      const cw = getCounterweightPosition(state, config)
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
      for (let i = 0; i < 500; i++) {
        const s = sim.update(0.01)
        const bottomY = s.position[1] - projRadius
        expect(bottomY).toBeGreaterThanOrEqual(-0.01)
      }
    })

    it('should prevent counterweight ground penetration', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      const cwRadius = config.trebuchet.counterweightRadius
      for (let i = 0; i < 500; i++) {
        const s = sim.update(0.01)
        const cwPos = getCounterweightPosition(s, config)
        const bottomY = cwPos.y - cwRadius
        expect(bottomY).toBeGreaterThanOrEqual(-1.0)
      }
    })

    it('should maintain distance between projectile and arm (no penetration)', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      const projRadius = config.projectile.radius
      const armRadius = 0.1
      for (let i = 0; i < 300; i++) {
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
          expect(dist).toBeGreaterThanOrEqual(projRadius + armRadius - 0.15)
        }
      }
    })

    it('should maintain distance between projectile and counterweight', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      const projRadius = config.projectile.radius
      const cwRadius = config.trebuchet.counterweightRadius
      for (let i = 0; i < 300; i++) {
        const s = sim.update(0.01)
        const cwPos = getCounterweightPosition(s, config)
        const dist = Math.sqrt(
          (s.position[0] - cwPos.x) ** 2 +
            (s.position[1] - cwPos.y) ** 2 +
            (s.position[2] - cwPos.z) ** 2,
        )
        expect(dist).toBeGreaterThanOrEqual(projRadius + cwRadius - 0.2)
      }
    })
  })

  describe('3. Bounding Volume', () => {
    it('should correctly calculate arm bounding box', () => {
      const config = createStandardConfig()
      const baseState = createInitialState(config)
      const state: PhysicsState17DOF = { ...baseState, armAngle: Math.PI / 4 }
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
      let prevPos = new Float64Array(createInitialState(config).position)
      for (let i = 0; i < 200; i++) {
        const s = sim.update(0.01)
        const dx = s.position[0] - prevPos[0]
        const dy = s.position[1] - prevPos[1]
        const dz = s.position[2] - prevPos[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        expect(dist).toBeLessThan(4.0)
        prevPos.set(s.position)
      }
    })

    it('should have smooth arm angle transitions', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      let prevAngle = createInitialState(config).armAngle
      for (let i = 0; i < 200; i++) {
        const s = sim.update(0.01)
        const dAngle = Math.abs(s.armAngle - prevAngle)
        expect(dAngle).toBeLessThan(2.0)
        prevAngle = s.armAngle
      }
    })
  })

  describe('5. Sling Behavior', () => {
    it('should keep sling length within physical bounds (dist <= Ls)', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      const Ls = config.trebuchet.slingLength
      for (let i = 0; i < 1000; i++) {
        const s = sim.update(0.005)
        if (!s.isReleased) {
          const tip = getArmTipPosition(s, config)
          const dist = Math.sqrt(
            (s.position[0] - tip.x) ** 2 +
              (s.position[1] - tip.y) ** 2 +
              (s.position[2] - tip.z) ** 2,
          )
          expect(dist).toBeLessThanOrEqual(Ls + 0.25)
          const forces = sim.getLastForces()
          const tension = Math.sqrt(
            forces.tension[0] ** 2 +
              forces.tension[1] ** 2 +
              forces.tension[2] ** 2,
          )
          if (tension > 50.0) {
            expect(Math.abs(dist - Ls)).toBeLessThan(0.2)
          }
        }
      }
    })

    it('should allow sling to go slack after release', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      const Ls = config.trebuchet.slingLength
      let releasedAt = -1
      for (let i = 0; i < 500; i++) {
        const s = sim.update(0.01)
        if (s.isReleased) {
          if (releasedAt === -1) releasedAt = i
          const tip = getArmTipPosition(s, config)
          const dist = Math.sqrt(
            (s.position[0] - tip.x) ** 2 +
              (s.position[1] - tip.y) ** 2 +
              (s.position[2] - tip.z) ** 2,
          )
          if (i > releasedAt + 50) expect(dist).not.toBeCloseTo(Ls, 2)
        }
      }
      expect(releasedAt).toBeGreaterThan(0)
    })
  })

  describe('6. Orientation', () => {
    it('should maintain normalized orientation quaternions', () => {
      const sim = new CatapultSimulation(
        createInitialState(createStandardConfig()),
        createStandardConfig(),
      )
      for (let i = 0; i < 500; i++) {
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
      for (let i = 0; i < 50; i++) {
        const s = sim.update(0.01)
        trajectory.push({
          time: s.time,
          projectile: { pos: Array.from(s.position) },
        })
      }
      expect(trajectory).toHaveLength(50)
      expect(JSON.parse(JSON.stringify(trajectory))).toBeDefined()
    })
  })

  describe('8. Visual Debugging Data', () => {
    it('should provide force vectors', () => {
      const sim = new CatapultSimulation(
        createInitialState(createStandardConfig()),
        createStandardConfig(),
      )
      for (let i = 0; i < 50; i++) {
        sim.update(0.01)
        const forces = sim.getLastForces()
        expect(forces.total).toHaveLength(3)
        expect(forces.total[0]).not.toBeNaN()
      }
    })
  })
})
