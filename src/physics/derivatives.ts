import { PHYSICS_CONSTANTS } from './constants'
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
  const L = Array.from({ length: n }, () => new Array(n).fill(0))
  const U = A.map((row) => [...row])
  const P = Array.from({ length: n }, (_, i) => i)

  for (let i = 0; i < n; i++) {
    let max = Math.abs(U[i][i])
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(U[k][i]) > max) {
        max = Math.abs(U[k][i])
        maxRow = k
      }
    }

    const tempRow = U[i]
    U[i] = U[maxRow]
    U[maxRow] = tempRow
    const tempP = P[i]
    P[i] = P[maxRow]
    P[maxRow] = tempP

    for (let k = 0; k < i; k++) {
      const tempL = L[i][k]
      L[i][k] = L[maxRow][k]
      L[maxRow][k] = tempL
    }

    const pivotVal = U[i][i]
    if (Math.abs(pivotVal) < 1e-20) {
      U[i][i] = pivotVal < 0 ? -1e-20 : 1e-20
    }

    for (let k = i + 1; k < n; k++) {
      L[k][i] = U[k][i] / U[i][i]
      for (let j = i; j < n; j++) {
        U[k][j] -= L[k][i] * U[i][j]
      }
    }
    L[i][i] = 1
  }

  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j < i; j++) {
      sum += L[i][j] * y[j]
    }
    y[i] = b[P[i]] - sum
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0
    for (let j = i + 1; j < n; j++) {
      sum += U[i][j] * x[j]
    }
    x[i] = (y[i] - sum) / U[i][i]
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
    isReleased: wasReleased,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    slingLength: Ls,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    armMass: Ma,
    pivotHeight: H,
    jointFriction,
  } = trebuchetProps
  const Mp = projectile.mass
  const g = PHYSICS_CONSTANTS.GRAVITY

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

  const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360

  if (wasReleased) {
    return computeFreeFlight(state, projectile, trebuchetProps, aero)
  }

  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)
  const dx = position[0] - tipX
  const dy = position[1] - tipY
  const dz = position[2]
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 1e-12)
  const ux = dx / dist,
    uy = dy / dist,
    uz = dz / dist

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
    t_ext +
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
  const onGround = position[1] - projectile.radius <= 0.005

  const J1 = [
    L1 * (ux * Math.sin(armAngle) - uy * Math.cos(armAngle)),
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
    (C1_dot * C1_dot - (relVelX ** 2 + relVelY ** 2 + relVelZ ** 2)) / dist -
    armAngularVelocity ** 2 *
      L1 *
      (ux * Math.cos(armAngle) + uy * Math.sin(armAngle))

  const alpha = 20,
    beta = 100
  const b_vec = [
    Q_forces[0],
    Q_forces[1],
    Q_forces[2],
    Q_forces[3],
    Q_forces[4],
    isTaut ? gamma1 - 2 * alpha * C1_dot - beta * beta * (dist - Ls) : 0,
    onGround
      ? -2 * alpha * velocity[1] -
        beta * beta * (position[1] - projectile.radius)
      : 0,
  ]
  const A_matrix = Array.from({ length: 7 }, () => new Array(7).fill(0))
  A_matrix[0][0] = M_diag[0]
  A_matrix[0][1] = M12
  A_matrix[1][0] = M12
  A_matrix[1][1] = M_diag[1]
  A_matrix[2][2] = M_diag[2]
  A_matrix[3][3] = M_diag[3]
  A_matrix[4][4] = M_diag[4]

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
  let lambda1 = x[5]
  let lambda2 = x[6]

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
    lambda1 = x2[5]
    lambda2 = x2[6]
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
        -0.1 * w[0],
        -0.1 * w[1],
        -0.1 * w[2],
      ]),
      armAngle: armAngularVelocity,
      armAngularVelocity: th_ddot,
      cwAngle: cwAngularVelocity,
      cwAngularVelocity: phi_ddot,
      windVelocity: new Float64Array(3),
      time: 1,
      isReleased: wasReleased,
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
      groundNormal: -lambda2,
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

  const delta = armAngle - cwAngle
  const det =
    Ia * Icw +
    Ia * Mcw * Rcw * Rcw +
    Icw * Mcw * L2 * L2 +
    Mcw * Mcw * L2 * L2 * Rcw * Rcw * Math.cos(delta) * Math.cos(delta) +
    1e-9

  const armCG = (L1 - L2) / 2
  const G1 =
    -Ma * g * armCG * Math.cos(armAngle) + Mcw * g * L2 * Math.cos(armAngle)
  const G2 = -Mcw * g * Rcw * Math.sin(cwAngle)
  const C1 =
    -Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const C2 =
    Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const normAng = ((((armAngle * 180) / Math.PI) % 360) + 360) % 360
  let t_ext = -Math.sign(armAngularVelocity) * jointFriction * Mcw * g
  if (normAng > 160 && normAng < 180 && armAngularVelocity > 0)
    t_ext -=
      1000000 * (normAng - 160) * (Math.PI / 180) + 5000 * armAngularVelocity

  const th_ddot = ((G1 - C1 + t_ext) * M22 - (G2 - C2) * M12) / det,
    phi_ddot = (M11 * (G2 - C2) - M12 * (G1 - C1 + t_ext)) / det

  let ay = (aero.total[1] - Mp * g) / Mp

  if (position[1] < projectile.radius) {
    const stiffness = 2000000
    const damping = 4000
    ay += stiffness * (projectile.radius - position[1]) - damping * velocity[1]
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
      isReleased: state.isReleased,
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: new Float64Array(3),
      total: aero.total,
      groundNormal:
        position[1] < projectile.radius
          ? 2000000 * (projectile.radius - position[1])
          : 0,
    },
  }
}
