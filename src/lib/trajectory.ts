import { createServerFn } from '@tanstack/react-start'
import { promises as fs } from 'fs'
import path from 'path'
import { FrameData } from '../physics/types'

export const getTrajectory = createServerFn({ method: 'GET' }).handler(
  async () => {
    const filePath = path.join(process.cwd(), 'public', 'trajectory.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    const trajectory: FrameData[] = JSON.parse(fileContents)
    return trajectory
  },
)
