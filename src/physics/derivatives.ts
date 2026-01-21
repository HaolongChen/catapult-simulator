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

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length,
    L = Array.from({ length: n }, () => new Array(n).fill(0)),
    U = A.map((r) => [...r]),
    P = Array.from({ length: n }, (_, i) => i)
  for (let i = 0; i < n; i++) {
    let max = Math.abs(U[i][i]),
      maxR = i
    for (let k = i + 1; k < n; k++)
      if (Math.abs(U[k][i]) > max) {
        max = Math.abs(U[k][i])
        maxR = k
      }
    const tr = U[i]
    U[i] = U[maxR]
    U[maxR] = tr
    const tp = P[i]
    P[i] = P[maxR]
    P[maxR] = tp
    for (let k = 0; k < i; k++) {
      const tl = L[i][k]
      L[i][k] = L[maxR][k]
      L[maxR][k] = tl
    }
    const pV = U[i][i]
    if (Math.abs(pV) < 1e-12) U[i][i] = pV < 0 ? -1e-12 : 1e-12
    for (let k = i + 1; k < n; k++) {
      L[k][i] = U[k][i] / U[i][i]
      for (let j = i; j < n; j++) U[k][j] -= L[k][i] * U[i][j]
    }
    L[i][i] = 1
  }
  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = 0; j < i; j++) s += L[i][j] * y[j]
    y[i] = b[P[i]] - s
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = 0
    for (let j = i + 1; j < n; j++) s += U[i][j] * x[j]
    x[i] = (y[i] - s) / U[i][i]
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
    armAngle: th,
    armAngularVelocity: dth,
    cwVelocity: vCW,
    cwAngle: phi_cw,
    cwAngularVelocity: dphi_cw,
    slingAngle: phi_s,
    slingAngularVelocity: dphi_s,
    angularVelocity,
    windVelocity,
    isReleased,
  } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    counterweightInertia: Icw,
    armMass: Ma,
    jointFriction,
    slingLength: Ls,
    pivotHeight: H,
  } = trebuchetProps
  const Mp = projectile.mass,
    Rp = projectile.radius,
    g = PHYSICS_CONSTANTS.GRAVITY

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

  if (isReleased) {
    return computeFreeFlight(state, projectile, trebuchetProps, aero)
  }

  // --- 1. Kinematics ---
  const cosT = Math.cos(th),
    sinT = Math.sin(th)
  const cosP = Math.cos(phi_cw),
    sinP = Math.sin(phi_cw)
  const cosS = Math.cos(phi_s),
    sinS = Math.sin(phi_s)

  // Tip Positions
  const xtl = L1 * cosT,
    ytl = H + L1 * sinT
  const xts = -L2 * cosT,
    yts = H - L2 * sinT

  // Tip Partial Derivatives w.r.t th
  const xtl_p = -L1 * sinT,
    ytl_p = L1 * cosT
  const xts_p = L2 * sinT,
    yts_p = -L2 * cosT

  // Tip Acceleration Gamma Terms
  const xtl_g = -L1 * cosT * dth ** 2,
    ytl_g = -L1 * sinT * dth ** 2
  const xts_g = L2 * cosT * dth ** 2,
    yts_g = L2 * sinT * dth ** 2

  // --- 2. System Matrices (7 DOF) ---
  // q = [th, phi_s, xcw, ycw, phi_cw, xp, yp]
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const Is = 1e-6
  const M_diag = [Ia, Is, Mcw, Mcw, Icw, Mp, Mp]

  const friction =
    -Math.tanh(dth * 20.0) * jointFriction * Math.abs(normalForce)

  let projGndFric = 0
  if (position[1] - Rp <= 0.05) {
    projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.15 * Mp * g
  }

  const Q = [
    -Ma * g * ((L1 - L2) / 2) * cosT + friction,
    -Mp * g * Ls * cosS + Mp * L1 * Ls * Math.sin(th - phi_s) * dth ** 2,
    0,
    -Mcw * g,
    0,
    aero.total[0] + projGndFric,
    aero.total[1] - Mp * g,
  ]

  // --- 3. Constraints (5 total) ---
  const J = Array.from({ length: 5 }, () => new Array(7).fill(0))
  const gamma = new Array(5).fill(0)
  const alpha = 2.0,
    beta = 20.0

  // C0, C1: CW Hinge (xcw = xts + Rcw*sinP, ycw = yts - Rcw*cosP)
  const C0 = state.cwPosition[0] - (xts + Rcw * sinP)
  const dC0 = vCW[0] - (xts_p * dth + Rcw * cosP * dphi_cw)
  J[0][0] = -xts_p
  J[0][2] = 1.0
  J[0][4] = -Rcw * cosP
  gamma[0] = xts_g - Rcw * sinP * dphi_cw ** 2 - alpha * dC0 - beta * C0

  const C1 = state.cwPosition[1] - (yts - Rcw * cosP)
  const dC1 = vCW[1] - (yts_p * dth + Rcw * sinP * dphi_cw)
  J[1][0] = -yts_p
  J[1][3] = 1.0
  J[1][4] = -Rcw * sinP
  gamma[1] = yts_g + Rcw * cosP * dphi_cw ** 2 - alpha * dC1 - beta * C1

  // C2, C3: Sling Hinge (xp = xtl + Ls*cosS, yp = ytl + Ls*sinS)
  const C2 = position[0] - (xtl + Ls * cosS)
  const dC2 = velocity[0] - (xtl_p * dth - Ls * sinS * dphi_s)
  J[2][0] = -xtl_p
  J[2][1] = Ls * sinS
  J[2][5] = 1.0
  gamma[2] = xtl_g - Ls * cosS * dphi_s ** 2 - alpha * dC2 - beta * C2

  const C3 = position[1] - (ytl + Ls * sinS)
  const dC3 = velocity[1] - (ytl_p * dth + Ls * cosS * dphi_s)
  J[3][0] = -ytl_p
  J[3][1] = -Ls * cosS
  J[3][6] = 1.0
  gamma[3] = ytl_g - Ls * sinS * dphi_s ** 2 - alpha * dC3 - beta * C3

  // C4: Ground Rail (yp = Rp)
  const onR = position[1] - Rp <= 0.05
  const C4 = position[1] - Rp
  J[4][6] = 1.0
  gamma[4] = -100.0 * velocity[1] - 10000.0 * C4

  const solveKKT = (actR: boolean) => {
    const dim = 7 + 5
    const A = Array.from({ length: dim }, () => new Array(dim).fill(0))
    const B = new Array(dim).fill(0)
    for (let i = 0; i < 7; i++) {
      A[i][i] = M_diag[i]
      B[i] = Q[i]
    }
    // Add arm-sling coupling
    const coupling = Mp * L1 * Ls * Math.cos(th - phi_s)
    A[0][1] = coupling
    A[1][0] = coupling
    const active = [true, true, true, true, actR]
    for (let i = 0; i < 5; i++) {
      if (active[i]) {
        for (let j = 0; j < 7; j++) {
          A[7 + i][j] = J[i][j]
          A[j][7 + i] = J[i][j]
        }
        B[7 + i] = gamma[i]
      } else A[7 + i][7 + i] = 1.0
    }
    return solveLinearSystem(A, B)
  }

  let sol = solveKKT(onR)
  if (onR && sol[11] > 0) {
    sol = solveKKT(false)
  }

  const active = [true, true, true, true, onR && sol[11] <= 0]
  let checkFunction = 0
  const q_dot = [dth, dphi_s, vCW[0], vCW[1], dphi_cw, velocity[0], velocity[1]]
  for (let i = 0; i < 5; i++) {
    if (active[i]) {
      let sum = 0
      for (let j = 0; j < 7; j++) sum += J[i][j] * q_dot[j]
      checkFunction = Math.max(checkFunction, Math.abs(sum))
    }
  }

  // sol[5] and sol[6] are the projectile accelerations from the KKT solver
  // These accelerations already account for ALL forces (external + constraints)
  // So F_total = m * a by Newton's second law
  const ax = sol[5]
  const ay = sol[6]
  const F_total_x = Mp * ax
  const F_total_y = Mp * ay
  
  // Constraint forces from Lagrange multipliers
  // The Jacobian for projectile equations (rows for C2, C3, C4):
  // J[2] = [..., 0, 0, 0, 0, 0, 1.0, 0]  -> affects vx
  // J[3] = [..., 0, 0, 0, 0, 0, 0, 1.0]  -> affects vy
  // J[4] = [..., 0, 0, 0, 0, 0, 0, 1.0]  -> affects vy (ground)
  const lambda_C2 = sol[9]   // Sling constraint X
  const lambda_C3 = sol[10]  // Sling constraint Y
  const lambda_C4 = sol[11]  // Ground constraint Y
  
  // Sling tension (from C2 and C3 constraints only)
  const F_sling_x = lambda_C2
  const F_sling_y = lambda_C3
  
  return {
    derivative: {
      armAngle: dth,
      armAngularVelocity: sol[0],
      cwPosition: new Float64Array([vCW[0], vCW[1]]),
      cwVelocity: new Float64Array([sol[2], sol[3]]),
      cwAngle: dphi_cw,
      cwAngularVelocity: sol[4],
      slingAngle: dphi_s,
      slingAngularVelocity: sol[1],
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([sol[5], sol[6], 0]),
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
      tension: new Float64Array([F_sling_x, F_sling_y, 0]),
      total: new Float64Array([F_total_x, F_total_y, 0]),
      groundNormal: lambda_C4 > 0 ? 0 : -lambda_C4,
      checkFunction,
      lambda: new Float64Array(sol.slice(7)),
    },
  }
}

function computeFreeFlight(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  aero: { drag: Float64Array; magnus: Float64Array; total: Float64Array },
): { derivative: PhysicsDerivative17DOF; forces: PhysicsForces } {
  const Mp = projectile.mass
  const g = PHYSICS_CONSTANTS.GRAVITY
  const { velocity, position } = state
  const {
    longArmLength: L1,
    shortArmLength: L2,
    counterweightMass: Mcw,
    counterweightRadius: Rcw,
    armMass: Ma,
    jointFriction,
  } = trebuchetProps
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const Icw = 0.4 * Mcw * Rcw * Rcw
  const M11 = Ia + Mcw * L2 * L2
  const M12 = Mcw * L2 * Rcw * Math.sin(state.armAngle - state.cwAngle)
  const M22 = Icw + Mcw * Rcw * Rcw
  const det = M11 * M22 - M12 * M12 + 1e-9
  const G1 =
    -Ma * g * ((L1 - L2) / 2) * Math.cos(state.armAngle) +
    Mcw * g * L2 * Math.cos(state.armAngle)
  const G2 = -Mcw * g * Rcw * Math.sin(state.cwAngle)
  const C1 =
    -Mcw *
    L2 *
    Rcw *
    state.cwAngularVelocity ** 2 *
    Math.cos(state.armAngle - state.cwAngle)
  const C2 =
    Mcw *
    L2 *
    Rcw *
    state.armAngularVelocity ** 2 *
    Math.cos(state.armAngle - state.cwAngle)
  const t_ext =
    -Math.tanh(state.armAngularVelocity * 10) * jointFriction * Mcw * g
  const th_ddot = ((G1 - C1 + t_ext) * M22 - (G2 - C2) * M12) / det
  const phi_ddot = (M11 * (G2 - C2) - M12 * (G1 - C1 + t_ext)) / det

  let ay = (aero.total[1] - Mp * g) / Mp
  if (position[1] < projectile.radius) {
    ay +=
      Math.max(0, 50000 * (projectile.radius - position[1])) - 200 * velocity[1]
  }

  return {
    derivative: {
      armAngle: state.armAngularVelocity,
      armAngularVelocity: th_ddot,
      cwPosition: new Float64Array([state.cwVelocity[0], state.cwVelocity[1]]),
      cwVelocity: new Float64Array([0, 0]),
      cwAngle: state.cwAngularVelocity,
      cwAngularVelocity: phi_ddot,
      slingAngle: state.slingAngularVelocity,
      slingAngularVelocity: 0,
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([aero.total[0] / Mp, ay, 0]),
      orientation: new Float64Array(4),
      angularVelocity: new Float64Array(3),
      windVelocity: new Float64Array(3),
      time: 1,
      isReleased: true,
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: new Float64Array(3),
      total: new Float64Array([aero.total[0], ay * Mp, 0]),
      groundNormal: position[1] < projectile.radius ? 10.0 : 0,
      checkFunction: 0,
      lambda: new Float64Array(5),
    },
  }
}
