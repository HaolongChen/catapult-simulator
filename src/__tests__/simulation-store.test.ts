import { beforeEach, describe, expect, it } from 'vitest'
import { reset, simulationStore, update } from '../lib/simulation-store'

const LONG_ARM = 8
const PIVOT_H = 5
const SLING_L = 6
const INITIAL_ARM_ANGLE = -Math.asin((PIVOT_H - 0.5) / LONG_ARM)
const INITIAL_PROJ_X = LONG_ARM * Math.cos(INITIAL_ARM_ANGLE) - SLING_L

describe('SimulationStore', () => {
  beforeEach(() => {
    reset()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = simulationStore.state
      expect(state.state.armAngle).toBeCloseTo(INITIAL_ARM_ANGLE, 5)
    })

    it('should have correct initial projectile position', () => {
      const position = simulationStore.state.state.position
      expect(position[0]).toBeCloseTo(INITIAL_PROJ_X, 5)
    })
  })

  describe('update', () => {
    it('should update arm angle during simulation', () => {
      const initialArmAngle = simulationStore.state.state.armAngle
      for (let i = 0; i < 50; i++) {
        update(0.01)
      }
      expect(simulationStore.state.state.armAngle).not.toBeCloseTo(
        initialArmAngle,
        5,
      )
    })
  })

  describe('reset', () => {
    it('should reset state to initial values', () => {
      for (let i = 0; i < 10; i++) update(0.01)
      reset()
      expect(simulationStore.state.state.time).toBe(0)
      expect(simulationStore.state.state.armAngle).toBeCloseTo(
        INITIAL_ARM_ANGLE,
        5,
      )
    })
  })
})
