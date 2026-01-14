import { useStore } from '@tanstack/react-store'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { simulationStore } from '@/lib/simulation-store'

export function Helpers() {
  const { position, velocity } = useStore(simulationStore, (s) => s.state)
  const { drag, magnus, gravity, tension } = useStore(
    simulationStore,
    (s) => s.forces,
  )
  const isPlaying = useStore(simulationStore, (s) => s.isPlaying)

  if (!isPlaying) return null

  const pos = new THREE.Vector3(position[0], position[1] + 0.35, position[2])

  const createArrow = (force: Float64Array, color: number, scale = 0.05) => {
    if (
      Math.abs(force[0]) < 1e-6 &&
      Math.abs(force[1]) < 1e-6 &&
      Math.abs(force[2]) < 1e-6
    )
      return null
    const dir = new THREE.Vector3(force[0], force[1], force[2]).multiplyScalar(
      scale,
    )
    const points = [pos, pos.clone().add(dir)]
    return (
      <Line
        key={color}
        points={points}
        color={color}
        lineWidth={2}
        dashed={false}
      />
    )
  }

  const velDir = new THREE.Vector3(
    velocity[0],
    velocity[1],
    velocity[2],
  ).multiplyScalar(0.2)
  const velPoints = [pos, pos.clone().add(velDir)]

  return (
    <group>
      <Line points={velPoints} color={0x00d4ff} lineWidth={3} dashed={false} />
      {createArrow(drag, 0xff4444, 0.1)}
      {createArrow(magnus, 0x4444ff, 0.1)}
      {createArrow(gravity, 0x44ff44, 0.05)}
      {createArrow(tension, 0xffff44, 0.00001)}
    </group>
  )
}
