import { UI_CONSTANTS } from '@/physics/constants'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface AnimationControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  frame: number
  onScrub: (frame: number) => void
  maxFrames: number
  playbackSpeed: number
  onSpeedChange: (speed: number) => void
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2]

export function AnimationControls({
  isPlaying,
  onPlayPause,
  frame,
  onScrub,
  maxFrames,
  playbackSpeed,
  onSpeedChange,
}: AnimationControlsProps) {
  return (
    <div
      className={`fixed bottom-${UI_CONSTANTS.LAYOUT.OFFSET_STANDARD} left-1/2 -translate-x-1/2 bg-[#1e293b]/80 backdrop-blur-md p-${UI_CONSTANTS.LAYOUT.GAP_MEDIUM} rounded-2xl shadow-2xl border border-white/10 flex items-center gap-${UI_CONSTANTS.LAYOUT.GAP_LARGE} z-50 ring-1 ring-white/5 max-md:bottom-4 max-md:left-4 max-md:right-4 max-md:translate-x-0 max-md:p-3 max-md:gap-2 max-md:flex-wrap`}
      style={{
        width: window.innerWidth >= 768 ? UI_CONSTANTS.CONTROLS.WIDTH : 'auto',
      }}
    >
      <button
        onClick={onPlayPause}
        className={`w-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_MAIN} h-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_MAIN} rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 max-md:w-12 max-md:h-12 flex-shrink-0`}
      >
        {isPlaying ? (
          <Pause
            size={UI_CONSTANTS.CONTROLS.ICON_SIZE_LARGE}
            fill="currentColor"
          />
        ) : (
          <Play
            size={UI_CONSTANTS.CONTROLS.ICON_SIZE_LARGE}
            fill="currentColor"
            className={`ml-${UI_CONSTANTS.CONTROLS.PLAY_ICON_OFFSET}`}
          />
        )}
      </button>

      <button
        onClick={() => onScrub(UI_CONSTANTS.CONTROLS.RESET_FRAME)}
        className={`w-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_SECONDARY} h-${UI_CONSTANTS.CONTROLS.BUTTON_SIZE_SECONDARY} rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-slate-200 flex items-center justify-center transition-colors border border-white/10 max-md:w-10 max-md:h-10 flex-shrink-0`}
      >
        <RotateCcw size={UI_CONSTANTS.CONTROLS.ICON_SIZE_MEDIUM} />
      </button>

      <div
        className={`flex-1 flex flex-col gap-${UI_CONSTANTS.LAYOUT.GAP_TINY} max-md:w-full max-md:order-3`}
      >
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Frame {frame.toString().padStart(4, '0')}</span>
          <span>
            {Math.max(0, maxFrames - 1)
              .toString()
              .padStart(4, '0')}
          </span>
        </div>
        <input
          type="range"
          min={UI_CONSTANTS.CONTROLS.RESET_FRAME}
          max={Math.max(0, maxFrames - 1)}
          value={frame}
          onChange={(e) => onScrub(parseInt(e.target.value))}
          className={`w-full h-${UI_CONSTANTS.CONTROLS.PROGRESS_HEIGHT} bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-400 transition-all hover:bg-white/20`}
          style={{
            background: `linear-gradient(90deg, #60a5fa ${(frame / Math.max(1, maxFrames - 1)) * 100}%, rgba(255,255,255,0.1) 0%)`,
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-1 max-md:flex-row max-md:gap-2 flex-shrink-0">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
          Speed
        </span>
        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="bg-white/10 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 border border-white/10 outline-none cursor-pointer hover:bg-white/20 transition-colors"
        >
          {PLAYBACK_SPEEDS.map((s) => (
            <option key={s} value={s} className="bg-slate-800 text-white">
              {s}x
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
