import type {
  DerivativeFunction,
  PhysicsDerivative,
  PhysicsState,
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
  releaseAngle: 0,
}

export class RK4Integrator {
  private config: RK4Config
  private accumulator = 0

  private state: PhysicsState
  private previousState: PhysicsState

  constructor(initialState: PhysicsState, config?: Partial<RK4Config>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = initialState
    this.previousState = this.cloneState(initialState)
  }

  update(frameTime: number, derivative: DerivativeFunction): RK4Result {
    this.accumulator += frameTime
    let steps = 0
    while (this.accumulator >= this.config.initialTimestep) {
      const dt = this.config.initialTimestep
      this.previousState = this.cloneState(this.state)
      const adaptiveResult = this.adaptiveStep(this.state, derivative, dt)
      this.state = adaptiveResult.newState
      this.accumulator -= dt
      steps++
      if (steps >= this.config.maxSubsteps) break
    }
    const interpolationAlpha = this.accumulator / this.config.initialTimestep
    return {
      newState: this.state,
      stepsTaken: steps,
      interpolationAlpha,
    }
  }

  private adaptiveStep(
    state: PhysicsState,
    derivative: DerivativeFunction,
    dt: number,
  ): { newState: PhysicsState; nextTimestep: number } {
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

  private calculateError(s1: PhysicsState, s2: PhysicsState): number {
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
    checkArray(s1.slingParticles, s2.slingParticles)
    checkArray(s1.slingVelocities, s2.slingVelocities)

    const armAngleDiff = Math.abs(s1.armAngle - s2.armAngle)
    if (armAngleDiff > maxError) maxError = armAngleDiff
    const cwAngleDiff = Math.abs(s1.cwAngle - s2.cwAngle)
    if (cwAngleDiff > maxError) maxError = cwAngleDiff

    if(s1.isReleased !== s2.isReleased) {
      console.log("error in isReleased calculation!")
    }

    return maxError
  }

  public getState(): PhysicsState {
    return this.state
  }

  public setState(state: PhysicsState): void {
    this.state = this.cloneState(state)
    this.previousState = this.cloneState(state)
    this.accumulator = 0
  }

  private rk4Step(
    state: PhysicsState,
    d1: PhysicsDerivative,
    derivative: DerivativeFunction,
    dt: number,
  ): PhysicsState {
    const state2 = this.addState(state, d1, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d2 } = derivative(state2.time, state2)
    const state3 = this.addState(state, d2, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d3 } = derivative(state3.time, state3)
    const state4 = this.addState(state, d3, dt, state.time + dt)
    const { derivative: d4 } = derivative(state4.time, state4)
    return this.combineState(state, d1, d2, d3, d4, dt, state4.isReleased)
  }

  private addState(
    state: PhysicsState,
    derivative: PhysicsDerivative,
    scale: number,
    newTime: number,
  ): PhysicsState {
    const addArrays = (a: Float64Array, b: Float64Array) => {
      const res = new Float64Array(a.length)
      for (let i = 0; i < a.length; i++) res[i] = a[i] + b[i] * scale
      return res
    }
    let isReleased = state.isReleased
    if (!state.isReleased) {
      const velocityAngle = Math.atan2(
        state.velocity[1],
        state.velocity[0],
      )
      if (velocityAngle >= this.config.releaseAngle) {
        isReleased = true
      }
    }
    return {
      position: addArrays(state.position, derivative.position),
      velocity: addArrays(state.velocity, derivative.velocity),
      orientation: addArrays(state.orientation, derivative.orientation),
      angularVelocity: addArrays(
        state.angularVelocity,
        derivative.angularVelocity,
      ),
      cwPosition: addArrays(state.cwPosition, derivative.cwPosition),
      cwVelocity: addArrays(state.cwVelocity, derivative.cwVelocity),
      slingParticles: addArrays(
        state.slingParticles,
        derivative.slingParticles,
      ),
      slingVelocities: addArrays(
        state.slingVelocities,
        derivative.slingVelocities,
      ),
      armAngle: state.armAngle + derivative.armAngle * scale,
      armAngularVelocity:
        state.armAngularVelocity + derivative.armAngularVelocity * scale,
      cwAngle: state.cwAngle + derivative.cwAngle * scale,
      cwAngularVelocity:
        state.cwAngularVelocity + derivative.cwAngularVelocity * scale,
      windVelocity: addArrays(state.windVelocity, derivative.windVelocity),
      time: newTime,
      isReleased: isReleased, // Topological lock
    }
  }

  private combineState(
    state: PhysicsState,
    d1: PhysicsDerivative,
    d2: PhysicsDerivative,
    d3: PhysicsDerivative,
    d4: PhysicsDerivative,
    dt: number,
    isReleased: boolean,
  ): PhysicsState {
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
      slingParticles: combine(
        state.slingParticles,
        d1.slingParticles,
        d2.slingParticles,
        d3.slingParticles,
        d4.slingParticles,
      ),
      slingVelocities: combine(
        state.slingVelocities,
        d1.slingVelocities,
        d2.slingVelocities,
        d3.slingVelocities,
        d4.slingVelocities,
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
      isReleased
    }
  }

  private cloneState(state: PhysicsState): PhysicsState {
    return {
      ...state,
      position: new Float64Array(state.position),
      velocity: new Float64Array(state.velocity),
      orientation: new Float64Array(state.orientation),
      angularVelocity: new Float64Array(state.angularVelocity),
      cwPosition: new Float64Array(state.cwPosition),
      cwVelocity: new Float64Array(state.cwVelocity),
      slingParticles: new Float64Array(state.slingParticles),
      slingVelocities: new Float64Array(state.slingVelocities),
      windVelocity: new Float64Array(state.windVelocity),
    }
  }

  getInterpolationAlpha(): number {
    return this.accumulator / this.config.initialTimestep
  }

  getRenderState(): PhysicsState {
    const alpha = this.getInterpolationAlpha()
    if (alpha <= 0.0001) return this.state
    if (alpha >= 0.9999) return this.state
    return this.interpolateState(this.previousState, this.state, alpha)
  }

  private interpolateState(
    s1: PhysicsState,
    s2: PhysicsState,
    alpha: number,
  ): PhysicsState {
    const lerp = (a: Float64Array, b: Float64Array) => {
      const res = new Float64Array(a.length)
      for (let i = 0; i < a.length; i++)
        res[i] = a[i] * (1 - alpha) + b[i] * alpha
      return res
    }
    return {
      ...s2,
      position: lerp(s1.position, s2.position),
      velocity: lerp(s1.velocity, s2.velocity),
      orientation: lerp(s1.orientation, s2.orientation),
      angularVelocity: lerp(s1.angularVelocity, s2.angularVelocity),
      cwPosition: lerp(s1.cwPosition, s2.cwPosition),
      cwVelocity: lerp(s1.cwVelocity, s2.cwVelocity),
      slingParticles: lerp(s1.slingParticles, s2.slingParticles),
      slingVelocities: lerp(s1.slingVelocities, s2.slingVelocities),
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
