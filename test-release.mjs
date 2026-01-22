import { createConfig, createInitialState } from './src/physics/config.ts'
import { CatapultSimulation } from './src/physics/simulation.ts'

// Try to run a simulation and check release
const config = createConfig()
const state = createInitialState(config)
const sim = new CatapultSimulation(state, config)

console.log('Initial state:')
console.log('  armAngle:', ((state.armAngle * 180) / Math.PI).toFixed(1) + '°')
console.log('  position:', state.position.map((v) => v.toFixed(2)).join(', '))
console.log('  isReleased:', state.isReleased)
console.log('  slingLength:', config.trebuchet.slingLength)
console.log('  projectile.mass:', config.projectile.mass)
console.log('')

// Run a few steps and monitor release
const releaseThreshold = 0.1 * config.projectile.mass * 9.81
console.log('Release threshold:', releaseThreshold.toFixed(3) + 'N')
console.log('')

let released = false
for (let i = 0; i < 200; i++) {
  sim.update(0.01)
  const s = sim.getState()
  const normAng = ((((s.armAngle * 180) / Math.PI) % 360) + 360) % 360
  const forces = sim.getLastForces()
  const tensionMag = Math.sqrt(
    forces.tension[0] ** 2 + forces.tension[1] ** 2 + forces.tension[2] ** 2,
  )
  const isUpward = normAng > 45 && normAng < 225
  const shouldRelease = isUpward && tensionMag < releaseThreshold

  if (i % 20 === 0 || s.isReleased) {
    console.log(
      `Step ${i}: arm=${normAng.toFixed(1)}°, tension=${tensionMag.toFixed(3)}N, upward=${isUpward}, shouldRelease=${shouldRelease}, released=${s.isReleased}`,
    )
  }

  if (s.isReleased && !released) {
    console.log('\n*** RELEASED at step ' + i + ' ***')
    released = true
  }
}

if (!released) {
  console.log('\n*** NEVER RELEASED ***')
  console.log('Ran 200 steps without release')
}
