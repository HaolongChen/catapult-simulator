import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { useStore } from '@tanstack/react-store'
import { Suspense, useEffect } from 'react'
import { TrebuchetModel } from './TrebuchetModel'
import { Helpers } from './Helpers'
import { SimulationControls } from './SimulationControls'
import { pause, play, simulationStore, update } from '@/lib/simulation-store'

function SimulationLoop() {
  const isPlaying = useStore(simulationStore, (s) => s.isPlaying)

  useFrame((_state, delta) => {
    if (isPlaying) {
      update(Math.min(delta, 0.033))
    }
  })

  return null
}

export function Scene() {
  const isPlaying = useStore(simulationStore, (s) => s.isPlaying)

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
    <div className="w-full h-screen relative bg-slate-950">
      <Canvas
        shadows
        camera={{ position: [25, 20, 25], fov: 40 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#020617')
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            console.warn('WebGL context lost. Attempting to restore...')
          })
        }}
      >
        <Suspense fallback={null}>
          <SimulationLoop />
          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.1}
          />
          <Environment preset="forest" background blur={0.6} />

          <ContactShadows
            opacity={0.7}
            scale={60}
            blur={1}
            far={15}
            resolution={1024}
            color="#1a1105"
          />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[20, 40, 10]}
            intensity={1.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={100}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />

          <TrebuchetModel />
          <Helpers />

          <gridHelper
            args={[100, 50, 0x444444, 0x222222]}
            position={[0, 0.01, 0]}
          />
        </Suspense>
      </Canvas>
      <SimulationControls />
    </div>
  )
}
