import { Play, Pause, RotateCcw } from "lucide-react";

interface AnimationControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  frame: number;
  onScrub: (frame: number) => void;
  maxFrames: number;
}

export function AnimationControls({
  isPlaying,
  onPlayPause,
  frame,
  onScrub,
  maxFrames,
}: AnimationControlsProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-6 w-[600px]">
      <button
        onClick={onPlayPause}
        className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
      >
        {isPlaying ? (
          <Pause size={24} fill="white" />
        ) : (
          <Play size={24} fill="white" className="ml-1" />
        )}
      </button>

      <button
        onClick={() => onScrub(0)}
        className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
      >
        <RotateCcw size={20} />
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Frame {frame}</span>
          <span>{maxFrames - 1}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxFrames - 1}
          value={frame}
          onChange={(e) => onScrub(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    </div>
  );
}
