import { beforeEach, describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { physicsLogger } from '../logging'
import type { PhysicsState19DOF, SimulationConfig } from '../types'

const MOCK_TREBUCHET = {
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
  flexStiffness: 500000,
  flexDamping: 5000,
  flexPoint: 3.5,
  armMass: 100,
  pivotHeight: 5,
}

const BASE_CONFIG = {
  initialTimestep: 0.01,
  maxSubsteps: 100,
  maxAccumulator: 1.0,
  tolerance: 1e-6,
  minTimestep: 1e-7,
  maxTimestep: 0.01,
}

describe('catapult-simulation', () => {
  beforeEach(() => {
    physicsLogger.clear()
    physicsLogger.enable()
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      const state: PhysicsState19DOF = createTestState()
      const config: SimulationConfig = {
        ...BASE_CONFIG,
        projectile: createTestProjectile(),
        trebuchet: MOCK_TREBUCHET,
      }
      const sim = new CatapultSimulation(state, config)
      expect(sim).toBeDefined()
    })
  })

  describe('update', () => {
    it('should advance simulation state', () => {
      const state = createTestState()
      const config: SimulationConfig = {
        ...BASE_CONFIG,
        projectile: createTestProjectile(),
        trebuchet: MOCK_TREBUCHET,
      }
      const sim = new CatapultSimulation(state, config)
      const newState = sim.update(0.01667)
      expect(newState.time).toBeGreaterThan(0)
    })
  })
})

function createTestState(): PhysicsState19DOF {
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([1, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    slingBagPosition: new Float64Array(2),
    slingBagVelocity: new Float64Array(2),
    armAngle: 0,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    flexAngle: 0,
    flexAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}

function createTestProjectile() {
  return {
    mass: 1,
    radius: 0.05,
    area: Math.PI * 0.05 ** 2,
    dragCoefficient: 0.47,
    magnusCoefficient: 0.3,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }
}
