import { describe, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type {
  PhysicsState17DOF as PhysicsState19DOF,
  SimulationConfig,
} from '../types'

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
        slingBagWidth: 0.35,
        slingBagMass: 5.0,
        slingBagInertia: 0.1,
        jointFriction: 0.1,
        armMass: 200,
        pivotHeight: 15,
      },
    }

    const armAngle = -Math.PI / 4,
      L1 = 10,
      H = 15,
      Ls = 8,
      Rcw = 2.0,
      rp = 0.1
    const tipX = L1 * Math.cos(armAngle),
      tipY = H + L1 * Math.sin(armAngle)
    const shortTip = {
      x: -3 * Math.cos(armAngle),
      y: H - 3 * Math.sin(armAngle),
    }

    const dy = tipY - rp
    const dx = Math.sqrt(Math.max(Ls * Ls - dy * dy, 0))
    const bagX = tipX + dx
    const angle = Math.atan2(rp - tipY, dx)

    const state: PhysicsState19DOF = {
      position: new Float64Array([bagX, rp, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle,
      armAngularVelocity: 0.1,
      cwPosition: new Float64Array([shortTip.x, shortTip.y + Rcw]),
      cwVelocity: new Float64Array([0, 0]),
      cwAngle: 0,
      cwAngularVelocity: 0,
      slingBagAngle: angle,
      slingBagAngularVelocity: 0,
      slingBagPosition: new Float64Array([bagX, rp]),
      slingBagVelocity: new Float64Array([0, 0]),
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 200; i++) {
      const s = sim.update(0.01)
      if (isNaN(s.armAngle)) {
        throw new Error('NaN detected at step ' + i)
      }
      if (s.position[1] < -100) {
        throw new Error(
          'Massive tunneling detected at step ' + i + ': ' + s.position[1],
        )
      }
    }
  })
})
