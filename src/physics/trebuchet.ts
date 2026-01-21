import type { TrebuchetProperties } from './types'

/**
 * Calculates the world-space kinematics of the trebuchet arm and sling bag.
 * Centralizing this logic ensures that physics and rendering stay synchronized.
 */
export function getTrebuchetKinematics(
  armAngle: number,
  slingBagPosition: Float64Array | [number, number],
  slingBagAngle: number,
  props: TrebuchetProperties,
) {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    slingBagWidth: W,
  } = props

  // 1. Arm Tips
  const longArmTip = {
    x: L1 * Math.cos(armAngle),
    y: H + L1 * Math.sin(armAngle),
  }

  const shortArmTip = {
    x: -L2 * Math.cos(armAngle),
    y: H - L2 * Math.sin(armAngle),
  }

  // 2. Sling Bag Attachment Points (Dual Ropes)
  const cosB = Math.cos(slingBagAngle)
  const sinB = Math.sin(slingBagAngle)
  const halfW = W / 2

  const bagLeftAttachment = {
    x: slingBagPosition[0] - halfW * cosB,
    y: slingBagPosition[1] - halfW * sinB,
  }

  const bagRightAttachment = {
    x: slingBagPosition[0] + halfW * cosB,
    y: slingBagPosition[1] + halfW * sinB,
  }

  return {
    longArmTip,
    shortArmTip,
    bagLeftAttachment,
    bagRightAttachment,
    pivot: { x: 0, y: H },
  }
}

/**
 * Utility for dual-rope attachment points.
 */
export function getSlingBagAttachmentPoints(
  slingBagPos: [number, number, number] | Float64Array,
  angle: number,
  slingBagWidth: number,
) {
  const cosB = Math.cos(angle)
  const sinB = Math.sin(angle)
  const dx = (slingBagWidth / 2) * cosB
  const dy = (slingBagWidth / 2) * sinB

  return {
    left: [slingBagPos[0] - dx, slingBagPos[1] - dy, 0] as [
      number,
      number,
      number,
    ],
    right: [slingBagPos[0] + dx, slingBagPos[1] + dy, 0] as [
      number,
      number,
      number,
    ],
  }
}