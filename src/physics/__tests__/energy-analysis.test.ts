import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createInitialState, createConfig } from '../config'
import { PHYSICS_CONSTANTS } from '../constants'
import type { PhysicsState, SimulationConfig } from '../types'

const G = PHYSICS_CONSTANTS.GRAVITY

function getEnergy(state: PhysicsState, config: SimulationConfig) {
  const { trebuchet, projectile } = config
  const {
    armAngle,
    armAngularVelocity,
    cwPosition,
    cwVelocity,
    cwAngle,
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
  const Msling = Mp * 0.05
  const m_p = Math.max(Msling / N, PHYSICS_CONSTANTS.MIN_PARTICLE_MASS_BASE)

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

  return {
    pe: peArm + peCw + peProj + peSling,
    ke: keArm + keCw + keProj + keSling,
    total: peArm + peCw + peProj + peSling + keArm + keCw + keProj + keSling,
    cwAngleDelta: Math.abs(cwAngle),
  }
}

describe('Physics Energy & Motion Analysis', () => {
  it('should conserve energy and demonstrate CW motion in a vacuum (High Pivot)', () => {
    const config = createConfig()
    config.projectile.dragCoefficient = 0
    config.trebuchet.jointFriction = 0
    config.trebuchet.pivotHeight = 15.0 // No ground contact
    config.initialTimestep = 0.001

    const state = createInitialState(config)
    const sim = new CatapultSimulation(state, config)

    const initial = getEnergy(state, config)
    let maxDrift = 0
    let maxCwSwing = 0

    console.log(
      `Initial Total Energy (High Pivot): ${initial.total.toFixed(2)} J`,
    )

    const dt = 0.01
    for (let i = 0; i < 150; i++) {
      const s = sim.update(dt)
      const current = getEnergy(s, config)

      const drift =
        Math.abs(current.total - initial.total) / Math.abs(initial.total)
      maxDrift = Math.max(maxDrift, drift)
      maxCwSwing = Math.max(maxCwSwing, current.cwAngleDelta)
    }

    console.log(
      `Final total energy (High Pivot): ${getEnergy(sim.getState(), config).total.toFixed(2)} J`,
    )
    console.log(
      `Max Energy Drift (High Pivot): ${(maxDrift * 100).toFixed(4)}%`,
    )
    console.log(
      `Max CW Swing Angle (High Pivot): ${((maxCwSwing * 180) / Math.PI).toFixed(2)} deg`,
    )

    expect(maxDrift).toBeLessThan(0.1)
    expect(maxCwSwing).toBeGreaterThan(0.2)
  })
})
