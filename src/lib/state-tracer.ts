import { simulationStore } from '@/lib/simulation-store'

export interface StateRecord {
  t: number
  armAngle: number
  cwAngle: number
  px: number
  py: number
  vx: number
  vy: number
  dist: number
  energy: number
  rel: boolean
}

export class HighFrequencyStateTracer {
  private logs: Array<StateRecord> = []
  private isTracing = false

  public start() {
    this.logs = []
    this.isTracing = true
  }

  public stop() {
    this.isTracing = false
    this.printSummary()
  }

  public record() {
    if (!this.isTracing) return

    const { state, config } = simulationStore.state
    const {
      position,
      velocity,
      armAngle,
      armAngularVelocity,
      cwAngle,
      cwAngularVelocity,
      time,
      orientation,
    } = state
    const { trebuchet, projectile: projProps } = config

    const tipX = trebuchet.longArmLength * Math.cos(armAngle)
    const tipY =
      trebuchet.pivotHeight + trebuchet.longArmLength * Math.sin(armAngle)
    const dx = position[0] - tipX
    const dy = position[1] - tipY
    const dist = Math.sqrt(dx * dx + dy * dy)

    const g = 9.81
    const pe =
      projProps.mass * g * position[1] +
      trebuchet.counterweightMass *
        g *
        (trebuchet.pivotHeight -
          trebuchet.shortArmLength * Math.sin(armAngle) -
          trebuchet.counterweightRadius * Math.cos(cwAngle))

    const Ia = (1 / 3) * trebuchet.armMass * trebuchet.longArmLength ** 2
    const Icw =
      0.5 * trebuchet.counterweightMass * trebuchet.counterweightRadius ** 2
    const ke =
      0.5 * projProps.mass * (velocity[0] ** 2 + velocity[1] ** 2) +
      0.5 *
        (Ia + trebuchet.counterweightMass * trebuchet.shortArmLength ** 2) *
        armAngularVelocity ** 2 +
      0.5 * Icw * cwAngularVelocity ** 2

    const record: StateRecord = {
      t: time,
      armAngle: (armAngle * 180) / Math.PI,
      cwAngle: (cwAngle * 180) / Math.PI,
      px: position[0],
      py: position[1],
      vx: velocity[0],
      vy: velocity[1],
      dist,
      energy: pe + ke,
      rel: orientation[0] > 0.5,
    }

    this.logs.push(record)

    if (this.logs.length % 50 === 0) {
      console.log(
        `[TRACE] t=${record.t.toFixed(3)} | py=${record.py.toFixed(3)} | dist=${record.dist.toFixed(3)} | E=${record.energy.toFixed(0)} | rel=${record.rel}`,
      )
    }
  }

  private printSummary() {
    if (this.logs.length === 0) return
    console.log('--- TRACE SUMMARY ---')
    console.log('Steps:', this.logs.length)
    console.log('Max Y:', Math.max(...this.logs.map((l) => l.py)).toFixed(2))

    const initialE = this.logs[0].energy
    const finalE = this.logs[this.logs.length - 1].energy
    console.log(
      'Energy Drift:',
      (((finalE - initialE) / initialE) * 100).toFixed(2),
      '%',
    )
  }
}

export const stateTracer = new HighFrequencyStateTracer()
