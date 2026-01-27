import type { FrameData } from '@/physics/types'

export async function saveTrajectory(
  trajectory: FrameData[],
): Promise<boolean> {
  try {
    const response = await fetch('/api/save-trajectory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trajectory, null, 2),
    })

    if (!response.ok) {
      throw new Error(`Failed to save trajectory: ${response.statusText}`)
    }

    return true
  } catch (error) {
    console.error('Error saving trajectory:', error)
    return false
  }
}
