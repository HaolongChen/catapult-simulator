import type {
  DerivativeFunction,
  PhysicsDerivative19DOF,
  PhysicsState19DOF,
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

  private state: PhysicsState19DOF
  private previousState: PhysicsState19DOF

  constructor(initialState: PhysicsState19DOF, config?: Partial<RK4Config>) {
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

  public getInterpolationAlpha(): number {
    return this.accumulator / this.config.initialTimestep
  }

  private adaptiveStep(
    state: PhysicsState19DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): { newState: PhysicsState19DOF; nextTimestep: number } {
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

  private calculateError(s1: PhysicsState19DOF, s2: PhysicsState19DOF): number {
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

  public getState(): PhysicsState19DOF {
    return this.state
  }

  public setState(state: PhysicsState19DOF): void {
    this.state = this.cloneState(state)
    this.previousState = this.cloneState(state)
    this.accumulator = 0
  }

  private rk4Step(
    state: PhysicsState19DOF,
    d1: PhysicsDerivative19DOF,
    derivative: DerivativeFunction,
    dt: number,
  ): PhysicsState19DOF {
    const state2 = this.addState(state, d1, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d2 } = derivative(state2.time, state2)
    const state3 = this.addState(state, d2, dt * 0.5, state.time + dt * 0.5)
    const { derivative: d3 } = derivative(state3.time, state3)
    const state4 = this.addState(state, d3, dt, state.time + dt)
    const { derivative: d4 } = derivative(state4.time, state4)
    return this.combineState(state, d1, d2, d3, d4, dt)
  }

  private addState(
    state: PhysicsState19DOF,
    derivative: PhysicsDerivative19DOF,
    scale: number,
    newTime: number,
  ): PhysicsState19DOF {
    const addArr = (a: Float64Array, b: Float64Array) => {
      const res = new Float64Array(a.length)
      for (let i = 0; i < a.length; i++) res[i] = a[i] + b[i] * scale
      return res
    }
    return {
      position: addArr(state.position, derivative.position),
      velocity: addArr(state.velocity, derivative.velocity),
      orientation: addArr(state.orientation, derivative.orientation),
      angularVelocity: addArr(
        state.angularVelocity,
        derivative.angularVelocity,
      ),
      cwPosition: addArr(state.cwPosition, derivative.cwPosition),
      cwVelocity: addArr(state.cwVelocity, derivative.cwVelocity),
      slingBagPosition: addArr(
        state.slingBagPosition,
        derivative.slingBagPosition,
      ),
      slingBagVelocity: addArr(
        state.slingBagVelocity,
        derivative.slingBagVelocity,
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
      windVelocity: addArr(state.windVelocity, derivative.windVelocity),
      time: newTime,
      isReleased: state.isReleased || derivative.isReleased,
    }
  }

  private combineState(
    state: PhysicsState19DOF,
    d1: PhysicsDerivative19DOF,
    d2: PhysicsDerivative19DOF,
    d3: PhysicsDerivative19DOF,
    d4: PhysicsDerivative19DOF,
    dt: number,
  ): PhysicsState19DOF {
    const d6 = dt / 6
    const combArr = (
      s: Float64Array,
      v1: Float64Array,
      v2: Float64Array,
      v3: Float64Array,
      v4: Float64Array,
    ) => {
      const res = new Float64Array(s.length)
      for (let i = 0; i < s.length; i++)
        res[i] = s[i] + d6 * (v1[i] + 2 * v2[i] + 2 * v3[i] + v4[i])
      return res
    }
    const combVal = (
      s: number,
      v1: number,
      v2: number,
      v3: number,
      v4: number,
    ) => s + d6 * (v1 + 2 * v2 + 2 * v3 + v4)

    return {
      position: combArr(
        state.position,
        d1.position,
        d2.position,
        d3.position,
        d4.position,
      ),
      velocity: combArr(
        state.velocity,
        d1.velocity,
        d2.velocity,
        d3.velocity,
        d4.velocity,
      ),
      orientation: combArr(
        state.orientation,
        d1.orientation,
        d2.orientation,
        d3.orientation,
        d4.orientation,
      ),
      angularVelocity: combArr(
        state.angularVelocity,
        d1.angularVelocity,
        d2.angularVelocity,
        d3.angularVelocity,
        d4.angularVelocity,
      ),
      cwPosition: combArr(
        state.cwPosition,
        d1.cwPosition,
        d2.cwPosition,
        d3.cwPosition,
        d4.cwPosition,
      ),
      cwVelocity: combArr(
        state.cwVelocity,
        d1.cwVelocity,
        d2.cwVelocity,
        d3.cwVelocity,
        d4.cwVelocity,
      ),
      slingBagPosition: combArr(
        state.slingBagPosition,
        d1.slingBagPosition,
        d2.slingBagPosition,
        d3.slingBagPosition,
        d4.slingBagPosition,
      ),
      slingBagVelocity: combArr(
        state.slingBagVelocity,
        d1.slingBagVelocity,
        d2.slingBagVelocity,
        d3.slingBagVelocity,
        d4.slingBagVelocity,
      ),
      armAngle: combVal(
        state.armAngle,
        d1.armAngle,
        d2.armAngle,
        d3.armAngle,
        d4.armAngle,
      ),
      armAngularVelocity: combVal(
        state.armAngularVelocity,
        d1.armAngularVelocity,
        d2.armAngularVelocity,
        d3.armAngularVelocity,
        d4.armAngularVelocity,
      ),
      cwAngle: combVal(
        state.cwAngle,
        d1.cwAngle,
        d2.cwAngle,
        d3.cwAngle,
        d4.cwAngle,
      ),
      cwAngularVelocity: combVal(
        state.cwAngularVelocity,
        d1.cwAngularVelocity,
        d2.cwAngularVelocity,
        d3.cwAngularVelocity,
        d4.cwAngularVelocity,
      ),
      slingBagAngle: combVal(
        state.slingBagAngle,
        d1.slingBagAngle,
        d2.slingBagAngle,
        d3.slingBagAngle,
        d4.slingBagAngle,
      ),
      slingBagAngularVelocity: combVal(
        state.slingBagAngularVelocity,
        d1.slingBagAngularVelocity,
        d2.slingBagAngularVelocity,
        d3.slingBagAngularVelocity,
        d4.slingBagAngularVelocity,
      ),
      windVelocity: combArr(
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

  private cloneState(state: PhysicsState19DOF): PhysicsState19DOF {
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

  getRenderState(): PhysicsState19DOF {
    const alpha = this.accumulator / this.config.initialTimestep
    if (alpha <= 0.0001) return this.state
    if (alpha >= 0.9999) return this.state
    return this.interpolateState(this.previousState, this.state, alpha)
  }

  private interpolateState(
    s1: PhysicsState19DOF,
    s2: PhysicsState19DOF,
    alpha: number,
  ): PhysicsState19DOF {
    const lerpArr = (a: Float64Array, b: Float64Array) => {
      const res = new Float64Array(a.length)
      for (let i = 0; i < a.length; i++)
        res[i] = a[i] * (1 - alpha) + b[i] * alpha
      return res
    }
    const lerpVal = (a: number, b: number) => a * (1 - alpha) + b * alpha
    return {
      position: lerpArr(s1.position, s2.position),
      velocity: lerpArr(s1.velocity, s2.velocity),
      orientation: lerpArr(s1.orientation, s2.orientation),
      angularVelocity: lerpArr(s1.angularVelocity, s2.angularVelocity),
      cwPosition: lerpArr(s1.cwPosition, s2.cwPosition),
      cwVelocity: lerpArr(s1.cwVelocity, s2.cwVelocity),
      slingBagPosition: lerpArr(s1.slingBagPosition, s2.slingBagPosition),
      slingBagVelocity: lerpArr(s1.slingBagVelocity, s2.slingBagVelocity),
      windVelocity: lerpArr(s1.windVelocity, s2.windVelocity),
      armAngle: lerpVal(s1.armAngle, s2.armAngle),
      armAngularVelocity: lerpVal(s1.armAngularVelocity, s2.armAngularVelocity),
      cwAngle: lerpVal(s1.cwAngle, s2.cwAngle),
      cwAngularVelocity: lerpVal(s1.cwAngularVelocity, s2.cwAngularVelocity),
      slingBagAngle: lerpVal(s1.slingBagAngle, s2.slingBagAngle),
      slingBagAngularVelocity: lerpVal(
        s1.slingBagAngularVelocity,
        s2.slingBagAngularVelocity,
      ),
      time: lerpVal(s1.time, s2.time),
      isReleased: s2.isReleased,
    }
  }

  reset(): void {
    this.accumulator = 0
  }
}
