import { describe, expect, it } from 'vitest'
import { computeDerivatives } from '../derivatives'
import { PHYSICS_CONSTANTS } from '../constants'
import type { PhysicsState } from '../types'

describe('derivatives', () => {
  it('should compute gravitational force', () => {
    const trebuchet = {
      longArmLength: 8,
      shortArmLength: 2,
      counterweightMass: 1000,
      counterweightRadius: 1.5,
      slingLength: 6,
      releaseAngle: (45 * Math.PI) / 180,
      counterweightInertia: 500,
      jointFriction: 0.3,
      armMass: 100,
      pivotHeight: 5,
    }

    const M = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES - 1
    const state: PhysicsState = {
      position: new Float64Array([8 + 3, 5 + 4, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: 0,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      cwPosition: new Float64Array([-2, 5 - 1.5]),
      cwVelocity: new Float64Array([0, 0]),
      windVelocity: new Float64Array([0, 0, 0]),
      slingParticles: new Float64Array(2 * M),
      slingVelocities: new Float64Array(2 * M),
      time: 0,
      isReleased: false,
    }

    const projectile = {
      mass: 10,
      radius: 0.05,
      area: Math.PI * 0.05 ** 2,
      dragCoefficient: 0.47,
      magnusCoefficient: 0.3,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    }

    const normalForce = trebuchet.counterweightMass * 9.80665
    const { derivative: deriv } = computeDerivatives(
      state,
      projectile,
      trebuchet,
      normalForce,
    )

    expect(deriv.position).toEqual(state.velocity)
    expect(deriv.velocity[1]).not.toBeNaN()
  })
})
