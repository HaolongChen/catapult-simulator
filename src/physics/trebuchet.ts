import type { TrebuchetProperties } from './types'

/**
 * Calculates the world-space kinematics of the trebuchet arm and sling bag.
 * Centralizing this logic ensures that physics and rendering stay synchronized.
 */
export function getTrebuchetKinematics(
  armAngle: number,
  _slingBagPosition: Float64Array | [number, number],
  _slingBagAngle: number,
  props: TrebuchetProperties,
) {
  const { longArmLength: L1, shortArmLength: L2, pivotHeight: H } = props

  // 1. Arm Tips
  const longArmTip = {
    x: L1 * Math.cos(armAngle),
    y: H + L1 * Math.sin(armAngle),
  }

  const shortArmTip = {
    x: -L2 * Math.cos(armAngle),
    y: H - L2 * Math.sin(armAngle),
  }

  return {
    longArmTip,
    shortArmTip,
    pivot: { x: 0, y: H },
  }
}
