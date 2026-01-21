import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type { PhysicsState19DOF, SimulationConfig } from '../types'

function createStandardConfig(): SimulationConfig {
  return {
    initialTimestep: 0.001,
    maxSubsteps: 1000,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 5.0,
      radius: 0.1,
      area: Math.PI * 0.1 ** 2,
      dragCoefficient: 0.47,
      magnusCoefficient: 0,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    },
    trebuchet: {
      longArmLength: 3.0,
      shortArmLength: 1.0,
      counterweightMass: 100.0,
      counterweightRadius: 0.5,
      counterweightInertia: 50,
      slingLength: 5.0,
      releaseAngle: Math.PI / 4,
      slingBagWidth: 0.35,
      slingBagMass: 5,
      slingBagInertia: 0.1,
      jointFriction: 0,
      flexStiffness: 500000,
      flexDamping: 5000,
      flexPoint: 2.0,
      armMass: 20.0,
      pivotHeight: 5.0,
    },
  }
}

describe('Simulation Soak Test', () => {
  it('should maintain stability over a heavy swing', () => {
    const config = createStandardConfig()
    const initialState: PhysicsState19DOF = {
      position: new Float64Array([14, 0, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: -0.5,
      armAngularVelocity: 0,
      flexAngle: 0,
      flexAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      cwPosition: new Float64Array(2),
      cwVelocity: new Float64Array(2),
      slingBagAngle: 0,
      slingBagAngularVelocity: 0,
      slingBagPosition: new Float64Array([14, 0]),
      slingBagVelocity: new Float64Array(2),
      windVelocity: new Float64Array([5, 0, 2]),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(initialState, config)
    for (let i = 0; i < 100; i++) {
      const state = sim.update(0.01)
      expect(state.position.some(isNaN)).toBe(false)
    }
  })
})
