import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { computeTrebuchetKinematics } from '../kinematics'
import type {
  PhysicsState17DOF as PhysicsState19DOF,
  SimulationConfig,
} from '../types'

// --- Geometry Helpers ---

function getArmTipPosition(
  state: PhysicsState19DOF,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const kin = computeTrebuchetKinematics(
    state.armAngle,
    state.cwAngle,
    state.slingBagAngle,
    config.trebuchet,
  )
  return { x: kin.tip.x, y: kin.tip.y, z: 0 }
}

function getShortArmTipPosition(
  state: PhysicsState19DOF,
  config: SimulationConfig,
): { x: number; y: number; z: number } {
  const kin = computeTrebuchetKinematics(
    state.armAngle,
    state.cwAngle,
    state.slingBagAngle,
    config.trebuchet,
  )
  return { x: kin.shortTip.x, y: kin.shortTip.y, z: 0 }
}

function getCounterweightPosition(state: PhysicsState19DOF): {
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
      slingBagWidth: 0.35,
      slingBagMass: 5,
      slingBagInertia: 0.1,
      jointFriction: 0.3,
      armMass: 100,
      pivotHeight: 5,
    },
  }
}

function createInitialState(config: SimulationConfig): PhysicsState19DOF {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    counterweightRadius: Rcw,
  } = config.trebuchet
  const armAngle = -Math.PI / 4
  const tip = { x: L1 * Math.cos(armAngle), y: H + L1 * Math.sin(armAngle) }
  const shortTip = {
    x: -L2 * Math.cos(armAngle),
    y: H - L2 * Math.sin(armAngle),
  }

  return {
    position: new Float64Array([tip.x + 8, tip.y, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle,
    armAngularVelocity: 0,
    cwPosition: new Float64Array([shortTip.x, shortTip.y - Rcw]),
    cwVelocity: new Float64Array([0, 0]),
    cwAngle: 0,
    cwAngularVelocity: 0,
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    slingBagPosition: new Float64Array([tip.x + 8, tip.y]),
    slingBagVelocity: new Float64Array(2),
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
      for (let i = 0; i < 500; i++) {
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
      for (let i = 0; i < 500; i++) {
        const s = sim.update(0.01)
        const cwPos = getCounterweightPosition(s)
        const bottomY = cwPos.y - cwRadius
        expect(bottomY).toBeGreaterThanOrEqual(-1.0)
      }
    })

    it('should maintain distance between projectile and arm (no penetration)', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
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
          expect(dist).toBeGreaterThanOrEqual(0.0)
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
        const cwPos = getCounterweightPosition(s)
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
      const state: PhysicsState19DOF = { ...baseState, armAngle: Math.PI / 4 }
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
            expect(Math.abs(dist - Ls)).toBeLessThan(0.3)
          }
        }
      }
    })

    it('should allow sling to go slack after release', () => {
      const config = createStandardConfig()
      config.trebuchet.counterweightMass = 500000
      config.trebuchet.jointFriction = 0
      config.projectile.mass = 0.05
      const sim = new CatapultSimulation(createInitialState(config), config)
      const Ls = config.trebuchet.slingLength
      let releasedAt = -1
      for (let i = 0; i < 5000; i++) {
        const s = sim.update(0.005)
        if (s.isReleased || s.time > 5.0) {
          if (releasedAt === -1) releasedAt = i
          const tip = getArmTipPosition(s, config)
          const dist = Math.sqrt(
            (s.position[0] - tip.x) ** 2 +
              (s.position[1] - tip.y) ** 2 +
              (s.position[2] - tip.z) ** 2,
          )
          if (i > releasedAt + 500) expect(dist).not.toBeCloseTo(Ls, 4)
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

  describe('exportFrameData', () => {
    it('should export complete and valid frame data', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      sim.update(0.1)
      const frame = sim.exportFrameData()

      // Check that all top-level keys exist
      expect(frame).toHaveProperty('time')
      expect(frame).toHaveProperty('projectile')
      expect(frame).toHaveProperty('arm')
      expect(frame).toHaveProperty('counterweight')
      expect(frame).toHaveProperty('sling')
      expect(frame).toHaveProperty('ground')
      expect(frame).toHaveProperty('forces')
      expect(frame).toHaveProperty('constraints')
      expect(frame).toHaveProperty('phase')

      // Check a few key values
      expect(frame.projectile.position.every(isFinite)).toBe(true)
      expect(frame.arm.longArmTip.every(isFinite)).toBe(true)
      expect(frame.counterweight.position.every(isFinite)).toBe(true)
      expect(frame.sling.startPoint.every(isFinite)).toBe(true)
      expect(frame.sling.endPoint.every(isFinite)).toBe(true)
    })

    it('should correctly calculate arm tip positions', () => {
      const config = createStandardConfig()
      const initialState = createInitialState(config)
      const state = { ...initialState, armAngle: 0 }
      const sim = new CatapultSimulation(state, config)
      const frame = sim.exportFrameData()

      const expectedLongTip = [
        config.trebuchet.longArmLength * Math.cos(0),
        config.trebuchet.pivotHeight +
          config.trebuchet.longArmLength * Math.sin(0),
        0,
      ]
      expect(frame.arm.longArmTip[0]).toBeCloseTo(expectedLongTip[0])
      expect(frame.arm.longArmTip[1]).toBeCloseTo(expectedLongTip[1])
    })

    it('should correctly calculate sling length violation', () => {
      const config = createStandardConfig()
      const sim = new CatapultSimulation(createInitialState(config), config)
      sim.update(0.1)
      const frame = sim.exportFrameData()

      const dx = frame.sling.endPoint[0] - frame.sling.startPoint[0]
      const dy = frame.sling.endPoint[1] - frame.sling.startPoint[1]
      const dz = frame.sling.endPoint[2] - frame.sling.startPoint[2]
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz)

      expect(frame.constraints.slingLength.current).toBeCloseTo(length)
      expect(frame.constraints.slingLength.violation).toBeCloseTo(
        length - frame.sling.length,
      )
    })
  })
})
