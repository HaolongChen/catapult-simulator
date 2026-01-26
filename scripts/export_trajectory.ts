import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { FrameData } from '../src/physics/types'
import { physicsLogger } from '../src/physics/logging'
import { UI_CONSTANTS } from '@/physics/constants'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = createConfig()
const initialState = createInitialState(config)
const sim = new CatapultSimulation(initialState, config)
const trajectory: FrameData[] = []

physicsLogger.enable()

trajectory.push(sim.exportFrameData())

let stuckFrames = 0
let lastTime = 0

for (let i = 0; i < UI_CONSTANTS.CONTROLS.DURATION; i++) {
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
      console.warn(`This often happens with extreme config parameters:\n`)
      console.warn(`  - Very high counterweightMass (> 8000 kg)`)
      console.warn(`  - Very long slingLength (> 7 m)`)
      console.warn(`  - Very high projectile mass or very low friction\n`)
      console.warn(`Try reducing these values in src/physics/config.ts`)
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

const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

const jsonPath = path.join(publicDir, 'trajectory.json')
fs.writeFileSync(jsonPath, JSON.stringify(trajectory, null, 2))
console.log(`Exported ${trajectory.length} JSON frames to ${jsonPath}`)

const csvPath = path.join(publicDir, 'simulation_log.csv')
fs.writeFileSync(csvPath, physicsLogger.exportCSV())
console.log(`Exported CSV simulation log to ${csvPath}`)
