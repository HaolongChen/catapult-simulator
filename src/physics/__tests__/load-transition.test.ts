import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { computeDerivatives } from '../derivatives'
import { createConfig, createInitialState } from '../config'
import { PHYSICS_CONSTANTS } from '../constants'
import type {
  PhysicsState,
  ProjectileProperties,
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
    (Mp * 0.05) / (N - 1),
    PHYSICS_CONSTANTS.MIN_PARTICLE_MASS,
  )

  const L_cg = (L1 - L2) / 2
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)

  const sinTh = Math.sin(armAngle)

  const yArmCG = H + L_cg * sinTh
  const yCW = cwPosition[1]
  const yProj = position[1]

  let V = Mp * G * yProj + Mcw * G * yCW + Ma * G * yArmCG
  let T_sling = 0

  const M = N - 1
  for (let i = 0; i < M; i++) {
    const py = slingParticles[2 * i + 1]
    const vx = slingVelocities[2 * i]
    const vy = slingVelocities[2 * i + 1]
    V += m_p * G * py
    T_sling += 0.5 * m_p * (vx * vx + vy * vy)
  }

  const Tp = 0.5 * Mp * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const keCW =
    0.5 * Mcw * (cwVelocity[0] ** 2 + cwVelocity[1] ** 2) +
    0.5 * Icw * cwAngularVelocity ** 2
  const Ta = 0.5 * Ia * armAngularVelocity ** 2

  return Tp + Ta + keCW + V + T_sling
}

describe('Load Transition (Lift-Off) Dynamics', () => {
  it('should exhibit instantaneous change in arm acceleration at lift-off', () => {
    const config = createConfig()
    config.trebuchet.counterweightMass = 1000
    config.initialTimestep = 0.001

    let state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    let liftedOff = false
    let prevAcc = 0
    let accJump = 0

    for (let i = 0; i < 500; i++) {
      const res = computeDerivatives(
        state,
        config.projectile,
        config.trebuchet,
        100000,
      )
      const currentAcc = res.derivative.armAngularVelocity

      if (!liftedOff && res.forces.groundNormal === 0 && i > 10) {
        liftedOff = true
        accJump = Math.abs(currentAcc - prevAcc)
      }

      prevAcc = currentAcc
      state = sim.update(0.001)
      if (liftedOff) break
    }

    expect(liftedOff).toBe(true)
    expect(accJump).toBeGreaterThan(0.05)
  })

  it('should maintain energy conservation during the lift-off transition', () => {
    const config = createConfig()
    config.trebuchet.counterweightMass = 2000
    config.initialTimestep = 0.0005

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const initialEnergy = calculateTotalEnergy(
      state,
      config.trebuchet,
      config.projectile,
    )
    let liftedOff = false
    let maxDrift = 0

    for (let i = 0; i < 1000; i++) {
      const newState = sim.update(0.0005)
      const currentEnergy = calculateTotalEnergy(
        newState,
        config.trebuchet,
        config.projectile,
      )
      const drift =
        Math.abs(currentEnergy - initialEnergy) / (Math.abs(initialEnergy) + 1)
      maxDrift = Math.max(maxDrift, drift)

      const forces = sim.getLastForces()
      if (!liftedOff && forces.groundNormal === 0 && i > 10) {
        liftedOff = true
      }

      expect(newState.armAngle).not.toBeNaN()
      if (liftedOff && i > 200) break
    }
    expect(liftedOff).toBe(true)
    expect(maxDrift).toBeLessThan(1.0)
  })
})
