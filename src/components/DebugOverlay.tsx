import type { FrameData } from "../physics/types";

export function DebugOverlay({ frameData }: { frameData?: FrameData }) {
  if (!frameData) return null;

  const { time, projectile, phase, constraints } = frameData;

  return (
    <div className="fixed top-8 left-8 bg-slate-900/90 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-white/10 text-white w-80 font-mono text-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-blue-400 font-bold text-lg tracking-tight">
          SIM_STATUS
        </h2>
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold border border-blue-500/30 uppercase">
          {phase.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between border-b border-white/5 pb-2">
          <span className="text-slate-400 uppercase text-[10px] font-bold">
            Elapsed Time
          </span>
          <span className="text-blue-100">{time.toFixed(3)}s</span>
        </div>

        <div className="space-y-2">
          <span className="text-slate-400 uppercase text-[10px] font-bold">
            Projectile Position
          </span>
          <div className="grid grid-cols-3 gap-2">
            {projectile.position.map((v, i) => (
              <div key={i} className="bg-white/5 p-2 rounded text-center">
                <span className="block text-[8px] text-slate-500 font-bold">
                  {["X", "Y", "Z"][i]}
                </span>
                <span className={v < 0 ? "text-red-400" : "text-blue-100"}>
                  {v.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <span className="text-slate-400 uppercase text-[10px] font-bold">
            Sling Constraint
          </span>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Length</span>
              <span className="text-blue-100">
                {constraints.slingLength.current.toFixed(3)}m
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Violation</span>
              <span
                className={
                  Math.abs(constraints.slingLength.violation) > 0.01
                    ? "text-red-400"
                    : "text-emerald-400"
                }
              >
                {(constraints.slingLength.violation * 1000).toFixed(2)}mm
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
