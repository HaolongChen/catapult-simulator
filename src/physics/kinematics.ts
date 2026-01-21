import type { TrebuchetProperties } from './types'

/**
 * Computes world-space geometric points for the trebuchet.
 * Centralized here to ensure consistency between physics and rendering.
 */
export function computeTrebuchetKinematics(
  armAngle: number,
  cwAngle: number,
  slingBagAngle: number,
  props: TrebuchetProperties,
) {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    counterweightRadius: Rcw,
    slingBagWidth: W,
  } = props

  // Arm Tip (Long arm)
  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)

  // Short Arm Tip (Pivot for CW hinge)
  const shortTipX = -L2 * Math.cos(armAngle)
  const shortTipY = H - L2 * Math.sin(armAngle)

  // Counterweight Pivot (Bottom of the short arm)
  const cwPivotX = shortTipX
  const cwPivotY = shortTipY

  // Counterweight Center (Solved by DAE, but kinematics provides anchor)
  const cwCenterX = cwPivotX + Rcw * Math.sin(cwAngle)
  const cwCenterY = cwPivotY - Rcw * Math.cos(cwAngle)

  // Sling Bag Attachment Points (V-Shape)
  const cosB = Math.cos(slingBagAngle)
  const sinB = Math.sin(slingBagAngle)

  // Left and Right edges of the sling bag
  const bagLeft = {
    x: -(W / 2) * cosB,
    y: -(W / 2) * sinB,
  }
  const bagRight = {
    x: (W / 2) * cosB,
    y: (W / 2) * sinB,
  }

  return {
    tip: { x: tipX, y: tipY },
    shortTip: { x: shortTipX, y: shortTipY },
    cwPivot: { x: cwPivotX, y: cwPivotY },
    cwCenter: { x: cwCenterX, y: cwCenterY },
    bagAttachments: { left: bagLeft, right: bagRight },
    pivot: { x: 0, y: H },
  }
}

/**
 * Helper to get world-space attachment points for the sling bag.
 */
export function getSlingBagAttachmentPoints(
  slingBagPos: [number, number, number],
  angle: number,
  slingBagWidth: number,
) {
  const dx = (slingBagWidth / 2) * Math.cos(angle)
  const dy = (slingBagWidth / 2) * Math.sin(angle)

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
