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
  readonly groundNormal: number
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

export interface FrameData {
  // Time
  time: number
  timestep: number

  // Projectile
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

  // Arm
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

  // Counterweight
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

  // Sling
  sling: {
    isAttached: boolean
    startPoint: [number, number, number]
    endPoint: [number, number, number]
    length: number
    tension: number
    tensionVector: [number, number, number]
  }

  // Ground
  ground: {
    height: number
    normalForce: number
  }

  // Forces (for debug visualization)
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

  // Constraints (for debug visualization)
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

  // Phase
  phase: string
}
