import { useStore } from '@tanstack/react-store'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { simulationStore } from '@/lib/simulation-store'

export function TrebuchetModel() {
  const {
    armAngle,
    cwAngle,
    position: projPos,
    orientation,
  } = useStore(simulationStore, (s) => s.state)
  const { longArmLength, shortArmLength, pivotHeight, counterweightRadius } =
    useStore(simulationStore, (s) => s.config.trebuchet)

  const armRef = useRef<THREE.Group>(null)
  const cwPivotRef = useRef<THREE.Group>(null)

  const isReleased = orientation[0] > 0.5

  useEffect(() => {
    if (armRef.current && !isNaN(armAngle)) {
      armRef.current.rotation.z = armAngle
    }
    if (cwPivotRef.current && !isNaN(cwAngle) && !isNaN(armAngle)) {
      cwPivotRef.current.rotation.z = cwAngle - armAngle
    }
  }, [armAngle, cwAngle])

  const isValidPos = (p: Float64Array) =>
    !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])
  const safeProjPos = isValidPos(projPos)
    ? projPos
    : new Float64Array([0, 0, 0])

  const tipX = Math.cos(armAngle) * longArmLength
  const tipY = pivotHeight + Math.sin(armAngle) * longArmLength
  const safeTipPos =
    isNaN(tipX) || isNaN(tipY)
      ? new THREE.Vector3(0, pivotHeight, 0)
      : new THREE.Vector3(tipX, tipY, 0)

  const slingPoints = isReleased
    ? []
    : [
        safeTipPos,
        new THREE.Vector3(safeProjPos[0], safeProjPos[1], safeProjPos[2]),
      ]

  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[22, 0.1, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>

      {[2.8, -2.8].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh
            position={[-2.5, pivotHeight / 2, 0]}
            rotation={[0, 0, 0.4]}
            castShadow
          >
            <boxGeometry args={[1.0, pivotHeight + 4, 1.0]} />
            <meshStandardMaterial color="#3d2314" roughness={0.9} />
          </mesh>
          <mesh
            position={[2.5, pivotHeight / 2, 0]}
            rotation={[0, 0, -0.4]}
            castShadow
          >
            <boxGeometry args={[1.0, pivotHeight + 4, 1.0]} />
            <meshStandardMaterial color="#3d2314" roughness={0.9} />
          </mesh>
          <mesh position={[0, pivotHeight * 0.8, 0]}>
            <boxGeometry args={[6, 0.8, 0.8]} />
            <meshStandardMaterial color="#2d1c10" />
          </mesh>
        </group>
      ))}

      <mesh position={[0, pivotHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 6.5]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>

      <group ref={armRef} position={[0, pivotHeight, 0]}>
        <group position={[longArmLength / 2 - shortArmLength / 2, 0, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[longArmLength + shortArmLength, 0.3, 0.6]} />
            <meshStandardMaterial color="#5c361e" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.4, 0]} castShadow>
            <boxGeometry args={[longArmLength + shortArmLength, 0.3, 0.6]} />
            <meshStandardMaterial color="#5c361e" roughness={0.8} />
          </mesh>
          {[-shortArmLength, 0, longArmLength].map((x) => (
            <mesh
              key={x}
              position={[x - (longArmLength / 2 - shortArmLength / 2), 0, 0]}
            >
              <boxGeometry args={[1.0, 1.0, 1.0]} />
              <meshStandardMaterial color="#2d1c10" />
            </mesh>
          ))}
        </group>

        <group position={[-shortArmLength, 0, 0]} ref={cwPivotRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1.5]} />
            <meshStandardMaterial color="#111" metalness={0.8} />
          </mesh>

          <mesh position={[0, -counterweightRadius, 0]} castShadow>
            <boxGeometry args={[4, 4, 4]} />
            <meshStandardMaterial
              color="#222"
              roughness={0.4}
              metalness={0.4}
            />
          </mesh>
          <mesh position={[0, -counterweightRadius / 2, 0]}>
            <cylinderGeometry args={[0.25, 0.25, counterweightRadius]} />
            <meshStandardMaterial color="#000" metalness={0.6} />
          </mesh>
        </group>

        <group position={[longArmLength, 0, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 3]}>
            <cylinderGeometry args={[0.08, 0.08, 1.5]} />
            <meshStandardMaterial color="#333" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {!isReleased && slingPoints.length > 0 && (
        <Line points={slingPoints} color="#5c361e" lineWidth={4} />
      )}

      <mesh
        position={[safeProjPos[0], safeProjPos[1], safeProjPos[2]]}
        castShadow
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#333" roughness={0.5} />
      </mesh>

      {!isReleased && (
        <mesh position={[safeProjPos[0], safeProjPos[1], safeProjPos[2]]}>
          <sphereGeometry args={[0.45, 12, 12]} />
          <meshBasicMaterial
            color="#5c361e"
            transparent
            opacity={0.4}
            wireframe
          />
        </mesh>
      )}

      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[18, 0.02, 2.5]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
    </group>
  )
}
