import { UI_CONSTANTS, VISUAL_CONSTANTS } from '@/physics/constants'
import type { FrameData } from '@/physics/types'

export function DebugOverlay({ frameData }: { frameData?: FrameData }) {
  if (!frameData) return null

  const { time, projectile, phase, constraints } = frameData

  return (
    <div
      className={`fixed top-${UI_CONSTANTS.LAYOUT.OFFSET_STANDARD} left-${UI_CONSTANTS.LAYOUT.OFFSET_STANDARD} bg-slate-900/90 backdrop-blur-lg p-${UI_CONSTANTS.LAYOUT.GAP_LARGE} rounded-2xl shadow-2xl border border-white/10 text-white w-${UI_CONSTANTS.OVERLAY.WIDTH} font-mono text-sm`}
    >
      <div
        className={`flex justify-between items-center mb-${UI_CONSTANTS.LAYOUT.GAP_LARGE}`}
      >
        <h2 className="text-blue-400 font-bold text-lg tracking-tight">
          SIM_STATUS
        </h2>
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold border border-blue-500/30 uppercase">
          {phase.replace('_', ' ')}
        </span>
      </div>

      <div className={`space-y-${UI_CONSTANTS.LAYOUT.GAP_MEDIUM}`}>
        <div className="flex justify-between border-b border-white/5 pb-2">
          <span
            className={`text-slate-400 uppercase text-[${UI_CONSTANTS.OVERLAY.FONT_SIZE_HEADER}px] font-bold`}
          >
            Elapsed Time
          </span>
          <span className="text-blue-100">
            {time.toFixed(UI_CONSTANTS.OVERLAY.PRECISION_TIME)}s
          </span>
        </div>

        <div className={`space-y-${UI_CONSTANTS.LAYOUT.GAP_SMALL}`}>
          <span
            className={`text-slate-400 uppercase text-[${UI_CONSTANTS.OVERLAY.FONT_SIZE_HEADER}px] font-bold`}
          >
            Projectile Position
          </span>
          <div
            className={`grid grid-cols-${UI_CONSTANTS.OVERLAY.GRID_COLS} gap-${UI_CONSTANTS.LAYOUT.GAP_SMALL}`}
          >
            {projectile.position.map((v, i) => (
              <div
                key={i}
                className={`bg-white/5 p-${UI_CONSTANTS.OVERLAY.PADDING_ITEM} rounded text-center`}
              >
                <span
                  className={`block text-[${UI_CONSTANTS.OVERLAY.FONT_SIZE_LABEL}px] text-slate-500 font-bold`}
                >
                  {['X', 'Y', 'Z'][i]}
                </span>
                <span className={v < 0 ? 'text-red-400' : 'text-blue-100'}>
                  {v.toFixed(UI_CONSTANTS.OVERLAY.PRECISION_COORDS)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`space-y-${UI_CONSTANTS.LAYOUT.GAP_SMALL} pt-2`}>
          <span
            className={`text-slate-400 uppercase text-[${UI_CONSTANTS.OVERLAY.FONT_SIZE_HEADER}px] font-bold`}
          >
            Sling Constraint
          </span>
          <div className={`space-y-${UI_CONSTANTS.CONTROLS.PLAY_ICON_OFFSET}`}>
            <div className="flex justify-between text-xs">
              <span>Length</span>
              <span className="text-blue-100">
                {constraints.slingLength.current.toFixed(
                  UI_CONSTANTS.OVERLAY.PRECISION_TIME,
                )}
                m
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Violation</span>
              <span
                className={
                  Math.abs(constraints.slingLength.violation) >
                  VISUAL_CONSTANTS.SLING_VIOLATION_THRESHOLD
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }
              >
                {(
                  constraints.slingLength.violation *
                  UI_CONSTANTS.OVERLAY.UNIT_MILLIMETERS
                ).toFixed(UI_CONSTANTS.OVERLAY.PRECISION_VIOLATION)}
                mm
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
