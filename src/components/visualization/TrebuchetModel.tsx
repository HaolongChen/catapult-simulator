import { useStore } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { simulationStore } from '@/lib/simulation-store'

export function TrebuchetModel() {
  const isPlaying = useStore(simulationStore, (s) => s.isPlaying)
  const {
    armAngle,
    cwAngle,
    position: projPos,
    orientation: projQuat,
  } = useStore(simulationStore, (s) => s.state)

  const {
    longArmLength,
    shortArmLength,
    pivotHeight,
    counterweightRadius,
    slingLength,
  } = useStore(simulationStore, (s) => s.config.trebuchet)
  const { radius: projRadius } = useStore(
    simulationStore,
    (s) => s.config.projectile,
  )

  const armRef = useRef<THREE.Group>(null)
  const cwPivotRef = useRef<THREE.Group>(null)
  const projMeshRef = useRef<THREE.Mesh>(null)
  const [slingFreeEnd, setSlingFreeEnd] = useState(new THREE.Vector3())

  const isReleased = projQuat[0] > 0.5 && isPlaying

  const tipX = Math.cos(armAngle) * longArmLength
  const tipY = pivotHeight + Math.sin(armAngle) * longArmLength
  const safeTipPos = new THREE.Vector3(tipX || 0, tipY || pivotHeight, 0)

  const isValidPos = (p: Float64Array) =>
    !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])
  const safeProjPos = isValidPos(projPos)
    ? projPos
    : new Float64Array([0, 0, 0])

  useEffect(() => {
    if (armRef.current && !isNaN(armAngle)) {
      armRef.current.rotation.z = armAngle
    }
    if (cwPivotRef.current && !isNaN(cwAngle) && !isNaN(armAngle)) {
      cwPivotRef.current.rotation.z = cwAngle - armAngle
    }
    if (projMeshRef.current && !isNaN(projQuat[0])) {
      projMeshRef.current.position.set(
        projPos[0],
        projPos[1] + projRadius,
        projPos[2],
      )
      projMeshRef.current.quaternion.set(
        projQuat[1],
        projQuat[2],
        projQuat[3],
        projQuat[0],
      )
    }
  }, [armAngle, cwAngle, projPos, projQuat, projRadius])

  useFrame((_state, delta) => {
    if (!isReleased) {
      setSlingFreeEnd(
        new THREE.Vector3(projPos[0], projPos[1] + projRadius, projPos[2]),
      )
    } else {
      const target = safeTipPos
        .clone()
        .add(new THREE.Vector3(0, -slingLength, 0))
      slingFreeEnd.lerp(target, Math.min(delta * 5, 1.0))
    }
  })

  const slingPoints = [safeTipPos, slingFreeEnd]

  return (
    <group>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[22, 0.1, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>

      <mesh position={[6, -0.01, 0]} receiveShadow>
        <boxGeometry args={[18, 0.02, 2.5]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>

      {[2.8, -2.8].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, pivotHeight / 2, 0]}>
            <mesh position={[-2.0, 0, 0]} rotation={[0, 0, 0.4]} castShadow>
              <boxGeometry args={[0.8, pivotHeight / Math.cos(0.4), 0.8]} />
              <meshStandardMaterial color="#3d2314" roughness={0.9} />
            </mesh>
            <mesh position={[2.0, 0, 0]} rotation={[0, 0, -0.4]} castShadow>
              <boxGeometry args={[0.8, pivotHeight / Math.cos(0.4), 0.8]} />
              <meshStandardMaterial color="#3d2314" roughness={0.9} />
            </mesh>
          </mesh>
          <mesh position={[0, pivotHeight * 0.7, 0]}>
            <boxGeometry args={[4.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#2d1c10" />
          </mesh>
        </group>
      ))}

      <mesh position={[0, pivotHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 6.5]} />
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
              <boxGeometry args={[0.8, 0.8, 0.8]} />
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
            <boxGeometry args={[3.5, 3.5, 3.5]} />
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
            <cylinderGeometry args={[0.05, 0.05, 1.5]} />
            <meshStandardMaterial color="#333" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {slingPoints.length > 0 && (
        <Line points={slingPoints} color="#8b4513" lineWidth={4} />
      )}

      <mesh ref={projMeshRef} castShadow>
        <sphereGeometry args={[projRadius, 32, 32]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>

      {!isReleased && (
        <mesh
          position={[
            safeProjPos[0],
            safeProjPos[1] + projRadius,
            safeProjPos[2],
          ]}
        >
          <sphereGeometry args={[projRadius * 1.3, 12, 12]} />
          <meshBasicMaterial
            color="#5c361e"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}
    </group>
  )
}
