import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { FrameData } from '../src/physics/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = createConfig()
const initialState = createInitialState(config)
const sim = new CatapultSimulation(initialState, config)
const trajectory: FrameData[] = []

trajectory.push(sim.exportFrameData())

for (let i = 0; i < 1000; i++) {
  sim.update(0.01)
  trajectory.push(sim.exportFrameData())
}

const outputPath = path.join(__dirname, '..', 'public', 'trajectory.json')

// Ensure public directory exists
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
}

fs.writeFileSync(outputPath, JSON.stringify(trajectory, null, 2))
console.log(`Exported ${trajectory.length} frames to ${outputPath}`)
