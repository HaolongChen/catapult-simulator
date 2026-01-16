import type { TrebuchetProperties, CatapultTorque } from "./types";

export function springTorque(
  angle: number,
  _angularVelocity: number,
  props: TrebuchetProperties,
): number {
  return -props.springConstant * (angle - props.equilibriumAngle);
}

export function jointFriction(
  angularVelocity: number,
  props: TrebuchetProperties,
  normalForce: number,
): number {
  if (Math.abs(angularVelocity) < 1e-2) return 0;
  return -Math.sign(angularVelocity) * props.jointFriction * normalForce;
}

export function flexureTorque(
  _angle: number,
  angularVelocity: number,
  props: TrebuchetProperties,
): number {
  return -props.flexuralStiffness * angularVelocity;
}

export function energyLoss(props: TrebuchetProperties): number {
  return props.efficiency;
}

export function catapultTorque(
  angle: number,
  angularVelocity: number,
  props: TrebuchetProperties,
  normalForce: number,
): CatapultTorque {
  const spring = springTorque(angle, angularVelocity, props);
  const friction = jointFriction(angularVelocity, props, normalForce);
  const flexure = flexureTorque(angle, angularVelocity, props);
  const damping = -props.dampingCoefficient * angularVelocity;

  return {
    spring,
    damping,
    friction,
    flexure,
    total: spring + damping + friction + flexure,
  };
}
