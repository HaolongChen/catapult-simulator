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
  SimulationConfig,
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
  armTorques: {
    pivotFriction: 0,
    slingDamping: 0,
    cwDamping: 0,
    total: 0,
  },
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

describe('Quaternion Degeneracy', () => {
  it('should recover from degenerate quaternion', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    const state = createInitialState(config)

    // Create degenerate quaternion (all zeros)
    state.orientation[0] = 0
    state.orientation[1] = 0
    state.orientation[2] = 0
    state.orientation[3] = 0

    const sim = new CatapultSimulation(state, config)

    // Run multiple updates - quaternion should be recovered to identity
    for (let i = 0; i < 50; i++) {
      sim.update(1 / 60)
    }

    const finalState = sim.getState()
    assertStateIsFinite(finalState)

    // Verify quaternion was reset to identity [1, 0, 0, 0]
    expect(finalState.orientation[0]).toBe(1)
    expect(finalState.orientation[1]).toBe(0)
    expect(finalState.orientation[2]).toBe(0)
    expect(finalState.orientation[3]).toBe(0)

    warnSpy.mockRestore()
  })
})

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

describe('Parameter Validation', () => {
  it('should clamp extreme ropeStiffness to safe range', () => {
    const config = createConfig()
    const props = { ...config.trebuchet, ropeStiffness: 1e15 }
    const validated = CatapultSimulation.validateTrebuchetProperties(props)

    expect(validated.ropeStiffness).toBe(1e12)
  })

  it('should clamp extreme slingLength to safe range', () => {
    const config = createConfig()
    const props = { ...config.trebuchet, slingLength: 500 }
    const validated = CatapultSimulation.validateTrebuchetProperties(props)

    expect(validated.slingLength).toBe(100)
  })

  it('should warn when parameters are clamped', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    const props = { ...config.trebuchet, ropeStiffness: 1e15 }
    CatapultSimulation.validateTrebuchetProperties(props)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('clamping'))
    warnSpy.mockRestore()
  })

  it('should replace NaN ropeStiffness with default', () => {
    const config = createConfig()
    const props = { ...config.trebuchet, ropeStiffness: NaN }
    const validated = CatapultSimulation.validateTrebuchetProperties(props)

    expect(validated.ropeStiffness).toBe(PHYSICS_CONSTANTS.ROPE_YOUNGS_MODULUS)
  })

  it('should replace Infinity slingLength with upper bound', () => {
    const config = createConfig()
    const props = { ...config.trebuchet, slingLength: Infinity }
    const validated = CatapultSimulation.validateTrebuchetProperties(props)

    expect(validated.slingLength).toBe(100)
  })

  it('should replace negative slingLength with lower bound', () => {
    const config = createConfig()
    const props = { ...config.trebuchet, slingLength: -5 }
    const validated = CatapultSimulation.validateTrebuchetProperties(props)

    expect(validated.slingLength).toBe(0.1)
  })

  it('should handle state/config mismatch gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    const state = createInitialState(config)

    state.slingParticles[0] = 1000

    expect(() => {
      new CatapultSimulation(state, config)
    }).not.toThrow()

    warnSpy.mockRestore()
  })
})

function getEnergy(state: PhysicsState, config: SimulationConfig): number {
  const G = PHYSICS_CONSTANTS.GRAVITY
  const { trebuchet, projectile } = config
  const {
    armAngle,
    armAngularVelocity,
    cwPosition,
    cwVelocity,
    cwAngularVelocity,
    position,
    velocity,
    angularVelocity,
    slingParticles,
    slingVelocities,
  } = state

  const Ma = trebuchet.armMass
  const L1 = trebuchet.longArmLength
  const L2 = trebuchet.shortArmLength
  const H = trebuchet.pivotHeight
  const L_cg = (L1 - L2) / 2
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)

  const Mcw = trebuchet.counterweightMass
  const Icw = trebuchet.counterweightInertia

  const Mp = projectile.mass
  const Rp = projectile.radius
  const Ip = 0.4 * Mp * Rp * Rp

  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const Msling = PHYSICS_CONSTANTS.SLING_MASS
  const m_p = Msling / N

  const peArm = Ma * G * (H + L_cg * Math.sin(armAngle))
  const peCw = Mcw * G * cwPosition[1]
  const peProj = Mp * G * position[1]
  let peSling = 0
  for (let i = 0; i < N; i++) {
    peSling += m_p * G * slingParticles[2 * i + 1]
  }

  const keArm = 0.5 * Ia * armAngularVelocity ** 2
  const keCw =
    0.5 * Mcw * (cwVelocity[0] ** 2 + cwVelocity[1] ** 2) +
    0.5 * Icw * cwAngularVelocity ** 2
  const keProj =
    0.5 * Mp * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2) +
    0.5 *
      Ip *
      (angularVelocity[0] ** 2 +
        angularVelocity[1] ** 2 +
        angularVelocity[2] ** 2)
  let keSling = 0
  for (let i = 0; i < N; i++) {
    keSling +=
      0.5 *
      m_p *
      (slingVelocities[2 * i] ** 2 + slingVelocities[2 * i + 1] ** 2)
  }

  return peArm + peCw + peProj + peSling + keArm + keCw + keProj + keSling
}

describe('Extreme Coefficient Tests', () => {
  const ENERGY_THRESHOLD = 0.0125 // 1.25% - increased to accommodate 30Hz rope frequency (prevents force spikes)

  it('should handle very high ropeStiffness (1e15)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.ropeStiffness = 1e15
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle very low ropeStiffness (1e3)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.ropeStiffness = 1e3
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle zero slingLength', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.slingLength = 0
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle very long slingLength (200m)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.slingLength = 200
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle undefined ropeStiffness', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.trebuchet.ropeStiffness = undefined as any
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle combined high stiffness + short length', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.ropeStiffness = 1e15
    config.trebuchet.slingLength = 0.5
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle combined low stiffness + long length', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.ropeStiffness = 1e3
    config.trebuchet.slingLength = 50
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should maintain energy drift ≤ threshold (high-pivot vacuum)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.projectile.dragCoefficient = 0
    config.trebuchet.jointFriction = 0
    config.trebuchet.pivotHeight = 15.0
    config.initialTimestep = 0.0005

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    const initialEnergy = getEnergy(state, config)

    let hasReleased = false
    const dt = 0.01
    while (!hasReleased && sim.getState().time < 10) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
      hasReleased = currentState.isReleased
    }

    const finalState = sim.getState()
    const finalEnergy = getEnergy(finalState, config)
    const energyDrift =
      Math.abs(finalEnergy - initialEnergy) / Math.abs(initialEnergy)

    expect(energyDrift).toBeLessThanOrEqual(ENERGY_THRESHOLD)

    warnSpy.mockRestore()
  })

  it('should handle NaN ropeStiffness', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    config.trebuchet.ropeStiffness = NaN
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it('should handle Infinity slingLength', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    const props = { ...config.trebuchet, slingLength: Infinity }
    const validated = CatapultSimulation.validateTrebuchetProperties(props)
    expect(validated.slingLength).toBe(100)

    config.trebuchet = validated
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const dt = 0.01
    for (let t = 0; t < 3; t += dt) {
      sim.update(dt)
      const currentState = sim.getState()
      assertStateIsFinite(currentState)
    }

    warnSpy.mockRestore()
  })

  it(
    'Fuzzer: should remain finite for 100 seeded random configurations',
    () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      let seed = 42
      const random = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296
        return seed / 4294967296
      }

      let failureCount = 0

      for (let i = 0; i < 100; i++) {
        const config = createConfig()
        config.trebuchet.ropeStiffness = 1e5 + random() * (1e13 - 1e5)
        config.trebuchet.slingLength = 0.01 + random() * (150 - 0.01)

        try {
          const state = createInitialState(config)
          const sim = new CatapultSimulation(state, config)
          const dt = 0.02
          for (let t = 0; t < 1; t += dt) {
            sim.update(dt)
            assertStateIsFinite(sim.getState())
          }
        } catch {
          failureCount++
        }
      }

      expect(failureCount).toBe(0)
      warnSpy.mockRestore()
    },
    30000,
  )
})
