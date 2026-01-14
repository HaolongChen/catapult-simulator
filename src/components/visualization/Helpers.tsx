import { useStore } from '@tanstack/react-store'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { simulationStore } from '@/lib/simulation-store'

export function Helpers() {
  const velocity = useStore(simulationStore, (s) => s.state.velocity)
  const position = useStore(simulationStore, (s) => s.state.position)

  const speed = Math.sqrt(
    velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2,
  )

  const points =
    speed > 0.1
      ? [
          new THREE.Vector3(position[0], position[1], position[2]),
          new THREE.Vector3(
            position[0] + velocity[0] * 0.5,
            position[1] + velocity[1] * 0.5,
            position[2] + velocity[2] * 0.5,
          ),
        ]
      : []

  if (points.length < 2) return null

  return <Line points={points} color={0x00d4ff} lineWidth={2} dashed={false} />
}
