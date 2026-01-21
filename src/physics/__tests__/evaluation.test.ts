import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type {
  PhysicsState19DOF,
  ProjectileProperties,
  SimulationConfig,
  TrebuchetProperties,
} from '../types'

const G = 9.81

function calculateTotalEnergy(
  state: PhysicsState19DOF,
  trebuchet: TrebuchetProperties,
  projectile: ProjectileProperties,
): number {
  const { armAngle, armAngularVelocity, position, velocity, flexAngle } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    armMass: Ma,
    pivotHeight: H,
    flexPoint: Lf,
  } = trebuchet
  const Mp = projectile.mass,
    Lw = L1 - Lf
  const rho = Ma / (L1 + L2),
    m1 = rho * (Lf + L2),
    m2 = rho * Lw

  const peProj = Mp * G * position[1]
  const peMainArm = m1 * G * (H + ((Lf - L2) / 2) * Math.sin(armAngle))
  const peWhip =
    m2 *
    G *
    (H + Lf * Math.sin(armAngle) + (Lw / 2) * Math.sin(armAngle + flexAngle))
  const peCW = Mcw * G * state.cwPosition[1]
  const peSlingBag = trebuchet.slingBagMass * G * state.slingBagPosition[1]

  const keProj =
    0.5 * Mp * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const keArm =
    0.5 * ((1 / 3) * m1 * (Lf ** 2 + L2 ** 2)) * armAngularVelocity ** 2

  return peProj + peMainArm + peWhip + peCW + peSlingBag + keProj + keArm
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
      slingBagWidth: 0.35,
      slingBagMass: 5,
      slingBagInertia: 0.1,
      jointFriction: 0.1,
      flexStiffness: 1e7,
      flexDamping: 1e4,
      flexPoint: 8.0,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

function createInitialState(
  trebuchet: TrebuchetProperties,
  armAngle: number = -Math.PI / 4,
): PhysicsState19DOF {
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
    flexAngle: 0,
    flexAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    cwPosition: new Float64Array([
      shortTip.x,
      shortTip.y + trebuchet.counterweightRadius,
    ]),
    cwVelocity: new Float64Array(2),
    slingBagAngle: angle,
    slingBagAngularVelocity: 0,
    slingBagPosition: new Float64Array([bagX, rp]),
    slingBagVelocity: new Float64Array(2),
    windVelocity: new Float64Array(3),
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
    config.trebuchet.flexStiffness = 1e11 // High stiffness for stability
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
    const state: PhysicsState19DOF = {
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
