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
    cwAngle: phi,
    cwAngularVelocity: dphi,
    slingBagVelocity: vSB,
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
    slingBagMass: Msb,
    slingBagInertia: Isb,
    slingLength: Ls,
    pivotHeight: H,
  } = trebuchetProps
  const Mp = projectile.mass,
    Rp = projectile.radius,
    g = PHYSICS_CONSTANTS.GRAVITY
  const aero = aerodynamicForce(
    new Float64Array([
      velocity[0] - windVelocity[0],
      velocity[1] - windVelocity[1],
      velocity[2] - windVelocity[2],
    ]),
    angularVelocity,
    projectile,
    position[1],
    PHYSICS_CONSTANTS.SEA_LEVEL_TEMPERATURE,
  )
  if (isReleased)
    return computeFreeFlight(state, projectile, trebuchetProps, aero)

  const cosT = Math.cos(th),
    sinT = Math.sin(th),
    cosP = Math.cos(phi),
    sinP = Math.sin(phi)
  const xtl = L1 * cosT,
    ytl = H + L1 * sinT,
    vxtl = -L1 * sinT * dth,
    vytl = L1 * cosT * dth
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3),
    M_diag = [Ia, Mcw, Mcw, Icw, Msb, Msb, Isb, Mp, Mp]
  const friction =
    -Math.tanh(dth * 100.0) * jointFriction * Math.abs(normalForce)
  const Q = [
    -Ma * g * ((L1 - L2) / 2) * cosT + friction,
    0,
    -Mcw * g,
    0,
    0,
    -Msb * g,
    0,
    aero.total[0],
    aero.total[1] - Mp * g,
  ]

  const J = Array.from({ length: 6 }, () => new Array(9).fill(0)),
    gamma = new Array(6).fill(0)
  const a = 10.0,
    b = 100.0 // Baumgarte alpha, beta

  const C0 = state.cwPosition[0] + L2 * cosT - Rcw * sinP,
    dC0 = vCW[0] - L2 * sinT * dth - Rcw * cosP * dphi
  J[0][0] = -L2 * sinT
  J[0][1] = 1.0
  J[0][3] = -Rcw * cosP
  gamma[0] = L2 * cosT * dth ** 2 - Rcw * sinP * dphi ** 2 - a * dC0 - b * C0
  const C1 = state.cwPosition[1] + L2 * sinT + Rcw * cosP - H,
    dC1 = vCW[1] + L2 * cosT * dth - Rcw * sinP * dphi
  J[1][0] = L2 * cosT
  J[1][2] = 1.0
  J[1][3] = -Rcw * sinP
  gamma[1] = L2 * sinT * dth ** 2 + Rcw * cosP * dphi ** 2 - a * dC1 - b * C1

  const dx = position[0] - xtl,
    dy = position[1] - ytl,
    dvx = velocity[0] - vxtl,
    dvy = velocity[1] - vytl
  const C2 = 0.5 * (dx * dx + dy * dy - Ls * Ls),
    dC2 = dx * dvx + dy * dvy
  J[2][0] = dx * L1 * sinT - dy * L1 * cosT
  J[2][7] = dx
  J[2][8] = dy
  gamma[2] =
    -(dvx ** 2 + dvy ** 2) -
    dx * L1 * cosT * dth ** 2 -
    dy * L1 * sinT * dth ** 2 -
    a * dC2 -
    b * C2

  const onR = position[1] - Rp <= 0.05,
    C3 = position[1] - Rp
  J[3][8] = 1.0
  gamma[3] = -100.0 * velocity[1] - 10000.0 * C3

  const C4 = state.slingBagPosition[0] - position[0],
    dC4 = vSB[0] - velocity[0]
  const C5 = state.slingBagPosition[1] - position[1],
    dC5 = vSB[1] - velocity[1]
  J[4][4] = 1.0
  J[4][7] = -1.0
  gamma[4] = -20 * dC4 - 400 * C4
  J[5][5] = 1.0
  J[5][8] = -1.0
  gamma[5] = -20 * dC5 - 400 * C5

  const solveKKT = (as: boolean, ar: boolean) => {
    const A = Array.from({ length: 15 }, () => new Array(15).fill(0)),
      B = new Array(15).fill(0)
    for (let i = 0; i < 9; i++) {
      A[i][i] = M_diag[i]
      B[i] = Q[i]
    }
    const active = [true, true, as, ar, true, true]
    for (let i = 0; i < 6; i++) {
      if (active[i]) {
        for (let j = 0; j < 9; j++) {
          A[9 + i][j] = J[i][j]
          A[j][9 + i] = J[i][j]
        }
        B[9 + i] = gamma[i]
      } else A[9 + i][9 + i] = 1.0
    }
    return solveLinearSystem(A, B)
  }

  let actS = true,
    actR = onR,
    sol = solveKKT(actS, actR)
  if (sol[11] < 0 || (onR && sol[12] > 0)) {
    if (sol[11] < 0) actS = false
    if (onR && sol[12] > 0) actR = false
    sol = solveKKT(actS, actR)
  }

  return {
    derivative: {
      armAngle: dth,
      armAngularVelocity: sol[0],
      cwPosition: new Float64Array([vCW[0], vCW[1]]),
      cwVelocity: new Float64Array([sol[1], sol[2]]),
      cwAngle: dphi,
      cwAngularVelocity: sol[3],
      slingBagPosition: new Float64Array([vSB[0], vSB[1]]),
      slingBagVelocity: new Float64Array([sol[4], sol[5]]),
      slingBagAngle: 0,
      slingBagAngularVelocity: 0,
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([sol[7], sol[8], 0]),
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
      tension: actS
        ? new Float64Array([-sol[11] * dx, -sol[11] * dy, 0])
        : new Float64Array(3),
      total: new Float64Array([sol[7] * Mp, sol[8] * Mp, 0]),
      groundNormal: actR ? -sol[12] : 0,
      slingBagNormal: 0,
      lambda: new Float64Array(sol.slice(9)),
    },
  }
}

function computeFreeFlight(
  state: PhysicsState17DOF,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties, // Make sure to pass this arg in the main function call!
  aero: { drag: Float64Array; magnus: Float64Array; total: Float64Array },
): { derivative: PhysicsDerivative17DOF; forces: PhysicsForces } {
  const Mp = projectile.mass
  const g = PHYSICS_CONSTANTS.GRAVITY
  const {
    velocity,
    position,
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

  // --- 1. Solve Arm Dynamics (Recoil) ---
  // We solve M * acc = Q for the reduced system (Arm + CW, no projectile)

  // Inertia of Arm
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  // Inertia of CW relative to its hinge
  const Icw = 0.4 * Mcw * Rcw * Rcw

  // Matrix Components for Double Pendulum (Arm + Hinged CW)
  // M11: Arm Inertia + CW point mass effect
  const M11 = Ia + Mcw * L2 * L2
  // M12: Coupling between Arm and CW Hinge
  const M12 = Mcw * L2 * Rcw * Math.sin(armAngle - cwAngle)
  // M22: CW Inertia + CW point mass effect
  const M22 = Icw + Mcw * Rcw * Rcw

  const det = M11 * M22 - M12 * M12 + 1e-9

  // Generalized Forces (Gravity + Coriolis)
  const armCG = (L1 - L2) / 2
  // Gravity torques
  const G1 =
    -Ma * g * armCG * Math.cos(armAngle) + Mcw * g * L2 * Math.cos(armAngle)
  const G2 = -Mcw * g * Rcw * Math.sin(cwAngle)

  // Coriolis/Centripetal torques
  const C1 =
    -Mcw * L2 * Rcw * cwAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)
  const C2 =
    Mcw * L2 * Rcw * armAngularVelocity ** 2 * Math.cos(armAngle - cwAngle)

  // Friction
  const normalForce = Mcw * g // Approx
  const t_ext =
    -Math.tanh(armAngularVelocity * 10) * jointFriction * normalForce

  // Cramers Rule / Direct Inversion for 2x2 system
  const RHS1 = G1 - C1 + t_ext
  const RHS2 = G2 - C2

  const th_ddot = (RHS1 * M22 - RHS2 * M12) / det
  const phi_ddot = (M11 * RHS2 - M12 * RHS1) / det

  // --- 2. Solve Projectile Dynamics (Ballistics) ---
  let ay = (aero.total[1] - Mp * g) / Mp
  if (position[1] < projectile.radius) {
    ay +=
      Math.max(0, 50000 * (projectile.radius - position[1])) - 200 * velocity[1]
  }

  // --- 3. Return Derivatives ---
  // Note: slingBag visual derivatives set to 0 to stop them flying around
  return {
    derivative: {
      armAngle: armAngularVelocity,
      armAngularVelocity: th_ddot, // Correct acceleration
      cwPosition: new Float64Array([state.cwVelocity[0], state.cwVelocity[1]]),
      cwVelocity: new Float64Array([0, 0]), // Simplified: CW follows arm kinematically
      cwAngle: cwAngularVelocity,
      cwAngularVelocity: phi_ddot, // Correct acceleration
      slingBagPosition: new Float64Array([0, 0]),
      slingBagVelocity: new Float64Array([0, 0]),
      slingBagAngle: 0,
      slingBagAngularVelocity: 0,
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([aero.total[0] / Mp, ay, 0]),
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
      tension: new Float64Array(3),
      total: new Float64Array([aero.total[0], ay * Mp, 0]),
      groundNormal: position[1] < projectile.radius ? 10.0 : 0,
      slingBagNormal: 0,
      lambda: new Float64Array(6),
    },
  }
}
