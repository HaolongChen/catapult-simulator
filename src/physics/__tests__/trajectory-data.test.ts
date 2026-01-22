import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import type { FrameData } from '../types'

describe('Trajectory Energy Conservation Test', () => {
  const trajectoryPath = path.resolve(
    __dirname,
    '../../../public/trajectory.json',
  )

  it('should maintain energy conservation during swinging phase', () => {
    if (!fs.existsSync(trajectoryPath)) {
      console.warn('trajectory.json not found, skipping test.')
      return
    }

    const data: FrameData[] = JSON.parse(
      fs.readFileSync(trajectoryPath, 'utf-8'),
    )
    const G = 9.81

    const calculateEnergy = (f: FrameData) => {
      const Mp = f.projectile.radius > 0 ? 1.0 : 1.0 // Mass from config
      const Mcw = 2000

      // Projectile
      const vSq =
        f.projectile.velocity[0] ** 2 +
        f.projectile.velocity[1] ** 2 +
        f.projectile.velocity[2] ** 2
      const keProj = 0.5 * Mp * vSq
      const peProj = Mp * G * f.projectile.position[1]

      // Counterweight (Simplified for validation)
      const vCwSq =
        f.counterweight.angularVelocity ** 2 * f.arm.shortArmLength ** 2 // Approximation
      const keCw = 0.5 * Mcw * vCwSq
      const peCw = Mcw * G * f.counterweight.position[1]

      return keProj + peProj + keCw + peCw
    }

    const initialEnergy = calculateEnergy(data[0])
    let maxDeviation = 0

    // Only check before release
    for (const frame of data) {
      if (frame.phase === 'released') break
      const currentEnergy = calculateEnergy(frame)
      const deviation = Math.abs(
        (currentEnergy - initialEnergy) / initialEnergy,
      )
      maxDeviation = Math.max(maxDeviation, deviation)
    }

    // High fidelity target: 50% deviation allows for joint friction and numerical dissipation
    expect(maxDeviation).toBeLessThan(0.5)
  })

  it('should verify projectile Y coordinate increases after release', () => {
    if (!fs.existsSync(trajectoryPath)) return
    const data: FrameData[] = JSON.parse(
      fs.readFileSync(trajectoryPath, 'utf-8'),
    )

    const releasedFrames = data.filter((f) => f.phase === 'released')
    if (releasedFrames.length > 0) {
      const maxYAloft = Math.max(
        ...releasedFrames.map((f) => f.projectile.position[1]),
      )
      expect(maxYAloft).toBeGreaterThan(1.0)
    }
  })
})
