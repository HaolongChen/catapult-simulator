import type { CatapultTorque, TrebuchetProperties } from './types'

export function springTorque(
  angle: number,
  angularVelocity: number,
  properties: TrebuchetProperties,
  previousAngle?: number,
): number {
  const { springConstant, dampingCoefficient, equilibriumAngle } = properties

  const displacement = angle - equilibriumAngle

  const sTorque = -springConstant * displacement
  const dTorque = -dampingCoefficient * angularVelocity

  let hysteresisTorque = 0
  if (previousAngle !== undefined) {
    const hysteresis = 0.1
    const displacementChange = displacement - (previousAngle - equilibriumAngle)

    if (Math.sign(displacement) !== Math.sign(displacementChange)) {
      hysteresisTorque = hysteresis * springConstant * displacement
    }
  }

  return sTorque + dTorque + hysteresisTorque
}

export function jointFriction(
  angularVelocity: number,
  properties: TrebuchetProperties,
  normalForce: number,
): number {
  const { jointFriction: mu } = properties

  const velocityThreshold = 0.01

  if (Math.abs(angularVelocity) < velocityThreshold) {
    return 0
  }

  const sign = Math.sign(angularVelocity)

  return -sign * mu * normalForce
}

export function flexureTorque(
  angle: number,
  angularVelocity: number,
  properties: TrebuchetProperties,
): number {
  const { flexuralStiffness, equilibriumAngle } = properties
  const displacement = angle - equilibriumAngle

  return -flexuralStiffness * displacement * Math.abs(angularVelocity)
}

export function energyLoss(
  properties: TrebuchetProperties,
  _kineticEnergy: number,
  _potentialEnergy: number,
): number {
  return properties.efficiency
}

export function catapultTorque(
  angle: number,
  angularVelocity: number,
  properties: TrebuchetProperties,
  normalForce: number,
  previousAngle?: number,
): CombinedTorque {
  const spring = springTorque(angle, angularVelocity, properties, previousAngle)
  const friction = jointFriction(angularVelocity, properties, normalForce)
  const flexure = flexureTorque(angle, angularVelocity, properties)

  const total = (spring + friction + flexure) * properties.efficiency

  return {
    spring,
    friction,
    flexure,
    damping: -properties.dampingCoefficient * angularVelocity,
    total,
  }
}

export interface CombinedTorque extends CatapultTorque {
  total: number
}
