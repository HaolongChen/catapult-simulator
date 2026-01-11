import { Store } from '@tanstack/store'
import {
  CatapultSimulation,
  type SimulationConfig,
} from '../physics/simulation'
import type { PhysicsState17DOF } from '../physics/types'

const DEFAULT_CONFIG: SimulationConfig = {
  fixedTimestep: 0.01,
  maxSubsteps: 100,
  maxAccumulator: 1.0,
  projectile: {
    mass: 1,
    radius: 0.05,
    area: Math.PI * 0.05 ** 2,
    dragCoefficient: 0.47,
    magnusCoefficient: 0.3,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  },
  trebuchet: {
    armLength: 10,
    counterweightMass: 1000,
    springConstant: 50000,
    dampingCoefficient: 100,
    equilibriumAngle: 0,
    jointFriction: 0.3,
    efficiency: 0.9,
    flexuralStiffness: 1000000,
  },
}

const DEFAULT_INITIAL_STATE: PhysicsState17DOF = {
  position: new Float64Array([0, 0, 0]),
  velocity: new Float64Array([0, 0, 0]),
  orientation: new Float64Array([1, 0, 0, 0]),
  angularVelocity: new Float64Array([0, 0, 0]),
  armAngle: -Math.PI / 4,
  armAngularVelocity: 0,
  windVelocity: new Float64Array([0, 0, 0]),
  time: 0,
}

export const simulationStore = new Store({
  isPlaying: false,
  state: DEFAULT_INITIAL_STATE,
  interpolationAlpha: 0,
})

export function play() {
  simulationStore.setState((s) => ({ ...s, isPlaying: true }))
}

export function pause() {
  simulationStore.setState((s) => ({ ...s, isPlaying: false }))
}

export function update(deltaTime: number) {
  const sim = getSimulationInstance()
  sim.update(deltaTime)
  simulationStore.setState((s) => ({
    ...s,
    state: sim.getRenderState(),
    interpolationAlpha: sim.getInterpolationAlpha(),
  }))
}

export function reset() {
  const sim = getSimulationInstance()
  sim.reset()
  simulationStore.setState({
    isPlaying: false,
    state: DEFAULT_INITIAL_STATE,
    interpolationAlpha: 0,
  })
}

export function setState(newState: PhysicsState17DOF) {
  const sim = getSimulationInstance()
  sim.setState(newState)
  simulationStore.setState((s) => ({ ...s, state: newState }))
}

let simulationInstance: CatapultSimulation | null = null

function getSimulationInstance(): CatapultSimulation {
  if (!simulationInstance) {
    simulationInstance = new CatapultSimulation(
      DEFAULT_INITIAL_STATE,
      DEFAULT_CONFIG,
    )
  }
  return simulationInstance
}
