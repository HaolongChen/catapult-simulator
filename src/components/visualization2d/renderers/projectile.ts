import type { FrameData } from '@/physics/types'

export function renderProjectile(
  ctx: CanvasRenderingContext2D,
  currentFrameData: FrameData,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  zoomRef: React.MutableRefObject<number>,
  rotationAngleRef: React.MutableRefObject<number>,
) {
  const { projectile, slingBag } = currentFrameData
  const projX = toCanvasX(projectile.position[0])
  const projY = toCanvasY(projectile.position[1])

  // Bag centered on projectile
  const slingBagX = projX
  const slingBagY = projY

  const projRadius = projectile.radius * zoomRef.current
  const slingBagWidth = slingBag.width * zoomRef.current
  const slingBagDepth = projRadius * 1.2

  // 1. Draw SlingBag (Pure fabric, no slingBag)
  ctx.save()
  ctx.translate(slingBagX, slingBagY)
  ctx.rotate(slingBag.angle)

  // Create fabric gradient
  const grad = ctx.createLinearGradient(0, -slingBagDepth / 2, 0, slingBagDepth)
  grad.addColorStop(0.0, '#475569') // Slate 600
  grad.addColorStop(0.5, '#1e293b') // Slate 900
  grad.addColorStop(1.0, '#0f172a') // Slate 950

  ctx.beginPath()
  // Bottom curve (the 'belly' of the slingBag)
  ctx.moveTo(-slingBagWidth / 2, 0)
  ctx.bezierCurveTo(
    -slingBagWidth / 4,
    slingBagDepth,
    slingBagWidth / 4,
    slingBagDepth,
    slingBagWidth / 2,
    0,
  )
  // Top edge (slightly curved inwards)
  ctx.bezierCurveTo(
    slingBagWidth / 4,
    slingBagDepth * 0.2,
    -slingBagWidth / 4,
    slingBagDepth * 0.2,
    -slingBagWidth / 2,
    0,
  )

  ctx.fillStyle = grad
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 6
  ctx.fill()

  // Highlight edge
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()

  // 2. Projectile itself
  const vx = projectile.velocity[0]
  const vy = projectile.velocity[1]
  const vMag = Math.sqrt(vx * vx + vy * vy)

  let rotationAngle = 0
  if (vMag > 0.1) {
    rotationAngle = Math.atan2(-vy, vx)
    rotationAngleRef.current = rotationAngle
  } else {
    rotationAngle = rotationAngleRef.current
  }

  ctx.beginPath()
  ctx.arc(projX, projY, Math.max(2, projRadius), 0, Math.PI * 2)
  ctx.fillStyle = '#d4af37' // Gold
  ctx.fill()
  ctx.strokeStyle = '#854d0e'
  ctx.lineWidth = 1
  ctx.stroke()

  // Rotation detail
  ctx.beginPath()
  ctx.moveTo(projX, projY)
  ctx.lineTo(
    projX + Math.cos(rotationAngle) * projRadius * 0.8,
    projY + Math.sin(rotationAngle) * projRadius * 0.8,
  )
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2
  ctx.stroke()
}

export function renderVelocityVector(
  ctx: CanvasRenderingContext2D,
  currentFrameData: FrameData,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  showVelocity: boolean,
) {
  if (!showVelocity) return

  const { projectile } = currentFrameData
  const projX = toCanvasX(projectile.position[0])
  const projY = toCanvasY(projectile.position[1])

  const vx = projectile.velocity[0]
  const vy = projectile.velocity[1]
  const vMag = Math.sqrt(vx * vx + vy * vy)

  const arrowLength = Math.min(vMag * 20, 500)
  const angle = Math.atan2(-vy, vx)

  ctx.beginPath()
  ctx.moveTo(projX, projY)
  ctx.lineTo(
    projX + Math.cos(angle) * arrowLength,
    projY + Math.sin(angle) * arrowLength,
  )

  ctx.strokeStyle = '#06b6d4'
  ctx.lineWidth = 2
  ctx.stroke()

  const headSize = 8
  ctx.beginPath()
  ctx.moveTo(
    projX + Math.cos(angle) * arrowLength,
    projY + Math.sin(angle) * arrowLength,
  )
  ctx.lineTo(
    projX +
      Math.cos(angle) * arrowLength -
      Math.cos(angle - Math.PI / 6) * headSize,
    projY +
      Math.sin(angle) * arrowLength -
      Math.sin(angle - Math.PI / 6) * headSize,
  )
  ctx.moveTo(
    projX + Math.cos(angle) * arrowLength,
    projY + Math.sin(angle) * arrowLength,
  )
  ctx.lineTo(
    projX +
      Math.cos(angle) * arrowLength -
      Math.cos(angle + Math.PI / 6) * headSize,
    projY +
      Math.sin(angle) * arrowLength -
      Math.sin(angle + Math.PI / 6) * headSize,
  )
  ctx.stroke()

  ctx.fillStyle = '#06b6d4'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`v=${vMag.toFixed(1)}m/s`, projX + 10, projY - 10)
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fx: number,
  fy: number,
  color: string,
) {
  const fMag = Math.sqrt(fx * fx + fy * fy)

  const scaleForce = 10
  const arrowLength = Math.min(fMag * scaleForce, 400)
  const angle = Math.atan2(-fy, fx)

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(
    x + Math.cos(angle) * arrowLength,
    y + Math.sin(angle) * arrowLength,
  )
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()

  const headSize = 6
  ctx.beginPath()
  ctx.moveTo(
    x + Math.cos(angle) * arrowLength,
    y + Math.sin(angle) * arrowLength,
  )
  ctx.lineTo(
    x +
      Math.cos(angle) * arrowLength -
      Math.cos(angle - Math.PI / 6) * headSize,
    y +
      Math.sin(angle) * arrowLength -
      Math.sin(angle - Math.PI / 6) * headSize,
  )
  ctx.moveTo(
    x + Math.cos(angle) * arrowLength,
    y + Math.sin(angle) * arrowLength,
  )
  ctx.lineTo(
    x +
      Math.cos(angle) * arrowLength -
      Math.cos(angle + Math.PI / 6) * headSize,
    y +
      Math.sin(angle) * arrowLength -
      Math.sin(angle + Math.PI / 6) * headSize,
  )
  ctx.stroke()
}

export function renderForceVectors(
  ctx: CanvasRenderingContext2D,
  currentFrameData: FrameData,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  showForces: boolean,
) {
  if (!showForces) return

  const { projectile } = currentFrameData
  const projX = toCanvasX(projectile.position[0])
  const projY = toCanvasY(projectile.position[1])

  drawArrow(
    ctx,
    projX,
    projY,
    currentFrameData.forces.projectile.gravity[0],
    currentFrameData.forces.projectile.gravity[1],
    '#ef4444',
  )
  drawArrow(
    ctx,
    projX,
    projY,
    currentFrameData.forces.projectile.drag[0],
    currentFrameData.forces.projectile.drag[1],
    '#8b5cf6',
  )
  if (currentFrameData.sling.isAttached) {
    drawArrow(
      ctx,
      projX,
      projY,
      currentFrameData.forces.projectile.tension[0],
      currentFrameData.forces.projectile.tension[1],
      '#8b4513',
    )
  }
}
