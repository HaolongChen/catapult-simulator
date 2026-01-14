import { Store } from '@tanstack/store'
import { CatapultSimulation } from '../physics/simulation'
import { stateTracer } from './state-tracer'
import type { SimulationConfig } from '../physics/simulation'
import type { PhysicsForces, PhysicsState17DOF } from '../physics/types'

const DEFAULT_CONFIG: SimulationConfig = {
  fixedTimestep: 0.005,
  maxSubsteps: 200,
  maxAccumulator: 1.0,
  projectile: {
    mass: 1,
    radius: 0.35,
    area: Math.PI * 0.35 ** 2,
    dragCoefficient: 0.47,
    magnusCoefficient: 0.3,
    momentOfInertia: new Float64Array([0.05, 0.05, 0.05]),
    spin: 0,
  },
  trebuchet: {
    longArmLength: 8,
    shortArmLength: 2,
    counterweightMass: 2500,
    counterweightRadius: 1.5,
    slingLength: 6,
    releaseAngle: (45 * Math.PI) / 180,
    springConstant: 0,
    dampingCoefficient: 5,
    equilibriumAngle: 0,
    jointFriction: 0.1,
    efficiency: 1.0,
    flexuralStiffness: 0,
    armMass: 100,
    pivotHeight: 5,
  },
}

const EMPTY_FORCES: PhysicsForces = {
  drag: new Float64Array(3),
  magnus: new Float64Array(3),
  gravity: new Float64Array(3),
  tension: new Float64Array(3),
  total: new Float64Array(3),
}

function getInitialState(config: SimulationConfig): PhysicsState17DOF {
  const { longArmLength, pivotHeight, slingLength } = config.trebuchet

  const cockedAngle = -Math.asin(
    Math.min((pivotHeight - 0.5) / longArmLength, 1.0),
  )
  const tipX = longArmLength * Math.cos(cockedAngle)
  const px = tipX - slingLength

  return {
    position: new Float64Array([px, 0, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle: cockedAngle,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
  }
}

export interface SimulationStoreState {
  isPlaying: boolean
  state: PhysicsState17DOF
  forces: PhysicsForces
  config: SimulationConfig
  interpolationAlpha: number
}

export const simulationStore = new Store<SimulationStoreState>({
  isPlaying: false,
  state: getInitialState(DEFAULT_CONFIG),
  forces: EMPTY_FORCES,
  config: DEFAULT_CONFIG,
  interpolationAlpha: 0,
})

export function updateConfig(newConfig: Partial<SimulationConfig>) {
  simulationStore.setState((s) => {
    const updatedConfig = {
      ...s.config,
      ...newConfig,
      projectile: { ...s.config.projectile, ...newConfig.projectile },
      trebuchet: { ...s.config.trebuchet, ...newConfig.trebuchet },
    }

    const initialState = getInitialState(updatedConfig)
    simulationInstance = new CatapultSimulation(initialState, updatedConfig)

    return {
      ...s,
      config: updatedConfig,
      state: initialState,
      forces: EMPTY_FORCES,
    }
  })
}

export function play() {
  simulationStore.setState((s) => ({ ...s, isPlaying: true }))
}

export function pause() {
  simulationStore.setState((s) => ({ ...s, isPlaying: false }))
}

export function update(deltaTime: number) {
  const sim = getSimulationInstance()
  sim.update(deltaTime)
  const newState = sim.getRenderState()
  const lastForces = sim.getLastForces()

  simulationStore.setState((s) => {
    return {
      ...s,
      state: newState,
      forces: lastForces,
      interpolationAlpha: sim.getInterpolationAlpha(),
    }
  })

  stateTracer.record()
}

export function reset() {
  const initialState = getInitialState(simulationStore.state.config)
  simulationInstance = new CatapultSimulation(
    initialState,
    simulationStore.state.config,
  )
  simulationStore.setState((s) => ({
    ...s,
    isPlaying: false,
    state: initialState,
    forces: EMPTY_FORCES,
    interpolationAlpha: 0,
  }))
}

export function setState(newState: PhysicsState17DOF) {
  const sim = getSimulationInstance()
  sim.setState(newState)
  simulationStore.setState((s) => ({ ...s, state: newState }))
}

let simulationInstance: CatapultSimulation | null = null

function getSimulationInstance(): CatapultSimulation {
  if (!simulationInstance) {
    const initialState = getInitialState(simulationStore.state.config)
    simulationInstance = new CatapultSimulation(
      initialState,
      simulationStore.state.config,
    )
  }
  return simulationInstance
}
