import { PHYSICS_CONSTANTS } from './constants'
import type {
  PhysicsForces,
  PhysicsState17DOF,
  SimulationConfig,
} from './types'

export interface LogRecord {
  state: PhysicsState17DOF
  forces: PhysicsForces
  config: SimulationConfig
  virtualTrebuchet: {
    Aq: number
    Wq: number
    Sq: number
    u1: number
    u2: number
    u3: number
    Px: number
    Py: number
    Pvx: number
    Pvy: number
    Fy: number
    energyEfficiency: number
    rangeEfficiency: number
    checkFunction: number
  }
}

export class PhysicsLogger {
  private records: Array<LogRecord> = []
  private isEnabled = false
  private initialPE = 0

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

    const g = PHYSICS_CONSTANTS.GRAVITY
    const Mp = config.projectile.mass
    const Mcw = config.trebuchet.counterweightMass
    const Ma = config.trebuchet.armMass
    const L1 = config.trebuchet.longArmLength
    const L2 = config.trebuchet.shortArmLength
    const H = config.trebuchet.pivotHeight

    if (this.initialPE === 0 || this.records.length === 0) {
      const ycw0 = state.cwPosition[1]
      const yp0 = state.position[1]
      const yarm0 = H + ((L1 - L2) / 2) * Math.sin(state.armAngle)
      this.initialPE = Mcw * g * ycw0 + Ma * g * yarm0 + Mp * g * yp0
    }

    const yp = state.position[1]
    const vp = Math.sqrt(state.velocity[0] ** 2 + state.velocity[1] ** 2)
    const totalEnergyProj = 0.5 * Mp * vp ** 2 + Mp * g * yp
    const energyEfficiency =
      this.initialPE > 0 ? totalEnergyProj / this.initialPE : 0

    const theta = Math.atan2(state.velocity[1], state.velocity[0])
    const h = yp
    const R_actual =
      ((vp * Math.cos(theta)) / g) *
      (vp * Math.sin(theta) +
        Math.sqrt(Math.max(0, (vp * Math.sin(theta)) ** 2 + 2 * g * h)))
    const R_ideal = (vp * vp) / g
    const rangeEfficiency = R_ideal > 0 ? R_actual / R_ideal : 0

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
      virtualTrebuchet: {
        Aq: state.armAngle,
        Wq: state.cwAngle - state.armAngle,
        Sq: state.slingAngle - state.armAngle,
        u1: state.armAngularVelocity,
        u2: state.cwAngularVelocity - state.armAngularVelocity,
        u3: state.slingAngularVelocity - state.armAngularVelocity,
        Px: state.position[0],
        Py: state.position[1],
        Pvx: state.velocity[0],
        Pvy: state.velocity[1],
        Fy: forces.groundNormal,
        energyEfficiency,
        rangeEfficiency,
        checkFunction: forces.checkFunction,
      },
    }

    this.records.push(record)

    if (this.records.length % 50 === 0) {
      this.printRealTimeDebug(record)
    }
  }

  private printRealTimeDebug(record: LogRecord) {
    const { virtualTrebuchet: vt, state } = record
    const toDeg = 180 / Math.PI
    console.log(
      `[LOG] t=${state.time.toFixed(3)}s | ` +
        `Aq=${(vt.Aq * toDeg).toFixed(1)}° | ` +
        `Eff_E=${(vt.energyEfficiency * 100).toFixed(1)}% | ` +
        `Check=${vt.checkFunction.toExponential(2)}`,
    )
  }

  public exportCSV(): string {
    const toDeg = 180 / Math.PI
    const header =
      'Time (s),Arm Angle (deg),Weight Rel Angle (deg),Sling Rel Angle (deg),Arm Omega (deg/s),Weight Rel Omega (deg/s),Sling Rel Omega (deg/s),Proj X (m),Proj Y (m),Proj VX (m/s),Proj VY (m/s),Normal Force (N),Energy Eff,Range Eff,Check Function\n'
    const rows = this.records
      .map((r) => {
        const vt = r.virtualTrebuchet
        return [
          r.state.time.toFixed(4),
          (vt.Aq * toDeg).toFixed(4),
          (vt.Wq * toDeg).toFixed(4),
          (vt.Sq * toDeg).toFixed(4),
          (vt.u1 * toDeg).toFixed(4),
          (vt.u2 * toDeg).toFixed(4),
          (vt.u3 * toDeg).toFixed(4),
          vt.Px.toFixed(4),
          vt.Py.toFixed(4),
          vt.Pvx.toFixed(4),
          vt.Pvy.toFixed(4),
          vt.Fy.toFixed(4),
          vt.energyEfficiency.toFixed(6),
          vt.rangeEfficiency.toFixed(6),
          vt.checkFunction.toExponential(6),
        ].join(',')
      })
      .join('\n')
    return header + rows
  }

  public getRecords(): Array<LogRecord> {
    return this.records
  }

  public clear() {
    this.records = []
    this.initialPE = 0
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
