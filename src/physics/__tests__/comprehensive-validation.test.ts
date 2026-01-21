import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type { PhysicsState19DOF, SimulationConfig } from '../types'

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
      dragCoefficient: 0,
      magnusCoefficient: 0,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    },
    trebuchet: {
      longArmLength: 10,
      shortArmLength: 3,
      counterweightMass: 2000,
      counterweightRadius: 2.0,
      counterweightInertia: 500,
      slingLength: 8,
      releaseAngle: (45 * Math.PI) / 180,
      slingBagWidth: 0.35,
      slingBagMass: 5.0,
      slingBagInertia: 0.1,
      jointFriction: 0.1,
      flexStiffness: 500000,
      flexDamping: 5000,
      flexPoint: 3.5,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

function createInitialState(config: SimulationConfig): PhysicsState19DOF {
  const { longArmLength: L1, pivotHeight: H } = config.trebuchet
  return {
    position: new Float64Array([L1 + 5, H, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: -Math.PI / 4,
    armAngularVelocity: 0,
    flexAngle: 0,
    flexAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    cwAngle: 0,
    cwAngularVelocity: 0,
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    slingBagPosition: new Float64Array([L1 + 5, H]),
    slingBagVelocity: new Float64Array(2),
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}

describe('Comprehensive Physics Validation', () => {
  it('should maintain constraint stability', () => {
    const config = createStandardConfig()
    const sim = new CatapultSimulation(createInitialState(config), config)
    for (let i = 0; i < 50; i++) {
      const s = sim.update(0.01)
      expect(s.armAngle).not.toBeNaN()
    }
  })
})
