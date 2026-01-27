import { CatapultSimulation } from './src/physics/simulation'
import { createInitialState } from './src/physics/config'
import type { SimulationConfig } from './src/physics/types'
import { PHYSICS_CONSTANTS } from './src/physics/constants'

const baseConfig: SimulationConfig = {
  initialTimestep: 0.001,
  maxSubsteps: 10,
  maxAccumulator: 1.0,
  tolerance: 1e-6,
  minTimestep: 1e-7,
  maxTimestep: 0.01,
  projectile: {
    mass: 1.0,
    radius: 0.1,
    area: Math.PI * 0.1 ** 2,
    dragCoefficient: 0.47,
    magnusCoefficient: 0.3,
    momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
    spin: 0,
  },
  trebuchet: {
    longArmLength: 4.4,
    shortArmLength: 0.8,
    counterweightMass: 2000.0,
    counterweightRadius: 0.8,
    counterweightInertia: 500,
    slingLength: 3.5,
    releaseAngle: (45.0 * Math.PI) / 180,
    jointFriction: 0.1,
    armMass: 200.0,
    pivotHeight: 3.0,
  },
}

function testParticleCount(N: number) {
  // Temporarily override constant
  const originalN = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  ;(PHYSICS_CONSTANTS as any).NUM_SLING_PARTICLES = N

  const state = createInitialState(baseConfig)
  const sim = new CatapultSimulation(state, baseConfig)

  let releaseTime = -1
  let releaseVelocity = [0, 0]
  let releaseAngle = 0

  for (let i = 0; i < 1000; i++) {
    const newState = sim.update(0.01)
    if (newState.isReleased && releaseTime < 0) {
      releaseTime = newState.time
      releaseVelocity = [newState.velocity[0], newState.velocity[1]]
      releaseAngle =
        Math.atan2(newState.velocity[1], newState.velocity[0]) * (180 / Math.PI)
      break
    }
  }

  // Restore
  ;(PHYSICS_CONSTANTS as any).NUM_SLING_PARTICLES = originalN

  const speed = Math.sqrt(releaseVelocity[0] ** 2 + releaseVelocity[1] ** 2)

  return {
    N,
    releaseTime,
    releaseVelocity,
    releaseAngle,
    speed,
  }
}

console.log('Testing mesh convergence...\n')
console.log('N\tRelease Time (s)\tSpeed (m/s)\tAngle (°)')
console.log('='.repeat(60))

for (const N of [5, 10, 20, 50, 100]) {
  const result = testParticleCount(N)
  console.log(
    `${N}\t${result.releaseTime.toFixed(3)}\t\t${result.speed.toFixed(2)}\t\t${result.releaseAngle.toFixed(1)}`,
  )
}

console.log('\n' + '='.repeat(60))
console.log('✓ Values should converge as N increases')
console.log('✗ If values change significantly, physics is mesh-dependent (BUG)')
