import { aerodynamicForce } from './aerodynamics'
import type {
  PhysicsDerivative17DOF,
  PhysicsForces,
  PhysicsState17DOF,
  ProjectileProperties,
  TrebuchetProperties,
} from './types'

export type { DerivativeFunction } from './types'

function solveLinearSystem(
  A: Array<Array<number>>,
  b: Array<number>,
): Array<number> {
  const n = b.length
  const matrix = A.map((row) => [...row])
  const rhs = [...b]

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let max = Math.abs(matrix[i][i])
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > max) {
        max = Math.abs(matrix[k][i])
        maxRow = k
      }
    }
    const tempRow = matrix[maxRow]
    matrix[maxRow] = matrix[i]
    matrix[i] = tempRow
    const tempB = rhs[maxRow]
    rhs[maxRow] = rhs[i]
    rhs[i] = tempB

    const pivotVal = matrix[i][i]
    if (Math.abs(pivotVal) < 1e-20) {
      matrix[i][i] = matrix[i][i] < 0 ? -1e-20 : 1e-20
    }

    for (let k = i + 1; k < n; k++) {
      const c = -matrix[k][i] / matrix[i][i]
      matrix[k][i] = 0
      for (let j = i + 1; j < n; j++) {
        matrix[k][j] += c * matrix[i][j]
      }
      rhs[k] += c * rhs[i]
    }
  }

  // Back substitution
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0
    for (let j = i + 1; j < n; j++) {
      sum += matrix[i][j] * x[j]
    }
    const pivotVal = matrix[i][i]
    x[i] =
      (rhs[i] - sum) /
      (Math.abs(pivotVal) < 1e-20 ? (pivotVal < 0 ? -1e-20 : 1e-20) : pivotVal)
  }
  return x
}

export function computeDerivatives(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  normalForce: number,
): { derivative: PhysicsDerivative17DOF; forces: PhysicsForces } {
  const {
    position,
    velocity,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
    orientation,
    angularVelocity,
    windVelocity,
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
  const dz = position[2]
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 1e-12)
  const ux = dx / dist,
    uy = dy / dist,
    uz = dz / dist
  const armVecX = Math.cos(armAngle),
    armVecY = Math.sin(armAngle)
  const slingDotArm = ux * armVecX + uy * armVecY
  const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360
  const isUpward = normAng > 45 && normAng < 225
  const releaseCondition =
    !wasReleased && isUpward && slingDotArm > Math.cos(releaseAngle)
  const isReleased = wasReleased || releaseCondition

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
    288.15,
  )

  if (isReleased) {
    return computeFreeFlight(state, projectile, trebuchetProps, aero)
  }

  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const Icw_box = 0.4 * Mcw * Rcw * Rcw
  const M_diag = [Ia + Mcw * L2 * L2, Icw_box + Mcw * Rcw * Rcw, Mp, Mp, Mp]
  const M12 = Mcw * L2 * Rcw * Math.sin(armAngle - cwAngle)

  let t_ext = -Math.sign(armAngularVelocity) * jointFriction * normalForce
  if (normAng > 160 && normAng < 180 && armAngularVelocity > 0) {
    t_ext -=
      1000000 * (normAng - 160) * (Math.PI / 180) + 5000 * armAngularVelocity
  }

  const armCG = (L1 - L2) / 2
  const Q_th =
    -Ma * g * armCG * Math.cos(armAngle) +
    Mcw * g * L2 * Math.cos(armAngle) +
    t_ext -
    Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const Q_phi =
    -Mcw * g * Rcw * Math.sin(cwAngle) -
    Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const Q_forces = [
    Q_th,
    Q_phi,
    aero.total[0],
    aero.total[1] - Mp * g,
    aero.total[2],
  ]

  const isTaut = dist >= Ls * 0.999
  const onGround = position[1] <= 0.005
  const J1 = [
    L1 * (uy * Math.cos(armAngle) - ux * Math.sin(armAngle)),
    0,
    ux,
    uy,
    uz,
  ]
  const J2 = [0, 0, 0, 1, 0]
  const tipVelX = -L1 * armAngularVelocity * Math.sin(armAngle),
    tipVelY = L1 * armAngularVelocity * Math.cos(armAngle)
  const relVelX = velocity[0] - tipVelX,
    relVelY = velocity[1] - tipVelY,
    relVelZ = velocity[2]
  const C1_dot =
    J1[0] * armAngularVelocity +
    J1[2] * velocity[0] +
    J1[3] * velocity[1] +
    J1[4] * velocity[2]
  const gamma1 =
    -(relVelX ** 2 + relVelY ** 2 + relVelZ ** 2) / dist -
    armAngularVelocity ** 2 *
      L1 *
      (ux * Math.cos(armAngle) + uy * Math.sin(armAngle))

  const alpha = 80,
    beta = 150
  const b_vec = [
    Q_forces[0],
    Q_forces[1],
    Q_forces[2],
    Q_forces[3],
    Q_forces[4],
    isTaut ? gamma1 - 2 * alpha * C1_dot - beta * beta * (dist - Ls) : 0,
    onGround ? -2 * alpha * velocity[1] - beta * beta * position[1] : 0,
  ]
  const A_matrix = Array.from({ length: 7 }, () => new Array(7).fill(0))
  A_matrix[0][0] = M_diag[0]
  A_matrix[0][1] = M12
  A_matrix[1][0] = M12
  A_matrix[1][1] = M_diag[1]
  A_matrix[2][2] = M_diag[2]
  A_matrix[3][3] = M_diag[3]
  A_matrix[4][4] = M_diag[4]

  // Regularization for stability with extreme mass ratios
  const eps = 1e-8
  for (let i = 0; i < 7; i++) A_matrix[i][i] += eps

  if (isTaut) {
    for (let i = 0; i < 5; i++) {
      A_matrix[5][i] = J1[i]
      A_matrix[i][5] = J1[i]
    }
  } else {
    A_matrix[5][5] = 1
    b_vec[5] = 0
  }
  if (onGround) {
    for (let i = 0; i < 5; i++) {
      A_matrix[6][i] = J2[i]
      A_matrix[i][6] = J2[i]
    }
  } else {
    A_matrix[6][6] = 1
    b_vec[6] = 0
  }

  const x = solveLinearSystem(A_matrix, b_vec)
  let th_ddot = x[0],
    phi_ddot = x[1],
    ax = x[2],
    ay = x[3],
    az = x[4]
  const lambda1 = x[5]
  const lambda2 = x[6]

  let needResolve = false
  if (isTaut && lambda1 < 0) {
    for (let i = 0; i < 5; i++) A_matrix[5][i] = A_matrix[i][5] = 0
    A_matrix[5][5] = 1
    b_vec[5] = 0
    needResolve = true
  }
  if (onGround && lambda2 > 0) {
    for (let i = 0; i < 5; i++) A_matrix[6][i] = A_matrix[i][6] = 0
    A_matrix[6][6] = 1
    b_vec[6] = 0
    needResolve = true
  }
  if (needResolve) {
    const x2 = solveLinearSystem(A_matrix, b_vec)
    th_ddot = x2[0]
    phi_ddot = x2[1]
    ax = x2[2]
    ay = x2[3]
    az = x2[4]
  }

  const w = angularVelocity,
    q = orientation
  return {
    derivative: {
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([ax, ay, az]),
      orientation: new Float64Array([
        0.5 * (-q[1] * w[0] - q[2] * w[1] - q[3] * w[2]),
        0.5 * (q[0] * w[0] + q[2] * w[2] - q[3] * w[1]),
        0.5 * (q[0] * w[1] - q[1] * w[2] + q[3] * w[0]),
        0.5 * (q[0] * w[2] + q[1] * w[1] - q[2] * w[0]),
      ]),
      angularVelocity: new Float64Array([
        -0.01 * w[0],
        -0.01 * w[1],
        -0.01 * w[2],
      ]),
      armAngle: armAngularVelocity,
      armAngularVelocity: th_ddot,
      cwAngle: cwAngularVelocity,
      cwAngularVelocity: phi_ddot,
      windVelocity: new Float64Array(3),
      time: 1,
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: new Float64Array([-ux * lambda1, -uy * lambda1, -uz * lambda1]),
      total: new Float64Array([
        aero.total[0] - ux * lambda1,
        aero.total[1] - uy * lambda1 - Mp * g - lambda2,
        aero.total[2] - uz * lambda1,
      ]),
    },
  }
}

function computeFreeFlight(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  aero: { drag: Float64Array; magnus: Float64Array; total: Float64Array },
): { derivative: PhysicsDerivative17DOF; forces: PhysicsForces } {
  const {
    velocity,
    position,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
    orientation,
    angularVelocity,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    armMass: Ma,
    jointFriction,
  } = trebuchetProps
  const Mp = projectile.mass,
    g = 9.81

  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3),
    Icw = 0.4 * Mcw * Rcw * Rcw

  const M11 = Ia + Mcw * L2 * L2
  const M12 = Mcw * L2 * Rcw * Math.sin(armAngle - cwAngle)
  const M22 = Icw + Mcw * Rcw * Rcw

  // Stable determinant calculation for extreme mass ratios
  const delta = armAngle - cwAngle
  const det =
    Ia * Icw +
    Ia * Mcw * Rcw * Rcw +
    Icw * Mcw * L2 * L2 +
    Mcw * Mcw * L2 * L2 * Rcw * Rcw * Math.cos(delta) * Math.cos(delta) +
    1e-9

  const armCG = (L1 - L2) / 2
  const G1 =
      -Ma * g * armCG * Math.cos(armAngle) + Mcw * g * L2 * Math.cos(armAngle),
    G2 = -Mcw * g * Rcw * Math.sin(cwAngle)
  const C1 =
      -Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle),
    C2 = Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360
  let t_ext = -Math.sign(armAngularVelocity) * jointFriction * Mcw * g
  if (normAng > 160 && normAng < 180 && armAngularVelocity > 0)
    t_ext -=
      1000000 * (normAng - 160) * (Math.PI / 180) + 5000 * armAngularVelocity

  const th_ddot = ((G1 - C1 + t_ext) * M22 - (G2 - C2) * M12) / det,
    phi_ddot = (M11 * (G2 - C2) - M12 * (G1 - C1 + t_ext)) / det

  let ay = (aero.total[1] - Mp * g) / Mp

  // Improved ground collision: acceleration-based penalty to avoid mass-ratio issues and tunnelling
  if (position[1] < 0) {
    const stiffness = 2000000 // Higher stiffness for high speed
    const damping = 4000
    ay += stiffness * -position[1] - damping * velocity[1]
  }

  const q = orientation,
    w = angularVelocity
  return {
    derivative: {
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([aero.total[0] / Mp, ay, aero.total[2] / Mp]),
      orientation: new Float64Array([
        0.5 * (-q[1] * w[0] - q[2] * w[1] - q[3] * w[2]),
        0.5 * (q[0] * w[0] + q[2] * w[2] - q[3] * w[1]),
        0.5 * (q[0] * w[1] - q[1] * w[2] + q[3] * w[0]),
        0.5 * (q[0] * w[2] + q[1] * w[1] - q[2] * w[0]),
      ]),
      angularVelocity: new Float64Array(3),
      armAngle: armAngularVelocity,
      armAngularVelocity: th_ddot,
      cwAngle: cwAngularVelocity,
      cwAngularVelocity: phi_ddot,
      windVelocity: new Float64Array(3),
      time: 1,
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: new Float64Array(3),
      total: aero.total,
    },
  }
}
