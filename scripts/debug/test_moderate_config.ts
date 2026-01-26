import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'
import type { FrameData } from '../src/physics/types'

// Test with moderately extreme but valid config
const config = createConfig()
config.trebuchet.counterweightMass = 6000 // 50% more than default
config.trebuchet.slingLength = 5 // Slightly longer

console.log('Testing moderately extreme config:')
console.log('  CW Mass:', config.trebuchet.counterweightMass)
console.log('  Sling Length:', config.trebuchet.slingLength)
console.log()

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

  if (frameData.time === lastTime) {
    stuckFrames++
    if (stuckFrames >= 10) {
      console.warn(
        `\n⚠️  WARNING: Simulation stuck at t=${frameData.time.toFixed(2)}s`,
      )
      console.warn(
        `Config may be too extreme. Try reducing counterweight mass or sling length.\n`,
      )
      break
    }
  } else {
    stuckFrames = 0
    lastTime = frameData.time
  }
}

const finalTime = trajectory[trajectory.length - 1].time
const success = finalTime >= 19.5 // Allow slight tolerance

console.log(`Result: ${trajectory.length} frames, ${finalTime.toFixed(2)}s`)
console.log(
  `Status: ${success ? '✓ COMPLETED SUCCESSFULLY' : '✗ FAILED - DID NOT REACH 20s'}`,
)
