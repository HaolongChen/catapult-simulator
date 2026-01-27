import { PHYSICS_CONSTANTS } from './constants'
import type { PhysicsState, SimulationConfig } from './types'

export function createConfig(): SimulationConfig {
  return {
    initialTimestep: 0.005,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-12,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 60.0,
      radius: 0.1,
      area: Math.PI * 0.1 * 0.1,
      dragCoefficient: 0.47,
      magnusCoefficient: 0.3,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    },
    trebuchet: {
      longArmLength: 4.4,
      shortArmLength: 0.8,
      counterweightMass: 15000,
      counterweightRadius: 0.8,
      counterweightInertia: 2000,
      slingLength: 3.5,
      releaseAngle: (120.0 * Math.PI) / 180, // Standard launch angle in Radians
      jointFriction: 0.1,
      armMass: 200.0,
      pivotHeight: 3.0,
    },
  }
}

export function createInitialState(config: SimulationConfig): PhysicsState {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    slingLength: Ls,
  } = config.trebuchet
  const armAngle = (-30 * Math.PI) / 180
  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)

  const shortTipX = -L2 * Math.cos(armAngle)
  const shortTipY = H - L2 * Math.sin(armAngle)

  const cwX = shortTipX
  const cwY = shortTipY - config.trebuchet.counterweightRadius

  const projRadius = config.projectile.radius

  let projX: number
  let projY: number

  const dy_max = tipY - projRadius
  if (Ls > dy_max) {
    projY = projRadius
    const dx = Math.sqrt(Ls * Ls - dy_max * dy_max)
    // Initialize slightly closer to allow gravitational sag to develop
    projX = tipX - dx * 0.9
  } else {
    projX = tipX
    projY = tipY - Ls
  }

  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const slingParticles = new Float64Array(2 * N)
  const slingVelocities = new Float64Array(2 * N)

  const Lseg = Ls / N
  const particles = []
  particles.push({ x: tipX, y: tipY }) // P0
  for (let i = 0; i < N; i++) {
    const alpha = (i + 1) / N
    particles.push({
      x: tipX * (1 - alpha) + projX * alpha,
      y: tipY * (1 - alpha) + projY * alpha,
    })
  }
  // No need to push projectile again, particles[N] is the end of the sling

  // Geometric PBD Settle
  for (let iter = 0; iter < 500; iter++) {
    // 1. Gravity Step (Interior particles)
    for (let i = 1; i <= N; i++) {
      particles[i].y -= 0.002
      if (particles[i].y < projRadius) particles[i].y = projRadius
    }

    // 2. Constraint Step
    for (let i = 0; i < N; i++) {
      const p1 = particles[i]
      const p2 = particles[i + 1]
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy + 1e-12)

      const error = (dist - Lseg) / (dist + 1e-12)
      const offsetX = dx * error * 0.5
      const offsetY = dy * error * 0.5

      if (i === 0) {
        // P0 is fixed
        p2.x -= offsetX * 2
        p2.y -= offsetY * 2
      } else {
        p1.x += offsetX
        p1.y += offsetY
        p2.x -= offsetX
        p2.y -= offsetY
      }
    }

    // 3. Pinning & Rail Clamping
    particles[0].x = tipX
    particles[0].y = tipY
    if (particles[N].y < projRadius) particles[N].y = projRadius
  }

  // Write back to state
  for (let i = 0; i < N; i++) {
    slingParticles[2 * i] = particles[i + 1].x
    slingParticles[2 * i + 1] = particles[i + 1].y
    slingVelocities[2 * i] = 0
    slingVelocities[2 * i + 1] = 0
  }

  return {
    armAngle,
    armAngularVelocity: 0,
    cwPosition: new Float64Array([cwX, cwY]),
    cwVelocity: new Float64Array([0, 0]),
    cwAngle: 0,
    cwAngularVelocity: 0,
    slingParticles,
    slingVelocities,
    position: new Float64Array([particles[N].x, particles[N].y, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}
