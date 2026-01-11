import { createFileRoute } from '@tanstack/react-router'
import { Scene } from '@/components/visualization/Scene'

export const Route = createFileRoute('/demo/start/simulation')({
  ssr: false,
  component: Simulation,
})

function Simulation() {
  return <Scene />
}
