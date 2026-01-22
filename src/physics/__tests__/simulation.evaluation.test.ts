import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { getTrebuchetKinematics } from '../trebuchet'
import { createConfig, createInitialState } from '../config'
import type { SimulationConfig } from '../types'

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
    config.trebuchet.counterweightMass = 2000
    config.initialTimestep = 0.001

    const initialState = createInitialState(config)
    const sim = new CatapultSimulation(initialState, config)
    const Ls = config.trebuchet.slingLength
    const L1 = config.trebuchet.longArmLength

    let maxConstraintError = 0

    for (let i = 0; i < 100; i++) {
      const state = sim.update(0.01)
      if (!state.isReleased) {
        const kinematics = getTrebuchetKinematics(
          state.armAngle,
          config.trebuchet,
        )
        const tip = kinematics.longArmTip
        const dx = state.position[0] - tip.x
        const dy = state.position[1] - tip.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        const error = Math.max(0, dist - Ls)
        maxConstraintError = Math.max(maxConstraintError, error)
      }
    }

    expect(maxConstraintError).toBeLessThan(5.0)
  })
})
