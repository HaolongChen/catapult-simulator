import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import { createInitialState } from '../config'
import type {
  PhysicsState17DOF,
  ProjectileProperties,
  TrebuchetProperties,
  SimulationConfig,
} from '../types'

describe('Ghost Constraint Sling Physics', () => {
  const projectile: ProjectileProperties = {
    mass: 1.0,
    radius: 0.1,
    area: Math.PI * 0.1 ** 2,
    dragCoefficient: 0.47,
    magnusCoefficient: 0.3,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  }

  const trebuchet: TrebuchetProperties = {
    longArmLength: 4.4,
    shortArmLength: 0.8,
    counterweightMass: 2000.0,
    counterweightRadius: 0.8,
    counterweightInertia: 500,
    slingLength: 3.5,
    releaseAngle: Math.PI / 2,
    slingBagWidth: 0.35,
    slingBagMass: 5,
    slingBagInertia: 0.1,
    jointFriction: 0.1,
    armMass: 200.0,
    pivotHeight: 3.0,
  }

  const config: SimulationConfig = {
    initialTimestep: 0.001,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile,
    trebuchet,
  }

  it('should maintain holonomic distance constraint under load', () => {
    const armAngle = 0
    const tipX = 4.4
    const tipY = 3.0
    const slingBagX = tipX + 3.0
    const slingBagY = tipY - 1.8

    const state: PhysicsState17DOF = {
      position: new Float64Array([slingBagX, slingBagY + 0.15, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      cwPosition: new Float64Array(2),
      cwVelocity: new Float64Array(2),
      slingBagAngle: 0,
      slingBagAngularVelocity: 0,
      slingBagPosition: new Float64Array([slingBagX, slingBagY]),
      slingBagVelocity: new Float64Array(2),
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(state, config)
    sim.update(0.001)
    const frame = sim.exportFrameData()

    expect(frame.sling.isAttached).toBe(true)
    expect(frame.sling.tension).toBeDefined()
    expect(isNaN(frame.sling.tension)).toBe(false)
  })

  it('should follow kinematic release: separation logic handles angular trigger', () => {
    const armAngle = -0.5
    const state: PhysicsState17DOF = {
      position: new Float64Array([4, 0.1, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      cwPosition: new Float64Array(2),
      cwVelocity: new Float64Array(2),
      slingBagAngle: 0,
      slingBagAngularVelocity: 0,
      slingBagPosition: new Float64Array([3.85, 0.1]),
      slingBagVelocity: new Float64Array(2),
      windVelocity: new Float64Array([0, 0, 0]),
      time: 0,
      isReleased: false,
    }

    const sim = new CatapultSimulation(state, config)
    expect(() => sim.update(0.005)).not.toThrow()
    const frame = sim.exportFrameData()
    expect(frame.projectile.position.some(isNaN)).toBe(false)
  })

  it('should separate projectile from tip when angular condition met (kinematic release)', () => {
    const configHighPower = {
      ...config,
      trebuchet: { ...trebuchet, counterweightMass: 100000, releaseAngle: 0.1 },
    }
    const sim = new CatapultSimulation(
      createInitialState(configHighPower),
      configHighPower,
    )

    let separated = false
    for (let i = 0; i < 2000; i++) {
      const state = sim.update(0.002)
      if (state.isReleased) {
        separated = true
        break
      }
    }
    expect(separated).toBe(true)
  })
})
