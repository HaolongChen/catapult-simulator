import { CatapultSimulation } from './src/physics/simulation'
import { PHYSICS_CONSTANTS } from './src/physics/constants'

// Temporarily test with higher N by modifying the constant (won't persist)
const originalN = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES

console.log('Testing convergence at high N:\n')
console.log('Note: This test modifies NUM_SLING_PARTICLES temporarily')
console.log('Current N:', originalN)

// Test if N=200 behaves like N=100
const testN = (label: string) => {
  const sim = new CatapultSimulation({
    trebuchet: {
      longArmLength: 10,
      shortArmLength: 1,
      counterweightMass: 1000,
      counterweightRadius: 0.5,
      counterweightInertia: 125,
      armMass: 100,
      pivotHeight: 2,
      slingLength: 7,
      pivotFriction: 1.0,
      jointFriction: 0.05,
    },
    projectile: { mass: 50, radius: 0.2 },
    initialState: {
      armAngle: 0,
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
    },
    environment: { windVelocity: [0, 0, 0], gravity: 9.81 },
    releaseAngle: (45 * Math.PI) / 180,
  })

  let released = false
  while (sim.getTime() < 5.0 && !released) {
    sim.update(0.005)
    if (sim.getState().isReleased) {
      released = true
      const state = sim.getState()
      const speed = Math.sqrt(state.velocity[0] ** 2 + state.velocity[1] ** 2)
      const angle = (Math.atan2(state.velocity[1], state.velocity[0]) * 180) / Math.PI
      console.log(`${label}: t=${state.time.toFixed(3)}s, speed=${speed.toFixed(2)} m/s, angle=${angle.toFixed(1)}°`)
    }
  }
}

testN(`N=${originalN}`)
