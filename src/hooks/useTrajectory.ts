import { useState, useEffect } from 'react'
import { FrameData } from '../physics/types'

export function useTrajectory() {
  const [trajectory, setTrajectory] = useState<FrameData[]>([])
  const [frame, setFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    fetch('/trajectory.json')
      .then((res) => res.json())
      .then(setTrajectory)
  }, [])

  useEffect(() => {
    if (!isPlaying || trajectory.length === 0) return

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % trajectory.length)
    }, 16) // 60fps

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
