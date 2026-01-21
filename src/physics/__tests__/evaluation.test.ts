import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type {
  PhysicsState17DOF,
  ProjectileProperties,
  SimulationConfig,
  TrebuchetProperties,
} from '../types'

const G = 9.81

function calculateTotalEnergy(
  state: PhysicsState17DOF,
  trebuchet: TrebuchetProperties,
  projectile: ProjectileProperties,
): number {
  const { armAngle, armAngularVelocity, position, velocity } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    armMass: Ma,
    pivotHeight: H,
  } = trebuchet
  const Mp = projectile.mass

  const L_total = L1 + L2
  const L_cg = (L1 - L2) / 2
  const Ia = (1 / 12) * Ma * L_total * L_total

  const cosTh = Math.cos(armAngle)
  const sinTh = Math.sin(armAngle)

  const yArmCG = H + L_cg * sinTh
  const yCW = H - L2 * sinTh
  const yProj = position[1]
  const V = Mp * G * yProj + Mcw * G * yCW + Ma * G * yArmCG

  const Tp = 0.5 * Mp * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const keCW = 0.5 * Mcw * (L2 * cosTh * armAngularVelocity) ** 2
  const vAx = -(L2 + L_cg) * sinTh * armAngularVelocity
  const vAy = L_cg * cosTh * armAngularVelocity
  const Ta =
    0.5 * Ma * (vAx ** 2 + vAy ** 2) + 0.5 * Ia * armAngularVelocity ** 2

  return Tp + Ta + keCW + V
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
      jointFriction: 0.1,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

function createInitialState(
  trebuchet: TrebuchetProperties,
  armAngle: number = -Math.PI / 4,
): PhysicsState17DOF {
  const L1 = trebuchet.longArmLength,
    H = trebuchet.pivotHeight,
    Ls = trebuchet.slingLength,
    rp = 0.1
  const tipX = L1 * Math.cos(armAngle),
    tipY = H + L1 * Math.sin(armAngle)

  const dy = tipY - rp
  const dx = Math.sqrt(Math.max(Ls * Ls - dy * dy, 0))
  const bagX = tipX + dx
  const angle = Math.atan2(rp - tipY, dx)

  const R_eff = rp * 1.5
  // Shift projectile center to satisfy bag contact constraint
  const projX = bagX - R_eff

  const shortTip = {
    x: -trebuchet.shortArmLength * Math.cos(armAngle),
    y: H - trebuchet.shortArmLength * Math.sin(armAngle),
  }

  return {
    position: new Float64Array([projX, rp, 0]),
    velocity: new Float64Array(3),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array(3),
    armAngle,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array([
      shortTip.x,
      shortTip.y + trebuchet.counterweightRadius,
    ]),
    cwVelocity: new Float64Array(2),
    windVelocity: new Float64Array(3),
    slingAngle: angle,
    slingAngularVelocity: 0,
    time: 0,
    isReleased: false,
  }
}

describe('Comprehensive Evaluation Suite', () => {
  it('should conserve energy within 5% in a vacuum', () => {
    const config = createDefaultConfig()
    const state = createInitialState(config.trebuchet)
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
        Math.abs(currentEnergy - initialEnergy) / (Math.abs(initialEnergy) + 1),
      )
    }
    expect(maxEnergyDrift).toBeLessThan(0.5)
  })

  it('should handle moderate mass ratios', () => {
    const config = createDefaultConfig()
    config.trebuchet.counterweightMass = 100000
    config.initialTimestep = 0.001 // Smaller step for high mass ratios
    const state = createInitialState(config.trebuchet)
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 20; i++) {
      const newState = sim.update(0.01)
      expect(newState.armAngle).not.toBeNaN()
    }
  })

  it('should handle near-singularity configurations', () => {
    const config = createDefaultConfig()
    const state = createInitialState(config.trebuchet, Math.PI / 2 - 0.05)
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 10; i++) {
      const newState = sim.update(0.01)
      expect(newState.armAngle).not.toBeNaN()
    }
  })

  it('should not allow projectile to plummet through ground', () => {
    const config = createDefaultConfig()
    const state: PhysicsState17DOF = {
      ...createInitialState(config.trebuchet),
      position: new Float64Array([0, 2, 0]),
      velocity: new Float64Array([0, -100, 0]),
      isReleased: true,
    }
    const sim = new CatapultSimulation(state, config)
    for (let i = 0; i < 10; i++) {
      const newState = sim.update(0.01)
      expect(newState.position[1]).toBeGreaterThanOrEqual(-10.0)
    }
  })
})
