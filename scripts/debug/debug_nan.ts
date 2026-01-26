import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'

const config = createConfig()
config.trebuchet.counterweightMass = 10000
config.trebuchet.slingLength = 8

const initialState = createInitialState(config)
const sim = new CatapultSimulation(initialState, config)

for (let i = 0; i < 300; i++) {
  sim.update(0.01)
  const state = sim.getState()

  // Check all fields for NaN
  if (isNaN(state.armAngle)) console.log(`Frame ${i}: armAngle is NaN`)
  if (isNaN(state.armAngularVelocity))
    console.log(`Frame ${i}: armAngularVelocity is NaN`)
  if (isNaN(state.cwAngle)) console.log(`Frame ${i}: cwAngle is NaN`)
  if (isNaN(state.position[0])) console.log(`Frame ${i}: position[0] is NaN`)

  // @ts-expect-error - accessing private property for debugging
  if (sim.integrator?.degraded) {
    console.log(`\nDegraded at frame ${i}, time ${state.time.toFixed(3)}s`)
    console.log('State at degradation:')
    console.log('  armAngle:', state.armAngle)
    console.log('  armAngularVelocity:', state.armAngularVelocity)
    console.log('  cwAngle:', state.cwAngle)
    console.log('  position:', Array.from(state.position))
    break
  }
}
