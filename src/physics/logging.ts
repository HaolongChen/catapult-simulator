import type {
  PhysicsForces,
  PhysicsState17DOF,
  SimulationConfig,
} from './types'

export interface LogRecord {
  state: PhysicsState17DOF
  forces: PhysicsForces
  config: SimulationConfig
}

export class PhysicsLogger {
  private records: Array<LogRecord> = []
  private isEnabled = false

  public enable() {
    this.isEnabled = true
  }

  public disable() {
    this.isEnabled = false
  }

  public log(
    state: PhysicsState17DOF,
    forces: PhysicsForces,
    config: SimulationConfig,
  ) {
    if (!this.isEnabled) return

    const recordConfig = JSON.parse(JSON.stringify(config)) as SimulationConfig
    recordConfig.projectile.momentOfInertia = new Float64Array(
      config.projectile.momentOfInertia,
    )

    const record: LogRecord = {
      state: {
        ...state,
        position: new Float64Array(state.position),
        velocity: new Float64Array(state.velocity),
        orientation: new Float64Array(state.orientation),
        angularVelocity: new Float64Array(state.angularVelocity),
        windVelocity: new Float64Array(state.windVelocity),
      },
      forces: {
        ...forces,
        drag: new Float64Array(forces.drag),
        magnus: new Float64Array(forces.magnus),
        gravity: new Float64Array(forces.gravity),
        tension: new Float64Array(forces.tension),
        total: new Float64Array(forces.total),
      },
      config: recordConfig,
    }

    this.records.push(record)

    if (this.records.length % 50 === 0) {
      this.printRealTimeDebug(record)
    }
  }

  private printRealTimeDebug(record: LogRecord) {
    const { state, forces } = record
    console.log(
      `[DEBUG] t=${state.time.toFixed(3)} | ` +
        `pos=[${state.position[0].toFixed(2)}, ${state.position[1].toFixed(2)}, ${state.position[2].toFixed(2)}] | ` +
        `armAngle=${((state.armAngle * 180) / Math.PI).toFixed(1)}° | ` +
        `F_total=[${forces.total[0].toFixed(1)}, ${forces.total[1].toFixed(1)}, ${forces.total[2].toFixed(1)}]`,
    )
  }

  public getRecords(): Array<LogRecord> {
    return this.records
  }

  public clear() {
    this.records = []
  }

  public exportJSON(): string {
    return JSON.stringify(this.records, (_key, value) => {
      if (value instanceof Float64Array) {
        return Array.from(value)
      }
      return value
    })
  }
}

export const physicsLogger = new PhysicsLogger()