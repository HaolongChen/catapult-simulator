import { RK4Integrator } from './rk4-integrator'
import { computeDerivatives } from './derivatives'
import type { PhysicsState17DOF, SimulationConfig } from './types'

export type { SimulationConfig }

export class CatapultSimulation {
  private integrator: RK4Integrator
  private state: PhysicsState17DOF
  private config: SimulationConfig
  private normalForce: number
  private derivativeFunction: (t: number, state: PhysicsState17DOF) => any

  constructor(initialState: PhysicsState17DOF, config: SimulationConfig) {
    this.state = initialState
    this.config = config
    this.normalForce = config.trebuchet.counterweightMass * 9.81
    this.derivativeFunction = (_t: number, state: PhysicsState17DOF) =>
      computeDerivatives(
        state,
        this.config.projectile,
        this.config.trebuchet,
        this.normalForce,
      )
    this.integrator = new RK4Integrator(initialState, {
      fixedTimestep: config.fixedTimestep,
      maxSubsteps: config.maxSubsteps,
      maxAccumulator: config.maxAccumulator,
    })
  }

  update(deltaTime: number): PhysicsState17DOF {
    const result = this.integrator.update(deltaTime, this.derivativeFunction)
    this.state = result.newState
    return this.state
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
  }
}
