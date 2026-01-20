import { UI_CONSTANTS } from '@/physics/constants'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface AnimationControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  frame: number
  onScrub: (frame: number) => void
  maxFrames: number
}

export function AnimationControls({
  isPlaying,
  onPlayPause,
  frame,
  onScrub,
  maxFrames,
}: AnimationControlsProps) {
  return (
    <div
      className={`fixed bottom-${UI_CONSTANTS.LAYOUT.OFFSET_STANDARD} left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md p-${UI_CONSTANTS.LAYOUT.GAP_MEDIUM} rounded-2xl shadow-2xl border border-white/20 flex items-center gap-${UI_CONSTANTS.LAYOUT.GAP_LARGE}`}
      style={{ width: UI_CONSTANTS.CONTROLS.WIDTH }}
    >
      <button
        onClick={onPlayPause}
        className={`w-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_MAIN} h-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_MAIN} rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30`}
      >
        {isPlaying ? (
          <Pause size={UI_CONSTANTS.CONTROLS.ICON_SIZE_LARGE} fill="white" />
        ) : (
          <Play
            size={UI_CONSTANTS.CONTROLS.ICON_SIZE_LARGE}
            fill="white"
            className={`ml-${UI_CONSTANTS.CONTROLS.PLAY_ICON_OFFSET}`}
          />
        )}
      </button>

      <button
        onClick={() => onScrub(UI_CONSTANTS.CONTROLS.RESET_FRAME)}
        className={`w-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_SECONDARY} h-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_SECONDARY} rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors`}
      >
        <RotateCcw size={UI_CONSTANTS.CONTROLS.ICON_SIZE_MEDIUM} />
      </button>

      <div
        className={`flex-1 flex flex-col gap-${UI_CONSTANTS.LAYOUT.GAP_TINY}`}
      >
        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Frame {frame}</span>
          <span>{maxFrames - UI_CONSTANTS.LAYOUT.GAP_TINY}</span>
        </div>
        <input
          type="range"
          min={UI_CONSTANTS.CONTROLS.RESET_FRAME}
          max={maxFrames - UI_CONSTANTS.LAYOUT.GAP_TINY}
          value={frame}
          onChange={(e) => onScrub(parseInt(e.target.value))}
          className={`w-full h-${UI_CONSTANTS.CONTROLS.PROGRESS_HEIGHT} bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600`}
        />
      </div>
    </div>
  )
}
