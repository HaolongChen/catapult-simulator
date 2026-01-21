import { describe, expect, it } from 'vitest'
import { RK4Integrator } from '../rk4-integrator'
import type {
  PhysicsDerivative17DOF,
  PhysicsForces,
  PhysicsState17DOF,
} from '../types'

const EMPTY_FORCES: PhysicsForces = {
  drag: new Float64Array(3),
  magnus: new Float64Array(3),
  gravity: new Float64Array(3),
  tension: new Float64Array(3),
  total: new Float64Array(3),
  groundNormal: 0,
  slingBagNormal: 0,
  lambda: new Float64Array(6),
}

function createTestState(): PhysicsState17DOF {
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    slingBagPosition: new Float64Array(2),
    slingBagVelocity: new Float64Array(2),
    armAngle: 0,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}

function createZeroDerivative(): PhysicsDerivative17DOF {
  return {
    position: new Float64Array(3),
    velocity: new Float64Array(3),
    orientation: new Float64Array(4),
    angularVelocity: new Float64Array(3),
    slingBagPosition: new Float64Array(2),
    slingBagVelocity: new Float64Array(2),
    armAngle: 0,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    windVelocity: new Float64Array(3),
    time: 0,
    isReleased: false,
  }
}

describe('RK4Integrator', () => {
  it('should initialize with initial state', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state)
    expect(integrator.getState()).toEqual(state)
  })

  it('should take a step without changes if derivative is zero', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, { initialTimestep: 0.01 })
    const result = integrator.update(0.01, (_t, _state) => ({
      derivative: createZeroDerivative(),
      forces: EMPTY_FORCES,
    }))
    expect(result.newState.armAngle).toBe(0)
  })
})
