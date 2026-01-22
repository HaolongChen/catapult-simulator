import React, { useState } from 'react'
import type { FrameData } from '@/physics/types'
import { createConfig } from '@/physics/config'
import {
  ChevronRight,
  Rocket,
  Move3D,
  Weight,
  FolderSymlink,
  Activity,
  Gauge,
  CloudRain,
  LayoutDashboard,
  Settings,
  X,
  Menu,
} from 'lucide-react'

const HEADER_FONT = 'Orbitron, sans-serif'
const VALUE_FONT = 'Fira Mono, Menlo, monospace'

const SECTION_META = [
  {
    key: 'system',
    label: 'System Status',
    icon: <LayoutDashboard size={18} strokeWidth={2.3} />,
    accent: '#fff',
  },
  {
    key: 'projectile',
    label: 'Projectile',
    icon: <Rocket size={18} strokeWidth={2.3} />,
    accent: '#2fd785',
  },
  {
    key: 'arm',
    label: 'Arm & Mechanism',
    icon: <Move3D size={18} strokeWidth={2.3} />,
    accent: '#3cabfd',
  },
  {
    key: 'counterweight',
    label: 'Counterweight',
    icon: <Weight size={18} strokeWidth={2.3} />,
    accent: '#9ca3af',
  },
  {
    key: 'sling',
    label: 'Sling & SlingBag',
    icon: <FolderSymlink size={18} strokeWidth={2.3} />,
    accent: '#fad15b',
  },
  {
    key: 'forces',
    label: 'Forces',
    icon: <Activity size={18} strokeWidth={2.3} />,
    accent: '#ff6359',
  },
  {
    key: 'environment',
    label: 'Environment',
    icon: <CloudRain size={18} strokeWidth={2.3} />,
    accent: '#60a5fa',
  },
  {
    key: 'constraints',
    label: 'Constraints & Stability',
    icon: <Gauge size={18} strokeWidth={2.3} />,
    accent: '#a855f7',
  },
  {
    key: 'config',
    label: 'Engine Config',
    icon: <Settings size={18} strokeWidth={2.3} />,
    accent: '#ec4899',
  },
]

function fmt(n: number, digits = 3) {
  if (n === undefined || n === null || isNaN(n)) return '0.000'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtVec(
  v: [number, number, number] | number[] | Float64Array | undefined,
  sum: boolean = false,
  digits = 3,
) {
  if (!v) return 'X: 0.000 Y: 0.000 Z: 0.000'
  if (sum) {
    const s = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    return `X:${fmt(v[0], digits)} Y:${fmt(v[1], digits)} Z:${fmt(v[2], digits)} [∑ ${fmt(s, digits)}]`
  }
  return `X:${fmt(v[0], digits)} Y:${fmt(v[1], digits)} Z:${fmt(v[2], digits)}`
}

const TelemetrySection: React.FC<{
  title: string
  icon: React.ReactNode
  accent: string
  children: React.ReactNode
  defaultOpen?: boolean
}> = ({ title, icon, accent, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section
      className="mb-2 bg-black/20 rounded-lg border-l-4 px-4 pb-2 pt-2 shadow-md transition-all duration-300"
      style={
        {
          borderLeftColor: accent,
          '--accent': accent,
        } as React.CSSProperties
      }
    >
      <button
        className="flex items-center w-full group select-none outline-none"
        style={{ fontFamily: HEADER_FONT, color: accent }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mr-3 opacity-80 group-hover:opacity-100 transition-opacity">
          {icon}
        </span>
        <span className="uppercase tracking-wider font-bold text-[0.7rem] flex-1 text-left text-white/90">
          {title}
        </span>
        <span
          className={`transition-transform duration-300 ${open ? 'rotate-90' : ''} ml-2 flex-none opacity-40 group-hover:opacity-100`}
        >
          <ChevronRight size={14} strokeWidth={3} />
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </section>
  )
}

const TelemetryTable: React.FC<{
  data: { label: string; value: string | number | React.ReactNode }[]
}> = ({ data }) => (
  <div className="grid grid-cols-[110px_1fr] gap-y-1.5 pb-2 max-md:grid-cols-[90px_1fr]">
    {data.map((item) => (
      <React.Fragment key={item.label}>
        <div
          className="text-[0.65rem] font-bold uppercase text-slate-500 pr-2 self-center max-md:text-[0.6rem]"
          style={{ fontFamily: HEADER_FONT }}
        >
          {item.label}
        </div>
        <div
          className="text-[0.75rem] font-mono text-slate-200 break-all leading-tight max-md:text-[0.65rem]"
          style={{
            fontFamily: VALUE_FONT,
            letterSpacing: '-0.02em',
          }}
        >
          {item.value}
        </div>
      </React.Fragment>
    ))}
  </div>
)

export const DebugOverlay: React.FC<{
  frameData?: FrameData
}> = ({ frameData }) => {
  const config = createConfig()
  const [isOpen, setIsOpen] = useState(false)

  if (!frameData) return null

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-[110] w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`fixed top-0 left-0 h-full w-[480px] z-[100] backdrop-blur-xl border-r border-white/10 shadow-[10px_0_40px_rgba(0,0,0,0.5)] overflow-y-auto custom-scrollbar transition-transform duration-300 max-md:w-full ${isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
        style={{
          background:
            'linear-gradient(165deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        }}
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-end max-md:p-4 max-md:pt-16">
          <div>
            <h2
              className="text-xl font-black text-white tracking-tighter uppercase italic max-md:text-lg"
              style={{ fontFamily: HEADER_FONT }}
            >
              Telemetry
            </h2>
            <p className="text-[0.6rem] text-slate-500 font-bold tracking-[0.3em] uppercase max-md:text-[0.55rem]">
              19-DOF High Fidelity Stream
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[0.7rem] font-mono text-blue-400 max-md:text-[0.6rem]">
              FRAME_{frameData.time.toFixed(2).replace('.', '')}
            </span>
          </div>
        </div>

        <div className="p-4 max-md:p-3 max-md:pb-24">
          <TelemetrySection
            title="System Status"
            icon={SECTION_META[0].icon}
            accent={SECTION_META[0].accent}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Phase',
                  value: (
                    <span
                      className={`px-2 py-0.5 rounded text-[0.65rem] font-black uppercase ${
                        frameData.phase === 'released'
                          ? 'bg-green-500/20 text-green-400'
                          : frameData.phase === 'swinging'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {frameData.phase}
                    </span>
                  ),
                },
                { label: 'Timestamp', value: `${fmt(frameData.time, 4)}s` },
                {
                  label: 'Delta Time',
                  value: `${fmt(frameData.timestep, 5)}s`,
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Projectile"
            icon={SECTION_META[1].icon}
            accent={SECTION_META[1].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'World Pos',
                  value: fmtVec(frameData.projectile.position),
                },
                {
                  label: 'Linear Vel',
                  value: fmtVec(frameData.projectile.velocity, true),
                },
                {
                  label: 'Angular Vel',
                  value: fmtVec(frameData.projectile.angularVelocity, true),
                },
                {
                  label: 'Radius',
                  value: `${fmt(frameData.projectile.radius)}m`,
                },
                {
                  label: 'Orientation',
                  value: `Q[${Array.from(frameData.projectile.orientation)
                    .map((v) => fmt(v, 2))
                    .join(', ')}]`,
                },
                {
                  label: 'B-Box Min',
                  value: fmtVec(frameData.projectile.boundingBox.min),
                },
                {
                  label: 'B-Box Max',
                  value: fmtVec(frameData.projectile.boundingBox.max),
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Arm & Mechanism"
            icon={SECTION_META[2].icon}
            accent={SECTION_META[2].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Theta (θ)',
                  value: `${fmt((frameData.arm.angle * 180) / Math.PI, 2)}°`,
                },
                {
                  label: 'ω (Angular V)',
                  value: `${fmt(frameData.arm.angularVelocity, 4)} rad/s`,
                },
                { label: 'Pivot G-Pos', value: fmtVec(frameData.arm.pivot) },
                { label: 'Long Tip', value: fmtVec(frameData.arm.longArmTip) },
                {
                  label: 'Short Tip',
                  value: fmtVec(frameData.arm.shortArmTip),
                },
                {
                  label: 'Arm Ratio',
                  value: `${frameData.arm.longArmLength}:${frameData.arm.shortArmLength}`,
                },
                {
                  label: 'B-Box Min',
                  value: fmtVec(frameData.arm.boundingBox.min),
                },
                {
                  label: 'B-Box Max',
                  value: fmtVec(frameData.arm.boundingBox.max),
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Counterweight"
            icon={SECTION_META[3].icon}
            accent={SECTION_META[3].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Angle (φ)',
                  value: `${fmt((frameData.counterweight.angle * 180) / Math.PI, 2)}°`,
                },
                {
                  label: 'ω (Angular V)',
                  value: `${fmt(frameData.counterweight.angularVelocity, 4)} rad/s`,
                },
                {
                  label: 'Position',
                  value: fmtVec(frameData.counterweight.position),
                },
                {
                  label: 'Radius',
                  value: `${fmt(frameData.counterweight.radius)}m`,
                },
                {
                  label: 'Attachment',
                  value: fmtVec(frameData.counterweight.attachmentPoint),
                },
                {
                  label: 'B-Box Min',
                  value: fmtVec(frameData.counterweight.boundingBox.min),
                },
                {
                  label: 'B-Box Max',
                  value: fmtVec(frameData.counterweight.boundingBox.max),
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Sling & SlingBag"
            icon={SECTION_META[4].icon}
            accent={SECTION_META[4].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Attached',
                  value: (
                    <span
                      className={`px-2 py-0.5 rounded text-[0.6rem] font-black uppercase ${
                        frameData.sling.isAttached
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {frameData.sling.isAttached ? 'YES' : 'NO'}
                    </span>
                  ),
                },
                {
                  label: 'Length',
                  value: `${fmt(frameData.sling.length)}m`,
                },
                {
                  label: 'Tension Vec',
                  value: fmtVec(frameData.sling.tensionVector, true),
                },
                {
                  label: 'Tension',
                  value: `${fmt(frameData.sling.tension, 2)} N`,
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Forces"
            icon={SECTION_META[5].icon}
            accent={SECTION_META[5].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Gravity',
                  value: fmtVec(frameData.forces.projectile.gravity, true),
                },
                {
                  label: 'Drag',
                  value: fmtVec(frameData.forces.projectile.drag, true),
                },
                {
                  label: 'Magnus',
                  value: fmtVec(frameData.forces.projectile.magnus, true),
                },
                {
                  label: 'Tension',
                  value: fmtVec(frameData.forces.projectile.tension, true),
                },
                {
                  label: 'Total',
                  value: fmtVec(frameData.forces.projectile.total, true),
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Ground Contact"
            icon={SECTION_META[6].icon}
            accent="#10b981"
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Ground Height',
                  value: `${fmt(frameData.ground.height)} m`,
                },
                {
                  label: 'Normal Force',
                  value: `${fmt(frameData.ground.normalForce)} N`,
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Constraints & Stability"
            icon={SECTION_META[7].icon}
            accent={SECTION_META[7].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Sling Length',
                  value: `${fmt(frameData.constraints.slingLength.current, 3)}m`,
                },
                {
                  label: 'Target Length',
                  value: `${fmt(frameData.constraints.slingLength.target, 3)}m`,
                },
                {
                  label: 'Violation',
                  value: `${fmt(frameData.constraints.slingLength.violation, 6)}m`,
                },
                {
                  label: 'Ground Pen.',
                  value: `${fmt(frameData.constraints.groundContact.penetration, 6)}m`,
                },
                {
                  label: 'Ground Active',
                  value: (
                    <span
                      className={`px-2 py-0.5 rounded text-[0.6rem] font-black uppercase ${
                        frameData.constraints.groundContact.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {frameData.constraints.groundContact.isActive
                        ? 'YES'
                        : 'NO'}
                    </span>
                  ),
                },
              ]}
            />
          </TelemetrySection>

          <TelemetrySection
            title="Engine Config"
            icon={SECTION_META[8].icon}
            accent={SECTION_META[8].accent}
            defaultOpen={false}
          >
            <TelemetryTable
              data={[
                {
                  label: 'Timestep',
                  value: `${fmt(config.initialTimestep, 5)}s`,
                },
                {
                  label: 'Tolerance',
                  value: `${fmt(config.tolerance, 8)}`,
                },
                {
                  label: 'Max Substeps',
                  value: config.maxSubsteps,
                },
              ]}
            />
          </TelemetrySection>
        </div>
      </aside>

      {/* Mobile Overlay Background */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[90]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
