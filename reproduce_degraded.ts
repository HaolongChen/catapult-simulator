import { CatapultSimulation } from './src/physics/simulation'
import { createInitialState, createConfig } from './src/physics/config'

console.log('Reproducing degraded mode at t=0.14s\n')

const config = createConfig()
console.log('Default config:')
console.log('  counterweightMass:', config.trebuchet.counterweightMass)
console.log('  slingLength:', config.trebuchet.slingLength)
console.log()

const sim = new CatapultSimulation(createInitialState(config), config)

for (let i = 0; i < 200; i++) {
  sim.update(0.01)
  const state = sim.getState()

  // @ts-expect-error accessing private
  const degraded = sim.integrator?.degraded

  if (degraded && i > 0) {
    console.log(`⚠️  DEGRADED MODE at frame ${i}, t=${state.time.toFixed(3)}s`)
    console.log(
      `  Arm angle: ${((state.armAngle * 180) / Math.PI).toFixed(2)}°`,
    )
    console.log(`  Arm velocity: ${state.armAngularVelocity.toFixed(4)} rad/s`)
    console.log(
      `  Proj pos: [${state.position[0].toFixed(3)}, ${state.position[1].toFixed(3)}]`,
    )
    console.log(
      `  Proj vel: [${state.velocity[0].toFixed(3)}, ${state.velocity[1].toFixed(3)}]`,
    )
    console.log(
      `  CW pos: [${state.cwPosition[0].toFixed(3)}, ${state.cwPosition[1].toFixed(3)}]`,
    )
    break
  }

  if (i % 10 === 0) {
    console.log(
      `Frame ${i}, t=${state.time.toFixed(2)}s: ${degraded ? 'DEGRADED' : 'OK'}`,
    )
  }
}
