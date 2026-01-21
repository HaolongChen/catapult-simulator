import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type { SimulationConfig, PhysicsState19DOF } from '../types'

describe('Physics DAE Stability Evaluation', () => {
  const createConfig = (): SimulationConfig => ({
    initialTimestep: 0.005,
    maxSubsteps: 100,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 1.0,
      radius: 0.1,
      area: Math.PI * 0.1 * 0.1,
      dragCoefficient: 0.47,
      magnusCoefficient: 0.3,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    },
    trebuchet: {
      longArmLength: 10,
      shortArmLength: 3,
      counterweightMass: 2000,
      counterweightRadius: 2.0,
      counterweightInertia: 500,
      slingLength: 8,
      releaseAngle: (45 * Math.PI) / 180,
      slingBagWidth: 0.35,
      slingBagMass: 5,
      slingBagInertia: 0.1,
      jointFriction: 0.1,
      flexStiffness: 500000,
      flexDamping: 5000,
      flexPoint: 3.5,
      armMass: 200,
      pivotHeight: 15,
    },
  })

  it('should maintain constraint consistency throughout the swing', () => {
    const config = createConfig()
    const armAngle = -Math.PI / 4
    const L1 = config.trebuchet.longArmLength
    const tipX = L1 * Math.cos(armAngle)
    const tipY = config.trebuchet.pivotHeight + L1 * Math.sin(armAngle)

    const initialState: PhysicsState19DOF = {
      position: new Float64Array([tipX + 8, tipY, 0]), // Taut sling
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle,
      armAngularVelocity: 0,
      flexAngle: 0,
      flexAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      cwPosition: new Float64Array(2),
      cwVelocity: new Float64Array(2),
      slingBagAngle: 0,
      slingBagAngularVelocity: 0,
      slingBagPosition: new Float64Array([tipX + 8, tipY]),
      slingBagVelocity: new Float64Array(2),
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(initialState, config)

    let maxConstraintError = 0
    let maxVelocityConstraintError = 0

    for (let i = 0; i < 500; i++) {
      const state = sim.update(0.005)
      if (!state.isReleased) {
        const tipX_curr = L1 * Math.cos(state.armAngle)
        const tipY_curr =
          config.trebuchet.pivotHeight + L1 * Math.sin(state.armAngle)
        const dx = state.position[0] - tipX_curr
        const dy = state.position[1] - tipY_curr
        const dist = Math.sqrt(dx * dx + dy * dy)

        const error = Math.max(0, dist - config.trebuchet.slingLength)
        maxConstraintError = Math.max(maxConstraintError, error)

        if (dist > config.trebuchet.slingLength * 0.99) {
          const vTipX =
            -L1 * state.armAngularVelocity * Math.sin(state.armAngle)
          const vTipY = L1 * state.armAngularVelocity * Math.cos(state.armAngle)
          const dvx = state.velocity[0] - vTipX
          const dvy = state.velocity[1] - vTipY
          const velError = Math.abs(dx * dvx + dy * dvy) / (dist + 1e-6)
          maxVelocityConstraintError = Math.max(
            maxVelocityConstraintError,
            velError,
          )
        }
      }
    }

    console.log(
      `Max Position Constraint Error: ${maxConstraintError.toExponential(4)}m`,
    )
    console.log(
      `Max Velocity Constraint Error: ${maxVelocityConstraintError.toExponential(4)}m/s`,
    )

    expect(maxConstraintError).toBeLessThan(1.0)
    expect(maxVelocityConstraintError).toBeLessThan(100.0)
  })
})
