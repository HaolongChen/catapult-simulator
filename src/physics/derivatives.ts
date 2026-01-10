/**
 * Physics Derivatives - Combines all forces
 *
 * Computes time derivatives of 17-DOF state vector.
 */

import type {
  PhysicsDerivative17DOF,
  PhysicsState17DOF,
  ProjectileProperties,
  TrebuchetProperties,
} from './types'
import { aerodynamicForce } from './aerodynamics'
import { catapultTorque, type CatapultTorque } from './trebuchet'
import { ATMOSPHERIC_CONSTANTS } from './atmosphere'

/**
 * Compute gravitational force
 * F_g = m g (altitude-dependent)
 */
function gravitationalForce(mass: number, altitude: number): Float64Array {
  const { gravity } = ATMOSPHERIC_CONSTANTS

  const result = new Float64Array(3)
  result[0] = 0
  result[1] = -mass * gravity
  result[2] = 0

  return result
}

/**
 * Compute spin vector from angular velocity
 * S = ω × r
 */
function spinVector(
  angularVelocity: Float64Array,
  radius: number,
): Float64Array {
  const result = new Float64Array(3)
  result[0] = angularVelocity[0] * radius
  result[1] = angularVelocity[1] * radius
  result[2] = angularVelocity[2] * radius
  return result
}

/**
 * Compute total force on projectile
 * F_total = F_g + F_d + F_m
 */
function totalForce(
  position: Float64Array,
  velocity: Float64Array,
  spinVector: Float64Array,
  projectile: ProjectileProperties,
  windVelocity: Float64Array,
): Float64Array {
  const relativeVelocity = new Float64Array(3)
  relativeVelocity[0] = velocity[0] - windVelocity[0]
  relativeVelocity[1] = velocity[1] - windVelocity[1]
  relativeVelocity[2] = velocity[2] - windVelocity[2]

  const gravity = gravitationalForce(projectile.mass, position[1])
  const aero = aerodynamicForce(
    relativeVelocity,
    spinVector,
    projectile,
    position[1],
    288.15,
  )

  const result = new Float64Array(3)
  result[0] = gravity[0] + aero.total[0]
  result[1] = gravity[1] + aero.total[1]
  result[2] = gravity[2] + aero.total[2]

  return result
}

/**
 * Compute quaternion derivative from angular velocity
 * q̇ = 0.5 * ω * q
 */
function quaternionDerivative(
  orientation: Float64Array,
  angularVelocity: Float64Array,
): Float64Array {
  const qw = orientation[0]
  const qx = orientation[1]
  const qy = orientation[2]
  const qz = orientation[3]
  const ωx = angularVelocity[0]
  const ωy = angularVelocity[1]
  const ωz = angularVelocity[2]

  const result = new Float64Array(4)
  result[0] = 0.5 * (ωx * qx + ωy * qy + ωz * qz)
  result[1] = 0.5 * (ωy * qw - ωx * qz + ωz * qx)
  result[2] = 0.5 * (ωz * qw - ωx * qy + ωy * qx)
  result[3] = 0.5 * (ωx * qz - ωy * qx + ωz * qy)

  return result
}

/**
 * Normalize quaternion to prevent drift
 */
function normalizeQuaternion(q: Float64Array): Float64Array {
  const norm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2)
  const result = new Float64Array(4)
  result[0] = q[0] / norm
  result[1] = q[1] / norm
  result[2] = q[2] / norm
  result[3] = q[3] / norm
  return result
}

/**
 * Compute projectile acceleration (F/m)
 */
function projectileAcceleration(
  position: Float64Array,
  velocity: Float64Array,
  orientation: Float64Array,
  angularVelocity: Float64Array,
  projectile: ProjectileProperties,
  windVelocity: Float64Array,
): Float64Array {
  const force = totalForce(
    position,
    velocity,
    angularVelocity,
    projectile,
    windVelocity,
  )
  const mass = projectile.mass

  const result = new Float64Array(3)
  result[0] = force[0] / mass
  result[1] = force[1] / mass
  result[2] = force[2] / mass

  return result
}

/**
 * Compute catapult angular acceleration
 * α = τ / I
 */
function catapultAcceleration(
  torque: CatapultTorque,
  momentOfInertia: number,
): number {
  return torque.total / momentOfInertia
}

/**
 * Compute complete state derivatives
 */
export function computeDerivatives(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchet: TrebuchetProperties,
  normalForce: number,
): PhysicsDerivative17DOF {
  const spin = spinVector(state.angularVelocity, projectile.radius)

  const positionDeriv = state.velocity
  const velocityDeriv = projectileAcceleration(
    state.position,
    state.velocity,
    state.orientation,
    state.angularVelocity,
    projectile,
    state.windVelocity,
  )

  const orientationDeriv = quaternionDerivative(
    state.orientation,
    state.angularVelocity,
  )
  const normalizedOrientation = normalizeQuaternion(state.orientation)

  const momentOfInertia =
    (trebuchet.counterweightMass * trebuchet.armLength ** 2) / 3

  const angularVelocityDeriv = catapultAcceleration(
    catapultTorque(
      state.armAngle,
      state.armAngularVelocity,
      trebuchet,
      normalForce,
    ),
    momentOfInertia,
  )

  const armAngleDeriv = state.armAngularVelocity
  const armAngularVelocityDeriv = catapultAcceleration(
    catapultTorque(
      state.armAngle,
      state.armAngularVelocity,
      trebuchet,
      normalForce,
    ),
    momentOfInertia,
  )

  const windVelocityDeriv = new Float64Array([0, 0, 0])

  return {
    position: positionDeriv,
    velocity: velocityDeriv,
    orientation: orientationDeriv,
    angularVelocity: angularVelocityDeriv,
    armAngle: armAngleDeriv,
    armAngularVelocity: armAngularVelocityDeriv,
    windVelocity: windVelocityDeriv,
    time: 1,
  }
}
