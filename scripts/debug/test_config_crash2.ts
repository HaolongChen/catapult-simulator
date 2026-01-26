import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'

const config = createConfig()
config.trebuchet.counterweightMass = 10000
config.trebuchet.slingLength = 8

const initialState = createInitialState(config)
const sim = new CatapultSimulation(initialState, config)

for (let i = 0; i < 2000; i++) {
  sim.update(0.01)
  const state = sim.getState()

  // @ts-expect-error - accessing private property for debugging
  const degraded = sim.integrator?.degraded

  if (degraded && i % 100 === 0) {
    console.log(`Frame ${i}, time ${state.time.toFixed(2)}s - DEGRADED MODE`)
  }

  if (i % 500 === 0) {
    console.log(
      `Frame ${i}, time ${state.time.toFixed(2)}s, degraded: ${degraded}`,
    )
  }
}

const finalState = sim.getState()
// @ts-expect-error - accessing private property for debugging
console.log('\nFinal degraded state:', sim.integrator?.degraded)
console.log('Final time:', finalState.time.toFixed(2), 'seconds')
