import { useStore } from '@tanstack/react-store'
import { simulationStore } from '@/lib/simulation-store'
import { useRef, useEffect } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

export function Helpers() {
  const velocity = useStore(simulationStore, (s) => s.state.velocity)
  const position = useStore(simulationStore, (s) => s.state.position)
  const pointsRef = useRef<THREE.Vector3[]>([])

  useEffect(() => {
    const speed = Math.sqrt(
      velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2,
    )
    if (speed < 0.1) return

    pointsRef.current = [
      new THREE.Vector3(position[0], position[1], position[2]),
      new THREE.Vector3(
        position[0] + velocity[0] * 0.5,
        position[1] + velocity[1] * 0.5,
        position[2] + velocity[2] * 0.5,
      ),
    ]
  }, [velocity, position])

  const speed = Math.sqrt(
    velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2,
  )

  return speed > 0.1 ? (
    <Line
      points={pointsRef.current}
      color={0x00d4ff}
      lineWidth={2}
      dashed={false}
    />
  ) : null
}
