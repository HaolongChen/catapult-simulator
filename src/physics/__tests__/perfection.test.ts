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
  flexStiffness: 1e6,
  flexDamping: 1e4,
  flexPoint: 6.0,
}

const BASE_CONFIG = {
  initialTimestep: 0.001,
  maxSubsteps: 5000,
  maxAccumulator: 1.0,
  tolerance: 1e-8,
  minTimestep: 1e-10,
  maxTimestep: 0.01,
}

describe('physics-perfection', () => {
  beforeEach(() => {
    physicsLogger.clear()
    physicsLogger.enable()
  })

  it('should maintain energy conservation', () => {
    const state: PhysicsState19DOF = createTestState()
    const config: SimulationConfig = {
      ...BASE_CONFIG,
      projectile: createTestProjectile(),
      trebuchet: {
        ...MOCK_TREBUCHET,
        jointFriction: 0,
      flexStiffness: 500000,
      flexDamping: 5000,
      flexPoint: 3.5,
      },
    }
    const sim = new CatapultSimulation(state, config)

    for (let i = 0; i < 20; i++) {
      sim.update(0.01)
    }

    const records = physicsLogger.getRecords()
    expect(records.length).toBeGreaterThan(10)
  })

  it('should handle extreme mass ratios using LU stability', () => {
    const state: PhysicsState19DOF = createTestState()
    const config: SimulationConfig = {
      ...BASE_CONFIG,
      projectile: {
        ...createTestProjectile(),
        mass: 0.001,
      },
      trebuchet: {
        ...MOCK_TREBUCHET,
        counterweightMass: 100000,
      },
    }
    const sim = new CatapultSimulation(state, config)

    expect(() => sim.update(0.1)).not.toThrow()

    const finalState = sim.getState()
    expect(isNaN(finalState.armAngle)).toBe(false)
    expect(isFinite(finalState.armAngle)).toBe(true)
  })
})

function createTestState(): PhysicsState19DOF {
  return {
    position: new Float64Array([10, 20, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: -0.5,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
      flexAngle: 0,
      flexAngularVelocity: 0,
    cwPosition: new Float64Array([10, 20]),
    cwVelocity: new Float64Array(2),
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    slingBagPosition: new Float64Array([10, 20]),
    slingBagVelocity: new Float64Array(2),
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
    dragCoefficient: 0,
    magnusCoefficient: 0,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }
}
