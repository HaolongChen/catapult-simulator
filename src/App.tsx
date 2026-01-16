import { APP_METADATA, UI_CONSTANTS } from "./physics/constants";
import { useTrajectory } from "./hooks/useTrajectory";
import { TrebuchetVisualization } from "./components/TrebuchetVisualization";
import { AnimationControls } from "./components/AnimationControls";
import { DebugOverlay } from "./components/DebugOverlay";

function App() {
  const {
    frameData,
    frame,
    setFrame,
    isPlaying,
    setIsPlaying,
    trajectoryLength,
  } = useTrajectory();

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

      <div
        className={`fixed bottom-${UI_CONSTANTS.LAYOUT.OFFSET_STANDARD} left-${UI_CONSTANTS.LAYOUT.OFFSET_STANDARD} flex flex-col gap-${UI_CONSTANTS.LAYOUT.GAP_SMALL}`}
      >
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
          {APP_METADATA.TITLE}
        </h1>
        <p
          className={`text-[${UI_CONSTANTS.OVERLAY.FONT_SIZE_HEADER}px] font-bold text-slate-400 uppercase tracking-[${UI_CONSTANTS.OVERLAY.TRACKING_WIDE}em]`}
        >
          {APP_METADATA.SUBTITLE}
        </p>
      </div>
    </div>
  );
}

export default App;
