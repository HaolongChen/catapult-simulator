/**
 * Physics Simulation Integration Tests
 */

import { describe, it, expect } from 'vitest'
import { CatapultSimulation, type SimulationConfig } from '../simulation'
import type { PhysicsState17DOF } from '../types'

describe('catapult-simulation', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const state: PhysicsState17DOF = {
        position: new Float64Array([0, 0, 0]),
        velocity: new Float64Array([1, 0, 0]),
        orientation: new Float64Array([1, 0, 0, 0]),
        angularVelocity: new Float64Array([0, 0, 0]),
        armAngle: 0,
        armAngularVelocity: 0,
        windVelocity: new Float64Array([0, 0, 0]),
        time: 0,
      }

      const sim = new CatapultSimulation(state, {})

      expect(sim).toBeDefined()
    })

    it('should accept custom config', () => {
      const state = createTestState()
      const config: SimulationConfig = {
        projectile: {
          mass: 10,
          radius: 0.05,
          area: Math.PI * 0.05 ** 2,
          dragCoefficient: 0.47,
          magnusCoefficient: 0.3,
          momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
          spin: 0,
        },
        trebuchet: {
          armLength: 10,
          counterweightMass: 1000,
          springConstant: 50000,
          dampingCoefficient: 100,
          equilibriumAngle: 0,
          jointFriction: 0.3,
          efficiency: 0.9,
          flexuralStiffness: 1000000,
        },
      }

      const sim = new CatapultSimulation(state, config)

      expect(sim).toBeDefined()
    })
  })

  describe('update', () => {
    it('should advance simulation state', () => {
      const state = createTestState()
      const config: SimulationConfig = {
        projectile: {
          mass: 10,
          radius: 0.05,
          area: Math.PI * 0.05 ** 2,
          dragCoefficient: 0.47,
          magnusCoefficient: 0.3,
          momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
          spin: 0,
        },
        trebuchet: {
          armLength: 10,
          counterweightMass: 1000,
          springConstant: 50000,
          dampingCoefficient: 100,
          equilibriumAngle: 0,
          jointFriction: 0.3,
          efficiency: 0.9,
          flexuralStiffness: 1000000,
        },
        fixedTimestep: 0.001, // Fast for quick test
      }

      const sim = new CatapultSimulation(state, config)
      const newState = sim.update(0.01667) // 1 frame at 60fps

      expect(newState.time).toBeCloseTo(0.01667, 5)
      expect(newState.velocity[0]).toBeGreaterThan(0) // Gravity acceleration
    })
  })

  describe('render state', () => {
    it('should return interpolated state', () => {
      const state: PhysicsState17DOF = {
        position: new Float64Array([0, 0, 0]),
        velocity: new Float64Array([1, 0, 0]),
        orientation: new Float64Array([1, 0, 0, 0]),
        angularVelocity: new Float64Array([0, 0, 0]),
        armAngle: 0,
        armAngularVelocity: 0,
        windVelocity: new Float64Array([0, 0, 0]),
        time: 0,
      }

      const config: SimulationConfig = {
        projectile: {
          mass: 10,
          radius: 0.05,
          area: Math.PI * 0.05 ** 2,
          dragCoefficient: 0.47,
          magnusCoefficient: 0.3,
          momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
          spin: 0,
        },
        trebuchet: {
          armLength: 10,
          counterweightMass: 1000,
          springConstant: 50000,
          dampingCoefficient: 100,
          equilibriumAngle: 0,
          jointFriction: 0.3,
          efficiency: 0.9,
          flexuralStiffness: 1000000,
        },
        fixedTimestep: 0.01,
      }

      const sim = new CatapultSimulation(state, config)
      sim.update(0.005) // Half step
      const renderState = sim.getRenderState()

      expect(renderState.position[0]).toBeGreaterThan(0)
      expect(renderState.position[0]).toBeLessThan(state.position[0])
    })
  })
})

function createTestState(): PhysicsState17DOF {
  return {
    position: new Float64Array([0, 0, 0]),
    velocity: new Float64Array([1, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: 0,
    armAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
  }
}
