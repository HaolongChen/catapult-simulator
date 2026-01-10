/**
 * Physics Simulation - Complete Simulation Orchestrator
 *
 * Combines RK4 integrator with physics derivatives
 * for complete catapult + projectile simulation.
 */

import { RK4Integrator, type RK4Config } from './rk4-integrator'
import { computeDerivatives, type DerivativeFunction } from './derivatives'
import type {
  PhysicsDerivative17DOF,
  PhysicsState17DOF,
  ProjectileProperties,
  TrebuchetProperties,
} from './types'

export interface SimulationConfig extends Partial<RK4Config> {
  projectile: ProjectileProperties
  trebuchet: TrebuchetProperties
}

export class CatapultSimulation {
  private integrator: RK4Integrator
  private derivativeFunction: DerivativeFunction
  private normalForce: number

  constructor(initialState: PhysicsState17DOF, config: SimulationConfig) {
    this.normalForce = (config.trebuchet?.counterweightMass ?? 1000) * 9.81 // mg
    this.derivativeFunction = (t: number, state: PhysicsState17DOF) =>
      computeDerivatives(
        state,
        config.projectile ?? {
          mass: 1,
          radius: 0.05,
          area: Math.PI * 0.05 ** 2,
          dragCoefficient: 0.47,
          magnusCoefficient: 0.3,
          momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
          spin: 0,
        },
        config.trebuchet ?? {
          armLength: 10,
          counterweightMass: 1000,
          springConstant: 50000,
          dampingCoefficient: 100,
          equilibriumAngle: 0,
          jointFriction: 0.3,
          efficiency: 0.9,
          flexuralStiffness: 1000000,
        },
        this.normalForce,
      )

    this.integrator = new RK4Integrator(initialState, config)
  }

  update(frameTime: number): PhysicsState17DOF {
    const result = this.integrator.update(frameTime, this.derivativeFunction)
    return result.newState
  }

  getRenderState(): PhysicsState17DOF {
    return this.integrator.getRenderState()
  }

  getInterpolationAlpha(): number {
    return this.integrator.getInterpolationAlpha()
  }

  reset(): void {
    this.integrator.reset()
  }

  setState(state: PhysicsState17DOF): void {
    this.integrator['state'] = state
  }
}
