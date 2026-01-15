import type {
  DerivativeFunction,
  PhysicsDerivative17DOF,
  PhysicsState17DOF,
  RK4Config,
  RK4Result,
} from './types'

export type { RK4Config }

const DEFAULT_CONFIG: RK4Config = {
  initialTimestep: 0.001,
  maxSubsteps: 1000,
  maxAccumulator: 1.0,
  tolerance: 1e-6,
  minTimestep: 1e-7,
  maxTimestep: 0.01,
}

export class RK4Integrator {
  private config: RK4Config
  private accumulator = 0
  private currentTimestep: number

  private state: PhysicsState17DOF
  private previousState: PhysicsState17DOF

  constructor(initialState: PhysicsState17DOF, config?: Partial<RK4Config>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = initialState
    this.previousState = this.cloneState(initialState)
    this.currentTimestep = this.config.initialTimestep
  }

  update(frameTime: number, derivative: DerivativeFunction): RK4Result {
    this.accumulator += frameTime

    let steps = 0
    const targetAccumulator = this.currentTimestep

    while (
      this.accumulator >= targetAccumulator &&
      steps < this.config.maxSubsteps
    ) {
      this.previousState = this.cloneState(this.state)

      const adaptiveResult = this.adaptiveStep(
        this.state,
        derivative,
        this.currentTimestep,
      )
      this.state = adaptiveResult.newState
      this.currentTimestep = adaptiveResult.nextTimestep

      this.accumulator -= targetAccumulator
      steps++
    }

    const interpolationAlpha = this.accumulator / this.currentTimestep

    return {
      newState: this.state,
      stepsTaken: steps,
      interpolationAlpha,
    }
  }

  private adaptiveStep(
    state: PhysicsState17DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): { newState: PhysicsState17DOF; nextTimestep: number } {
    const { derivative: d1 } = derivative(state.time, state)
    const stateFull = this.rk4Step(state, d1, derivative, dt)

    const dtHalf = dt * 0.5
    const stateHalf1 = this.rk4Step(state, d1, derivative, dtHalf)
    const { derivative: dHalf2 } = derivative(stateHalf1.time, stateHalf1)
    const stateHalf2 = this.rk4Step(stateHalf1, dHalf2, derivative, dtHalf)

    const error = this.calculateError(stateFull, stateHalf2)

    let nextTimestep = dt
    if (error > 0) {
      const scale = 0.9 * Math.pow(this.config.tolerance / error, 0.2)
      nextTimestep = Math.max(
        this.config.minTimestep,
        Math.min(this.config.maxTimestep, dt * scale),
      )
    }

    return { newState: stateHalf2, nextTimestep }
  }

  private calculateError(s1: PhysicsState17DOF, s2: PhysicsState17DOF): number {
    let maxError = 0

    const checkArray = (a: Float64Array, b: Float64Array) => {
      for (let i = 0; i < a.length; i++) {
        const diff = Math.abs(a[i] - b[i])
        if (diff > maxError) maxError = diff
      }
    }

    checkArray(s1.position, s2.position)
    checkArray(s1.velocity, s2.velocity)

    const armAngleDiff = Math.abs(s1.armAngle - s2.armAngle)
    if (armAngleDiff > maxError) maxError = armAngleDiff

    const cwAngleDiff = Math.abs(s1.cwAngle - s2.cwAngle)
    if (cwAngleDiff > maxError) maxError = cwAngleDiff

    return maxError
  }

  public getState(): PhysicsState17DOF {
    return this.state
  }

  private rk4Step(
    state: PhysicsState17DOF,
    d1: PhysicsDerivative17DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): PhysicsState17DOF {
    const state2 = this.addState(state, d1, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d2 } = derivative(state2.time, state2)

    const state3 = this.addState(state, d2, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d3 } = derivative(state3.time, state3)

    const state4 = this.addState(state, d3, dt, state.time + dt)
    const { derivative: d4 } = derivative(state4.time, state4)

    return this.combineState(state, d1, d2, d3, d4, dt)
  }

  private addState(
    state: PhysicsState17DOF,
    derivative: PhysicsDerivative17DOF,
    scale: number,
    newTime: number,
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
      cwAngle: state.cwAngle + derivative.cwAngle * scale,
      cwAngularVelocity:
        state.cwAngularVelocity + derivative.cwAngularVelocity * scale,
      windVelocity: this.addArrays(
        state.windVelocity,
        derivative.windVelocity,
        scale,
      ),
      time: newTime,
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
    const combine = (
      s: Float64Array,
      v1: Float64Array,
      v2: Float64Array,
      v3: Float64Array,
      v4: Float64Array,
    ) => {
      const res = new Float64Array(s.length)
      for (let i = 0; i < s.length; i++) {
        res[i] = s[i] + dto6 * (v1[i] + 2 * v2[i] + 2 * v3[i] + v4[i])
      }
      return res
    }

    return {
      position: combine(
        state.position,
        d1.position,
        d2.position,
        d3.position,
        d4.position,
      ),
      velocity: combine(
        state.velocity,
        d1.velocity,
        d2.velocity,
        d3.velocity,
        d4.velocity,
      ),
      orientation: combine(
        state.orientation,
        d1.orientation,
        d2.orientation,
        d3.orientation,
        d4.orientation,
      ),
      angularVelocity: combine(
        state.angularVelocity,
        d1.angularVelocity,
        d2.angularVelocity,
        d3.angularVelocity,
        d4.angularVelocity,
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
      cwAngle:
        state.cwAngle +
        dto6 * (d1.cwAngle + 2 * d2.cwAngle + 2 * d3.cwAngle + d4.cwAngle),
      cwAngularVelocity:
        state.cwAngularVelocity +
        dto6 *
          (d1.cwAngularVelocity +
            2 * d2.cwAngularVelocity +
            2 * d3.cwAngularVelocity +
            d4.cwAngularVelocity),
      windVelocity: combine(
        state.windVelocity,
        d1.windVelocity,
        d2.windVelocity,
        d3.windVelocity,
        d4.windVelocity,
      ),
      time: state.time + dt,
    }
  }

  private addArrays(
    a: Float64Array,
    b: Float64Array,
    scale: number,
  ): Float64Array {
    const res = new Float64Array(a.length)
    for (let i = 0; i < a.length; i++) res[i] = a[i] + b[i] * scale
    return res
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
      cwAngle: state.cwAngle,
      cwAngularVelocity: state.cwAngularVelocity,
      time: state.time,
    }
  }

  getInterpolationAlpha(): number {
    return this.accumulator / this.currentTimestep
  }

  getRenderState(): PhysicsState17DOF {
    const alpha = this.getInterpolationAlpha()
    if (alpha <= 0.0001) return this.state
    if (alpha >= 0.9999) return this.state
    return this.interpolateState(this.previousState, this.state, alpha)
  }

  private interpolateState(
    s1: PhysicsState17DOF,
    s2: PhysicsState17DOF,
    alpha: number,
  ): PhysicsState17DOF {
    const lerp = (a: Float64Array, b: Float64Array) => {
      const res = new Float64Array(a.length)
      for (let i = 0; i < a.length; i++)
        res[i] = a[i] * (1 - alpha) + b[i] * alpha
      return res
    }
    return {
      position: lerp(s1.position, s2.position),
      velocity: lerp(s1.velocity, s2.velocity),
      orientation: lerp(s1.orientation, s2.orientation),
      angularVelocity: lerp(s1.angularVelocity, s2.angularVelocity),
      windVelocity: lerp(s1.windVelocity, s2.windVelocity),
      armAngle: s1.armAngle * (1 - alpha) + s2.armAngle * alpha,
      armAngularVelocity:
        s1.armAngularVelocity * (1 - alpha) + s2.armAngularVelocity * alpha,
      cwAngle: s1.cwAngle * (1 - alpha) + s2.cwAngle * alpha,
      cwAngularVelocity:
        s1.cwAngularVelocity * (1 - alpha) + s2.cwAngularVelocity * alpha,
      time: s1.time * (1 - alpha) + s2.time * alpha,
    }
  }

  reset(): void {
    this.accumulator = 0
  }
}
