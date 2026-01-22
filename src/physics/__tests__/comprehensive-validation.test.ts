import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { PHYSICS_CONSTANTS } from '../constants'
import type { PhysicsState, SimulationConfig } from '../types'

function createStandardConfig(): SimulationConfig {
  return {
    initialTimestep: 0.005,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 1.0,
      radius: 0.1,
      area: Math.PI * 0.1 * 0.1,
      dragCoefficient: 0,
      magnusCoefficient: 0,
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
      jointFriction: 0.1,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

function createInitialState(config: SimulationConfig): PhysicsState {
  const { longArmLength: L1, pivotHeight: H } = config.trebuchet
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const armAngle = -Math.PI / 4
  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)
  const projX = tipX + 5
  const projY = tipY

  const slingParticles = new Float64Array(2 * N)
  for (let i = 0; i < N; i++) {
    const alpha = (i + 1) / N
    slingParticles[2 * i] = tipX * (1 - alpha) + projX * alpha
    slingParticles[2 * i + 1] = tipY * (1 - alpha) + projY * alpha
  }

  return {
    position: new Float64Array([projX, projY, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    slingParticles,
    slingVelocities: new Float64Array(2 * N),
    cwPosition: new Float64Array(2),
    cwVelocity: new Float64Array(2),
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}

describe('Comprehensive Physics Validation', () => {
  it('should maintain stable state after initial update', () => {
    const config = createStandardConfig()
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    const newState = sim.update(0.01)

    expect(newState.time).toBeGreaterThan(0)
    expect(newState.position[1]).toBeGreaterThanOrEqual(0)
  })
})
