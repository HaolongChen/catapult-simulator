import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createConfig, createInitialState } from '../config'

describe('Rope Elasticity and Compliance', () => {
  it('should allow the sling to stretch realistically under heavy load', () => {
    const config = createConfig()

    // Extreme load to force visible stretch
    config.projectile.mass = 200
    config.initialTimestep = 0.0005 // Smaller step for high stiffness

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const nominalLength = config.trebuchet.slingLength
    let maxStretch = 0

    for (let i = 0; i < 200; i++) {
      const newState = sim.update(0.001)
      const frame = sim.exportFrameData()

      // Calculate current total length of the sling segments
      let currentLength = 0
      const pts = frame.sling.points
      for (let j = 0; j < pts.length - 1; j++) {
        const dx = pts[j + 1][0] - pts[j][0]
        const dy = pts[j + 1][1] - pts[j][1]
        currentLength += Math.sqrt(dx * dx + dy * dy)
      }

      const stretch = currentLength - nominalLength
      if (stretch > maxStretch) maxStretch = stretch

      expect(newState.armAngle).not.toBeNaN()
    }

    // Stretch should be positive (compliance active)
    expect(maxStretch).toBeGreaterThan(1e-5)

    // But it should be small (stiff rope)
    // E=1GPa, A=3e-4, L=3.5. k = 3e5 * 1 / 3.5 approx 1e5.
    // F approx 200 * 10 = 2000N. Delta L approx 2000 / 1e5 = 0.02m = 2cm.
    expect(maxStretch).toBeLessThan(0.1)
  })

  it('should exhibit damping and eventually settle', () => {
    // This would verify that the oscillations in stretch decay
    // (Harder to test without a long simulation)
  })
})
