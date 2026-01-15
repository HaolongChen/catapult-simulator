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
    this.state = this.projectConstraints(result.newState)
    this.latchRelease()

    physicsLogger.log(this.state, this.lastForces, this.config)

    return this.state
  }

  private latchRelease() {
    if (this.state.orientation[0] > 0.5) return

    const {
      longArmLength: L1,
      pivotHeight: H,
      releaseAngle,
    } = this.config.trebuchet
    const { armAngle, position } = this.state
    const tipX = L1 * Math.cos(armAngle)
    const tipY = H + L1 * Math.sin(armAngle)
    const dx = position[0] - tipX
    const dy = position[1] - tipY
    const dz = position[2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 1e-12)
    const ux = dx / dist,
      uy = dy / dist

    const armVecX = Math.cos(armAngle),
      armVecY = Math.sin(armAngle)
    const slingDotArm = ux * armVecX + uy * armVecY
    const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360

    if (normAng > 45 && normAng < 270 && slingDotArm > Math.cos(releaseAngle)) {
      ;(this.state.orientation as any)[0] = 1.0
    }
  }

  private projectConstraints(state: PhysicsState17DOF): PhysicsState17DOF {
    const isReleased = state.orientation[0] > 0.5
    if (isReleased) return state

    const {
      longArmLength: L1,
      slingLength: Ls,
      pivotHeight: H,
    } = this.config.trebuchet
    const { armAngle, position } = state

    const tipX = L1 * Math.cos(armAngle)
    const tipY = H + L1 * Math.sin(armAngle)
    const dx = position[0] - tipX
    const dy = position[1] - tipY
    const dz = position[2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 1e-12)

    if (Math.abs(dist - Ls) > 0.0001) {
      const ux = dx / dist
      const uy = dy / dist
      const uz = dz / dist

      const newPos = new Float64Array(position)
      newPos[0] = tipX + ux * Ls
      newPos[1] = Math.max(0, tipY + uy * Ls)
      newPos[2] = uz * Ls

      return {
        ...state,
        position: newPos,
      }
    }
    return state
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
