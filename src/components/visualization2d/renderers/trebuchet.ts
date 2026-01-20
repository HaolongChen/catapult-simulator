import type { FrameData } from '@/physics/types'

export function renderTrebuchet(
  ctx: CanvasRenderingContext2D,
  currentFrameData: FrameData,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  zoomRef: React.MutableRefObject<number>,
) {
  const { arm, counterweight, sling } = currentFrameData

  const pivotX = toCanvasX(arm.pivot[0])
  const pivotY = toCanvasY(arm.pivot[1])
  const longTipX = toCanvasX(arm.longArmTip[0])
  const longTipY = toCanvasY(arm.longArmTip[1])
  const shortTipX = toCanvasX(arm.shortArmTip[0])
  const shortTipY = toCanvasY(arm.shortArmTip[1])

  ctx.beginPath()
  ctx.moveTo(shortTipX, shortTipY)
  ctx.lineTo(longTipX, longTipY)
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#1e293b'
  ctx.fill()

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

  ctx.beginPath()
  ctx.moveTo(shortTipX, shortTipY)
  ctx.lineTo(cwX, cwY)
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.stroke()

  if (sling.isAttached) {
    ctx.beginPath()
    ctx.moveTo(toCanvasX(sling.startPoint[0]), toCanvasY(sling.startPoint[1]))
    ctx.lineTo(toCanvasX(sling.endPoint[0]), toCanvasY(sling.endPoint[1]))
    ctx.strokeStyle = '#8b4513'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}
