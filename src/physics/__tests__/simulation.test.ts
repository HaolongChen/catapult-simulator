import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type { PhysicsState17DOF, SimulationConfig } from '../types'

const MOCK_TREBUCHET = {
  longArmLength: 8,
  shortArmLength: 2,
  counterweightMass: 1000,
  counterweightRadius: 1.5,
  slingLength: 6,
  releaseAngle: (45 * Math.PI) / 180,
  springConstant: 50000,
  dampingCoefficient: 100,
  equilibriumAngle: 0,
  jointFriction: 0.3,
  efficiency: 0.9,
  flexuralStiffness: 1000000,
  armMass: 100,
  pivotHeight: 5,
}

const BASE_CONFIG = {
  fixedTimestep: 0.01,
  maxSubsteps: 100,
  maxAccumulator: 1.0,
}

describe('catapult-simulation', () => {
  describe('constructor', () => {
    it('should initialize with config', () => {
      const state: PhysicsState17DOF = createTestState()
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

function createTestState(): PhysicsState17DOF {
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([1, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: 0,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
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
