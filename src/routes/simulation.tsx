import { createFileRoute } from '@tanstack/react-router'
import { Scene } from '@/components/visualization/Scene'

export const Route = createFileRoute('/simulation')({
  component: Simulation,
})

function Simulation() {
  return <Scene />
}
