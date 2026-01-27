import { CatapultSimulation } from './src/physics/simulation.ts'
import { createInitialState, createConfig } from './src/physics/config.ts'

const config = createConfig()
const state = createInitialState(config)
const sim = new CatapultSimulation(state, config)

console.log('=== MOTION ANALYSIS ===\n')
console.log('Initial State (t=0):')
console.log(`  Arm angle: ${state.armAngle.toFixed(4)} rad (${(state.armAngle * 180 / Math.PI).toFixed(1)}°)`)
console.log(`  Projectile pos: [${state.position[0].toFixed(2)}, ${state.position[1].toFixed(2)}]`)
console.log(`  CW pos: [${state.cwPosition[0].toFixed(2)}, ${state.cwPosition[1].toFixed(2)}]`)

const dt = 0.016
let totalTime = 0

for (let step = 1; step <= 100; step++) {
  sim.update(dt)
  totalTime += dt
  
  if ([10, 30, 60, 100].includes(step)) {
    const frame = sim.exportFrameData()
    
    console.log(`\nAfter ${(totalTime*1000).toFixed(0)}ms:`)
    console.log(`  Arm angle: ${frame.arm.angle.toFixed(4)} rad (Δ=${(frame.arm.angle - state.armAngle).toFixed(4)})`)
    console.log(`  Arm angular vel: ${frame.arm.angularVelocity.toFixed(4)} rad/s`)
    console.log(`  Projectile pos: [${frame.projectile.position[0].toFixed(2)}, ${frame.projectile.position[1].toFixed(2)}]`)
    console.log(`  Projectile vel: [${frame.projectile.velocity[0].toFixed(2)}, ${frame.projectile.velocity[1].toFixed(2)}]`)
    console.log(`  CW pos: [${frame.counterweight.position[0].toFixed(2)}, ${frame.counterweight.position[1].toFixed(2)}]`)
    console.log(`  Sling point 0: [${frame.sling.points[1][0].toFixed(2)}, ${frame.sling.points[1][1].toFixed(2)}]`)
    console.log(`  Arm torque: ${frame.forces.arm.totalTorque.toFixed(2)} N⋅m`)
    
    if (Math.abs(frame.arm.angularVelocity) < 0.001 && totalTime < 0.5) {
      console.log('  ⚠️  WARNING: Arm not rotating!')
    }
    if (Math.abs(frame.arm.angle - state.armAngle) < 0.01 && totalTime > 0.3) {
      console.log('  ⚠️  WARNING: Arm barely moved!')
    }
  }
}

console.log('\n=== CHECKING FORCE MAGNITUDES ===')
const frame = sim.exportFrameData()
const forces = sim.getLastForces()
console.log(`Arm torque: ${frame.forces.arm.totalTorque.toFixed(2)} N⋅m`)
console.log(`Projectile forces: [${frame.forces.projectile.total[0].toFixed(2)}, ${frame.forces.projectile.total[1].toFixed(2)}] N`)
console.log(`Lambda (first 5 constraints): [${forces.lambda.slice(0,5).map(l => l.toFixed(2)).join(', ')}]`)
