import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { PHYSICS_CONSTANTS } from '../constants'
import { createInitialState } from '../config'
import type {
  PhysicsState,
  ProjectileProperties,
  SimulationConfig,
  TrebuchetProperties,
} from '../types'

const G = 9.81

function calculateTotalEnergy(
  state: PhysicsState,
  trebuchet: TrebuchetProperties,
  projectile: ProjectileProperties,
): number {
  const {
    armAngle,
    armAngularVelocity,
    position,
    velocity,
    slingParticles,
    slingVelocities,
    cwPosition,
    cwVelocity,
    cwAngularVelocity,
    angularVelocity,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    armMass: Ma,
    pivotHeight: H,
    counterweightInertia: Icw,
  } = trebuchet
  const Mp = projectile.mass
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const m_p = Math.max(
    (Mp * 0.05) / N,
    PHYSICS_CONSTANTS.MIN_PARTICLE_MASS_BASE,
  )

  const L_cg = (L1 - L2) / 2
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const sinTh = Math.sin(armAngle)
  const yArmCG = H + L_cg * sinTh
  const yCW = cwPosition[1]
  const yProj = position[1]

  let V = Mp * G * yProj + Mcw * G * yCW + Ma * G * yArmCG
  let T_sling = 0
  for (let i = 0; i < N; i++) {
    const py = slingParticles[2 * i + 1]
    const vx = slingVelocities[2 * i],
      vy = slingVelocities[2 * i + 1]
    V += m_p * G * py
    T_sling += 0.5 * m_p * (vx * vx + vy * vy)
  }

  const Tp = 0.5 * Mp * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const keCW =
    0.5 * Mcw * (cwVelocity[0] ** 2 + cwVelocity[1] ** 2) +
    0.5 * Icw * cwAngularVelocity ** 2
  const Ta = 0.5 * Ia * armAngularVelocity ** 2
  const I_proj = 0.4 * Mp * projectile.radius ** 2
  const Tr =
    0.5 *
    I_proj *
    (angularVelocity[0] ** 2 +
      angularVelocity[1] ** 2 +
      angularVelocity[2] ** 2)

  return Tp + Ta + keCW + V + T_sling + Tr
}

function createDefaultConfig(): SimulationConfig {
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
      jointFriction: 0,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

describe('Comprehensive Evaluation Suite', () => {
  it('should conserve energy within 5% in a vacuum', () => {
    const config = createDefaultConfig()
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    const initialEnergy = calculateTotalEnergy(
      state,
      config.trebuchet,
      config.projectile,
    )
    let maxEnergyDrift = 0
    for (let i = 0; i < 50; i++) {
      const newState = sim.update(0.01)
      const currentEnergy = calculateTotalEnergy(
        newState,
        config.trebuchet,
        config.projectile,
      )
      if (Number.isNaN(currentEnergy)) break
      maxEnergyDrift = Math.max(
        maxEnergyDrift,
        Math.abs(currentEnergy - initialEnergy) /
          (Math.abs(initialEnergy) + 1e-9),
      )
    }
    expect(maxEnergyDrift).toBeLessThan(0.05)
  })

  it('should handle moderate mass ratios', () => {
    const config = createDefaultConfig()
    config.trebuchet.counterweightMass = 20000
    config.initialTimestep = 0.001
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 20; i++) {
      const newState = sim.update(0.01)
      expect(newState.armAngle).not.toBeNaN()
    }
  })

  it('should handle near-singularity configurations', () => {
    const config = createDefaultConfig()
    config.trebuchet.slingLength = 30
    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 10; i++) {
      const newState = sim.update(0.01)
      expect(newState.armAngle).not.toBeNaN()
    }
  })

  it('should not allow projectile to plummet through ground', () => {
    const config = createDefaultConfig()
    const baseState = createInitialState(config)
    const state: PhysicsState = {
      ...baseState,
      position: new Float64Array([0, 2, 0]),
      velocity: new Float64Array([0, -100, 0]),
      isReleased: true,
    }
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 10; i++) {
      const newState = sim.update(0.01)
      expect(newState.position[1]).toBeGreaterThanOrEqual(0.0)
    }
  })
})
