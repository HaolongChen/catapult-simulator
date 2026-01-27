interface VectorToggleControlsProps {
  showForces: boolean
  showVelocity: boolean
  showTrajectory: boolean
  showGrid: boolean
  showTrebuchet: boolean
  showParticles: boolean
  onToggleForces: () => void
  onToggleVelocity: () => void
  onToggleTrajectory: () => void
  onToggleGrid: () => void
  onToggleTrebuchet: () => void
  onToggleParticles: () => void
}

export function VectorToggleControls({
  showForces,
  showVelocity,
  showTrajectory,
  showGrid,
  showTrebuchet,
  showParticles,
  onToggleForces,
  onToggleVelocity,
  onToggleTrajectory,
  onToggleGrid,
  onToggleTrebuchet,
  onToggleParticles,
}: VectorToggleControlsProps) {
  return (
    <div className="fixed top-4 right-4 flex flex-col gap-2 z-40">
      <button
        onClick={onToggleTrebuchet}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          showTrebuchet
            ? 'bg-slate-500 hover:bg-slate-600 text-white shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title="Toggle trebuchet structure"
      >
        Trebuchet
      </button>
      <button
        onClick={onToggleForces}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          showForces
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title="Toggle force vectors"
      >
        Force Vectors
      </button>
      <button
        onClick={onToggleVelocity}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          showVelocity
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title="Toggle velocity vectors"
      >
        Velocity Vector
      </button>
      <button
        onClick={onToggleTrajectory}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          showTrajectory
            ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title="Toggle trajectory path"
      >
        Trajectory Path
      </button>
      <button
        onClick={onToggleParticles}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          showParticles
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title="Toggle impact particles"
      >
        Particles
      </button>
      <button
        onClick={onToggleGrid}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          showGrid
            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title="Toggle grid and origin"
      >
        Grid & Origin
      </button>
    </div>
  )
}
