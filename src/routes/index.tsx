import { createFileRoute } from '@tanstack/react-router'
import { useTrajectory } from '../hooks/useTrajectory'
import { TrebuchetVisualization } from '../components/TrebuchetVisualization'
import { AnimationControls } from '../components/AnimationControls'
import { DebugOverlay } from '../components/DebugOverlay'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const {
    frameData,
    frame,
    setFrame,
    isPlaying,
    setIsPlaying,
    trajectoryLength,
  } = useTrajectory()

  return (
    <div className="w-screen h-screen bg-slate-100 relative overflow-hidden">
      <TrebuchetVisualization frameData={frameData} />

      <AnimationControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        frame={frame}
        onScrub={setFrame}
        maxFrames={trajectoryLength}
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
