import type { PhysicsState19DOF, SimulationConfig } from './types'

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
      counterweightMass: 2000,
      counterweightRadius: 0.8,
      counterweightInertia: 500,
      slingLength: 3.5,
      releaseAngle: (90 * Math.PI) / 180,
      slingBagWidth: 0.35,
      slingBagMass: 5.0,
      slingBagInertia: 0.1,
      jointFriction: 0.1,
      armMass: 200,
      pivotHeight: 3,
      flexStiffness: 500000,
      flexDamping: 5000,
      flexPoint: 3.5,
    },
  }
}

export function createInitialState(
  config: SimulationConfig,
): PhysicsState19DOF {
  const {
    longArmLength: L1,
    shortArmLength: L2,
    pivotHeight: H,
    slingLength: Ls,
  } = config.trebuchet
  const armAngle = -Math.PI / 6
  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)

  const shortTipX = -L2 * Math.cos(armAngle)
  const shortTipY = H - L2 * Math.sin(armAngle)

  const cwX = shortTipX
  const cwY = shortTipY - config.trebuchet.counterweightRadius

  const projRadius = config.projectile.radius
  const targetY = projRadius
  const dy = tipY - targetY

  let projX = tipX
  if (dy < Ls) {
    const dx = Math.sqrt(Ls * Ls - dy * dy)
    projX = tipX - dx
  }

  const R_p = projRadius * 1.5
  const dx_sling = projX - tipX
  const dy_sling = targetY - tipY
  const dist_sling = Math.sqrt(dx_sling * dx_sling + dy_sling * dy_sling + 1e-9)
  const ux = dx_sling / dist_sling
  const uy = dy_sling / dist_sling

  const slingBagX = projX - R_p * ux
  const slingBagY = targetY - R_p * uy

  const initialSlingBagAngle = Math.atan2(projX - tipX, tipY - targetY)

  return {
    armAngle,
    armAngularVelocity: 0,
    flexAngle: 0,
    flexAngularVelocity: 0,
    cwPosition: new Float64Array([cwX, cwY]),
    cwVelocity: new Float64Array([0, 0]),
    cwAngle: 0,
    cwAngularVelocity: 0,
    slingBagPosition: new Float64Array([slingBagX, slingBagY]),
    slingBagVelocity: new Float64Array([0, 0]),
    slingBagAngle: initialSlingBagAngle,
    slingBagAngularVelocity: 0,
    position: new Float64Array([projX, targetY, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}
