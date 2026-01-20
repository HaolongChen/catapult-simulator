import { UI_CONSTANTS, VISUAL_CONSTANTS } from '@/physics/constants'
import { useState, useEffect } from 'react'
import type { FrameData } from '@/physics/types'

export function useTrajectory() {
  const [trajectory, setTrajectory] = useState<FrameData[]>([])
  const [frame, setFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    fetch('/trajectory.json')
      .then((res) => res.json())
      .then(setTrajectory)
      .catch((err) => console.error('Failed to load trajectory:', err))
  }, [])

  useEffect(() => {
    if (!isPlaying || trajectory.length === 0) return

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % trajectory.length)
    }, UI_CONSTANTS.CONTROLS.FPS_CONVERSION / VISUAL_CONSTANTS.PLAYBACK_FPS)

    return () => clearInterval(interval)
  }, [isPlaying, trajectory.length])

  return {
    frameData: trajectory[frame],
    frame,
    setFrame,
    isPlaying,
    setIsPlaying,
    trajectoryLength: trajectory.length,
  }
}
