import { RK4Integrator } from './rk4-integrator'
import { computeDerivatives } from './derivatives'
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
      fixedTimestep: config.fixedTimestep,
      maxSubsteps: config.maxSubsteps,
      maxAccumulator: config.maxAccumulator,
    })
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
