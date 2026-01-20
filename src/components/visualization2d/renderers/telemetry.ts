export function renderTrajectory(
  ctx: CanvasRenderingContext2D,
  trajectory: [number, number][],
  toCanvasX: (x: number) => number,
  toCanvasY: (y: number) => number,
  showTrajectory: boolean,
) {
  if (!showTrajectory || trajectory.length < 2) return

  ctx.beginPath()
  ctx.moveTo(toCanvasX(trajectory[0][0]), toCanvasY(trajectory[0][1]))

  for (let i = 1; i < trajectory.length; i++) {
    ctx.lineTo(toCanvasX(trajectory[i][0]), toCanvasY(trajectory[i][1]))
  }

  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.stroke()
  ctx.setLineDash([])
}

export function renderPhaseIndicator(
  ctx: CanvasRenderingContext2D,
  phase: string,
) {
  const badgeY = 30
  const badgeHeight = 24

  let bgColor = '#3b82f6'
  if (phase === 'released') bgColor = '#10b981'
  else if (phase === 'ground_dragging') bgColor = '#f59e0b'

  ctx.fillStyle = bgColor
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(20, badgeY - badgeHeight / 2, 100, badgeHeight, 4)
  } else {
    ctx.rect(20, badgeY - badgeHeight / 2, 100, badgeHeight)
  }
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(phase.toUpperCase().replace('_', ' '), 70, badgeY + 4)
}
