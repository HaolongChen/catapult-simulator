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

    // Post-Integration Constraint Enforcement (Projection)
    if (!newState.isReleased) {
      this.projectConstraints(newState)
      this.projectVelocities(newState)
    }

    if (newState.position[1] < this.config.projectile.radius) {
      newState.position[1] = this.config.projectile.radius
      if (!newState.isReleased) {
        if (newState.velocity[1] < 0) newState.velocity[1] = 0
      } else {
        newState.velocity[0] = 0
        newState.velocity[1] = 0
        newState.velocity[2] = 0
      }
    }

    // Release Check
    if (!newState.isReleased) {
      const velocityAngle =
        (Math.atan2(newState.velocity[1], newState.velocity[0]) * 180) / Math.PI
      const releaseThreshold = this.config.trebuchet.releaseAngle

      if (velocityAngle >= releaseThreshold) {
        newState = {
          ...newState,
          isReleased: true,
        }
      }
    }

    this.state = newState
    this.integrator.setState(newState)
    physicsLogger.log(this.state, this.lastForces, this.config)
    return this.state
  }

  private projectConstraints(state: PhysicsState) {
    const { trebuchet } = this.config
    const { counterweightRadius: Rcw, slingLength: Ls } = trebuchet
    const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
    const Lseg = Ls / N

    const kinematics = getTrebuchetKinematics(state.armAngle, trebuchet)
    const { shortArmTip, longArmTip } = kinematics

    // 1. CW Position
    const dx_cw = state.cwPosition[0] - shortArmTip.x
    const dy_cw = state.cwPosition[1] - shortArmTip.y
    const d_cw = Math.sqrt(dx_cw * dx_cw + dy_cw * dy_cw + 1e-12)
    state.cwPosition[0] = shortArmTip.x + (dx_cw / d_cw) * Rcw
    state.cwPosition[1] = shortArmTip.y + (dy_cw / d_cw) * Rcw

    // 2. Sling Particles (Allow for elastic stretch)
    let prevX = longArmTip.x
    let prevY = longArmTip.y

    const M = N - 1
    // Weaken projection to allow DAE compliance to show
    const projectionFactor = 0.5
    for (let i = 0; i < M; i++) {
      const px = state.slingParticles[2 * i]
      const py = state.slingParticles[2 * i + 1]
      const dx = px - prevX
      const dy = py - prevY
      const d = Math.sqrt(dx * dx + dy * dy + 1e-12)

      // Only project if significantly violating (e.g. > 1% over nominal)
      const threshold = Lseg * 1.01
      if (d > threshold) {
        const corr = (d - threshold) * projectionFactor
        state.slingParticles[2 * i] = prevX + (dx / d) * (threshold + corr)
        state.slingParticles[2 * i + 1] = prevY + (dy / d) * (threshold + corr)
      }
      prevX = state.slingParticles[2 * i]
      prevY = state.slingParticles[2 * i + 1]
    }

    // Projectile
    const dxp = state.position[0] - prevX
    const dyp = state.position[1] - prevY
    const dp = Math.sqrt(dxp * dxp + dyp * dyp + 1e-12)
    const thresholdP = Lseg * 1.01
    if (dp > thresholdP) {
      const corr = (dp - thresholdP) * projectionFactor
      state.position[0] = prevX + (dxp / dp) * (thresholdP + corr)
      state.position[1] = prevY + (dyp / dp) * (thresholdP + corr)
    }
  }

  private projectVelocities(state: PhysicsState) {
    const { trebuchet } = this.config
    const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
    const Lseg = trebuchet.slingLength / N

    const kinematics = getTrebuchetKinematics(state.armAngle, trebuchet)
    const { longArmTip } = kinematics

    const vtx =
      -trebuchet.longArmLength *
      Math.sin(state.armAngle) *
      state.armAngularVelocity
    const vty =
      trebuchet.longArmLength *
      Math.cos(state.armAngle) *
      state.armAngularVelocity

    let prevX = longArmTip.x
    let prevY = longArmTip.y
    let prevVX = vtx
    let prevVY = vty

    const M = N - 1
    for (let i = 0; i < M; i++) {
      const px = state.slingParticles[2 * i]
      const py = state.slingParticles[2 * i + 1]
      const pvx = state.slingVelocities[2 * i]
      const pvy = state.slingVelocities[2 * i + 1]

      const dx = px - prevX
      const dy = py - prevY
      const d = Math.sqrt(dx * dx + dy * dy + 1e-12)

      if (d >= Lseg * 0.99) {
        const nx = dx / d
        const ny = dy / d
        const relVX = pvx - prevVX
        const relVY = pvy - prevVY
        const vdotn = relVX * nx + relVY * ny
        if (vdotn > 0) {
          state.slingVelocities[2 * i] -= vdotn * nx
          state.slingVelocities[2 * i + 1] -= vdotn * ny
        }
      }

      prevX = px
      prevY = py
      prevVX = state.slingVelocities[2 * i]
      prevVY = state.slingVelocities[2 * i + 1]
    }

    const dxp = state.position[0] - prevX
    const dyp = state.position[1] - prevY
    const dp = Math.sqrt(dxp * dxp + dyp * dyp + 1e-12)
    if (dp >= Lseg * 0.99) {
      const nx = dxp / dp
      const ny = dyp / dp
      const relVX = state.velocity[0] - prevVX
      const relVY = state.velocity[1] - prevVY
      const vdotn = relVX * nx + relVY * ny
      if (vdotn > 0) {
        state.velocity[0] -= vdotn * nx
        state.velocity[1] -= vdotn * ny
      }
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
    const M = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES - 1
    for (let i = 0; i < M; i++) {
      slingPoints.push([slingParticles[2 * i], slingParticles[2 * i + 1], 0])
    }
    slingPoints.push([position[0], position[1], position[2]])

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
          current: Ls,
          target: Ls,
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
    this.state = state
    this.integrator.setState(state)
  }

  reset(): void {
    this.integrator.reset()
    this.lastForces = EMPTY_FORCES
  }
}
