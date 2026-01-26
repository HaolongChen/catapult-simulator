import { describe, expect, it, vi } from 'vitest'
import { RK4Integrator } from '../rk4-integrator'
import { CatapultSimulation } from '../simulation'
import { createConfig, createInitialState } from '../config'
import { PHYSICS_CONSTANTS } from '../constants'
import type {
  DerivativeFunction,
  PhysicsDerivative,
  PhysicsForces,
  PhysicsState,
} from '../types'

const EMPTY_FORCES: PhysicsForces = {
  drag: new Float64Array(3),
  magnus: new Float64Array(3),
  gravity: new Float64Array(3),
  tension: new Float64Array(3),
  total: new Float64Array(3),
  groundNormal: 0,
  checkFunction: 0,
  lambda: new Float64Array(0),
}

function createTestState(): PhysicsState {
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: 0,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    windVelocity: new Float64Array([0, 0, 0]),
    slingParticles: new Float64Array(2 * N),
    slingVelocities: new Float64Array(2 * N),
    time: 0,
    isReleased: false,
  }
}

function createZeroDerivative(): PhysicsDerivative {
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  return {
    position: new Float64Array(3),
    velocity: new Float64Array(3),
    orientation: new Float64Array(4),
    angularVelocity: new Float64Array(3),
    armAngle: 0,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    windVelocity: new Float64Array(3),
    slingParticles: new Float64Array(2 * N),
    slingVelocities: new Float64Array(2 * N),
    time: 0,
    isReleased: false,
  }
}

function createNaNDerivative(): DerivativeFunction {
  return (_t: number, _state: PhysicsState) => ({
    derivative: {
      ...createZeroDerivative(),
      position: new Float64Array([NaN, NaN, NaN]),
    },
    forces: EMPTY_FORCES,
  })
}

// Helper function to assert all PhysicsState fields are finite
function assertStateIsFinite(state: PhysicsState): void {
  // Scalars
  expect(Number.isFinite(state.armAngle)).toBe(true)
  expect(Number.isFinite(state.armAngularVelocity)).toBe(true)
  expect(Number.isFinite(state.cwAngle)).toBe(true)
  expect(Number.isFinite(state.cwAngularVelocity)).toBe(true)
  expect(Number.isFinite(state.time)).toBe(true)

  // Float64Array fields - iterate directly (flat arrays)
  const checkArray = (arr: Float64Array) => {
    for (let i = 0; i < arr.length; i++) {
      expect(Number.isFinite(arr[i])).toBe(true)
    }
  }

  checkArray(state.position)
  checkArray(state.velocity)
  checkArray(state.orientation)
  checkArray(state.angularVelocity)
  checkArray(state.cwPosition)
  checkArray(state.cwVelocity)
  checkArray(state.slingParticles) // Float64Array, not 2D
  checkArray(state.slingVelocities) // Float64Array, not 2D
  checkArray(state.windVelocity)
}

describe('RK4Integrator - Degraded Mode', () => {
  it('should not accept NaN state from fallback', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    // Mock console.warn to prevent test spam
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = integrator.update(0.05, createNaNDerivative())

    // Should enter degraded mode instead of accepting NaN
    expect(integrator.degraded).toBe(true)
    expect(Number.isFinite(result.newState.position[0])).toBe(true)
    expect(Number.isFinite(result.newState.position[1])).toBe(true)
    expect(Number.isFinite(result.newState.position[2])).toBe(true)

    warnSpy.mockRestore()
  })

  it('should set degraded flag when NaN recovery fails', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    expect(integrator.degraded).toBe(false)

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    integrator.update(0.05, createNaNDerivative())

    expect(integrator.degraded).toBe(true)

    warnSpy.mockRestore()
  })

  it('should freeze at previousState when degraded', () => {
    const state = createTestState()
    state.position[0] = 1.0
    state.position[1] = 2.0
    state.position[2] = 3.0

    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // First update triggers degraded mode
    const result1 = integrator.update(0.05, createNaNDerivative())

    expect(integrator.degraded).toBe(true)
    expect(result1.newState.position[0]).toBe(1.0)
    expect(result1.newState.position[1]).toBe(2.0)
    expect(result1.newState.position[2]).toBe(3.0)

    // Second update should return same state
    const result2 = integrator.update(0.05, createNaNDerivative())

    expect(result2.newState.position[0]).toBe(1.0)
    expect(result2.newState.position[1]).toBe(2.0)
    expect(result2.newState.position[2]).toBe(3.0)

    warnSpy.mockRestore()
  })

  it('should return stepsTaken=0 when already degraded', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // First update triggers degraded mode
    integrator.update(0.05, createNaNDerivative())
    expect(integrator.degraded).toBe(true)

    // Second update should return stepsTaken=0
    const result = integrator.update(0.05, createNaNDerivative())
    expect(result.stepsTaken).toBe(0)
    expect(result.interpolationAlpha).toBe(0)

    warnSpy.mockRestore()
  })

  it('should clear degraded flag on resetDegraded()', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Trigger degraded mode
    integrator.update(0.05, createNaNDerivative())
    expect(integrator.degraded).toBe(true)

    // Reset degraded flag
    integrator.resetDegraded()
    expect(integrator.degraded).toBe(false)

    warnSpy.mockRestore()
  })

  it('should clear degraded flag on setState(state)', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Trigger degraded mode
    integrator.update(0.05, createNaNDerivative())
    expect(integrator.degraded).toBe(true)

    // Set new state - should clear degraded flag
    const newState = createTestState()
    newState.position[0] = 5.0
    integrator.setState(newState)

    expect(integrator.degraded).toBe(false)

    warnSpy.mockRestore()
  })

  it('should NOT clear degraded flag on reset()', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Trigger degraded mode
    integrator.update(0.05, createNaNDerivative())
    expect(integrator.degraded).toBe(true)

    // Call reset() - should NOT clear degraded flag
    integrator.reset()
    expect(integrator.degraded).toBe(true)

    warnSpy.mockRestore()
  })

  it('should zero accumulator when entering degraded mode', () => {
    const state = createTestState()
    const integrator = new RK4Integrator(state, {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Call update with frameTime that would normally accumulate
    // Use a NaN-producing derivative to trigger degraded mode
    const result = integrator.update(0.05, createNaNDerivative())

    // When degraded triggers:
    // 1. accumulator is set to 0 (per design)
    // 2. interpolationAlpha = accumulator / initialTimestep = 0 / 0.01 = 0
    expect(result.interpolationAlpha).toBe(0)
    expect(integrator.degraded).toBe(true)

    // Bonus: verify subsequent updates still return interpolationAlpha = 0
    // because early return doesn't consume time
    const result2 = integrator.update(0.1, createNaNDerivative())
    expect(result2.interpolationAlpha).toBe(0)

    warnSpy.mockRestore()
  })
})

describe('Division guards in derivatives', () => {
  it('should handle very small slingLength without NaN', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.slingLength = 0.001 // Very small - tests Lseg guard (Math.max(1e-6, Ls))
    // Note: 0 exactly would cause createInitialState issues, so use very small value
    // The derivatives.ts guard ensures Lseg >= 1e-6 even if config has tiny value

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    // Run 50 updates - should not produce NaN due to division guards
    for (let i = 0; i < 50; i++) {
      sim.update(1 / 60)
    }
    assertStateIsFinite(sim.getState())

    warnSpy.mockRestore()
  })

  it('should handle zero counterweightMass without NaN', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.counterweightMass = 0 // Guards in derivatives.ts protect against 1/Mcw

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    // Run 50 updates - should not produce NaN due to 1/Math.max(1e-12, Mcw) guard
    for (let i = 0; i < 50; i++) {
      sim.update(1 / 60)
    }
    assertStateIsFinite(sim.getState())

    warnSpy.mockRestore()
  })
})
