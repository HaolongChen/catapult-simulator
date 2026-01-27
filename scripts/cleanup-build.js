import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distPath = path.join(__dirname, '..', 'dist')
const trajectoryPath = path.join(distPath, 'trajectory.json')
const csvPath = path.join(distPath, 'simulation_log.csv')

if (fs.existsSync(trajectoryPath)) {
  fs.unlinkSync(trajectoryPath)
  console.log('✓ Removed trajectory.json from dist/')
}

if (fs.existsSync(csvPath)) {
  fs.unlinkSync(csvPath)
  console.log('✓ Removed simulation_log.csv from dist/')
}

console.log('✓ Build cleanup complete')
