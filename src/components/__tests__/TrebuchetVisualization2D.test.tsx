import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { TrebuchetVisualization2D } from '../visualization2d'
import type { FrameData } from '@/physics/types'

describe('TrebuchetVisualization2D', () => {
  const mockFrameData: FrameData = {
    time: 0,
    timestep: 0.01,
    projectile: {
      position: [5, 1, 0],
      velocity: [10, 5, 0],
      radius: 0.1,
    },
  } as unknown as FrameData

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      roundRect: vi.fn(),
    })
  })

  it('renders without crashing when frameData is provided', () => {
    expect(() => {
      render(<TrebuchetVisualization2D frameData={mockFrameData} />)
    }).not.toThrow()
  })

  it('renders a canvas element', () => {
    const { container } = render(
      <TrebuchetVisualization2D frameData={mockFrameData} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeDefined()
  })
})
