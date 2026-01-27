import { CatapultSimulation } from './src/physics/simulation'
import { computeDerivatives } from './src/physics/derivatives'
import { createConfig, createInitialState } from './src/physics/config'

// Test with default config
const config1 = createConfig()
let state1 = createInitialState(config1)
const sim1 = new CatapultSimulation(state1, config1)

console.log('=== DEFAULT CONFIG (Mcw = 4000 kg) ===')
console.log(
  'Initial ground normal:',
  computeDerivatives(
    state1,
    config1.projectile,
    config1.trebuchet,
    100000,
  ).forces.groundNormal.toFixed(2),
  'N',
)

for (let i = 0; i < 100; i++) {
  const res = computeDerivatives(
    state1,
    config1.projectile,
    config1.trebuchet,
    100000,
  )
  if (res.forces.groundNormal === 0) {
    console.log('✓ Lifts off at step', i)
    break
  }
  state1 = sim1.update(0.001)
}

// Test with Mcw = 1000
const config2 = createConfig()
config2.trebuchet.counterweightMass = 1000
let state2 = createInitialState(config2)
const sim2 = new CatapultSimulation(state2, config2)

console.log('\n=== TEST CONFIG (Mcw = 1000 kg) ===')
console.log(
  'Initial ground normal:',
  computeDerivatives(
    state2,
    config2.projectile,
    config2.trebuchet,
    100000,
  ).forces.groundNormal.toFixed(2),
  'N',
)

let liftedOff = false
for (let i = 0; i < 100; i++) {
  const res = computeDerivatives(
    state2,
    config2.projectile,
    config2.trebuchet,
    100000,
  )
  if (res.forces.groundNormal === 0 && i > 10) {
    console.log('✓ Lifts off at step', i)
    liftedOff = true
    break
  }
  state2 = sim2.update(0.001)
}

if (!liftedOff) {
  console.log('✗ Never lifts off in 100 steps')
  console.log(
    'This might be physically correct - insufficient CW mass to overcome ground friction',
  )
}
