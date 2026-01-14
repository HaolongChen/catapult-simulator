import { describe, expect, it } from 'vitest'
import { computeDerivatives } from '../derivatives'
import type {
  PhysicsState17DOF,
  ProjectileProperties,
  TrebuchetProperties,
} from '../types'

describe('Sling Physics', () => {
  const projectile: ProjectileProperties = {
    mass: 5.0,
    radius: 0.1,
    area: Math.PI * 0.1 ** 2,
    dragCoefficient: 0,
    magnusCoefficient: 0,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }

  const trebuchet: TrebuchetProperties = {
    longArmLength: 3.0,
    shortArmLength: 1.0,
    counterweightMass: 100.0,
    counterweightRadius: 0.5,
    slingLength: 5.0,
    releaseAngle: Math.PI / 4,
    springConstant: 0,
    dampingCoefficient: 0,
    equilibriumAngle: 0,
    jointFriction: 0,
    efficiency: 1.0,
    flexuralStiffness: 0,
    armMass: 20.0,
    pivotHeight: 2.0,
  }

  it('should compute sling tension when projectile is stretched', () => {
    const state: PhysicsState17DOF = {
      position: new Float64Array([8.1, 2, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([0, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: 0,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
    }
    const derivative = computeDerivatives(state, projectile, trebuchet, 0)
    expect(derivative.velocity[0]).toBeLessThan(0)
  })

  it('should handle ground phase', () => {
    const state: PhysicsState17DOF = {
      position: new Float64Array([2, 0, 0]),
      velocity: new Float64Array([1, 0, 0]),
      orientation: new Float64Array([0, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: -Math.PI / 2,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
    }
    const derivative = computeDerivatives(state, projectile, trebuchet, 0)
    expect(derivative.position[1]).toBe(0)
  })

  it('should not produce NaN values', () => {
    const state: PhysicsState17DOF = {
      position: new Float64Array([0, 0, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([0, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: 0,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
    }
    const derivative = computeDerivatives(state, projectile, trebuchet, 0)
    expect(isFinite(derivative.velocity[0])).toBe(true)
    expect(isFinite(derivative.armAngularVelocity)).toBe(true)
  })
})
