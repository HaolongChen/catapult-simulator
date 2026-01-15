import { RK4Integrator } from './rk4-integrator'
import { computeDerivatives } from './derivatives'
import { physicsLogger } from './logging'
import type {
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
    this.normalForce = config.trebuchet.counterweightMass * 9.81
    this.integrator = new RK4Integrator(initialState, {
      initialTimestep: config.initialTimestep,
      maxSubsteps: config.maxSubsteps,
      maxAccumulator: config.maxAccumulator,
      tolerance: config.tolerance,
      minTimestep: config.minTimestep,
      maxTimestep: config.maxTimestep,
    })
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
    this.state = result.newState

    const q = this.state.orientation
    const qMag = Math.sqrt(
      q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3],
    )
    if (qMag > 1e-12) {
      this.state = {
        ...this.state,
        orientation: new Float64Array([
          q[0] / qMag,
          q[1] / qMag,
          q[2] / qMag,
          q[3] / qMag,
        ]),
      }
    }

    // Check for release condition
    if (!this.state.isReleased) {
      const tension = this.lastForces.tension
      const tensionMag = Math.sqrt(
        tension[0] ** 2 + tension[1] ** 2 + tension[2] ** 2,
      )
      const releaseThreshold = 0.1 * this.config.projectile.mass * 9.81

      // Get arm angle to check if it's upward
      const normAng =
        ((((this.state.armAngle * 180) / Math.PI) % 360) + 360) % 360
      const isUpward = normAng > 45 && normAng < 225

      if (isUpward && tensionMag < releaseThreshold) {
        this.state = {
          ...this.state,
          isReleased: true,
        }
      }
    }

    physicsLogger.log(this.state, this.lastForces, this.config)

    return this.state
  }

  getLastForces(): PhysicsForces {
    return this.lastForces
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
  }

  reset(): void {
    this.integrator.reset()
    this.lastForces = EMPTY_FORCES
  }
}
