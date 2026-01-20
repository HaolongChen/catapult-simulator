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
      longArmLength: 10,
      shortArmLength: 3,
      counterweightMass: 2000,
      counterweightRadius: 2.0,
      slingLength: 8,
      releaseAngle: (90 * Math.PI) / 180,
      springConstant: 0,
      dampingCoefficient: 0,
      equilibriumAngle: 0,
      jointFriction: 0.1,
      efficiency: 1.0,
      flexuralStiffness: 1e12,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

export function createInitialState(
  config: SimulationConfig,
): PhysicsState17DOF {
  const {
    longArmLength: L1,
    pivotHeight: H,
    slingLength: Ls,
  } = config.trebuchet
  const armAngle = -Math.PI / 4
  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)

  const projRadius = config.projectile.radius
  const targetY = projRadius
  const dy = tipY - targetY

  let projX = tipX
  if (dy < Ls) {
    const dx = Math.sqrt(Ls * Ls - dy * dy)
    projX = tipX - dx
  }

  return {
    position: new Float64Array([projX, targetY, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}
