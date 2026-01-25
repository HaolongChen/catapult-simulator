import { APP_METADATA, UI_CONSTANTS } from '@/physics/constants'
import { useTrajectory } from '@/hooks/useTrajectory'
import { AnimationControls } from '@/components/AnimationControls'
import { DebugOverlay } from '@/components/DebugOverlay'
import { TrebuchetVisualization2D } from '@/components/visualization2d'

function App() {
  const {
    frameData,
    frame,
    setFrame,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    trajectoryLength,
  } = useTrajectory()

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-900 overflow-hidden text-slate-200">
      <TrebuchetVisualization2D frameData={frameData} />

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
