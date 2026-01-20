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

  ctx.beginPath()
  ctx.arc(toCanvasX(0), toCanvasY(0), 4, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4444'
  ctx.fill()
  ctx.fillText('(0,0)', toCanvasX(0) + 6, toCanvasY(0) + 12)
}
