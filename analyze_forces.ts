import { computeDerivatives } from './src/physics/derivatives.ts'
import { createInitialState, createConfig } from './src/physics/config.ts'
import { PHYSICS_CONSTANTS } from './src/physics/constants.ts'

const config = createConfig()
const state = createInitialState(config)

console.log('=== FORCE ANALYSIS AT t=0 ===\n')

const result = computeDerivatives(
  state,
  config.projectile,
  config.trebuchet,
  config.trebuchet.counterweightMass * PHYSICS_CONSTANTS.GRAVITY
)

const { forces, derivative } = result

console.log('Projectile forces:')
console.log(`  Gravity: [${forces.gravity[0].toFixed(2)}, ${forces.gravity[1].toFixed(2)}, ${forces.gravity[2].toFixed(2)}] N`)
console.log(`  Drag: [${forces.drag[0].toFixed(2)}, ${forces.drag[1].toFixed(2)}, ${forces.drag[2].toFixed(2)}] N`)
console.log(`  Magnus: [${forces.magnus[0].toFixed(2)}, ${forces.magnus[1].toFixed(2)}, ${forces.magnus[2].toFixed(2)}] N`)
console.log(`  Tension: [${forces.tension[0].toFixed(2)}, ${forces.tension[1].toFixed(2)}, ${forces.tension[2].toFixed(2)}] N`)
console.log(`  Total: [${forces.total[0].toFixed(2)}, ${forces.total[1].toFixed(2)}, ${forces.total[2].toFixed(2)}] N`)

console.log('\nArm torques:')
console.log(`  Pivot friction: ${forces.armTorques.pivotFriction.toFixed(2)} N⋅m`)
console.log(`  Sling damping: ${forces.armTorques.slingDamping.toFixed(2)} N⋅m`)
console.log(`  CW damping: ${forces.armTorques.cwDamping.toFixed(2)} N⋅m`)
console.log(`  Total: ${forces.armTorques.total.toFixed(2)} N⋅m`)

console.log('\nProjectile acceleration (from derivative):')
console.log(`  [${derivative.velocity[0].toFixed(2)}, ${derivative.velocity[1].toFixed(2)}, ${derivative.velocity[2].toFixed(2)}] m/s²`)

console.log('\nExpected projectile acceleration from total force:')
const expectedAccel = [
  forces.total[0] / config.projectile.mass,
  forces.total[1] / config.projectile.mass,
  forces.total[2] / config.projectile.mass,
]
console.log(`  [${expectedAccel[0].toFixed(2)}, ${expectedAccel[1].toFixed(2)}, ${expectedAccel[2].toFixed(2)}] m/s²`)

console.log('\nArm angular acceleration:')
console.log(`  ${derivative.armAngularVelocity.toFixed(4)} rad/s²`)

console.log('\nSling particle 0 acceleration:')
console.log(`  [${derivative.slingVelocities[0].toFixed(2)}, ${derivative.slingVelocities[1].toFixed(2)}] m/s²`)

console.log('\nConstraint forces (lambda, first 10):')
for (let i = 0; i < Math.min(10, forces.lambda.length); i++) {
  console.log(`  λ[${i}]: ${forces.lambda[i].toFixed(2)} N`)
}

console.log('\nGround normal force:')
console.log(`  ${forces.groundNormal.toFixed(2)} N`)

console.log('\nCheck function (J·q_dot constraint satisfaction):')
console.log(`  ${forces.checkFunction.toFixed(6)}`)
