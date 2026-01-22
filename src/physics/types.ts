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

/**
 * 19-DOF High Fidelity Physics State
 * Uses redundant world-space coordinates for numerical stability.
 */
export interface PhysicsState {
  // Arm
  readonly armAngle: number
  readonly armAngularVelocity: number

  // Counterweight (Hinged)
  readonly cwPosition: Float64Array // [x, y]
  readonly cwVelocity: Float64Array // [vx, vy]
  readonly cwAngle: number
  readonly cwAngularVelocity: number

  // Projectile (Last particle of the sling when attached)
  readonly position: Float64Array // [x, y, z]
  readonly velocity: Float64Array // [vx, vy, vz]
  readonly orientation: Float64Array // [q1, q2, q3, q4]
  readonly angularVelocity: Float64Array // [wx, wy, wz]

  // Intermediate Sling Particles (including terminal pouch particle)
  readonly slingParticles: Float64Array // [x1, y1, x2, y2, ..., xN, yN] where N = NUM_SLING_PARTICLES
  readonly slingVelocities: Float64Array // [vx1, vy1, ..., vxN, vyN]

  // Environment & Meta
  readonly windVelocity: Float64Array
  readonly time: number
  readonly isReleased: boolean
}

export interface PhysicsDerivative {
  readonly armAngle: number
  readonly armAngularVelocity: number
  readonly cwPosition: Float64Array
  readonly cwVelocity: Float64Array
  readonly cwAngle: number
  readonly cwAngularVelocity: number
  readonly slingParticles: Float64Array
  readonly slingVelocities: Float64Array
  readonly position: Float64Array
  readonly velocity: Float64Array
  readonly orientation: Float64Array
  readonly angularVelocity: Float64Array
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
  counterweightRadius: number // Distance to CW hinge
  counterweightInertia: number // Inertia of CW container
  slingLength: number
  releaseAngle: number
  jointFriction: number
  armMass: number
  pivotHeight: number
  ropeStiffness?: number // Elastic stiffness (N/m per segment)
  ropeDamping?: number // Internal viscosity (N·s/m per segment)
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
  readonly groundNormal: number
  readonly checkFunction: number // J * q_dot norm
  readonly lambda: Float64Array // Raw multipliers for debugging
}

export type DerivativeFunction = (
  t: number,
  state: PhysicsState,
) => {
  derivative: PhysicsDerivative
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
  newState: PhysicsState
  stepsTaken: number
  interpolationAlpha: number
}

export interface AerodynamicForce {
  readonly drag: Float64Array
  readonly magnus: Float64Array
  readonly total: Float64Array
}

export interface FrameData {
  time: number
  timestep: number
  projectile: {
    position: [number, number, number]
    orientation: [number, number, number, number]
    velocity: [number, number, number]
    angularVelocity: [number, number, number]
    radius: number
    boundingBox: {
      min: [number, number, number]
      max: [number, number, number]
    }
  }
  arm: {
    angle: number
    angularVelocity: number
    pivot: [number, number, number]
    longArmTip: [number, number, number]
    shortArmTip: [number, number, number]
    longArmLength: number
    shortArmLength: number
    boundingBox: {
      min: [number, number, number]
      max: [number, number, number]
    }
  }
  counterweight: {
    angle: number
    angularVelocity: number
    position: [number, number, number]
    radius: number
    attachmentPoint: [number, number, number]
    boundingBox: {
      min: [number, number, number]
      max: [number, number, number]
    }
  }
  sling: {
    isAttached: boolean
    points: [number, number, number][] // All points including arm tip, intermediate, and projectile
    length: number
    tension: number
    tensionVector: [number, number, number]
  }
  ground: {
    height: number
    normalForce: number
  }
  forces: {
    projectile: {
      gravity: [number, number, number]
      drag: [number, number, number]
      magnus: [number, number, number]
      tension: [number, number, number]
      total: [number, number, number]
    }
    arm: {
      springTorque: number
      dampingTorque: number
      frictionTorque: number
      totalTorque: number
    }
  }
  constraints: {
    slingLength: {
      current: number
      target: number
      violation: number
    }
    groundContact: {
      penetration: number
      isActive: boolean
    }
  }
  phase: string
}
