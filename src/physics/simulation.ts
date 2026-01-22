import { PHYSICS_CONSTANTS } from './constants'
import { RK4Integrator } from './rk4-integrator'
import { computeDerivatives } from './derivatives'
import { physicsLogger } from './logging'
import { getTrebuchetKinematics } from './trebuchet.ts'
import type {
  FrameData,
  PhysicsForces,
  PhysicsState,
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
  lambda: new Float64Array(0),
}

export class CatapultSimulation {
  private integrator: RK4Integrator
  private state: PhysicsState
  private config: SimulationConfig
  private normalForce: number
  private lastForces: PhysicsForces = EMPTY_FORCES

  constructor(initialState: PhysicsState, config: SimulationConfig) {
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

  update(deltaTime: number): PhysicsState {
    const derivativeFunction = (_t: number, state: PhysicsState) => {
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

    if (!newState.isReleased) {
      const velocityAngle = Math.atan2(
        newState.velocity[1],
        newState.velocity[0],
      )
      if (
        newState.velocity[0] > 5.0 &&
        newState.armAngle > 0.1 &&
        velocityAngle >= this.config.trebuchet.releaseAngle
      ) {
        newState = { ...newState, isReleased: true }
      }
    }

    // Quaternion Renormalization
    const q = newState.orientation
    const qMag = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2)
    if (qMag > 1e-12) {
      q[0] /= qMag
      q[1] /= qMag
      q[2] /= qMag
      q[3] /= qMag
    }

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
    }

    this.projectConstraints(newState)
    this.projectVelocities(newState)

    if (newState.position[1] < this.config.projectile.radius) {
      newState.position[1] = this.config.projectile.radius
      if (!newState.isReleased) {
        if (newState.velocity[1] < 0) newState.velocity[1] = 0
      } else {
        if (newState.velocity[1] < 0) newState.velocity[1] *= -0.2
      }
    }

    this.state = newState
    physicsLogger.log(this.state, this.lastForces, this.config)
    return this.state
  }

  private projectConstraints(state: PhysicsState) {
    const mutableState = state as any
    const { trebuchet } = this.config,
      { counterweightRadius: Rcw, slingLength: Ls } = trebuchet
    const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES,
      Lseg = Ls / N
    const kinematics = getTrebuchetKinematics(state.armAngle, trebuchet),
      { shortArmTip, longArmTip } = kinematics

    // 1. Counterweight Projection
    const dx_cw = state.cwPosition[0] - shortArmTip.x,
      dy_cw = state.cwPosition[1] - shortArmTip.y
    const d_cw = Math.sqrt(dx_cw * dx_cw + dy_cw * dy_cw + 1e-12)
    state.cwPosition[0] = shortArmTip.x + (dx_cw / d_cw) * Rcw
    state.cwPosition[1] = shortArmTip.y + (dy_cw / d_cw) * Rcw
    // Sync redundant angular coordinate
    mutableState.cwAngle = Math.atan2(
      state.cwPosition[0] - shortArmTip.x,
      -(state.cwPosition[1] - shortArmTip.y),
    )

    // 2. Sling Projection
    let prevX = longArmTip.x,
      prevY = longArmTip.y
    const projectionFactor = 0.5
    for (let i = 0; i < N; i++) {
      const px = state.slingParticles[2 * i],
        py = state.slingParticles[2 * i + 1]
      const dx = px - prevX,
        dy = py - prevY,
        d = Math.sqrt(dx * dx + dy * dy + 1e-12)
      const threshold = Lseg * 1.01
      if (d > threshold) {
        const corr = (d - threshold) * projectionFactor
        state.slingParticles[2 * i] = prevX + (dx / d) * (threshold + corr)
        state.slingParticles[2 * i + 1] = prevY + (dy / d) * (threshold + corr)
      }
      prevX = state.slingParticles[2 * i]
      prevY = state.slingParticles[2 * i + 1]
    }
    if (!state.isReleased) {
      state.position[0] = state.slingParticles[2 * (N - 1)]
      state.position[1] = state.slingParticles[2 * (N - 1) + 1]
    }
  }

  private projectVelocities(state: PhysicsState) {
    const mutableState = state as any
    const { trebuchet } = this.config,
      N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES,
      Lseg = trebuchet.slingLength / N
    const kinematics = getTrebuchetKinematics(state.armAngle, trebuchet),
      { longArmTip, shortArmTip } = kinematics

    // 1. Counterweight Velocity Projection
    const xts_p = trebuchet.shortArmLength * Math.sin(state.armAngle)
    const yts_p = -trebuchet.shortArmLength * Math.cos(state.armAngle)
    const vts_x = xts_p * state.armAngularVelocity
    const vts_y = yts_p * state.armAngularVelocity

    const vcw_rel_x = state.cwVelocity[0] - vts_x,
      vcw_rel_y = state.cwVelocity[1] - vts_y
    const rcw_x = state.cwPosition[0] - shortArmTip.x,
      rcw_y = state.cwPosition[1] - shortArmTip.y
    const rcw2 = rcw_x * rcw_x + rcw_y * rcw_y + 1e-12
    const v_dot_r = (vcw_rel_x * rcw_x + vcw_rel_y * rcw_y) / rcw2
    state.cwVelocity[0] -= v_dot_r * rcw_x
    state.cwVelocity[1] -= v_dot_r * rcw_y
    mutableState.cwAngularVelocity =
      (rcw_x * vcw_rel_y - rcw_y * vcw_rel_x) / rcw2

    // 2. Sling Velocity Projection
    const vtx =
      -trebuchet.longArmLength *
      Math.sin(state.armAngle) *
      state.armAngularVelocity
    const vty =
      trebuchet.longArmLength *
      Math.cos(state.armAngle) *
      state.armAngularVelocity
    let prevX = longArmTip.x,
      prevY = longArmTip.y,
      prevVX = vtx,
      prevVY = vty
    for (let i = 0; i < N; i++) {
      const px = state.slingParticles[2 * i],
        py = state.slingParticles[2 * i + 1],
        pvx = state.slingVelocities[2 * i],
        pvy = state.slingVelocities[2 * i + 1]
      const dx = px - prevX,
        dy = py - prevY,
        d = Math.sqrt(dx * dx + dy * dy + 1e-12)
      if (d >= Lseg * 0.99) {
        const nx = dx / d,
          ny = dy / d,
          relVX = pvx - prevVX,
          relVY = pvy - prevVY,
          vdotn = relVX * nx + relVY * ny
        if (vdotn > 0.01) {
          state.slingVelocities[2 * i] -= vdotn * nx * 0.9
          state.slingVelocities[2 * i + 1] -= vdotn * ny * 0.9
        }
      }
      prevX = px
      prevY = py
      prevVX = state.slingVelocities[2 * i]
      prevVY = state.slingVelocities[2 * i + 1]
    }
    if (!state.isReleased) {
      state.velocity[0] = state.slingVelocities[2 * (N - 1)]
      state.velocity[1] = state.slingVelocities[2 * (N - 1) + 1]
    }
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
      slingParticles,
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
    const slingPoints: [number, number, number][] = [
      [longArmTip.x, longArmTip.y, 0],
    ]
    const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
    for (let i = 0; i < N; i++)
      slingPoints.push([slingParticles[2 * i], slingParticles[2 * i + 1], 0])
    let phase = isReleased ? 'released' : 'swinging'
    if (!isReleased && this.lastForces.groundNormal > 0)
      phase = 'ground_dragging'
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
        boundingBox: { min: [0, 0, 0], max: [0, 0, 0] },
      },
      counterweight: {
        angle: cwAngle,
        angularVelocity: this.state.cwAngularVelocity,
        position: [cwPosition[0], cwPosition[1], 0],
        radius: Rcw,
        attachmentPoint: [shortArmTip.x, shortArmTip.y, 0],
        boundingBox: { min: [0, 0, 0], max: [0, 0, 0] },
      },
      sling: {
        isAttached: !isReleased,
        points: slingPoints,
        length: Ls,
        tension: Math.abs(this.lastForces.lambda[0] || 0),
        tensionVector: [
          this.lastForces.tension[0],
          this.lastForces.tension[1],
          this.lastForces.tension[2],
        ],
      },
      ground: { height: 0, normalForce: this.lastForces.groundNormal },
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
        slingLength: { current: Ls, target: Ls, violation: 0 },
        groundContact: {
          penetration: Math.min(0, position[1] - this.config.projectile.radius),
          isActive: this.lastForces.groundNormal > 0,
        },
      },
      phase,
    }
  }

  getLastForces(): PhysicsForces {
    return this.lastForces
  }
  getRenderState(): PhysicsState {
    return this.integrator.getRenderState()
  }
  getInterpolationAlpha(): number {
    return this.integrator.getInterpolationAlpha()
  }
  getState(): PhysicsState {
    return this.state
  }
  setState(state: PhysicsState): void {
    this.state = this.cloneState(state)
    this.integrator.setState(this.state)
  }
  reset(): void {
    this.integrator.reset()
    this.lastForces = EMPTY_FORCES
  }
  private cloneState(state: PhysicsState): PhysicsState {
    return {
      ...state,
      position: new Float64Array(state.position),
      velocity: new Float64Array(state.velocity),
      orientation: new Float64Array(state.orientation),
      angularVelocity: new Float64Array(state.angularVelocity),
      cwPosition: new Float64Array(state.cwPosition),
      cwVelocity: new Float64Array(state.cwVelocity),
      slingParticles: new Float64Array(state.slingParticles),
      slingVelocities: new Float64Array(state.slingVelocities),
      windVelocity: new Float64Array(state.windVelocity),
    }
  }
}
