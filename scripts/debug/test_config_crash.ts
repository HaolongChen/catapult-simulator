import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'

const config = createConfig()
// Try extreme parameters
config.trebuchet.counterweightMass = 10000
config.trebuchet.slingLength = 8

console.log('Testing with modified config:')
console.log('CW Mass:', config.trebuchet.counterweightMass)
console.log('Sling Length:', config.trebuchet.slingLength)

const initialState = createInitialState(config)
const sim = new CatapultSimulation(initialState, config)

let crashed = false
let lastTime = 0

try {
  for (let i = 0; i < 2000; i++) {
    sim.update(0.01)
    const state = sim.getState()
    lastTime = state.time

    if (isNaN(state.armAngle) || isNaN(state.position[0])) {
      console.error(`NaN detected at frame ${i}, time ${state.time}s`)
      crashed = true
      break
    }

    if (i % 500 === 0) {
      console.log(`Frame ${i}, time ${state.time.toFixed(2)}s`)
    }
  }
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e)
  console.error('Simulation crashed:', message)
  crashed = true
}

console.log('\nFinal state:')
console.log('Reached:', lastTime.toFixed(2), 'seconds')
console.log('Crashed:', crashed)
