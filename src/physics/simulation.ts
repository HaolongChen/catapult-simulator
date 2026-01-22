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
  private accumulator = 0

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
    const dt = this.config.initialTimestep
    this.accumulator += deltaTime

    while (this.accumulator >= dt) {
      // 1. DISCRETE TRIGGER: Sample exactly once at step start (tn)
      if (!this.state.isReleased) {
        // Use radians for consistent internal physics
        const velocityAngle = Math.atan2(
          this.state.velocity[1],
          this.state.velocity[0],
        )
        const releaseThreshold = this.config.trebuchet.releaseAngle

        if (velocityAngle >= releaseThreshold) {
          console.log(this.state.velocity[0])
          console.log(this.state.velocity[1])
          this.state = { ...this.state, isReleased: true }
        }
      }

      // 2. INTEGRATION: Full step with locked topology
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

      // integrator.update would run its own loop, so we use rk4Step directly or similar.
      // Actually, since we're already in a loop, we just need one step.
      // We'll use the integrator's internal state management.
      this.integrator.setState(this.state)
      const result = this.integrator.update(dt, derivativeFunction)
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

      // 3. ENFORCEMENT
      this.projectConstraints(newState)
      this.projectVelocities(newState)

      if (newState.position[1] < this.config.projectile.radius) {
        newState.position[1] = this.config.projectile.radius
        if (!newState.isReleased) {
          if (newState.velocity[1] < 0) newState.velocity[1] = 0
        } else {
          // Bounce off ground
          if (newState.velocity[1] < 0) newState.velocity[1] *= -0.2
        }
      }

      this.state = newState
      this.accumulator -= dt
    }

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

    const projectionFactor = 0.5
    for (let i = 0; i < N; i++) {
      const px = state.slingParticles[2 * i]
      const py = state.slingParticles[2 * i + 1]
      const dx = px - prevX
      const dy = py - prevY
      const d = Math.sqrt(dx * dx + dy * dy + 1e-12)

      const threshold = Lseg * 1.01
      if (d > threshold) {
        const corr = (d - threshold) * projectionFactor
        state.slingParticles[2 * i] = prevX + (dx / d) * (threshold + corr)
        state.slingParticles[2 * i + 1] = prevY + (dy / d) * (threshold + corr)
      }
      prevX = state.slingParticles[2 * i]
      prevY = state.slingParticles[2 * i + 1]
    }

    // 3. Lock Projection (Before release)
    if (!state.isReleased) {
      // Force Proj and PN to be identical for stability
      state.position[0] = state.slingParticles[2 * (N - 1)]
      state.position[1] = state.slingParticles[2 * (N - 1) + 1]
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

    for (let i = 0; i < N; i++) {
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
        // Use a small elasticity/threshold to prevent excessive energy loss
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
    for (let i = 0; i < N; i++) {
      slingPoints.push([slingParticles[2 * i], slingParticles[2 * i + 1], 0])
    }

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
