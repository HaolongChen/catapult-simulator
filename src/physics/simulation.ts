import { PHYSICS_CONSTANTS } from './constants'
import { RK4Integrator } from './rk4-integrator'
import { computeDerivatives } from './derivatives'
import { physicsLogger } from './logging'
import { getTrebuchetKinematics } from './trebuchet.ts'
import type {
  FrameData,
  PhysicsForces,
  PhysicsState17DOF,
  SimulationConfig,
} from './types'

export type { SimulationConfig }

const EMPTY_FORCES: PhysicsForces = {
  drag: new Float64Array(3),
  magnus: new Float64Array(3),
  gravity: new Float64Array(3),
  tension: new Float64Array(3),
  total: new Float64Array(3),
  groundNormal: 0,
  checkFunction: 0,
  lambda: new Float64Array(6),
}

export class CatapultSimulation {
  private integrator: RK4Integrator
  private state: PhysicsState17DOF
  private config: SimulationConfig
  private normalForce: number
  private lastForces: PhysicsForces = EMPTY_FORCES

  constructor(initialState: PhysicsState17DOF, config: SimulationConfig) {
    this.state = initialState
    this.config = config
    this.normalForce =
      config.trebuchet.counterweightMass * PHYSICS_CONSTANTS.GRAVITY
    this.integrator = new RK4Integrator(initialState, {
      initialTimestep: config.initialTimestep,
      maxSubsteps: config.maxSubsteps,
      maxAccumulator: config.maxAccumulator,
      tolerance: config.tolerance,
      minTimestep: config.minTimestep,
      maxTimestep: config.maxTimestep,
    })

    const res = computeDerivatives(
      this.state,
      this.config.projectile,
      this.config.trebuchet,
      this.normalForce,
    )
    this.lastForces = res.forces

    physicsLogger.log(this.state, this.lastForces, this.config)
  }

  update(deltaTime: number): PhysicsState17DOF {
    const derivativeFunction = (_t: number, state: PhysicsState17DOF) => {
      const res = computeDerivatives(
        state,
        this.config.projectile,
        this.config.trebuchet,
        this.normalForce,
      )
      this.lastForces = res.forces
      return res
    }

    const result = this.integrator.update(deltaTime, derivativeFunction)
    let newState = result.newState

    const normalizeAngle = (a: number) => {
      const TWO_PI = 2 * Math.PI
      let res = a % TWO_PI
      if (res > Math.PI) res -= TWO_PI
      if (res < -Math.PI) res += TWO_PI
      return res
    }
    newState = {
      ...newState,
      armAngle: normalizeAngle(newState.armAngle),
      cwAngle: normalizeAngle(newState.cwAngle),
      slingAngle: normalizeAngle(newState.slingAngle),
    }

    if (!newState.isReleased) {
      const {
        slingLength: Ls,
        longArmLength: L1,
        counterweightRadius: Rcw,
      } = this.config.trebuchet

      const kinematics = getTrebuchetKinematics(
        newState.armAngle,
        this.config.trebuchet,
      )
      const { longArmTip: tip, shortArmTip: shortTip } = kinematics

      const dx_cw = newState.cwPosition[0] - shortTip.x
      const dy_cw = newState.cwPosition[1] - shortTip.y
      const dist_cw = Math.sqrt(dx_cw * dx_cw + dy_cw * dy_cw + 1e-12)
      const factor_cw = Rcw / dist_cw
      newState.cwPosition[0] = shortTip.x + dx_cw * factor_cw
      newState.cwPosition[1] = shortTip.y + dy_cw * factor_cw

      const cosS = Math.cos(newState.slingAngle)
      const sinS = Math.sin(newState.slingAngle)
      newState.position[0] = tip.x + Ls * cosS
      newState.position[1] = tip.y + Ls * sinS

      const vxt =
        -L1 * Math.sin(newState.armAngle) * newState.armAngularVelocity
      const vyt = L1 * Math.cos(newState.armAngle) * newState.armAngularVelocity
      newState.velocity[0] = vxt - Ls * sinS * newState.slingAngularVelocity
      newState.velocity[1] = vyt + Ls * cosS * newState.slingAngularVelocity

      newState = {
        ...newState,
        cwAngle: Math.atan2(dy_cw, dx_cw) + Math.PI / 2, // Normalize to hinge downward
      }

      const armVec = {
        x: Math.cos(newState.armAngle),
        y: Math.sin(newState.armAngle),
      }
      const slingVec = {
        x: Math.cos(newState.slingAngle),
        y: Math.sin(newState.slingAngle),
      }
      const det = armVec.x * slingVec.y - armVec.y * slingVec.x
      const dot = armVec.x * slingVec.x + armVec.y * slingVec.y
      const currentRelAngle = Math.atan2(det, dot)

      const armAngleDeg =
        ((((newState.armAngle * 180) / Math.PI) % 360) + 360) % 360
      const releaseThresholdMagnitude = Math.abs(
        this.config.trebuchet.releaseAngle,
      )

      // Calculate projectile velocity angle and magnitude
      const velocityAngle = Math.atan2(newState.velocity[1], newState.velocity[0])
      const velocityAngleDeg = (velocityAngle * 180) / Math.PI
      const velocityMag = Math.sqrt(
        newState.velocity[0] ** 2 + newState.velocity[1] ** 2
      )

      // Release when:
      // 1. Arm is past vertical (angle > 80°)
      // 2. Projectile has high velocity (>40 m/s)
      // 3. Sling relative angle is small (nearly aligned)
      // 4. Velocity is transitioning from backward to forward
      //
      // The projectile swings backward initially, reaches peak velocity
      // around 80-90°, then should release as it transitions forward
      if (
        armAngleDeg > 80 &&
        armAngleDeg < 95 &&
        velocityMag > 40.0 &&
        Math.abs(currentRelAngle) < releaseThresholdMagnitude * 0.5
      ) {
        newState = {
          ...newState,
          isReleased: true,
        }
      }

      this.integrator.setState(newState)
    }

    if (newState.position[1] < this.config.projectile.radius) {
      newState.position[1] = this.config.projectile.radius
      if (newState.velocity[1] < 0) newState.velocity[1] = 0
    }

    const cwRadius = this.config.trebuchet.counterweightRadius
    if (newState.cwPosition[1] < cwRadius - 0.5) {
      newState.cwPosition[1] = cwRadius - 0.5
      if (newState.cwVelocity[1] < 0) newState.cwVelocity[1] = 0
    }

    const q = newState.orientation
    const qMag = Math.sqrt(
      q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3],
    )
    if (qMag > 1e-12) {
      for (let i = 0; i < 4; i++) q[i] /= qMag
    }

    this.state = newState
    physicsLogger.log(this.state, this.lastForces, this.config)
    return this.state
  }

  getLastForces(): PhysicsForces {
    return this.lastForces
  }

  exportFrameData(): FrameData {
    const {
      longArmLength: L1,
      shortArmLength: L2,
      counterweightRadius: Rcw,
      slingLength: Ls,
    } = this.config.trebuchet
    const {
      armAngle,
      cwAngle,
      cwPosition,
      position,
      orientation,
      velocity,
      angularVelocity,
      isReleased,
      time,
    } = this.state

    const kinematics = getTrebuchetKinematics(armAngle, this.config.trebuchet)
    const { longArmTip, shortArmTip, pivot } = kinematics

    const projectileBB = {
      min: [
        position[0] - this.config.projectile.radius,
        position[1] - this.config.projectile.radius,
        position[2] - this.config.projectile.radius,
      ] as [number, number, number],
      max: [
        position[0] + this.config.projectile.radius,
        position[1] + this.config.projectile.radius,
        position[2] + this.config.projectile.radius,
      ] as [number, number, number],
    }
    const armBB = {
      min: [
        Math.min(shortArmTip.x, longArmTip.x),
        Math.min(shortArmTip.y, longArmTip.y),
        -0.1,
      ] as [number, number, number],
      max: [
        Math.max(shortArmTip.x, longArmTip.x),
        Math.max(shortArmTip.y, longArmTip.y),
        0.1,
      ] as [number, number, number],
    }
    const cwBB = {
      min: [cwPosition[0] - Rcw, cwPosition[1] - Rcw, -Rcw] as [
        number,
        number,
        number,
      ],
      max: [cwPosition[0] + Rcw, cwPosition[1] + Rcw, Rcw] as [
        number,
        number,
        number,
      ],
    }

    const currentSlingLength = Math.sqrt(
      (position[0] - longArmTip.x) ** 2 +
        (position[1] - longArmTip.y) ** 2 +
        (position[2] - 0) ** 2,
    )

    let phase = isReleased ? 'released' : 'swinging'
    if (!isReleased && this.lastForces.groundNormal > 0) {
      phase = 'ground_dragging'
    }

    return {
      time,
      timestep: this.config.initialTimestep,
      projectile: {
        position: [position[0], position[1], position[2]],
        orientation: [
          orientation[0],
          orientation[1],
          orientation[2],
          orientation[3],
        ],
        velocity: [velocity[0], velocity[1], velocity[2]],
        angularVelocity: [
          angularVelocity[0],
          angularVelocity[1],
          angularVelocity[2],
        ],
        radius: this.config.projectile.radius,
        boundingBox: projectileBB,
      },
      arm: {
        angle: armAngle,
        angularVelocity: this.state.armAngularVelocity,
        pivot: [pivot.x, pivot.y, 0],
        longArmTip: [longArmTip.x, longArmTip.y, 0],
        shortArmTip: [shortArmTip.x, shortArmTip.y, 0],
        longArmLength: L1,
        shortArmLength: L2,
        boundingBox: armBB,
      },
      counterweight: {
        angle: cwAngle,
        angularVelocity: this.state.cwAngularVelocity,
        position: [cwPosition[0], cwPosition[1], 0],
        radius: Rcw,
        attachmentPoint: [shortArmTip.x, shortArmTip.y, 0],
        boundingBox: cwBB,
      },
      sling: {
        isAttached: !isReleased,
        startPoint: [longArmTip.x, longArmTip.y, 0],
        endPoint: [position[0], position[1], position[2]],
        length: Ls,
        tension: Math.abs(this.lastForces.lambda[2] * Ls),
        tensionVector: [
          this.lastForces.tension[0],
          this.lastForces.tension[1],
          this.lastForces.tension[2],
        ],
      },
      ground: {
        height: 0,
        normalForce: this.lastForces.groundNormal,
      },
      forces: {
        projectile: {
          gravity: [
            this.lastForces.gravity[0],
            this.lastForces.gravity[1],
            this.lastForces.gravity[2],
          ],
          drag: [
            this.lastForces.drag[0],
            this.lastForces.drag[1],
            this.lastForces.drag[2],
          ],
          magnus: [
            this.lastForces.magnus[0],
            this.lastForces.magnus[1],
            this.lastForces.magnus[2],
          ],
          tension: [
            this.lastForces.tension[0],
            this.lastForces.tension[1],
            this.lastForces.tension[2],
          ],
          total: [
            this.lastForces.total[0],
            this.lastForces.total[1],
            this.lastForces.total[2],
          ],
        },
        arm: {
          springTorque: 0,
          dampingTorque: 0,
          frictionTorque: 0,
          totalTorque: 0,
        },
      },
      constraints: {
        slingLength: !isReleased
          ? {
              current: currentSlingLength,
              target: Ls,
              violation: currentSlingLength - Ls,
            }
          : {
              current: 0,
              target: 0,
              violation: 0,
            },
        groundContact: {
          penetration: Math.min(0, position[1] - this.config.projectile.radius),
          isActive: this.lastForces.groundNormal > 0,
        },
      },
      phase,
    }
  }

  getRenderState(): PhysicsState17DOF {
    return this.integrator.getRenderState()
  }

  getInterpolationAlpha(): number {
    return this.integrator.getInterpolationAlpha()
  }

  getState(): PhysicsState17DOF {
    return this.state
  }

  setState(state: PhysicsState17DOF): void {
    this.state = state
    this.integrator.setState(state)
  }

  reset(): void {
    this.integrator.reset()
    this.lastForces = EMPTY_FORCES
  }
}
