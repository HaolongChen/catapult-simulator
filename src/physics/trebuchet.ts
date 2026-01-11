/**
 * Trebuchet Mechanics - Spring, Friction, Flexure
 *
 * Non-linear spring torque with hysteresis,
 * joint friction, efficiency,
 * arm flexure (Euler-Bernoulli beam).
 */

import type { CatapultTorque, TrebuchetProperties } from './types'

/**
 * Compute non-linear spring torque with hysteresis
 * τ = -k(θ - θ₀) - cθ̇ + hysteresis
 */
export function springTorque(
  angle: number,
  angularVelocity: number,
  properties: TrebuchetProperties,
  previousAngle?: number,
): number {
  const { springConstant, dampingCoefficient, equilibriumAngle } = properties

  const displacement = angle - equilibriumAngle

  const springTorque = -springConstant * displacement
  const dampingTorque = -dampingCoefficient * angularVelocity

  let hysteresisTorque = 0
  if (previousAngle !== undefined) {
    const hysteresis = 0.1
    const displacementChange = displacement - (previousAngle - equilibriumAngle)

    if (Math.sign(displacement) !== Math.sign(displacementChange)) {
      hysteresisTorque = hysteresis * springConstant * displacement
    }
  }

  const total = springTorque + dampingTorque + hysteresisTorque

  return total
}

/**
 * Compute joint friction torque
 * Coulomb friction with velocity threshold
 */
export function jointFriction(
  angularVelocity: number,
  properties: TrebuchetProperties,
  normalForce: number,
): number {
  const { jointFriction } = properties

  const velocityThreshold = 0.01

  if (Math.abs(angularVelocity) < velocityThreshold) {
    return 0
  }

  const sign = Math.sign(angularVelocity)
  return -sign * jointFriction * normalForce
}

/**
 * Compute angular acceleration
 * α = τ / I
 */
export function angularAcceleration(
  torque: number,
  momentOfInertia: number,
): number {
  return torque / momentOfInertia
}

/**
 * Compute arm flexure correction (Euler-Bernoulli beam)
 * τ_flexure = EI/L * f(θ)
 */
export function flexureTorque(
  angle: number,
  angularVelocity: number,
  properties: TrebuchetProperties,
): number {
  const { flexuralStiffness, armLength } = properties

  const normalizedAngle = angle / (Math.PI / 2)
  const modeShape = Math.sin(Math.PI * normalizedAngle)

  return (-flexuralStiffness / armLength) * modeShape * angularVelocity
}

/**
 * Compute energy loss factor
 * η = 1 - loss_factor
 */
export function energyLoss(
  properties: TrebuchetProperties,
  _currentEnergy: number,
  _maxEnergy: number,
): number {
  return properties.efficiency
}

/**
 * Compute total catapult torque
 */
export function catapultTorque(
  angle: number,
  angularVelocity: number,
  properties: TrebuchetProperties,
  normalForce: number,
): CatapultTorque {
  const spring = springTorque(angle, angularVelocity, properties)
  const friction = jointFriction(angularVelocity, properties, normalForce)
  const flexure = flexureTorque(angle, angularVelocity, properties)

  const total = (spring + friction + flexure) * properties.efficiency

  return {
    spring,
    damping: -properties.dampingCoefficient * angularVelocity,
    friction,
    flexure,
    total,
  }
}
