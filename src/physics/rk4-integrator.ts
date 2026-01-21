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

/**
 * RK4Integrator: A 4th-order Runge-Kutta integrator with adaptive sub-stepping.
 * Used for high-fidelity integration of the trebuchet DAE system.
 */
export class RK4Integrator {
  private config: RK4Config
  private accumulator = 0

  private state: PhysicsState17DOF
  private previousState: PhysicsState17DOF

  constructor(initialState: PhysicsState17DOF, config?: Partial<RK4Config>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = initialState
    this.previousState = this.cloneState(initialState)
  }

  /**
   * Updates the simulation by frameTime.
   * Uses an accumulator to maintain a fixed physics timestep (initialTimestep)
   * while performing adaptive sub-stepping within each physics step.
   */
  update(frameTime: number, derivative: DerivativeFunction): RK4Result {
    this.accumulator += frameTime

    let steps = 0

    // Fixed-timestep outer loop to maintain stability across frames
    while (this.accumulator >= this.config.initialTimestep) {
      const dt = this.config.initialTimestep
      this.previousState = this.cloneState(this.state)

      // Sub-step using adaptive logic to handle rapid force changes
      const adaptiveResult = this.adaptiveStep(this.state, derivative, dt)
      this.state = adaptiveResult.newState

      this.accumulator -= dt
      steps++

      // Safety break to prevent "Spiral of Death"
      if (steps >= this.config.maxSubsteps) break
    }

    // Alpha used for smooth visual interpolation between the two most recent states
    const interpolationAlpha = this.accumulator / this.config.initialTimestep

    return {
      newState: this.state,
      stepsTaken: steps,
      interpolationAlpha,
    }
  }

  /**
   * Performs an adaptive integration step using Richardson Extrapolation (Step Doubling).
   * Compares one full step with two half-steps to estimate local truncation error.
   */
  private adaptiveStep(
    state: PhysicsState17DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): { newState: PhysicsState17DOF; nextTimestep: number } {
    // 1. One full step of size dt
    const { derivative: d1 } = derivative(state.time, state)
    const stateFull = this.rk4Step(state, d1, derivative, dt)

    // 2. Two half-steps of size dt/2
    const dtHalf = dt * 0.5
    const stateHalf1 = this.rk4Step(state, d1, derivative, dtHalf)
    const { derivative: dHalf2 } = derivative(stateHalf1.time, stateHalf1)
    const stateHalf2 = this.rk4Step(stateHalf1, dHalf2, derivative, dtHalf)

    // 3. Error estimation (L-infinity norm of the difference)
    const error = this.calculateError(stateFull, stateHalf2)

    // 4. Adaptive timestep adjustment (Standard PID-like control for ODEs)
    let nextTimestep = dt
    if (error > 0) {
      // 5th order formula since RK4 has O(h^5) local error
      const scale = 0.9 * Math.pow(this.config.tolerance / error, 0.2)
      nextTimestep = Math.max(
        this.config.minTimestep,
        Math.min(this.config.maxTimestep, dt * scale),
      )
    }

    // Return the more accurate result (the two half-steps)
    return { newState: stateHalf2, nextTimestep }
  }

  /**
   * Calculates the maximum absolute difference (L-infinity norm) between two states.
   */
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
    checkArray(s1.cwPosition, s2.cwPosition)
    checkArray(s1.cwVelocity, s2.cwVelocity)
    checkArray(s1.slingBagPosition, s2.slingBagPosition)
    checkArray(s1.slingBagVelocity, s2.slingBagVelocity)

    const armAngleDiff = Math.abs(s1.armAngle - s2.armAngle)
    if (armAngleDiff > maxError) maxError = armAngleDiff

    const cwAngleDiff = Math.abs(s1.cwAngle - s2.cwAngle)
    if (cwAngleDiff > maxError) maxError = cwAngleDiff

    const sbAngleDiff = Math.abs(s1.slingBagAngle - s2.slingBagAngle)
    if (sbAngleDiff > maxError) maxError = sbAngleDiff

    return maxError
  }

  public getState(): PhysicsState17DOF {
    return this.state
  }

  public setState(state: PhysicsState17DOF): void {
    this.state = this.cloneState(state)
    this.previousState = this.cloneState(state)
    this.accumulator = 0
  }

  /**
   * Core 4-stage Runge-Kutta step.
   * Local error is O(h^5), global error is O(h^4).
   */
  private rk4Step(
    state: PhysicsState17DOF,
    d1: PhysicsDerivative17DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): PhysicsState17DOF {
    // Stage 2
    const state2 = this.addState(state, d1, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d2 } = derivative(state2.time, state2)

    // Stage 3
    const state3 = this.addState(state, d2, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d3 } = derivative(state3.time, state3)

    // Stage 4
    const state4 = this.addState(state, d3, dt, state.time + dt)
    const { derivative: d4 } = derivative(state4.time, state4)

    // Weighted average of stages
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
      cwPosition: this.addArrays(
        state.cwPosition,
        derivative.cwPosition,
        scale,
      ),
      cwVelocity: this.addArrays(
        state.cwVelocity,
        derivative.cwVelocity,
        scale,
      ),
      slingBagPosition: this.addArrays(
        state.slingBagPosition,
        derivative.slingBagPosition,
        scale,
      ),
      slingBagVelocity: this.addArrays(
        state.slingBagVelocity,
        derivative.slingBagVelocity,
        scale,
      ),
      armAngle: state.armAngle + derivative.armAngle * scale,
      armAngularVelocity:
        state.armAngularVelocity + derivative.armAngularVelocity * scale,
      cwAngle: state.cwAngle + derivative.cwAngle * scale,
      cwAngularVelocity:
        state.cwAngularVelocity + derivative.cwAngularVelocity * scale,
      slingBagAngle: state.slingBagAngle + derivative.slingBagAngle * scale,
      slingBagAngularVelocity:
        state.slingBagAngularVelocity +
        derivative.slingBagAngularVelocity * scale,
      windVelocity: this.addArrays(
        state.windVelocity,
        derivative.windVelocity,
        scale,
      ),
      time: newTime,
      isReleased: state.isReleased || derivative.isReleased,
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
      cwPosition: combine(
        state.cwPosition,
        d1.cwPosition,
        d2.cwPosition,
        d3.cwPosition,
        d4.cwPosition,
      ),
      cwVelocity: combine(
        state.cwVelocity,
        d1.cwVelocity,
        d2.cwVelocity,
        d3.cwVelocity,
        d4.cwVelocity,
      ),
      slingBagPosition: combine(
        state.slingBagPosition,
        d1.slingBagPosition,
        d2.slingBagPosition,
        d3.slingBagPosition,
        d4.slingBagPosition,
      ),
      slingBagVelocity: combine(
        state.slingBagVelocity,
        d1.slingBagVelocity,
        d2.slingBagVelocity,
        d3.slingBagVelocity,
        d4.slingBagVelocity,
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
      slingBagAngle:
        state.slingBagAngle +
        dto6 *
          (d1.slingBagAngle +
            2 * d2.slingBagAngle +
            2 * d3.slingBagAngle +
            d4.slingBagAngle),
      slingBagAngularVelocity:
        state.slingBagAngularVelocity +
        dto6 *
          (d1.slingBagAngularVelocity +
            2 * d2.slingBagAngularVelocity +
            2 * d3.slingBagAngularVelocity +
            d4.slingBagAngularVelocity),
      windVelocity: combine(
        state.windVelocity,
        d1.windVelocity,
        d2.windVelocity,
        d3.windVelocity,
        d4.windVelocity,
      ),
      time: state.time + dt,
      isReleased:
        state.isReleased ||
        d1.isReleased ||
        d2.isReleased ||
        d3.isReleased ||
        d4.isReleased,
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
      cwPosition: new Float64Array(state.cwPosition),
      cwVelocity: new Float64Array(state.cwVelocity),
      slingBagPosition: new Float64Array(state.slingBagPosition),
      slingBagVelocity: new Float64Array(state.slingBagVelocity),
      windVelocity: new Float64Array(state.windVelocity),
      armAngle: state.armAngle,
      armAngularVelocity: state.armAngularVelocity,
      cwAngle: state.cwAngle,
      cwAngularVelocity: state.cwAngularVelocity,
      slingBagAngle: state.slingBagAngle,
      slingBagAngularVelocity: state.slingBagAngularVelocity,
      time: state.time,
      isReleased: state.isReleased,
    }
  }

  getInterpolationAlpha(): number {
    return this.accumulator / this.config.initialTimestep
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
      cwPosition: lerp(s1.cwPosition, s2.cwPosition),
      cwVelocity: lerp(s1.cwVelocity, s2.cwVelocity),
      slingBagPosition: lerp(s1.slingBagPosition, s2.slingBagPosition),
      slingBagVelocity: lerp(s1.slingBagVelocity, s2.slingBagVelocity),
      windVelocity: lerp(s1.windVelocity, s2.windVelocity),
      armAngle: s1.armAngle * (1 - alpha) + s2.armAngle * alpha,
      armAngularVelocity:
        s1.armAngularVelocity * (1 - alpha) + s2.armAngularVelocity * alpha,
      cwAngle: s1.cwAngle * (1 - alpha) + s2.cwAngle * alpha,
      cwAngularVelocity:
        s1.cwAngularVelocity * (1 - alpha) + s2.cwAngularVelocity * alpha,
      slingBagAngle: s1.slingBagAngle * (1 - alpha) + s2.slingBagAngle * alpha,
      slingBagAngularVelocity:
        s1.slingBagAngularVelocity * (1 - alpha) +
        s2.slingBagAngularVelocity * alpha,
      time: s1.time * (1 - alpha) + s2.time * alpha,
      isReleased: s2.isReleased,
    }
  }

  reset(): void {
    this.accumulator = 0
  }
}