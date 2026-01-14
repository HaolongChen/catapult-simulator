import { beforeEach, describe, expect, it } from 'vitest'
import {
  pause,
  play,
  reset,
  simulationStore,
  update,
  updateConfig,
} from '../simulation-store'

describe('Simulation Store Evaluation', () => {
  beforeEach(() => {
    reset()
  })

  it('should initialize with correct default state', () => {
    const s = simulationStore.state
    expect(s.isPlaying).toBe(false)
    expect(s.state.time).toBe(0)
    expect(s.state.armAngle).toBeCloseTo(-0.54, 0.01) // Cocked angle for pivotHeight 5, L1 8
  })

  it('should toggle isPlaying state', () => {
    play()
    expect(simulationStore.state.isPlaying).toBe(true)
    pause()
    expect(simulationStore.state.isPlaying).toBe(false)
  })

  it('should propagate config updates and reset state', () => {
    const newL1 = 12
    updateConfig({
      trebuchet: {
        ...simulationStore.state.config.trebuchet,
        longArmLength: newL1,
      },
    })

    expect(simulationStore.state.config.trebuchet.longArmLength).toBe(newL1)
    expect(simulationStore.state.state.time).toBe(0)
    // Position should be updated based on new L1
    const cockedAngle = -Math.asin((5 - 0.5) / 12)
    expect(simulationStore.state.state.armAngle).toBeCloseTo(cockedAngle, 0.001)
  })

  it('should sync physics state to store on update', () => {
    const dt = 0.016 // ~60fps

    update(dt)

    const newState = simulationStore.state.state
    expect(newState.time).toBeGreaterThan(0)
    expect(simulationStore.state.interpolationAlpha).toBeGreaterThanOrEqual(0)
    expect(simulationStore.state.interpolationAlpha).toBeLessThanOrEqual(1)
  })

  it('should maintain state consistency after multiple updates', () => {
    for (let i = 0; i < 60; i++) {
      update(0.016)
    }

    const s = simulationStore.state
    expect(s.state.time).toBeCloseTo(60 * 0.016, 0.001)
    expect(s.forces.total).toBeDefined()
    expect(s.forces.total.length).toBe(3)
  })

  it('should correctly reset to initial conditions', () => {
    update(1.0) // Advance significantly
    expect(simulationStore.state.state.time).toBeGreaterThan(0)

    reset()
    const s = simulationStore.state
    expect(s.state.time).toBe(0)
    expect(s.isPlaying).toBe(false)
    expect(s.interpolationAlpha).toBe(0)
  })

  it('should correctly calculate interpolationAlpha for sub-step frame times', () => {
    const fixedDt = simulationStore.state.config.fixedTimestep
    reset()

    // dt = 0.4 * fixedDt
    update(0.4 * fixedDt)
    expect(simulationStore.state.interpolationAlpha).toBeCloseTo(0.4, 0.01)

    // dt = 1.4 * fixedDt
    reset()
    update(1.4 * fixedDt)
    expect(simulationStore.state.interpolationAlpha).toBeCloseTo(0.4, 0.01)
  })
})
