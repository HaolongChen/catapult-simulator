import { APP_METADATA, UI_CONSTANTS } from '@/physics/constants'
import { useState, useEffect } from 'react'
import { AnimationControls } from '@/components/AnimationControls'
import { DebugOverlay } from '@/components/DebugOverlay'
import { TrebuchetVisualization2D } from '@/components/visualization2d'
import { usePhysicsControls } from '@/components/LevaConfigPanel'
import { useRealTimeSimulation } from '@/hooks/useRealTimeSimulation'
import { ExportButton } from '@/components/ExportButton'
import { VectorToggleControls } from '@/components/VectorToggleControls'
import { VISUAL_CONSTANTS } from '@/physics/constants'

function App() {
  const config = usePhysicsControls()
  const { trajectory, isSimulating } = useRealTimeSimulation(config)

  const [frame, setFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [showForces, setShowForces] = useState(true)
  const [showVelocity, setShowVelocity] = useState(true)
  const [showTrajectory, setShowTrajectory] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showTrebuchet, setShowTrebuchet] = useState(true)
  const [showParticles, setShowParticles] = useState(true)

  useEffect(() => {
    if (!isPlaying || trajectory.length === 0) return

    const baseDelay = 1000 / VISUAL_CONSTANTS.PLAYBACK_FPS
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % trajectory.length)
    }, baseDelay / playbackSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, trajectory.length, playbackSpeed])

  const handleExportComplete = () => {
    setFrame(0)
    window.location.reload()
  }

  const frameData = trajectory[frame]
  const trajectoryLength = trajectory.length

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-900 overflow-hidden text-slate-200">
      {isSimulating && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-500/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-sm">Simulating...</span>
        </div>
      )}

      <ExportButton
        trajectory={trajectory}
        disabled={isSimulating}
        onExportComplete={handleExportComplete}
      />
      <VectorToggleControls
        showForces={showForces}
        showVelocity={showVelocity}
        showTrajectory={showTrajectory}
        showGrid={showGrid}
        showTrebuchet={showTrebuchet}
        showParticles={showParticles}
        onToggleForces={() => setShowForces(!showForces)}
        onToggleVelocity={() => setShowVelocity(!showVelocity)}
        onToggleTrajectory={() => setShowTrajectory(!showTrajectory)}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onToggleTrebuchet={() => setShowTrebuchet(!showTrebuchet)}
        onToggleParticles={() => setShowParticles(!showParticles)}
      />
      <TrebuchetVisualization2D
        frameData={frameData}
        showForces={showForces}
        showVelocity={showVelocity}
        showTrajectory={showTrajectory}
        showGrid={showGrid}
        showTrebuchet={showTrebuchet}
        showParticles={showParticles}
      />

      <AnimationControls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        frame={frame}
        onScrub={setFrame}
        maxFrames={trajectoryLength}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
      />

      <DebugOverlay frameData={frameData} />

      <div className="fixed bottom-8 left-20 flex flex-col gap-2 max-md:hidden">
        <h1 className="text-2xl font-black text-slate-100 tracking-tighter">
          {APP_METADATA.TITLE}
        </h1>
        <p
          className="font-bold text-slate-400 uppercase"
          style={{
            fontSize: `${UI_CONSTANTS.OVERLAY.FONT_SIZE_HEADER}px`,
            letterSpacing: `${UI_CONSTANTS.OVERLAY.TRACKING_WIDE}em`,
          }}
        >
          {APP_METADATA.SUBTITLE}
        </p>
      </div>

      {/* Mobile Title */}
      <div className="md:hidden fixed top-4 left-10 right-10 z-50">
        <h1 className="text-lg font-black text-slate-100 tracking-tighter">
          {APP_METADATA.TITLE}
        </h1>
      </div>
    </div>
  )
}

export default App
