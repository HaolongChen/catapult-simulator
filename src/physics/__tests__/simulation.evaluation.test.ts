import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { PHYSICS_CONSTANTS } from '../constants'
import type { SimulationConfig, PhysicsState } from '../types'

describe('Physics DAE Stability Evaluation', () => {
  const createConfig = (): SimulationConfig => ({
    initialTimestep: 0.005,
    maxSubsteps: 100,
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
      counterweightRadius: 2.0,
      counterweightInertia: 500,
      slingLength: 8,
      releaseAngle: (45 * Math.PI) / 180,
      jointFriction: 0.1,
      armMass: 200,
      pivotHeight: 15,
    },
  })

  it('should maintain constraint consistency throughout the swing', () => {
    const config = createConfig()
    const armAngle = -Math.PI / 4
    const L1 = config.trebuchet.longArmLength
    const tipX = L1 * Math.cos(armAngle)
    const tipY = config.trebuchet.pivotHeight + L1 * Math.sin(armAngle)
    const M = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES - 1

    const initialState: PhysicsState = {
      position: new Float64Array([tipX + 8, tipY, 0]), // Taut sling
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      cwPosition: new Float64Array(2),
      cwVelocity: new Float64Array(2),
      windVelocity: new Float64Array([0, 0, 0]),
      slingParticles: new Float64Array(2 * M),
      slingVelocities: new Float64Array(2 * M),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(initialState, config)

    let maxConstraintError = 0

    for (let i = 0; i < 100; i++) {
      const state = sim.update(0.005)
      if (!state.isReleased) {
        const tipX_curr = L1 * Math.cos(state.armAngle)
        const tipY_curr =
          config.trebuchet.pivotHeight + L1 * Math.sin(state.armAngle)
        const dx = state.position[0] - tipX_curr
        const dy = state.position[1] - tipY_curr
        const dist = Math.sqrt(dx * dx + dy * dy)

        const error = Math.max(0, dist - config.trebuchet.slingLength)
        maxConstraintError = Math.max(maxConstraintError, error)
      }
    }

    expect(maxConstraintError).toBeLessThan(2.0)
  })
})
