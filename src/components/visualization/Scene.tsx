import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { useStore } from '@tanstack/react-store'
import { simulationStore, play, pause, update } from '@/lib/simulation-store'
import { TrebuchetModel } from './TrebuchetModel'
import { ProjectileModel } from './ProjectileModel'
import { Helpers } from './Helpers'
import { useEffect } from 'react'

export function Scene() {
  const isPlaying = useStore(simulationStore, (s) => s.isPlaying)

  useFrame((_state, delta) => {
    if (isPlaying) {
      update(delta)
    }
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isPlaying) {
          pause()
        } else {
          play()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying])

  return (
    <div className="w-full h-screen">
      <Canvas shadows camera={{ position: [15, 10, 15], fov: 50 }}>
        <OrbitControls makeDefault />
        <Environment
          preset="studio"
          environmentIntensity={2.0}
          background={false}
        />
        <ContactShadows
          opacity={0.5}
          scale={30}
          blur={1}
          far={20}
          resolution={256}
          color="#000000"
        />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <TrebuchetModel />
        <ProjectileModel />
        <Helpers />
      </Canvas>
    </div>
  )
}
