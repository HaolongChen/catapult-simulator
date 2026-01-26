import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'
import type { FrameData } from '../src/physics/types'

const config = createConfig()
// Extreme parameters that cause degraded mode
config.trebuchet.counterweightMass = 10000
config.trebuchet.slingLength = 8

const initialState = createInitialState(config)
const sim = new CatapultSimulation(initialState, config)
const trajectory: FrameData[] = []

trajectory.push(sim.exportFrameData())

let stuckFrames = 0
let lastTime = 0

for (let i = 0; i < 2000; i++) {
  sim.update(0.01)
  const frameData = sim.exportFrameData()
  trajectory.push(frameData)

  // Detect if simulation is stuck (degraded mode or numerical issues)
  if (frameData.time === lastTime) {
    stuckFrames++
    if (stuckFrames >= 10) {
      console.warn(
        `\n⚠️  WARNING: Simulation got stuck at t=${frameData.time.toFixed(2)}s (frame ${i})`,
      )
      console.warn(
        `The simulation entered degraded mode due to numerical instability.`,
      )
      console.warn(
        `This often happens with extreme config parameters (very high mass, very long sling, etc.)`,
      )
      console.warn(
        `Stopping export early. Generated ${trajectory.length} frames.\n`,
      )
      break
    }
  } else {
    stuckFrames = 0
    lastTime = frameData.time
  }
}

console.log(
  `Final: ${trajectory.length} frames, ${trajectory[trajectory.length - 1].time.toFixed(2)}s`,
)
