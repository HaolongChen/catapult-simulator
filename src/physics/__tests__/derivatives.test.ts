/**
 * Physics Derivatives Tests
 */

import { describe, it, expect } from 'vitest'
import { computeDerivatives } from '../derivatives'
import type { PhysicsState17DOF } from '../types'

describe('derivatives', () => {
  it('should compute gravitational force', () => {
    const state: PhysicsState17DOF = {
      position: new Float64Array([0, 100, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: 0,
      armAngularVelocity: 0,
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
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

    const trebuchet = {
      armLength: 10,
      counterweightMass: 1000,
      springConstant: 50000,
      dampingCoefficient: 100,
      equilibriumAngle: 0,
      jointFriction: 0.3,
      efficiency: 0.9,
      flexuralStiffness: 1000000,
    }

    const deriv = computeDerivatives(state, projectile, trebuchet)

    // Position derivative should be velocity
    expect(deriv.position).toEqual(state.velocity)

    // Velocity should be acceleration (gravity at altitude 100m)
    expect(deriv.velocity[0]).toBeCloseTo(0, 5)
    expect(deriv.velocity[1]).toBeCloseTo(-9.8, 1)

    // Wind derivative should be zero
    expect(deriv.windVelocity[0]).toBeCloseTo(0, 10)
  })
})
