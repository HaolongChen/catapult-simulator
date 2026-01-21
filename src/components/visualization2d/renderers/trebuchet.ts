import type { FrameData } from '@/physics/types'
import { getSlingBagAttachmentPoints } from './projectile'

export function renderTrebuchet(
  ctx: CanvasRenderingContext2D,
  currentFrameData: FrameData,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  zoomRef: React.MutableRefObject<number>,
) {
  const { arm, counterweight, slingBag } = currentFrameData

  const pivotX = toCanvasX(arm.pivot[0])
  const pivotY = toCanvasY(arm.pivot[1])
  const longTipX = toCanvasX(arm.longArmTip[0])
  const longTipY = toCanvasY(arm.longArmTip[1])
  const shortTipX = toCanvasX(arm.shortArmTip[0])
  const shortTipY = toCanvasY(arm.shortArmTip[1])

  // 1. Draw Arm
  ctx.beginPath()
  ctx.moveTo(shortTipX, shortTipY)
  ctx.lineTo(longTipX, longTipY)
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.stroke()

  // 2. Draw Pivot
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#1e293b'
  ctx.fill()
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.stroke()

  // 3. Draw Counterweight
  const cwX = toCanvasX(counterweight.position[0])
  const cwY = toCanvasY(counterweight.position[1])
  const cwRadius = counterweight.radius * zoomRef.current

  ctx.beginPath()
  ctx.arc(cwX, cwY, cwRadius, 0, Math.PI * 2)
  ctx.fillStyle = '#475569'
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.stroke()

  // 4. Draw CW Rope
  ctx.beginPath()
  ctx.moveTo(shortTipX, shortTipY)
  ctx.lineTo(cwX, cwY)
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.stroke()

  // 5. Draw V-Shape Dual Sling
  const slingBagWidthPhys = 0.1 * 3.5
  const attachments = getSlingBagAttachmentPoints(
    slingBag.position,
    slingBag.angle,
    slingBagWidthPhys,
  )

  const leftSlotX = toCanvasX(attachments.left[0])
  const leftSlotY = toCanvasY(attachments.left[1])
  const rightSlotX = toCanvasX(attachments.right[0])
  const rightSlotY = toCanvasY(attachments.right[1])

  ctx.beginPath()
  ctx.moveTo(longTipX, longTipY)
  ctx.lineTo(leftSlotX, leftSlotY)
  ctx.moveTo(longTipX, longTipY)
  ctx.lineTo(rightSlotX, rightSlotY)

  ctx.strokeStyle = '#8b4513'
  ctx.lineWidth = 1.2
  ctx.globalAlpha = 0.8
  ctx.stroke()
  ctx.globalAlpha = 1.0
}
