import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { TrebuchetVisualization } from '../components/TrebuchetVisualization'
import { AnimationControls } from '../components/AnimationControls'
import { DebugOverlay } from '../components/DebugOverlay'
import { getTrajectory } from '../lib/trajectory'

// Loader runs on the server (or calls the server function)
export const Route = createFileRoute('/')({
  loader: async () => {
    const trajectory = await getTrajectory()
    return { trajectory }
  },
  component: Home,
})

function Home() {
  const { trajectory } = Route.useLoaderData()
  const [frame, setFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying || !trajectory || trajectory.length === 0) return

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % trajectory.length)
    }, 16) // 60fps

    return () => clearInterval(interval)
  }, [isPlaying, trajectory])

  const frameData = trajectory ? trajectory[frame] : undefined

  return (
    <div className="w-screen h-screen bg-slate-100 relative overflow-hidden">
      <TrebuchetVisualization frameData={frameData} />

      <AnimationControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        frame={frame}
        onScrub={setFrame}
        maxFrames={trajectory ? trajectory.length : 0}
      />

      <DebugOverlay frameData={frameData} />

      <div className="fixed bottom-8 left-8 flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
          TREBUCHET_V1.0
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          High Fidelity Physics Simulator
        </p>
      </div>
    </div>
  )
}
