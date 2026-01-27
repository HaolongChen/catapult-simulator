import { CatapultSimulation } from './src/physics/simulation.ts'
import { createInitialState, createConfig } from './src/physics/config.ts'

const config = createConfig()
const state1 = createInitialState(config)
const sim1 = new CatapultSimulation(state1, config)

const state2 = createInitialState(config)
const sim2 = new CatapultSimulation(state2, config)

console.log('=== COMPARING WITH/WITHOUT VELOCITY PROJECTION ===\n')

const dt = 0.016
const steps = 30

console.log('Running WITH projection (normal):')
for (let i = 0; i < steps; i++) {
  sim1.update(dt)
}
const frame1 = sim1.exportFrameData()

console.log('\nResults after 30 steps WITH projection:')
console.log(`  Arm angle: ${frame1.arm.angle.toFixed(4)} rad`)
console.log(`  Arm angular vel: ${frame1.arm.angularVelocity.toFixed(4)} rad/s`)
console.log(`  Projectile pos: [${frame1.projectile.position[0].toFixed(2)}, ${frame1.projectile.position[1].toFixed(2)}]`)
console.log(`  Projectile vel: [${frame1.projectile.velocity[0].toFixed(2)}, ${frame1.projectile.velocity[1].toFixed(2)}] m/s`)
console.log(`  Sling particle 0 vel: [${sim1.getLastForces().lambda[0].toFixed(2)}]`)

console.log('\n\nNOTE: Cannot easily disable projection without modifying source.')
console.log('The projectVelocities() function is called in update() and removes radial velocity.')
console.log('This is likely causing the "sling not moving properly" issue.')

console.log('\n=== EVIDENCE OF PROJECTION IMPACT ===')
console.log('The projection removes velocity components along rope segments when vdotn > 0.01')
console.log('This fights against the DAE constraint solver which already maintains constraints.')
console.log('Recommendation: Comment out or reduce the damping factor (0.9 -> 0.1) in projectVelocities')
