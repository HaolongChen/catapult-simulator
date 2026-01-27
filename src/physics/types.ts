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
  armAngle: number
  armAngularVelocity: number

  // Counterweight (Hinged)
  cwPosition: Float64Array // [x, y]
  cwVelocity: Float64Array // [vx, vy]
  cwAngle: number
  cwAngularVelocity: number

  // Projectile (Last particle of the sling when attached)
  position: Float64Array // [x, y, z]
  velocity: Float64Array // [vx, vy, vz]
  orientation: Float64Array // [q1, q2, q3, q4]
  angularVelocity: Float64Array // [wx, wy, wz]

  // Intermediate Sling Particles (including terminal pouch particle)
  slingParticles: Float64Array // [x1, y1, x2, y2, ..., xN, yN] where N = NUM_SLING_PARTICLES
  slingVelocities: Float64Array // [vx1, vy1, ..., vxN, vyN]

  // Environment & Meta
  windVelocity: Float64Array
  time: number
  isReleased: boolean
}

export interface PhysicsDerivative {
  armAngle: number
  armAngularVelocity: number
  cwPosition: Float64Array
  cwVelocity: Float64Array
  cwAngle: number
  cwAngularVelocity: number
  slingParticles: Float64Array
  slingVelocities: Float64Array
  position: Float64Array
  velocity: Float64Array
  orientation: Float64Array
  angularVelocity: Float64Array
  windVelocity: Float64Array
  time: number
  isReleased: boolean
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
  jointFriction: number // Bearing friction coefficient (dimensionless, ~0.1)
  angularDamping: number // Rotational damping rate (rad/s or Hz, ~1-10)
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
  drag: Float64Array
  magnus: Float64Array
  gravity: Float64Array
  tension: Float64Array
  total: Float64Array
  groundNormal: number
  checkFunction: number // J * q_dot norm
  lambda: Float64Array // Raw multipliers for debugging
  armTorques: {
    pivotFriction: number
    slingDamping: number
    slingAttachmentFriction: number
    cwDamping: number
    cwHingeFriction: number
    total: number
  }
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
  releaseAngle: number
}

export interface RK4Result {
  newState: PhysicsState
  stepsTaken: number
  interpolationAlpha: number
}

export interface AerodynamicForce {
  drag: Float64Array
  magnus: Float64Array
  total: Float64Array
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
