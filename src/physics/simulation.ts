import { PHYSICS_CONSTANTS } from './constants'
import { RK4Integrator } from './rk4-integrator'
import { computeDerivatives } from './derivatives'
import { computeTrebuchetKinematics } from './kinematics'
import { physicsLogger } from './logging'
import type {
  FrameData,
  PhysicsForces,
  PhysicsState19DOF,
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
  slingBagNormal: 0,
  lambda: new Float64Array(6),
}

export class CatapultSimulation {
  private integrator: RK4Integrator
  private state: PhysicsState19DOF
  private config: SimulationConfig
  private normalForce: number
  private lastForces: PhysicsForces = EMPTY_FORCES

  constructor(initialState: PhysicsState19DOF, config: SimulationConfig) {
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

  /**
   * Advances the simulation by deltaTime.
   * Performs integration, coordinate projection, and state transition checks.
   */
  update(deltaTime: number): PhysicsState19DOF {
    // 1. Integration Step (using Adaptive RK4)
    const derivativeFunction = (_t: number, state: PhysicsState19DOF) => {
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

    // 2. Coordinate Projection (SHAKE-style)
    // Ensures that redundant world-space coordinates satisfy geometric constraints.
    if (!newState.isReleased) {
      const kinematics = computeTrebuchetKinematics(
        newState.armAngle,
        newState.cwAngle,
        newState.slingBagAngle,
        this.config.trebuchet,
      )
      const { tip: tipPos, shortTip: shortTipPos } = kinematics
      const tipX = tipPos.x
      const tipY = tipPos.y

      const shortTipX = shortTipPos.x
      const shortTipY = shortTipPos.y

      const {
        slingLength: Ls,
        slingBagWidth: W,
        counterweightRadius: Rcw,
      } = this.config.trebuchet

      const R_p = this.config.projectile.radius * 1.5

      // 2.1 Counterweight Position Projection (Hinge)
      // Constrains CW center to be exactly Rcw from the short arm tip.
      const dx_cw = newState.cwPosition[0] - shortTipX
      const dy_cw = newState.cwPosition[1] - shortTipY
      const dist_cw = Math.sqrt(dx_cw * dx_cw + dy_cw * dy_cw + 1e-12)
      const factor_cw = Rcw / dist_cw
      newState.cwPosition[0] = shortTipX + dx_cw * factor_cw
      newState.cwPosition[1] = shortTipY + dy_cw * factor_cw

      // 2.2 Sling Bag Position Projection (V-shape center distance)
      // Constrains bag center to be at the target geometric distance from arm tip.
      const targetCenterDist = Math.sqrt(Math.max(0, Ls * Ls - (W / 2) ** 2))
      const dx_sb = newState.slingBagPosition[0] - tipX
      const dy_sb = newState.slingBagPosition[1] - tipY
      const dist_sb = Math.sqrt(dx_sb * dx_sb + dy_sb * dy_sb + 1e-12)
      const factor_sb = targetCenterDist / dist_sb
      newState.slingBagPosition[0] = tipX + dx_sb * factor_sb
      newState.slingBagPosition[1] = tipY + dy_sb * factor_sb

      // 2.3 Projectile-Bag Contact Projection
      // Prevents penetration between the projectile and the sling bag.
      const dx_b = newState.position[0] - newState.slingBagPosition[0]
      const dy_b = newState.position[1] - newState.slingBagPosition[1]
      const dist_b = Math.sqrt(dx_b * dx_b + dy_b * dy_b + 1e-12)
      const factor_b = R_p / dist_b
      newState.position[0] = newState.slingBagPosition[0] + dx_b * factor_b
      newState.position[1] = newState.slingBagPosition[1] + dy_b * factor_b

      // Ground Collision (Hard floor)
      if (newState.position[1] < this.config.projectile.radius) {
        newState.position[1] = this.config.projectile.radius
      }

      // 3. Update Orientation Angles to match projected positions
      // Derives phi and psi from the Cartesian coordinates solved by the DAE.
      newState = {
        ...newState,
        cwAngle: Math.atan2(dx_cw, -dy_cw),
        slingBagAngle: Math.atan2(dy_sb, dx_sb) - Math.PI / 2,
      }

      // 4. State Transitions (Natural Release)
      // Separation occurs strictly when the normal contact force N between bag and ball is zero.
      const normAng =
        ((((newState.armAngle * 180) / Math.PI) % 360) + 360) % 360
      const inReleaseWindow = normAng > 45 && normAng < 225

      if (inReleaseWindow && this.lastForces.slingBagNormal <= 0) {
        newState = {
          ...newState,
          isReleased: true,
        }
      }
      this.integrator.setState(newState)
    }

    // Quaternion Normalization (Numerical stability for orientation)
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
      armAngle,
      cwAngle,
      slingBagAngle,
      slingBagPosition,
      cwPosition,
      position,
      orientation,
      velocity,
      angularVelocity,
      isReleased,
      time,
    } = this.state

    const kinematics = computeTrebuchetKinematics(
      armAngle,
      cwAngle,
      slingBagAngle,
      this.config.trebuchet,
    )

    const {
      longArmLength: L1,
      shortArmLength: L2,
      counterweightRadius: Rcw,
      slingLength: Ls,
    } = this.config.trebuchet

    const pivot: [number, number, number] = [
      kinematics.pivot.x,
      kinematics.pivot.y,
      0,
    ]
    const longArmTip: [number, number, number] = [
      kinematics.tip.x,
      kinematics.tip.y,
      0,
    ]
    const shortArmTip: [number, number, number] = [
      kinematics.shortTip.x,
      kinematics.shortTip.y,
      0,
    ]

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
        Math.min(shortArmTip[0], longArmTip[0]),
        Math.min(shortArmTip[1], longArmTip[1]),
        -0.1,
      ] as [number, number, number],
      max: [
        Math.max(shortArmTip[0], longArmTip[0]),
        Math.max(shortArmTip[1], longArmTip[1]),
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
      (position[0] - longArmTip[0]) ** 2 +
        (position[1] - longArmTip[1]) ** 2 +
        (position[2] - longArmTip[2]) ** 2,
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
        pivot,
        longArmTip,
        shortArmTip,
        longArmLength: L1,
        shortArmLength: L2,
        boundingBox: armBB,
      },
      counterweight: {
        angle: cwAngle,
        angularVelocity: this.state.cwAngularVelocity,
        position: [cwPosition[0], cwPosition[1], 0],
        radius: Rcw,
        attachmentPoint: shortArmTip,
        boundingBox: cwBB,
      },
      sling: {
        isAttached: !isReleased,
        startPoint: longArmTip,
        endPoint: isReleased
          ? [slingBagPosition[0], slingBagPosition[1], 0]
          : [position[0], position[1], position[2]],
        length: Ls,
        tension: Math.sqrt(
          this.lastForces.tension[0] ** 2 +
            this.lastForces.tension[1] ** 2 +
            this.lastForces.tension[2] ** 2,
        ),
        tensionVector: [
          this.lastForces.tension[0],
          this.lastForces.tension[1],
          this.lastForces.tension[2],
        ],
      },
      slingBag: {
        position: [slingBagPosition[0], slingBagPosition[1], 0],
        angle: slingBagAngle,
        contactForce: this.lastForces.slingBagNormal,
        width: this.config.trebuchet.slingBagWidth,
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
        slingLength: {
          current: currentSlingLength,
          target: Ls,
          violation: currentSlingLength - Ls,
        },
        groundContact: {
          penetration: Math.min(0, position[1] - this.config.projectile.radius),
          isActive: this.lastForces.groundNormal > 0,
        },
      },
      phase,
    }
  }

  getRenderState(): PhysicsState19DOF {
    return this.integrator.getRenderState()
  }

  getInterpolationAlpha(): number {
    return this.integrator.getInterpolationAlpha()
  }

  getState(): PhysicsState19DOF {
    return this.state
  }

  setState(state: PhysicsState19DOF): void {
    this.state = state
    this.integrator.setState(state)
  }

  reset(): void {
    this.integrator.reset()
    this.lastForces = EMPTY_FORCES
  }
}
