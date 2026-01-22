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

for (let i = 0; i < UI_CONSTANTS.CONTROLS.FPS_CONVERSION; i++) {
  sim.update(0.01)
  trajectory.push(sim.exportFrameData())
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
