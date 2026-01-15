export interface AtmosphericConstants {
  seaLevelDensity: number
  seaLevelPressure: number
  seaLevelTemperature: number
  gravity: number
  scaleHeight: number
  airMolarMass: number
  universalGasConstant: number
  sutherlandT0: number
  sutherlandMu0: number
  sutherlandS: number
}

export interface PhysicsState17DOF {
  readonly position: Float64Array
  readonly velocity: Float64Array
  readonly orientation: Float64Array
  readonly angularVelocity: Float64Array
  readonly armAngle: number
  readonly armAngularVelocity: number
  readonly cwAngle: number
  readonly cwAngularVelocity: number
  readonly windVelocity: Float64Array
  readonly time: number
  readonly isReleased: boolean
}

export interface PhysicsDerivative17DOF {
  readonly position: Float64Array
  readonly velocity: Float64Array
  readonly orientation: Float64Array
  readonly angularVelocity: Float64Array
  readonly armAngle: number
  readonly armAngularVelocity: number
  readonly cwAngle: number
  readonly cwAngularVelocity: number
  readonly windVelocity: Float64Array
  readonly time: number
  readonly isReleased: boolean
}

export interface ProjectileProperties {
  mass: number
  radius: number
  area: number
  dragCoefficient: number
  magnusCoefficient: number
  momentOfInertia: Float64Array
  spin: number
}

export interface TrebuchetProperties {
  longArmLength: number
  shortArmLength: number
  counterweightMass: number
  counterweightRadius: number
  slingLength: number
  releaseAngle: number
  springConstant: number
  dampingCoefficient: number
  equilibriumAngle: number
  jointFriction: number
  efficiency: number
  flexuralStiffness: number
  armMass: number
  pivotHeight: number
}

export interface SimulationConfig {
  initialTimestep: number
  maxSubsteps: number
  maxAccumulator: number
  tolerance: number
  minTimestep: number
  maxTimestep: number
  projectile: ProjectileProperties
  trebuchet: TrebuchetProperties
}

export interface PhysicsForces {
  readonly drag: Float64Array
  readonly magnus: Float64Array
  readonly gravity: Float64Array
  readonly tension: Float64Array
  readonly total: Float64Array
}

export type DerivativeFunction = (
  t: number,
  state: PhysicsState17DOF,
) => {
  derivative: PhysicsDerivative17DOF
  forces: PhysicsForces
}

export interface RK4Config {
  initialTimestep: number
  maxSubsteps: number
  maxAccumulator: number
  tolerance: number
  minTimestep: number
  maxTimestep: number
}

export interface RK4Result {
  newState: PhysicsState17DOF
  stepsTaken: number
  interpolationAlpha: number
}

export interface AerodynamicForce {
  readonly drag: Float64Array
  readonly magnus: Float64Array
  readonly total: Float64Array
}

export interface CatapultTorque {
  readonly spring: number
  readonly damping: number
  readonly friction: number
  readonly flexure: number
  readonly total: number
}
