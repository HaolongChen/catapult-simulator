import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = createConfig()
const sim = new CatapultSimulation(createInitialState(config), config)
const trajectory = []

for (let i = 0; i < 500; i++) {
  sim.update(0.01)
  trajectory.push(sim.exportFrameData())
}

const outputPath = path.join(__dirname, '..', 'public', 'trajectory.json')

// Ensure public directory exists
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
}

fs.writeFileSync(outputPath, JSON.stringify(trajectory, null, 2))
console.log(`Exported 500 frames to ${outputPath}`)
