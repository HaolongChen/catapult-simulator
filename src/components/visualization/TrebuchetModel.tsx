import { useStore } from '@tanstack/react-store'
import { simulationStore } from '@/lib/simulation-store'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export function TrebuchetModel() {
  const armAngle = useStore(simulationStore, (s) => s.state.armAngle)
  const armRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (armRef.current) {
      armRef.current.rotation.z = armAngle
    }
  }, [armAngle])

  return (
    <group>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2, 3]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
      </mesh>

      <group ref={armRef}>
        <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 10]} />
          <meshStandardMaterial color="#8b4513" roughness={0.7} />
        </mesh>

        <mesh position={[5, 1.5, 0]} castShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#2f4f4f" roughness={0.6} />
        </mesh>

        <mesh position={[-4, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#8b4513" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
