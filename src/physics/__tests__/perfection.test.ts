import { beforeEach, describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { physicsLogger } from '../logging'
import { PHYSICS_CONSTANTS } from '../constants'
import type {
  PhysicsState,
  SimulationConfig,
  TrebuchetProperties,
  ProjectileProperties,
} from '../types'

const MOCK_TREBUCHET: TrebuchetProperties = {
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
}

const BASE_CONFIG = {
  initialTimestep: 0.001,
  maxSubsteps: 5000,
  maxAccumulator: 1.0,
  tolerance: 1e-8,
  minTimestep: 1e-10,
  maxTimestep: 0.01,
}

function createTestProjectile(): ProjectileProperties {
  return {
    mass: 1.0,
    radius: 0.1,
    area: Math.PI * 0.01,
    dragCoefficient: 0.47,
    magnusCoefficient: 0,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }
}

function createTestState(): PhysicsState {
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  return {
    position: new Float64Array([10, 20, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: -0.5,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    windVelocity: new Float64Array([0, 0, 0]),
    slingParticles: new Float64Array(2 * N),
    slingVelocities: new Float64Array(2 * N),
    time: 0,
    isReleased: false,
  }
}

describe('physics-perfection', () => {
  beforeEach(() => {
    physicsLogger.clear()
    physicsLogger.enable()
  })

  it('should maintain state consistency', () => {
    const state: PhysicsState = createTestState()
    const config: SimulationConfig = {
      ...BASE_CONFIG,
      projectile: createTestProjectile(),
      trebuchet: {
        ...MOCK_TREBUCHET,
        jointFriction: 0,
      },
    }

    const sim = new CatapultSimulation(state, config)
    const newState = sim.update(0.01)
    expect(newState.time).toBeGreaterThan(0)
  })
})
