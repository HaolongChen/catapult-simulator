import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createInitialState } from '../config'
import { PHYSICS_CONSTANTS } from '../constants'

describe('Reproduction: Arm Stuck with Light Sling Particles', () => {
  it('should show significant arm movement', () => {
    const config = {
      initialTimestep: 0.005,
      maxSubsteps: 10,
      maxAccumulator: 1.0,
      tolerance: 1e-6,
      minTimestep: 1e-7,
      maxTimestep: 0.01,
      projectile: {
        mass: 1.0, // LIGHT PROJECTILE
        radius: 0.1,
        area: Math.PI * 0.1 * 0.1,
        dragCoefficient: 0,
        magnusCoefficient: 0,
        momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
        spin: 0,
      },
      trebuchet: {
        longArmLength: 10,
        shortArmLength: 3,
        counterweightMass: 8000, // HEAVY COUNTERWEIGHT
        counterweightRadius: 2.0,
        counterweightInertia: 500,
        slingLength: 8,
        releaseAngle: (45 * Math.PI) / 180,
        jointFriction: 0.1,
        armMass: 1000,
        pivotHeight: 15,
      },
    }

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const initialArmAngle = state.armAngle

    // Simulate for 1.0 seconds
    let lastState = state
    for (let i = 0; i < 100; i++) {
      lastState = sim.update(0.01)
    }

    const deltaAngle = Math.abs(lastState.armAngle - initialArmAngle)
    console.log('Delta Arm Angle (rad):', deltaAngle)
    console.log('Delta Arm Angle (deg):', (deltaAngle * 180) / Math.PI)

    // Expect at least 5 degrees of movement in 1.0s
    expect((deltaAngle * 180) / Math.PI).toBeGreaterThan(5)
  })
})
