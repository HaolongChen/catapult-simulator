import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createConfig, createInitialState } from '../config'

describe('Simulation Soak Test', () => {
  it('should maintain stability over a heavy swing', () => {
    const config = createConfig()
    config.trebuchet.counterweightMass = 20000
    config.initialTimestep = 0.001

    const initialState = createInitialState(config)
    const sim = new CatapultSimulation(initialState, config)

    for (let i = 0; i < 100; i++) {
      const state = sim.update(0.01)
      expect(state.armAngle).not.toBeNaN()
      expect(state.position[0]).not.toBeNaN()
    }
  })
})
