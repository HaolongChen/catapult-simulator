import React from 'react'

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  zoomRef: React.MutableRefObject<number>,
) {
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1

  const gridWidthMeters = Math.ceil(canvas.width / zoomRef.current / 5) * 5
  const gridHeightMeters = Math.ceil(canvas.height / zoomRef.current / 5) * 5

  ctx.beginPath()
  ctx.font = '10px monospace'
  ctx.fillStyle = '#475569'

  for (let i = -gridWidthMeters / 2; i <= gridWidthMeters / 2; i += 5) {
    const x = toCanvasX(i)
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    if (i !== 0) ctx.fillText(`${i}m`, x + 2, canvas.height - 10)
  }

  for (let i = 0; i <= gridHeightMeters; i += 5) {
    const y = toCanvasY(i)
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    if (i !== 0) ctx.fillText(`${i}m`, 5, y - 2)
  }
  ctx.stroke()

  // Draw Projectile Guide Rail (滑轨) as an inset trench
  const railX0 = -20
  const railX1 = 20
  const railDepth = 0.2
  const ry = toCanvasY(0)
  const rheight = Math.abs(toCanvasY(railDepth) - ry)
  const rx0 = toCanvasX(railX0)
  const rx1 = toCanvasX(railX1)

  ctx.save()
  // Trench background (dark)
  const trenchGrad = ctx.createLinearGradient(0, ry, 0, ry + rheight)
  trenchGrad.addColorStop(0, '#020617') // Very dark top
  trenchGrad.addColorStop(1, '#1e293b') // Slightly lighter bottom

  ctx.fillStyle = trenchGrad
  ctx.beginPath()
  ctx.roundRect(rx0, ry, rx1 - rx0, rheight, 2)
  ctx.fill()

  // Inner shadow/stroke to give 'inset' feel
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Bottom light reflection
  ctx.beginPath()
  ctx.moveTo(rx0 + 5, ry + rheight - 1)
  ctx.lineTo(rx1 - 5, ry + rheight - 1)
  ctx.strokeStyle = 'rgba(148,163,184,0.15)'
  ctx.stroke()
  ctx.restore()

  // Origin point
  ctx.beginPath()
  ctx.arc(toCanvasX(0), toCanvasY(0), 4, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4444'
  ctx.fill()
  ctx.fillText('(0,0)', toCanvasX(0) + 6, toCanvasY(0) + 12)
}
