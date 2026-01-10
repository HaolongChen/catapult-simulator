/**
 * RK4 Integrator - Runge-Kutta 4th Order
 *
 * High-performance RK4 integrator with pre-allocated arrays.
 * Supports fixed timestep with sub-stepping for stability.
 */

import type {
  DerivativeFunction,
  PhysicsDerivative17DOF,
  PhysicsState17DOF,
  RK4Config,
  RK4Result,
} from './types'

const DEFAULT_CONFIG: RK4Config = {
  fixedTimestep: 0.01,
  maxSubsteps: 100,
  maxAccumulator: 1.0,
}

export class RK4Integrator {
  private config: RK4Config
  private accumulator: number = 0

  private state: PhysicsState17DOF
  private previousState: PhysicsState17DOF

  constructor(initialState: PhysicsState17DOF, config?: Partial<RK4Config>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = initialState
    this.previousState = this.cloneState(initialState)
  }

  update(frameTime: number, derivative: DerivativeFunction): RK4Result {
    this.accumulator += frameTime

    const clampedAccumulator = Math.min(
      this.accumulator,
      this.config.fixedTimestep * this.config.maxSubsteps,
    )

    let steps = 0
    while (clampedAccumulator >= this.config.fixedTimestep) {
      this.previousState = this.cloneState(this.state)

      const subStepSize = this.config.fixedTimestep / this.config.maxSubsteps
      for (let i = 0; i < this.config.maxSubsteps; i++) {
        this.state = this.rk4Step(this.state, derivative, subStepSize)
      }

      this.accumulator -= this.config.fixedTimestep
      steps++
    }

    const interpolationAlpha = this.accumulator / this.config.fixedTimestep

    return {
      newState: this.state,
      stepsTaken: steps,
      interpolationAlpha,
    }
  }

  private rk4Step(
    state: PhysicsState17DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): PhysicsState17DOF {
    const d1 = derivative(state.time, state)
    const state2 = this.addState(state, d1, dt * 0.5)
    const d2 = derivative(state.time + dt * 0.5, state2)
    const state3 = this.addState(state, d2, dt * 0.5)
    const d3 = derivative(state.time + dt * 0.5, state3)
    const state4 = this.addState(state, d3, dt)
    const d4 = derivative(state.time + dt, state4)

    return this.combineState(state, d1, d2, d3, d4, dt)
  }

  private addState(
    state: PhysicsState17DOF,
    derivative: PhysicsDerivative17DOF,
    scale: number,
  ): PhysicsState17DOF {
    return {
      position: this.addArrays(state.position, derivative.position, scale),
      velocity: this.addArrays(state.velocity, derivative.velocity, scale),
      orientation: this.addArrays(
        state.orientation,
        derivative.orientation,
        scale,
      ),
      angularVelocity: this.addArrays(
        state.angularVelocity,
        derivative.angularVelocity,
        scale,
      ),
      armAngle: state.armAngle + derivative.armAngle * scale,
      armAngularVelocity:
        state.armAngularVelocity + derivative.armAngularVelocity * scale,
      windVelocity: this.addArrays(
        state.windVelocity,
        derivative.windVelocity,
        scale,
      ),
      time: state.time + derivative.time * scale,
    }
  }

  private combineState(
    state: PhysicsState17DOF,
    d1: PhysicsDerivative17DOF,
    d2: PhysicsDerivative17DOF,
    d3: PhysicsDerivative17DOF,
    d4: PhysicsDerivative17DOF,
    dt: number,
  ): PhysicsState17DOF {
    const dto6 = dt / 6

    return {
      position: this.weightedSum(
        state.position,
        d1.position,
        d2.position,
        d3.position,
        d4.position,
        dto6,
      ),
      velocity: this.weightedSum(
        state.velocity,
        d1.velocity,
        d2.velocity,
        d3.velocity,
        d4.velocity,
        dto6,
      ),
      orientation: this.weightedSum(
        state.orientation,
        d1.orientation,
        d2.orientation,
        d3.orientation,
        d4.orientation,
        dto6,
      ),
      angularVelocity: this.weightedSum(
        state.angularVelocity,
        d1.angularVelocity,
        d2.angularVelocity,
        d3.angularVelocity,
        d4.angularVelocity,
        dto6,
      ),
      armAngle:
        state.armAngle +
        dto6 * (d1.armAngle + 2 * d2.armAngle + 2 * d3.armAngle + d4.armAngle),
      armAngularVelocity:
        state.armAngularVelocity +
        dto6 *
          (d1.armAngularVelocity +
            2 * d2.armAngularVelocity +
            2 * d3.armAngularVelocity +
            d4.armAngularVelocity),
      windVelocity: this.weightedSum(
        state.windVelocity,
        d1.windVelocity,
        d2.windVelocity,
        d3.windVelocity,
        d4.windVelocity,
        dto6,
      ),
      time: state.time + dt,
    }
  }

  private weightedSum(
    base: Float64Array,
    w1: Float64Array,
    w2: Float64Array,
    w3: Float64Array,
    w4: Float64Array,
    dto6: number,
  ): Float64Array {
    const result = new Float64Array(base.length)
    for (let i = 0; i < base.length; i++) {
      result[i] = base[i] + dto6 * (w1[i] + 2 * w2[i] + 2 * w3[i] + w4[i])
    }
    return result
  }

  private addArrays(
    a: Float64Array,
    b: Float64Array,
    scale: number,
  ): Float64Array {
    const result = new Float64Array(a.length)
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] + b[i] * scale
    }
    return result
  }

  private cloneState(state: PhysicsState17DOF): PhysicsState17DOF {
    return {
      position: new Float64Array(state.position),
      velocity: new Float64Array(state.velocity),
      orientation: new Float64Array(state.orientation),
      angularVelocity: new Float64Array(state.angularVelocity),
      windVelocity: new Float64Array(state.windVelocity),
      armAngle: state.armAngle,
      armAngularVelocity: state.armAngularVelocity,
      time: state.time,
    }
  }

  getInterpolationAlpha(): number {
    return this.accumulator / this.config.fixedTimestep
  }

  getRenderState(): PhysicsState17DOF {
    const alpha = this.getInterpolationAlpha()
    return this.interpolateState(this.previousState, this.state, alpha)
  }

  private interpolateState(
    s1: PhysicsState17DOF,
    s2: PhysicsState17DOF,
    alpha: number,
  ): PhysicsState17DOF {
    return {
      position: this.lerpArrays(s1.position, s2.position, alpha),
      velocity: this.lerpArrays(s1.velocity, s2.velocity, alpha),
      orientation: this.lerpArrays(s1.orientation, s2.orientation, alpha),
      angularVelocity: this.lerpArrays(
        s1.angularVelocity,
        s2.angularVelocity,
        alpha,
      ),
      windVelocity: this.lerpArrays(s1.windVelocity, s2.windVelocity, alpha),
      armAngle: s1.armAngle * (1 - alpha) + s2.armAngle * alpha,
      armAngularVelocity:
        s1.armAngularVelocity * (1 - alpha) + s2.armAngularVelocity * alpha,
      time: s1.time * (1 - alpha) + s2.time * alpha,
    }
  }

  private lerpArrays(
    a: Float64Array,
    b: Float64Array,
    t: number,
  ): Float64Array {
    const result = new Float64Array(a.length)
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] * (1 - t) + b[i] * t
    }
    return result
  }

  reset(): void {
    this.accumulator = 0
  }
}
