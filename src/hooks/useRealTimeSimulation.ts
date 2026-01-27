import { useState, useEffect } from 'react'
import { CatapultSimulation } from '@/physics/simulation'
import { createInitialState } from '@/physics/config'
import type { FrameData, SimulationConfig } from '@/physics/types'
import { UI_CONSTANTS } from '@/physics/constants'

interface UseRealTimeSimulationResult {
  trajectory: FrameData[]
  isSimulating: boolean
  error: string | null
}

export function useRealTimeSimulation(
  config: SimulationConfig,
): UseRealTimeSimulationResult {
  const [trajectory, setTrajectory] = useState<FrameData[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce config changes to avoid excessive re-simulation
  const debouncedConfig = useDebounce(config, 300)

  useEffect(() => {
    setIsSimulating(true)
    setError(null)

    try {
      const initialState = createInitialState(debouncedConfig)
      const sim = new CatapultSimulation(initialState, debouncedConfig)
      const frames: FrameData[] = []

      // Add initial frame
      frames.push(sim.exportFrameData())

      // Run simulation loop
      let stuckFrames = 0
      let lastTime = 0

      for (let i = 0; i < UI_CONSTANTS.CONTROLS.DURATION; i++) {
        sim.update(0.01)
        const frameData = sim.exportFrameData()
        frames.push(frameData)

        // Detect stuck simulation
        if (frameData.time === lastTime) {
          stuckFrames++
          if (stuckFrames >= 10) {
            console.warn(
              `Simulation stuck at t=${frameData.time.toFixed(2)}s (frame ${i})`,
            )
            break
          }
        } else {
          stuckFrames = 0
          lastTime = frameData.time
        }
      }

      setTrajectory(frames)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Simulation error:', err)
    } finally {
      setIsSimulating(false)
    }
  }, [debouncedConfig])

  return { trajectory, isSimulating, error }
}

// Debounce hook to prevent excessive re-computation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
