import { describe, it, expect, beforeEach } from 'vitest'
import {
  simulationStore,
  play,
  pause,
  update,
  reset,
  setState,
} from '../lib/simulation-store'

describe('SimulationStore', () => {
  beforeEach(() => {
    reset()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = simulationStore.state

      expect(state.isPlaying).toBe(false)
      expect(state.interpolationAlpha).toBe(0)
      expect(state.state).toBeDefined()
      expect(state.state.position).toHaveLength(3)
      expect(state.state.velocity).toHaveLength(3)
      expect(state.state.armAngle).toBe(-Math.PI / 4)
      expect(state.state.time).toBe(0)
    })

    it('should have correct initial projectile position at origin', () => {
      const position = simulationStore.state.state.position

      expect(position[0]).toBe(0)
      expect(position[1]).toBe(0)
      expect(position[2]).toBe(0)
    })

    it('should have correct initial arm angle', () => {
      expect(simulationStore.state.state.armAngle).toBeCloseTo(
        -0.7853981633974483,
        10,
      )
    })
  })

  describe('play/pause', () => {
    it('should set isPlaying to true when play() is called', () => {
      play()

      expect(simulationStore.state.isPlaying).toBe(true)
    })

    it('should set isPlaying to false when pause() is called', () => {
      play()
      pause()

      expect(simulationStore.state.isPlaying).toBe(false)
    })
  })

  describe('update', () => {
    it('should advance simulation time when update() is called', () => {
      const initialTime = simulationStore.state.state.time
      const deltaTime = 0.016

      update(deltaTime)

      expect(simulationStore.state.state.time).toBeGreaterThan(initialTime)
    })

    it('should update projectile position after update', () => {
      const initialPosition = Float64Array.from(
        simulationStore.state.state.position,
      )
      const deltaTime = 0.016

      update(deltaTime)

      const newPosition = simulationStore.state.state.position

      expect(newPosition).not.toEqual(initialPosition)
    })

    it('should update arm angle during simulation', () => {
      play()
      const initialArmAngle = simulationStore.state.state.armAngle

      update(0.1)

      expect(simulationStore.state.state.armAngle).not.toBe(initialArmAngle)
    })

    it('should update interpolation alpha after update', () => {
      update(0.016)

      expect(simulationStore.state.interpolationAlpha).toBeGreaterThanOrEqual(0)
      expect(simulationStore.state.interpolationAlpha).toBeLessThanOrEqual(1)
    })
  })

  describe('reset', () => {
    it('should reset state to initial values after playing', () => {
      play()
      update(1.0)
      update(1.0)

      reset()

      expect(simulationStore.state.isPlaying).toBe(false)
      expect(simulationStore.state.state.time).toBe(0)
      expect(simulationStore.state.state.armAngle).toBe(-Math.PI / 4)
      expect(simulationStore.state.state.position).toEqual(
        new Float64Array([0, 0, 0]),
      )
    })

    it('should reset interpolation alpha to 0', () => {
      update(0.016)
      expect(simulationStore.state.interpolationAlpha).toBeGreaterThan(0)

      reset()

      expect(simulationStore.state.interpolationAlpha).toBe(0)
    })
  })

  describe('setState', () => {
    it('should allow setting custom projectile position', () => {
      const customPosition = new Float64Array([10, 20, 30])

      setState({
        ...simulationStore.state.state,
        position: customPosition,
      })

      expect(simulationStore.state.state.position).toEqual(customPosition)
    })

    it('should allow setting custom arm angle', () => {
      const customAngle = Math.PI / 2

      setState({
        ...simulationStore.state.state,
        armAngle: customAngle,
      })

      expect(simulationStore.state.state.armAngle).toBe(customAngle)
    })
  })
})
