import { describe, expect, it } from 'vitest'
import { RK4Integrator } from '../rk4-integrator'
import type {
  PhysicsDerivative19DOF,
  PhysicsForces,
  PhysicsState19DOF,
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

function createTestState(): PhysicsState19DOF {
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
    flexAngle: 0,
    flexAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}

function createZeroDerivative(): PhysicsDerivative19DOF {
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
    flexAngle: 0,
    flexAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    slingBagAngle: 0,
    slingBagAngularVelocity: 0,
    windVelocity: new Float64Array(3),
    time: 1,
    isReleased: false,
  }
}

function testDerivative(
  _t: number,
  _state: PhysicsState19DOF,
): { derivative: PhysicsDerivative19DOF; forces: PhysicsForces } {
  return { derivative: createZeroDerivative(), forces: EMPTY_FORCES }
}

describe('rk4-integrator', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state)
      expect(integrator).toBeDefined()
    })

    it('should accept custom config', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { initialTimestep: 0.005 })
      expect(integrator).toBeDefined()
    })
  })

  describe('update', () => {
    it('should accumulate time', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { initialTimestep: 0.01 })

      const result1 = integrator.update(0.005, testDerivative)
      expect(result1.stepsTaken).toBe(0)

      const result2 = integrator.update(0.006, testDerivative)
      expect(result2.stepsTaken).toBe(1)
    })

    it('should clamp accumulator to prevent spiral of death', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { initialTimestep: 0.01 })

      const result = integrator.update(1.0, testDerivative)
      expect(result.stepsTaken).toBeLessThanOrEqual(100)
    })

    it('should compute interpolation alpha', () => {
      const state = createTestState()
      const integrator = new RK4Integrator(state, { initialTimestep: 0.01 })

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

      const derivative = (_t: number, s: PhysicsState19DOF) => ({
        derivative: {
          ...createZeroDerivative(),
          position: new Float64Array([s.velocity[0]]),
          velocity: new Float64Array([(-k / m) * s.position[0]]),
        },
        forces: EMPTY_FORCES,
      })

      const integrator = new RK4Integrator(state, { initialTimestep: 0.001 })
      integrator.update(0.01, derivative)

      const finalState = integrator.getRenderState()
      const energy =
        0.5 * m * finalState.velocity[0] ** 2 +
        0.5 * k * finalState.position[0] ** 2

      expect(energy).toBeCloseTo(0.5, 0.01)
    })
  })

  describe('render state interpolation', () => {
    it('should interpolate between previous and current state', () => {
      const state = createTestState()
      const initialPosition = 10.0
      state.position[0] = initialPosition
      const integrator = new RK4Integrator(state, { initialTimestep: 0.01 })

      const moveDeriv = (_t: number, _s: PhysicsState19DOF) => ({
        derivative: {
          ...createZeroDerivative(),
          position: new Float64Array([1.0]),
        },
        forces: EMPTY_FORCES,
      })

      const result = integrator.update(0.005, moveDeriv)
      const interpolatedState = integrator.getRenderState()

      expect(result.interpolationAlpha).toBeCloseTo(0.5, 3)
      expect(interpolatedState.position[0]).toBeDefined()
    })
  })
})
