import { aerodynamicForce } from './aerodynamics'
import type {
  PhysicsDerivative17DOF,
  PhysicsState17DOF,
  ProjectileProperties,
  TrebuchetProperties,
} from './types'

export type { DerivativeFunction } from './types'

export function computeDerivatives(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  normalForce: number,
): PhysicsDerivative17DOF {
  const {
    position,
    velocity,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
    orientation,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    slingLength: Ls,
    releaseAngle,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    armMass: Ma,
    pivotHeight: H,
    jointFriction,
  } = trebuchetProps
  const Mp = projectile.mass
  const g = 9.81

  const wasReleased = orientation[0] > 0.5

  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)
  const dx = position[0] - tipX
  const dy = position[1] - tipY
  const distSq = dx * dx + dy * dy
  const dist = Math.sqrt(Math.max(distSq, 1e-12))
  const ux = dx / dist
  const uy = dy / dist

  const tipVelX = -L1 * armAngularVelocity * Math.sin(armAngle)
  const tipVelY = L1 * armAngularVelocity * Math.cos(armAngle)
  const v_rel_n = ux * (velocity[0] - tipVelX) + uy * (velocity[1] - tipVelY)

  const armVecX = Math.cos(armAngle)
  const armVecY = Math.sin(armAngle)
  const slingDotArm = ux * armVecX + uy * armVecY

  const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360
  const isUpward = normAng > 45 && normAng < 225
  const releaseTriggered =
    !wasReleased && isUpward && slingDotArm > Math.cos(releaseAngle)
  const isReleased = wasReleased || releaseTriggered

  if (isReleased) {
    return computeFreeFlight(state, projectile, trebuchetProps, normalForce)
  }

  const Ia = (1 / 3) * Ma * L1 ** 2
  const Icw_box = 0.5 * Mcw * Rcw * Rcw
  const M11 = Ia + Mcw * L2 * L2
  const M12 = Mcw * L2 * Rcw * Math.sin(armAngle - cwAngle)
  const M22 = Icw_box + Mcw * Rcw * Rcw

  const G1 =
    -Ma * g * (L1 / 2) * Math.cos(armAngle) + Mcw * g * L2 * Math.cos(armAngle)
  const G2 = -Mcw * g * Rcw * Math.sin(cwAngle)
  const C1 =
    -Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const C2 =
    Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)

  let F_sling_x = 0
  let F_sling_y = 0
  let torque_sling = 0

  if (dist > Ls || v_rel_n > 0) {
    const k = 2000000
    const d = 2000
    const f = Math.max(0, k * (dist - Ls) + d * v_rel_n)
    const f_clamped = Math.min(f, 2000000)
    F_sling_x = -f_clamped * ux
    F_sling_y = -f_clamped * uy
    torque_sling = tipX * -F_sling_y - (tipY - H) * -F_sling_x
  }

  let F_ground_y = 0
  let F_ground_x = 0
  if (position[1] < 0) {
    const k_g = 5000000
    const d_g = 10000
    F_ground_y = Math.max(0, k_g * -position[1] - d_g * velocity[1])
    F_ground_x = -0.3 * F_ground_y * Math.sign(velocity[0])
  } else if (position[1] < 0.01) {
    F_ground_x = -0.2 * Mp * g * Math.sign(velocity[0])
  }

  const airVel = new Float64Array([velocity[0], velocity[1], 0])
  const aero = aerodynamicForce(
    airVel,
    new Float64Array(3),
    projectile,
    position[1],
    288.15,
  )

  const ax = (aero.total[0] + F_sling_x + F_ground_x) / Mp
  const ay = (aero.total[1] + F_sling_y + F_ground_y) / Mp - g

  const t_fric = -Math.sign(armAngularVelocity) * jointFriction * normalForce
  const Tau1 = G1 - C1 + t_fric + torque_sling
  const Tau2 = G2 - C2
  const det = Math.max(M11 * M22 - M12 * M12, 1e-9)
  const th_ddot = (Tau1 * M22 - Tau2 * M12) / det
  const phi_ddot = (M11 * Tau2 - M12 * Tau1) / det

  return {
    position: new Float64Array([velocity[0], velocity[1], 0]),
    velocity: new Float64Array([ax, ay, 0]),
    orientation: new Float64Array([isReleased ? 1 : 0, 0, 0, 0]),
    angularVelocity: new Float64Array(3),
    armAngle: armAngularVelocity,
    armAngularVelocity: th_ddot,
    cwAngle: cwAngularVelocity,
    cwAngularVelocity: phi_ddot,
    windVelocity: new Float64Array(3),
    time: 1,
  }
}

function computeFreeFlight(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  normalForce: number,
): PhysicsDerivative17DOF {
  const {
    position,
    velocity,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    armMass: Ma,
    jointFriction,
  } = trebuchetProps
  const Mp = projectile.mass
  const g = 9.81
  const Ia = (1 / 3) * Ma * L1 ** 2
  const Icw = 0.4 * Mcw * Rcw * Rcw
  const M11 = Ia + Mcw * L2 * L2
  const M12 = Mcw * L2 * Rcw * Math.sin(armAngle - cwAngle)
  const M22 = Icw + Mcw * Rcw * Rcw
  const G1 =
    -Ma * g * (L1 / 2) * Math.cos(armAngle) + Mcw * g * L2 * Math.cos(armAngle)
  const G2 = -Mcw * g * Rcw * Math.sin(cwAngle)
  const C1 =
    -Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const C2 =
    Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const t_fric = -Math.sign(armAngularVelocity) * jointFriction * normalForce
  const Tau1 = t_fric + G1 - C1
  const Tau2 = G2 - C2
  const det = Math.max(M11 * M22 - M12 * M12, 1e-9)
  const th_ddot = (Tau1 * M22 - Tau2 * M12) / det
  const phi_ddot = (M11 * Tau2 - M12 * Tau1) / det
  const airVel = new Float64Array([velocity[0], velocity[1], 0])
  const aero = aerodynamicForce(
    airVel,
    new Float64Array(3),
    projectile,
    position[1],
    288.15,
  )
  const ax = aero.total[0] / Mp
  let ay = (aero.total[1] - Mp * g) / Mp
  if (position[1] < 0) {
    ay += (2000000 * -position[1]) / Mp - (10000 * velocity[1]) / Mp
    ay = Math.max(0, ay)
  }
  return {
    position: new Float64Array([velocity[0], velocity[1], 0]),
    velocity: new Float64Array([ax, ay, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array(3),
    armAngle: armAngularVelocity,
    armAngularVelocity: th_ddot,
    cwAngle: cwAngularVelocity,
    cwAngularVelocity: phi_ddot,
    windVelocity: new Float64Array(3),
    time: 1,
  }
}
