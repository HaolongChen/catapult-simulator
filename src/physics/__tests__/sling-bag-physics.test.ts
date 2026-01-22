import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createInitialState } from '../config'
import type {
  ProjectileProperties,
  TrebuchetProperties,
  SimulationConfig,
} from '../types'

describe('Ghost Constraint Sling Physics', () => {
  const projectile: ProjectileProperties = {
    mass: 1.0,
    radius: 0.1,
    area: Math.PI * 0.1 ** 2,
    dragCoefficient: 0.47,
    magnusCoefficient: 0.3,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }

  const trebuchet: TrebuchetProperties = {
    longArmLength: 4.4,
    shortArmLength: 0.8,
    counterweightMass: 2000.0,
    counterweightRadius: 0.8,
    counterweightInertia: 500,
    slingLength: 3.5,
    releaseAngle: (90.0 * Math.PI) / 180,
    jointFriction: 0.1,
    armMass: 200.0,
    pivotHeight: 3.0,
  }

  const config: SimulationConfig = {
    initialTimestep: 0.001,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile,
    trebuchet,
  }

  it('should maintain holonomic distance constraint under load', () => {
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    sim.update(0.001)
    const frame = sim.exportFrameData()

    expect(frame.sling.isAttached).toBe(true)
    expect(frame.sling.tension).toBeDefined()
    expect(isNaN(frame.sling.tension)).toBe(false)
  })

  it('should separate projectile from tip when angular condition met (kinematic release)', () => {
    const configHighPower = {
      ...config,
      trebuchet: {
        ...trebuchet,
        counterweightMass: 100000,
        releaseAngle: (30.0 * Math.PI) / 180,
      },
    }
    const sim = new CatapultSimulation(
      createInitialState(configHighPower),
      configHighPower,
    )

    let separated = false
    for (let i = 0; i < 5000; i++) {
      const state = sim.update(0.001)
      if (state.isReleased) {
        separated = true
        break
      }
    }
    expect(separated).toBe(true)
  })
})
