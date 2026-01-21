import { PHYSICS_CONSTANTS } from './constants'
import { aerodynamicForce } from './aerodynamics'
import { computeTrebuchetKinematics } from './kinematics'
import type {
  PhysicsDerivative19DOF,
  PhysicsForces,
  PhysicsState19DOF,
  ProjectileProperties,
  TrebuchetProperties,
} from './types'

export type { DerivativeFunction } from './types'

/**
 * Solves Ax = b using LU decomposition with partial pivoting.
 * Used for solving the KKT system in the DAE solver.
 */
function solveLinearSystem(
  A: Array<Array<number>>,
  b: Array<number>,
): Array<number> {
  const n = b.length
  const L = Array.from({ length: n }, () => new Array(n).fill(0))
  const U = A.map((row) => [...row])
  const P = Array.from({ length: n }, (_, i) => i)

  // LU Decomposition with Partial Pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let max = Math.abs(U[i][i])
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(U[k][i]) > max) {
        max = Math.abs(U[k][i])
        maxRow = k
      }
    }

    // Swap rows in U and permutation vector P
    const tempRow = U[i]
    U[i] = U[maxRow]
    U[maxRow] = tempRow
    const tempP = P[i]
    P[i] = P[maxRow]
    P[maxRow] = tempP

    // Swap rows in L (only columns before current i)
    for (let k = 0; k < i; k++) {
      const tempL = L[i][k]
      L[i][k] = L[maxRow][k]
      L[maxRow][k] = tempL
    }

    // Regularize near-singular pivots to maintain numerical stability
    const pivotVal = U[i][i]
    if (Math.abs(pivotVal) < 1e-12) {
      U[i][i] = pivotVal < 0 ? -1e-12 : 1e-12
    }

    // Elimination
    for (let k = i + 1; k < n; k++) {
      L[k][i] = U[k][i] / U[i][i]
      for (let j = i; j < n; j++) {
        U[k][j] -= L[k][i] * U[i][j]
      }
    }
    L[i][i] = 1
  }

  // Forward substitution to solve Ly = Pb
  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j < i; j++) {
      sum += L[i][j] * y[j]
    }
    y[i] = b[P[i]] - sum
  }

  // Backward substitution to solve Ux = y
  const x_res = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0
    for (let j = i + 1; j < n; j++) {
      sum += U[i][j] * x_res[j]
    }
    x_res[i] = (y[i] - sum) / U[i][i]
  }

  return x_res
}

/**
 * Computes the physics derivatives for the trebuchet in the "swinging" phase.
 * Uses a Redundant Coordinate DAE (Differential-Algebraic Equation) solver.
 *
 * State Vector (9 DOF):
 * [theta, x_cw, y_cw, phi, x_sb, y_sb, psi, x_p, y_p]
 * - theta: Arm angle
 * - x_cw, y_cw: Counterweight Cartesian position
 * - phi: Counterweight orientation
 * - x_sb, y_sb: Sling bag Cartesian position
 * - psi: Sling bag orientation
 * - x_p, y_p: Projectile Cartesian position (2D)
 */
export function computeDerivatives(
  state: PhysicsState19DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  normalForce: number,
): { derivative: PhysicsDerivative19DOF; forces: PhysicsForces } {
  const {
    position,
    velocity,
    armAngle,
    armAngularVelocity,
    cwVelocity,
    cwAngle,
    cwAngularVelocity,
    slingBagAngle,
    slingBagAngularVelocity,
    slingBagPosition,
    slingBagVelocity,
    angularVelocity,
    windVelocity,
    isReleased: wasReleased,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    counterweightInertia: Icw_box,
    armMass: Ma,
    jointFriction,
    slingBagMass: Msb,
    slingBagInertia: Isb,
    slingBagWidth: W,
  } = trebuchetProps
  const Mp = projectile.mass
  const g = PHYSICS_CONSTANTS.GRAVITY

  // Numerical Safety: Clamp velocity to prevent explosion
  const vMag_val = Math.sqrt(
    velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2,
  )
  if (vMag_val > PHYSICS_CONSTANTS.MAX_SAFE_VELOCITY) {
    const scale = PHYSICS_CONSTANTS.MAX_SAFE_VELOCITY / vMag_val
    velocity[0] *= scale
    velocity[1] *= scale
    velocity[2] *= scale
  }

  // Aerodynamics calculation
  const airVel = new Float64Array([
    velocity[0] - windVelocity[0],
    velocity[1] - windVelocity[1],
    velocity[2] - windVelocity[2],
  ])
  const aero = aerodynamicForce(
    airVel,
    angularVelocity,
    projectile,
    position[1],
    PHYSICS_CONSTANTS.SEA_LEVEL_TEMPERATURE,
  )

  // Switch to simplified free flight if already released
  if (wasReleased) {
    return computeFreeFlight(state, projectile, trebuchetProps, aero)
  }

  // Forward Kinematics for arm tip and attachments
  const kinematics = computeTrebuchetKinematics(
    armAngle,
    cwAngle,
    slingBagAngle,
    trebuchetProps,
  )
  const { tip: tipPos, bagAttachments } = kinematics
  const tipX = tipPos.x
  const tipY = tipPos.y

  // Rotational Inertia of the arm (uniform rod)
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const Icw_box_val = Icw_box

  // System Mass Matrix (Diagonal in redundant coordinates)
  const M_diag = [Ia, Mcw, Mcw, Icw_box_val, Msb, Msb, Isb, Mp, Mp]

  // External Torques (Friction and hard-stop damping)
  let t_ext = -Math.sign(armAngularVelocity) * jointFriction * normalForce
  const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360
  if (normAng > 160 && normAng < 180 && armAngularVelocity > 0) {
    // Soft-limit stop at vertical up
    t_ext -=
      PHYSICS_CONSTANTS.STOP_STIFFNESS * (normAng - 160) * (Math.PI / 180) +
      PHYSICS_CONSTANTS.STOP_DAMPING * armAngularVelocity
  }

  // Generalized Force Vector Q
  const armCG = (L1 - L2) / 2
  const Q = [
    -Ma * g * armCG * Math.cos(armAngle) + t_ext,
    0, // x_cw
    -Mcw * g, // y_cw
    0, // phi
    0, // x_sb
    -Msb * g, // y_sb
    0, // psi
    aero.total[0], // x_p
    aero.total[1] - Mp * g, // y_p
  ]

  // Dual-Rope V-Shape Attachment Geometry
  const PL = [
    slingBagPosition[0] + bagAttachments.left.x,
    slingBagPosition[1] + bagAttachments.left.y,
  ]
  const PR = [
    slingBagPosition[0] + bagAttachments.right.x,
    slingBagPosition[1] + bagAttachments.right.y,
  ]
  const DL = [PL[0] - tipX, PL[1] - tipY]
  const DR = [PR[0] - tipX, PR[1] - tipY]
  const DB = [
    position[0] - slingBagPosition[0],
    position[1] - slingBagPosition[1],
  ]
  const R_p = projectile.radius * 1.5

  // Rail constraint (Projectile slides horizontally on ground)
  const onRail = position[1] - projectile.radius <= 0.005

  /**
   * Jacobian Matrix J (Constraints):
   * 0,1: Counterweight Hinge (x,y connected to short arm tip)
   * 2,3: Sling Ropes (L/R ropes connected to long arm tip)
   * 4: Projectile Contact (Ball pushed by sling bag)
   * 5: Ground Rail (Ball height fixed to radius)
   */
  const J = Array.from({ length: 6 }, () => new Array(9).fill(0))
  // CW Hinge
  J[0][0] = -L2 * -Math.sin(armAngle)
  J[0][1] = 1.0
  J[0][3] = -Rcw * Math.cos(cwAngle)
  J[1][0] = -L2 * -Math.cos(armAngle)
  J[1][2] = 1.0
  J[1][3] = -Rcw * Math.sin(cwAngle)
  const cosB = Math.cos(slingBagAngle)
  const sinB = Math.sin(slingBagAngle)

  // Left Rope
  J[2][0] =
    -2 *
    (DL[0] * (-L1 * Math.sin(armAngle)) + DL[1] * (L1 * Math.cos(armAngle)))
  J[2][4] = 2 * DL[0]
  J[2][5] = 2 * DL[1]
  J[2][6] = 2 * (DL[0] * ((W / 2) * sinB) + DL[1] * ((-W / 2) * cosB))
  // Right Rope
  J[3][0] =
    -2 *
    (DR[0] * (-L1 * Math.sin(armAngle)) + DR[1] * (L1 * Math.cos(armAngle)))
  J[3][4] = 2 * DR[0]
  J[3][5] = 2 * DR[1]
  J[3][6] = 2 * (DR[0] * ((-W / 2) * sinB) + DR[1] * ((W / 2) * cosB))
  // Projectile/Bag Contact
  J[4][4] = -2 * DB[0]
  J[4][5] = -2 * DB[1]
  J[4][7] = 2 * DB[0]
  J[4][8] = 2 * DB[1]
  // Ground Rail
  J[5][8] = 1.0

  /**
   * KKT System: [ M  J^T ] [ q_ddot ] = [ Q ]
   *             [ J   0  ] [ lambda ]   [ -J_dot * q_dot ]
   * Note: RHS is simplified here as q_dot is assumed to satisfy constraints via projection.
   */
  const A_full = Array.from({ length: 15 }, () => new Array(15).fill(0))
  for (let i = 0; i < 9; i++) A_full[i][i] = M_diag[i]

  const active = [true, true, true, true, true, onRail]
  const RHS = new Array(15).fill(0)
  for (let i = 0; i < 9; i++) RHS[i] = Q[i]

  for (let i = 0; i < 6; i++) {
    if (active[i]) {
      for (let j = 0; j < 9; j++) {
        A_full[9 + i][j] = J[i][j]
        A_full[j][9 + i] = J[i][j]
      }
    } else {
      // Inactive constraints handled by setting diagonal to 1 (identity row)
      A_full[9 + i][9 + i] = 1
    }
  }

  // Initial Solve
  const x_sol_raw = solveLinearSystem(A_full, RHS)
  const lambda_contact = x_sol_raw[13]
  const lambda_ground = x_sol_raw[14]

  /**
   * Inequality Handling (Contact Physics):
   * If lambda < 0, it means the constraint is trying to PULL (not possible for contact).
   * We deactivate such constraints and re-solve.
   */
  let redo = false
  if (lambda_contact < 0) {
    for (let j = 0; j < 15; j++) A_full[13][j] = A_full[j][13] = 0
    A_full[13][13] = 1
    RHS[13] = 0
    redo = true
  }
  if (onRail && lambda_ground > 0) {
    // If ground normal force points down, projectile has lifted off
    for (let j = 0; j < 15; j++) A_full[14][j] = A_full[j][14] = 0
    A_full[14][14] = 1
    RHS[14] = 0
    redo = true
  }

  const x_final = redo ? solveLinearSystem(A_full, RHS) : x_sol_raw

  // Calculate physical tension from multipliers
  const tL = x_final[9],
    tR = x_final[10]
  const tensionVec = new Float64Array([
    -2 * (DL[0] * tL + DR[0] * tR),
    -2 * (DL[1] * tL + DR[1] * tR),
    0,
  ])

  return {
    derivative: {
      armAngle: armAngularVelocity,
      armAngularVelocity: x_final[0],
      cwPosition: new Float64Array([cwVelocity[0], cwVelocity[1]]),
      cwVelocity: new Float64Array([x_final[1], x_final[2]]),
      cwAngle: cwAngularVelocity,
      cwAngularVelocity: x_final[3],
      slingBagPosition: new Float64Array([
        slingBagVelocity[0],
        slingBagVelocity[1],
      ]),
      slingBagVelocity: new Float64Array([x_final[4], x_final[5]]),
      slingBagAngle: slingBagAngularVelocity,
      slingBagAngularVelocity: x_final[6],
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([x_final[7], x_final[8], 0]),
      orientation: new Float64Array(4),
      angularVelocity: new Float64Array(3),
      windVelocity: new Float64Array(3),
      time: 1,
      isReleased: false,
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: tensionVec,
      total: new Float64Array([x_final[7] * Mp, x_final[8] * Mp, 0]),
      groundNormal: -x_final[14],
      slingBagNormal: 2 * R_p * x_final[13],
      lambda: new Float64Array(x_final.slice(9)),
    },
  }
}

/**
 * Computes derivatives for projectile in free flight.
 * Projectile motion is decoupled from the trebuchet.
 */
function computeFreeFlight(
  state: PhysicsState19DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  aero: { drag: Float64Array; magnus: Float64Array; total: Float64Array },
): { derivative: PhysicsDerivative19DOF; forces: PhysicsForces } {
  const Mp = projectile.mass,
    g = 9.81
  const {
    velocity,
    position,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
    slingBagAngle,
    slingBagAngularVelocity,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    armMass: Ma,
    jointFriction,
  } = trebuchetProps

  // Reduced Trebuchet Dynamics (Double Pendulum)
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const Icw = 0.4 * Mcw * Rcw * Rcw
  const M11 = Ia + Mcw * L2 * L2
  const M12 = Mcw * L2 * Rcw * Math.sin(armAngle - cwAngle)
  const M22 = Icw + Mcw * Rcw * Rcw
  const det = M11 * M22 - M12 * M12 + 1e-9

  const armCG = (L1 - L2) / 2
  const G1 =
    -Ma * g * armCG * Math.cos(armAngle) + Mcw * g * L2 * Math.cos(armAngle)
  const G2 = -Mcw * g * Rcw * Math.sin(cwAngle)
  const C1 =
    -Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const C2 =
    Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const normalForce = Mcw * g
  const t_ext = -Math.sign(armAngularVelocity) * jointFriction * normalForce

  const th_ddot = ((G1 - C1 + t_ext) * M22 - (G2 - C2) * M12) / det
  const phi_ddot = (M11 * (G2 - C2) - M12 * (G1 - C1 + t_ext)) / det

  // Arm tip acceleration for sling bag "follow-through"
  const ax_tip =
    -L1 * th_ddot * Math.sin(armAngle) -
    L1 * armAngularVelocity ** 2 * Math.cos(armAngle)
  const ay_tip =
    L1 * th_ddot * Math.cos(armAngle) -
    L1 * armAngularVelocity ** 2 * Math.sin(armAngle)

  // Sling bag swing dynamics (forced pendulum)
  const slingBag_ddot =
    -(g / 3.5) * Math.sin(slingBagAngle) -
    (ax_tip / 3.5) * Math.cos(slingBagAngle) -
    (ay_tip / 3.5) * Math.sin(slingBagAngle) -
    0.5 * slingBagAngularVelocity

  // Projectile Ballistics
  let ay = (aero.total[1] - Mp * g) / Mp
  if (position[1] < projectile.radius) {
    // Penalty-based ground contact for flight phase
    ay +=
      Math.min(2000000 * (projectile.radius - position[1]), 1e6) -
      4000 * velocity[1]
  }

  return {
    derivative: {
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([aero.total[0] / Mp, ay, 0]),
      orientation: new Float64Array(4),
      angularVelocity: new Float64Array(3),
      slingBagPosition: new Float64Array(2),
      slingBagVelocity: new Float64Array(2),
      armAngle: armAngularVelocity,
      armAngularVelocity: th_ddot,
      cwAngle: cwAngularVelocity,
      cwAngularVelocity: phi_ddot,
      slingBagAngle: slingBagAngularVelocity,
      slingBagAngularVelocity: slingBag_ddot,
      windVelocity: new Float64Array(3),
      time: 1,
      isReleased: true,
      cwPosition: new Float64Array(2),
      cwVelocity: new Float64Array(2),
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: new Float64Array(3),
      total: new Float64Array([aero.total[0], ay * Mp, 0]),
      groundNormal: position[1] < projectile.radius ? 1000 : 0,
      slingBagNormal: 0,
      lambda: new Float64Array(6),
    },
  }
}
