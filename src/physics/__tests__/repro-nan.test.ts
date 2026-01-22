import { describe, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { PHYSICS_CONSTANTS } from '../constants'
import type { PhysicsState, SimulationConfig } from '../types'

describe('NaN Reproduction', () => {
  it('should reproduce NaN with massive Mcw', () => {
    const config: SimulationConfig = {
      initialTimestep: 0.005,
      maxSubsteps: 1,
      maxAccumulator: 1.0,
      tolerance: 1e-6,
      minTimestep: 1e-7,
      maxTimestep: 0.01,
      projectile: {
        mass: 1.0,
        radius: 0.1,
        area: Math.PI * 0.1 * 0.1,
        dragCoefficient: 0.5,
        magnusCoefficient: 0.1,
        momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
        spin: 0,
      },
      trebuchet: {
        longArmLength: 10,
        shortArmLength: 3,
        counterweightMass: 1e4,
        counterweightRadius: 2.0,
        counterweightInertia: 500,
        slingLength: 8,
        releaseAngle: (45 * Math.PI) / 180,
        jointFriction: 0.1,
        armMass: 200,
        pivotHeight: 15,
      },
    }

    const armAngle = -Math.PI / 4,
      H = 15,
      Rcw = 2.0,
      rp = 0.1
    const shortTip = {
      x: -3 * Math.cos(armAngle),
      y: H - 3 * Math.sin(armAngle),
    }
    const M = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES - 1

    const state: PhysicsState = {
      position: new Float64Array([10, rp, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle,
      armAngularVelocity: 0.1,
      cwPosition: new Float64Array([shortTip.x, shortTip.y + Rcw]),
      cwVelocity: new Float64Array([0, 0]),
      cwAngle: 0,
      cwAngularVelocity: 0,
      windVelocity: new Float64Array([0, 0, 0]),
      slingParticles: new Float64Array(2 * M),
      slingVelocities: new Float64Array(2 * M),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 50; i++) {
      const s = sim.update(0.01)
      if (isNaN(s.armAngle)) {
        throw new Error('NaN detected at step ' + i)
      }
    }
  })
})
