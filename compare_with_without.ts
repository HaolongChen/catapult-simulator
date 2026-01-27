import { CatapultSimulation } from './src/physics/simulation'
import { computeDerivatives } from './src/physics/derivatives'
import { createConfig, createInitialState } from './src/physics/config'

const config = createConfig()
config.trebuchet.counterweightMass = 1000
config.initialTimestep = 0.001

let state = createInitialState(config)
const sim = new CatapultSimulation(state, config)

console.log('=== WITH SLING PROJECTION DISABLED ===\n')

for (let i = 0; i < 20; i++) {
  const res = computeDerivatives(
    state,
    config.projectile,
    config.trebuchet,
    100000,
  )

  console.log(`Step ${i}:`)
  console.log('  Ground normal:', res.forces.groundNormal.toFixed(4), 'N')
  console.log(
    '  Arm accel:',
    res.derivative.armAngularVelocity.toFixed(6),
    'rad/s²',
  )
  console.log(
    '  Sling[0] pos:',
    state.slingParticles[0].toFixed(4),
    state.slingParticles[1].toFixed(4),
  )
  console.log(
    '  Sling[0] vel:',
    state.slingVelocities[0].toFixed(6),
    state.slingVelocities[1].toFixed(6),
  )

  // Check constraint satisfaction
  const longArmTip = {
    x: 3.5 * Math.cos(state.armAngle),
    y: 3.0 + 3.5 * Math.sin(state.armAngle),
  }
  const dx = state.slingParticles[0] - longArmTip.x
  const dy = state.slingParticles[1] - longArmTip.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const Lseg = config.trebuchet.slingLength / 20
  console.log(
    '  Segment 0 length:',
    dist.toFixed(6),
    'vs target:',
    Lseg.toFixed(6),
    'error:',
    (dist - Lseg).toFixed(9),
  )

  state = sim.update(0.001)
}
