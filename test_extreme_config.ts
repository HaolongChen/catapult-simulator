import { CatapultSimulation } from './src/physics/simulation'
import { createInitialState, createConfig } from './src/physics/config'

console.log('Testing extreme configurations to ensure no degraded mode\n')

const extremeConfigs = [
  { name: 'Heavy Counterweight', counterweightMass: 8000, slingLength: 3.5 },
  { name: 'Long Sling', counterweightMass: 4000, slingLength: 6.0 },
  { name: 'Heavy + Long', counterweightMass: 6000, slingLength: 5.0 },
  {
    name: 'Very Heavy Projectile',
    projectileMass: 10.0,
    counterweightMass: 4000,
  },
]

for (const testCase of extremeConfigs) {
  console.log(`\n=== Testing: ${testCase.name} ===`)
  console.log(`  Config: ${JSON.stringify(testCase, null, 2)}`)

  const config = createConfig()
  if (testCase.counterweightMass)
    config.trebuchet.counterweightMass = testCase.counterweightMass
  if (testCase.slingLength) config.trebuchet.slingLength = testCase.slingLength
  if (testCase.projectileMass) config.projectile.mass = testCase.projectileMass

  const sim = new CatapultSimulation(createInitialState(config), config)

  let maxVel = 0
  let maxAngVel = 0

  for (let i = 0; i < 200; i++) {
    sim.update(0.01)
    const state = sim.getState()

    // @ts-expect-error accessing private
    const degraded = sim.integrator?.degraded

    if (degraded) {
      console.log(
        `  ❌ FAILED: Degraded mode at frame ${i}, t=${state.time.toFixed(3)}s`,
      )
      process.exit(1)
    }

    const vel = Math.sqrt(
      state.velocity[0] ** 2 + state.velocity[1] ** 2 + state.velocity[2] ** 2,
    )
    maxVel = Math.max(maxVel, vel)
    maxAngVel = Math.max(maxAngVel, Math.abs(state.armAngularVelocity))
  }

  console.log(`  ✅ PASSED: No degraded mode for 2 seconds`)
  console.log(`  Max velocity: ${maxVel.toFixed(2)} m/s`)
  console.log(`  Max angular velocity: ${maxAngVel.toFixed(2)} rad/s`)
}

console.log('\n✅ All extreme configurations handled successfully!')
