import { describe, expect, it, beforeEach } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { physicsLogger } from '../logging'
import type { PhysicsState17DOF, SimulationConfig } from '../types'

const MOCK_TREBUCHET = {
  longArmLength: 8,
  shortArmLength: 2,
  counterweightMass: 1000,
  counterweightRadius: 1.5,
  slingLength: 6,
  releaseAngle: (45 * Math.PI) / 180,
  springConstant: 50000,
  dampingCoefficient: 100,
  equilibriumAngle: 0,
  jointFriction: 0.3,
  efficiency: 0.9,
  flexuralStiffness: 1000000,
  armMass: 100,
  pivotHeight: 5,
}

const BASE_CONFIG: any = {
  initialTimestep: 0.001,
  maxSubsteps: 5000,
  maxAccumulator: 1.0,
  tolerance: 1e-8,
  minTimestep: 1e-10,
  maxTimestep: 0.01,
}

describe('physics-perfection', () => {
  beforeEach(() => {
    physicsLogger.clear()
    physicsLogger.enable()
  })

  it('should maintain energy conservation with high precision', () => {
    const state: PhysicsState17DOF = createTestState()
    const config: SimulationConfig = {
      ...BASE_CONFIG,
      projectile: createTestProjectile(),
      trebuchet: {
        ...MOCK_TREBUCHET,
        jointFriction: 0,
        dampingCoefficient: 0,
        efficiency: 1.0,
        flexuralStiffness: 0,
      },
    }
    const sim = new CatapultSimulation(state, config)

    for (let i = 0; i < 50; i++) {
      sim.update(0.01)
    }

    const records = physicsLogger.getRecords()
    expect(records.length).toBeGreaterThan(50)

    const energies = records.map((r) => calculateTotalEnergy(r.state, r.config))
    const initialEnergy = energies[0]
    const finalEnergy = energies[energies.length - 1]

    const drift = Math.abs((finalEnergy - initialEnergy) / initialEnergy)
    expect(drift).toBeLessThan(0.005)
  })

  it('should handle extreme mass ratios using LU stability', () => {
    const state: PhysicsState17DOF = createTestState()
    const config: SimulationConfig = {
      ...BASE_CONFIG,
      projectile: {
        ...createTestProjectile(),
        mass: 0.001,
      },
      trebuchet: {
        ...MOCK_TREBUCHET,
        counterweightMass: 100000,
      },
    }
    const sim = new CatapultSimulation(state, config)

    expect(() => sim.update(0.1)).not.toThrow()

    const finalState = sim.getState()
    expect(isNaN(finalState.armAngle)).toBe(false)
    expect(isFinite(finalState.armAngle)).toBe(true)
  })
})

function createTestState(): PhysicsState17DOF {
  return {
    position: new Float64Array([10, 20, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: -0.5,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
  }
}

function createTestProjectile() {
  return {
    mass: 1,
    radius: 0.05,
    area: Math.PI * 0.05 ** 2,
    dragCoefficient: 0,
    magnusCoefficient: 0,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }
}

function calculateTotalEnergy(
  state: PhysicsState17DOF,
  config: SimulationConfig,
): number {
  const g = 9.81
  const { trebuchet, projectile: projProps } = config
  const {
    position,
    velocity,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
  } = state

  const pe =
    projProps.mass * g * position[1] +
    trebuchet.counterweightMass *
      g *
      (trebuchet.pivotHeight -
        trebuchet.shortArmLength * Math.sin(armAngle) -
        trebuchet.counterweightRadius * Math.cos(cwAngle))

  const Ia = (1 / 3) * trebuchet.armMass * trebuchet.longArmLength ** 2
  const Icw =
    0.4 * trebuchet.counterweightMass * trebuchet.counterweightRadius ** 2

  const keProj =
    0.5 *
    projProps.mass *
    (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const keArm =
    0.5 *
    (Ia + trebuchet.counterweightMass * trebuchet.shortArmLength ** 2) *
    armAngularVelocity ** 2
  const keCW = 0.5 * Icw * cwAngularVelocity ** 2

  return pe + keProj + keArm + keCW
}
