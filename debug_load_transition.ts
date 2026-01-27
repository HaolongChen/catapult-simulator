import { CatapultSimulation } from './src/physics/simulation'
import { computeDerivatives } from './src/physics/derivatives'
import { createConfig, createInitialState } from './src/physics/config'

const config = createConfig()
config.trebuchet.counterweightMass = 1000
config.initialTimestep = 0.001

let state = createInitialState(config)
const sim = new CatapultSimulation(state, config)

console.log('=== DEBUGGING LOAD TRANSITION ===\n')
console.log('Initial state:')
console.log('  CW position:', state.cwPosition)
console.log('  Arm angle:', state.armAngle)

for (let i = 0; i < 50; i++) {
  const res = computeDerivatives(
    state,
    config.projectile,
    config.trebuchet,
    100000,
  )

  if (i < 10 || i % 10 === 0) {
    console.log(`\nStep ${i}:`)
    console.log(
      '  Ground normal force:',
      res.forces.groundNormal.toFixed(2),
      'N',
    )
    console.log(
      '  Arm angular accel:',
      res.derivative.armAngularVelocity.toFixed(6),
      'rad/s²',
    )
    console.log(
      '  Arm angular vel:',
      state.armAngularVelocity.toFixed(6),
      'rad/s',
    )
  }

  if (res.forces.groundNormal === 0 && i > 10) {
    console.log('\n✓ LIFT-OFF detected at step', i)
    break
  }

  state = sim.update(0.001)
}
