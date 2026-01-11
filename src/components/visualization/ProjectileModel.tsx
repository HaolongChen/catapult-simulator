import { useStore } from '@tanstack/react-store'
import { simulationStore } from '@/lib/simulation-store'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export function ProjectileModel() {
  const position = useStore(simulationStore, (s) => s.state.position)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position[0], position[1], position[2])
    }
  }, [position])

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial color="#808080" roughness={0.5} metalness={0.2} />
    </mesh>
  )
}
