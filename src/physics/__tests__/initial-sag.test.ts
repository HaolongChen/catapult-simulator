import { describe, expect, it } from 'vitest'
import { createConfig, createInitialState } from '../config'
import { PHYSICS_CONSTANTS } from '../constants'

describe('Initial Sling Sag', () => {
  it('should have non-collinear sling particles at t=0 due to weight', () => {
    const config = createConfig()
    const state = createInitialState(config)
    const { slingParticles, position } = state
    const { longArmLength: L1, pivotHeight: H } = config.trebuchet

    const armAngle = state.armAngle
    const tipY = H + L1 * Math.sin(armAngle)
    const projY = position[1]

    const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES

    for (let i = 0; i < N - 1; i++) {
      const py = slingParticles[2 * i + 1]

      const alpha = (i + 1) / N
      const lineY = tipY * (1 - alpha) + projY * alpha

      expect(py).toBeLessThan(lineY - 0.001)
    }
  })

  it('should satisfy distance constraints at t=0 within PBD tolerance', () => {
    const config = createConfig()
    const state = createInitialState(config)
    const { slingParticles } = state
    const {
      longArmLength: L1,
      pivotHeight: H,
      slingLength: Ls,
    } = config.trebuchet

    const armAngle = state.armAngle
    const tipX = L1 * Math.cos(armAngle)
    const tipY = H + L1 * Math.sin(armAngle)

    const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
    const Lseg = Ls / N

    let prevX = tipX
    let prevY = tipY

    for (let i = 0; i < N; i++) {
      const currX = slingParticles[2 * i]
      const currY = slingParticles[2 * i + 1]

      const dist = Math.sqrt((currX - prevX) ** 2 + (currY - prevY) ** 2)
      // PBD settlement can leave small residuals, but should be close
      expect(dist).toBeGreaterThan(Lseg * 0.95)
      expect(dist).toBeLessThan(Lseg * 1.1)

      prevX = currX
      prevY = currY
    }
  })
})
