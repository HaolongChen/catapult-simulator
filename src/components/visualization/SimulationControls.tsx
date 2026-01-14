import { useStore } from '@tanstack/react-store'
import {
  Construction,
  Globe,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Target,
} from 'lucide-react'
import {
  pause,
  play,
  reset,
  simulationStore,
  updateConfig,
} from '@/lib/simulation-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SimulationControls() {
  const isPlaying = useStore(simulationStore, (s) => s.isPlaying)
  const config = useStore(simulationStore, (s) => s.config)

  const PRESETS = [
    { name: 'Standard Trebuchet', id: 'standard' },
    { name: 'Heavy Siege', id: 'heavy' },
    { name: 'Long Range', id: 'range' },
  ]

  const handlePresetChange = (id: string) => {
    if (id === 'standard') {
      updateConfig({
        trebuchet: {
          ...config.trebuchet,
          longArmLength: 8,
          shortArmLength: 2,
          counterweightMass: 1000,
          counterweightRadius: 1.5,
          slingLength: 6,
        },
      })
    } else if (id === 'heavy') {
      updateConfig({
        trebuchet: {
          ...config.trebuchet,
          longArmLength: 12,
          shortArmLength: 3,
          counterweightMass: 5000,
          counterweightRadius: 2.0,
          slingLength: 8,
        },
      })
    } else if (id === 'range') {
      updateConfig({
        trebuchet: {
          ...config.trebuchet,
          longArmLength: 10,
          shortArmLength: 1.5,
          counterweightMass: 2000,
          counterweightRadius: 1.8,
          slingLength: 10,
        },
      })
    }
  }

  return (
    <Card className="absolute top-4 right-4 w-96 max-h-[calc(100vh-2rem)] bg-slate-950/80 border-slate-800 backdrop-blur-xl text-slate-100 shadow-2xl overflow-hidden flex flex-col border-l-4 border-l-cyan-500 z-50">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Catapult Command
          </CardTitle>
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[140px] h-7 text-[10px] bg-slate-900 border-slate-700 uppercase font-bold tracking-tighter">
              <SelectValue placeholder="LOAD PRESET" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
              {PRESETS.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="text-[10px] uppercase font-bold"
                >
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white h-8 text-[10px] font-black uppercase tracking-widest"
            onClick={isPlaying ? pause : play}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 mr-2" /> PAUSE
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-2" /> ENGAGE
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 h-8 px-2"
            onClick={reset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <CardDescription className="text-slate-400 text-[9px] font-mono uppercase tracking-[0.2em] mt-2">
          17-DOF KINEMATIC SOLVER
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="projectile" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 rounded-none border-b border-slate-800">
          <TabsTrigger
            value="projectile"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 text-xs"
          >
            <Target className="w-3.5 h-3.5 mr-1.5" /> Projectile
          </TabsTrigger>
          <TabsTrigger
            value="trebuchet"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 text-xs"
          >
            <Construction className="w-3.5 h-3.5 mr-1.5" /> Machine
          </TabsTrigger>
          <TabsTrigger
            value="world"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 text-xs"
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" /> World
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <CardContent className="p-4">
            <TabsContent value="projectile" className="space-y-6 mt-0">
              <ControlGroup
                label="Mass (kg)"
                value={config.projectile.mass}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(val) =>
                  updateConfig({
                    projectile: { ...config.projectile, mass: val },
                  })
                }
              />
              <ControlGroup
                label="Radius (m)"
                value={config.projectile.radius}
                min={0.01}
                max={0.5}
                step={0.01}
                onChange={(val) =>
                  updateConfig({
                    projectile: {
                      ...config.projectile,
                      radius: val,
                      area: Math.PI * val ** 2,
                    },
                  })
                }
              />
              <ControlGroup
                label="Spin (rad/s)"
                value={config.projectile.spin}
                min={-100}
                max={100}
                step={1}
                onChange={(val) =>
                  updateConfig({
                    projectile: { ...config.projectile, spin: val },
                  })
                }
              />
              <ControlGroup
                label="Drag Coefficient"
                value={config.projectile.dragCoefficient}
                min={0}
                max={1}
                step={0.01}
                onChange={(val) =>
                  updateConfig({
                    projectile: { ...config.projectile, dragCoefficient: val },
                  })
                }
              />
            </TabsContent>

            <TabsContent value="trebuchet" className="space-y-6 mt-0">
              <ControlGroup
                label="Counterweight (kg)"
                value={config.trebuchet.counterweightMass}
                min={100}
                max={10000}
                step={100}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: { ...config.trebuchet, counterweightMass: val },
                  })
                }
              />
              <ControlGroup
                label="Long Arm (m)"
                value={config.trebuchet.longArmLength}
                min={2}
                max={20}
                step={0.5}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: { ...config.trebuchet, longArmLength: val },
                  })
                }
              />
              <ControlGroup
                label="Short Arm (m)"
                value={config.trebuchet.shortArmLength}
                min={0.5}
                max={5}
                step={0.1}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: { ...config.trebuchet, shortArmLength: val },
                  })
                }
              />
              <ControlGroup
                label="Sling Length (m)"
                value={config.trebuchet.slingLength}
                min={1}
                max={15}
                step={0.5}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: { ...config.trebuchet, slingLength: val },
                  })
                }
              />
              <ControlGroup
                label="CW Pivot Radius (m)"
                value={config.trebuchet.counterweightRadius}
                min={0.5}
                max={4}
                step={0.1}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: {
                      ...config.trebuchet,
                      counterweightRadius: val,
                    },
                  })
                }
              />
              <ControlGroup
                label="Pivot Height (m)"
                value={config.trebuchet.pivotHeight}
                min={2}
                max={15}
                step={0.5}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: { ...config.trebuchet, pivotHeight: val },
                  })
                }
              />
              <ControlGroup
                label="Release Angle (deg)"
                value={Math.round(
                  (config.trebuchet.releaseAngle * 180) / Math.PI,
                )}
                min={-90}
                max={90}
                step={5}
                onChange={(val) =>
                  updateConfig({
                    trebuchet: {
                      ...config.trebuchet,
                      releaseAngle: (val * Math.PI) / 180,
                    },
                  })
                }
              />
            </TabsContent>

            <TabsContent value="world" className="space-y-6 mt-0">
              <div className="flex flex-col gap-4">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <p className="text-xs text-slate-400 leading-relaxed font-mono uppercase tracking-tight">
                    Environmental parameters affecting air density and
                    aerodynamic drag. High altitude reduces drag; high humidity
                    increases density slightly.
                  </p>
                </div>
                <Separator className="bg-slate-800" />
                <ControlGroup
                  label="Gravity (m/s²)"
                  value={9.81}
                  min={1.62}
                  max={24.79}
                  step={0.01}
                  disabled
                  onChange={() => {}}
                />
                <ControlGroup
                  label="Surface Temp (K)"
                  value={288.15}
                  min={250}
                  max={320}
                  step={0.1}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </TabsContent>
          </CardContent>
        </ScrollArea>
      </Tabs>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <Button
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase tracking-[0.2em] h-12 shadow-lg shadow-cyan-500/20"
          onClick={isPlaying ? pause : play}
        >
          {isPlaying ? 'ENGAGED' : 'READY TO LAUNCH'}
        </Button>
      </div>
    </Card>
  )
}

function ControlGroup({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className={`space-y-3 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.1em]">
          {label}
        </Label>
        <span className="text-[10px] font-mono bg-slate-900 text-cyan-400 px-2 py-0.5 rounded border border-slate-800 shadow-inner">
          {value.toFixed(2)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="py-1 cursor-crosshair"
      />
    </div>
  )
}
