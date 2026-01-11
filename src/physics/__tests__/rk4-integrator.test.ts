/**
 * RK4 Integrator Tests
 */

import { describe, it, expect } from 'vitest'
import { RK4Integrator } from '../rk4-integrator'
import type { PhysicsState17DOF, PhysicsDerivative17DOF } from '../types'

describe('rk4-integrator', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state)
      expect(integrator).toBeDefined()
    })

    it('should accept custom config', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { fixedTimestep: 0.005 })
      expect(integrator).toBeDefined()
    })
  })

  describe('update', () => {
    it('should accumulate time', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { fixedTimestep: 0.01 })

      const result1 = integrator.update(0.005, testDerivative)
      expect(result1.stepsTaken).toBe(0)

      const result2 = integrator.update(0.006, testDerivative)
      expect(result2.stepsTaken).toBe(1)
    })

    it('should clamp accumulator to prevent spiral of death', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { fixedTimestep: 0.01 })

      const result = integrator.update(1.0, testDerivative)
      expect(result.stepsTaken).toBeLessThanOrEqual(100)
    })

    it('should compute interpolation alpha', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { fixedTimestep: 0.01 })

      const result = integrator.update(0.005, testDerivative)
      expect(result.interpolationAlpha).toBeGreaterThanOrEqual(0)
      expect(result.interpolationAlpha).toBeLessThanOrEqual(1)
    })
  })

  describe('rk4Step accuracy', () => {
    it('should converge for simple harmonic oscillator', () => {
      const k = 1.0
      const m = 1.0
      const state = {
        ...createTestState(),
        position: new Float64Array([0]),
        velocity: new Float64Array([1.0]),
      }

      const derivative = (_t: number, s: PhysicsState17DOF) => ({
        ...createZeroDerivative(),
        position: new Float64Array([s.velocity[0]!]),
        velocity: new Float64Array([(-k / m) * s.position[0]!]),
      })

      const integrator = new RK4Integrator(state, { fixedTimestep: 0.001 })
      integrator.update(0.01, derivative)

      const finalState = integrator.getRenderState()
      const energy =
        0.5 * m * finalState.velocity[0]! ** 2 +
        0.5 * k * finalState.position[0]! ** 2

      expect(energy).toBeCloseTo(0.5, 0.01)
    })
  })

  describe('performance', () => {
    it('should handle 100 steps within performance budget', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { fixedTimestep: 0.01 })

      const startTime = performance.now()
      const result = integrator.update(1.0, testDerivative)
      const elapsed = performance.now() - startTime

      expect(result.stepsTaken).toBeGreaterThanOrEqual(99)
      expect(elapsed).toBeLessThanOrEqual(17)
    })
  })

  describe('render state interpolation', () => {
    it('should interpolate between previous and current state', () => {
      const state = createTestState()
      const initialPosition = state.position[0]
      const integrator = new RK4Integrator(state, { fixedTimestep: 0.01 })

      const result = integrator.update(0.005, testDerivative)
      const interpolatedState = integrator.getRenderState()

      expect(result.interpolationAlpha).toBeCloseTo(0.5, 3)
      expect(interpolatedState.position[0]).toBeCloseTo(
        initialPosition * 0.5,
        3,
      )
    })
  })
})

function createTestState(): PhysicsState17DOF {
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: 0,
    armAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
  }
}

function createZeroDerivative(): PhysicsDerivative17DOF {
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([0, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: 0,
    armAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 1,
  }
}

function testDerivative(
  _t: number,
  _state: PhysicsState17DOF,
): PhysicsDerivative17DOF {
  return createZeroDerivative()
}
