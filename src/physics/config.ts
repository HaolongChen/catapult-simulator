import type { PhysicsState17DOF, SimulationConfig } from './types'

export function createConfig(): SimulationConfig {
  return {
    initialTimestep: 0.005,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 1.0,
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
      counterweightMass: 1750,
      counterweightRadius: 0.8,
      counterweightInertia: 500,
      slingLength: 3.5,
      releaseAngle: (60 * Math.PI) / 180,
      jointFriction: 0.1,
      armMass: 200.0,
      pivotHeight: 3.0,
    },
  }
}

export function createInitialState(
  config: SimulationConfig,
): PhysicsState17DOF {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    slingLength: Ls,
  } = config.trebuchet
  const armAngle = -Math.PI / 6 // -30 degrees (back and down)
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
    // Projectile starts BEHIND the tip in this model (CW rotation)
    projX = tipX - dx
  } else {
    projX = tipX
    projY = tipY - Ls
  }

  const dx_sling = projX - tipX
  const dy_sling = projY - tipY
  const slingAngle = Math.atan2(dy_sling, dx_sling)

  return {
    armAngle,
    armAngularVelocity: 0,
    cwPosition: new Float64Array([cwX, cwY]),
    cwVelocity: new Float64Array([0, 0]),
    cwAngle: 0,
    cwAngularVelocity: 0,
    slingAngle: slingAngle,
    slingAngularVelocity: 0,
    position: new Float64Array([projX, projY, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}
