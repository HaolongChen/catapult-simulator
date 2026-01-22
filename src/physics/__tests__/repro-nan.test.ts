import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createInitialState } from '../config'
import type { SimulationConfig } from '../types'

describe('NaN Reproduction', () => {
  it('should reproduce NaN with massive Mcw', () => {
    const config: SimulationConfig = {
      initialTimestep: 0.0001,
      maxSubsteps: 100,
      maxAccumulator: 1.0,
      tolerance: 1e-8,
      minTimestep: 1e-10,
      maxTimestep: 0.01,
      projectile: {
        mass: 1.0,
        radius: 0.1,
        area: Math.PI * 0.1 * 0.1,
        dragCoefficient: 0.5,
        magnusCoefficient: 0.1,
        momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
        spin: 0,
      },
      trebuchet: {
        longArmLength: 10,
        shortArmLength: 3,
        counterweightMass: 1e4,
        counterweightRadius: 2.0,
        counterweightInertia: 500,
        slingLength: 8,
        releaseAngle: (45.0 * Math.PI) / 180,
        jointFriction: 0.1,
        armMass: 200,
        pivotHeight: 15,
      },
    }

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 50; i++) {
      const s = sim.update(0.01)
      expect(s.armAngle).not.toBeNaN()
    }
  })
})
