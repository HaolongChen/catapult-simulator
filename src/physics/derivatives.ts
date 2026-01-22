import { PHYSICS_CONSTANTS } from './constants'
import { aerodynamicForce } from './aerodynamics'
import type {
  PhysicsDerivative,
  PhysicsForces,
  PhysicsState,
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
    if (Math.abs(pV) < 1e-20) U[i][i] = pV < 0 ? -1e-20 : 1e-20
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
  state: PhysicsState,
  projectile: ProjectileProperties,
  trebuchetProps: TrebuchetProperties,
  normalForce: number,
): { derivative: PhysicsDerivative; forces: PhysicsForces } {
  const {
    position,
    velocity,
    armAngle: th,
    armAngularVelocity: dth,
    cwPosition: pCW,
    cwVelocity: vCW,
    cwAngle: phi_cw,
    cwAngularVelocity: dphi_cw,
    slingParticles,
    slingVelocities,
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
    ropeStiffness,
  } = trebuchetProps

  const Mp = projectile.mass
  const Rp = projectile.radius
  const g = PHYSICS_CONSTANTS.GRAVITY
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const Lseg = Ls / N

  const E = ropeStiffness || PHYSICS_CONSTANTS.ROPE_YOUNGS_MODULUS
  const Area = Math.PI * (PHYSICS_CONSTANTS.ROPE_DIAMETER / 2) ** 2
  const segmentK = (E * Area) / Lseg

  const Msling = Mp * 0.05
  const m_p = Math.max(Msling / N, PHYSICS_CONSTANTS.MIN_PARTICLE_MASS)

  const omega = Math.sqrt(segmentK / Math.max(m_p, 0.1))
  const alphaSoft = 2 * PHYSICS_CONSTANTS.ROPE_DAMPING_RATIO * omega
  const betaSoft = omega * omega

  const airVel = new Float64Array([
    velocity[0] - windVelocity[0],
    velocity[1] - windVelocity[1],
    velocity[2] - windVelocity[2],
  ])
  const aero = aerodynamicForce(
    airVel,
    angularVelocity,
    projectile,
    Math.max(0, position[1]),
    PHYSICS_CONSTANTS.SEA_LEVEL_TEMPERATURE,
  )

  const cosT = Math.cos(th),
    sinT = Math.sin(th)
  const cosP = Math.cos(phi_cw),
    sinP = Math.sin(phi_cw)

  const xtl = L1 * cosT,
    ytl = H + L1 * sinT
  const xts = -L2 * cosT,
    yts = H - L2 * sinT

  const xtl_p = -L1 * sinT,
    ytl_p = L1 * cosT
  const xts_p = L2 * sinT,
    yts_p = -L2 * cosT

  const xtl_g = -L1 * cosT * dth ** 2,
    ytl_g = -L1 * sinT * dth ** 2
  const xts_g = L2 * cosT * dth ** 2,
    yts_g = L2 * sinT * dth ** 2

  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)

  // dimQ: [arm, P1..PN, Proj, CW, phi_cw]
  const dimQ = 1 + 2 * N + 2 + 2 + 1
  const M_diag = new Float64Array(dimQ)
  const Minv = new Float64Array(dimQ)
  M_diag[0] = Ia
  for (let i = 0; i < N; i++) {
    M_diag[1 + 2 * i] = m_p
    M_diag[2 + 2 * i] = m_p
  }
  const idxProj = 1 + 2 * N
  M_diag[idxProj] = Mp
  M_diag[idxProj + 1] = Mp
  const idxCW = idxProj + 2
  M_diag[idxCW] = Mcw
  M_diag[idxCW + 1] = Mcw
  const idxPhi = idxCW + 2
  M_diag[idxPhi] = Icw

  for (let i = 0; i < dimQ; i++) Minv[i] = 1.0 / M_diag[i]

  const friction =
    -Math.tanh(dth * 100.0) * jointFriction * Math.abs(normalForce)

  let projGndFric = 0
  if (!isReleased && position[1] - Rp <= 0.05) {
    projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.4 * Mp * g
  }

  const Q = new Float64Array(dimQ)
  Q[0] = -Ma * g * ((L1 - L2) / 2) * cosT + friction
  for (let i = 0; i < N; i++) {
    Q[1 + 2 * i] = 0
    Q[2 + 2 * i] = -m_p * g
  }
  Q[idxProj] = aero.total[0] + projGndFric
  Q[idxProj + 1] = aero.total[1] - Mp * g
  Q[idxCW] = 0
  Q[idxCW + 1] = -Mcw * g
  Q[idxPhi] = 0

  // Air Resistance (Drag per segment)
  const ropeCd = PHYSICS_CONSTANTS.ROPE_DRAG_COEFFICIENT
  const ropeDiam = PHYSICS_CONSTANTS.ROPE_DIAMETER
  const rho = 1.225
  for (let i = 0; i < N; i++) {
    const vx = slingVelocities[2 * i]
    const vy = slingVelocities[2 * i + 1]
    const vMag = Math.sqrt(vx * vx + vy * vy + 1e-12)
    const fDrag = -0.5 * rho * vMag * ropeCd * ropeDiam * Lseg
    Q[1 + 2 * i] += (fDrag * vx) / vMag
    Q[2 + 2 * i] += (fDrag * vy) / vMag
  }

  // dimC: [N segments, 2 Lock, 2 CW, 1 Ground]
  const dimC = N + 2 + 2 + 1
  const J = Array.from({ length: dimC }, () => new Array(dimQ).fill(0))
  const gamma = new Array(dimC).fill(0)
  const alphaHard = 40.0,
    betaHard = 1600.0

  // Sling Distance Constraints
  for (let i = 0; i < N; i++) {
    let pa, va, pb, vb, idxA, idxB
    const La = Lseg

    if (i === 0) {
      pa = { x: xtl, y: ytl }
      va = { x: xtl_p * dth, y: ytl_p * dth }
      pb = { x: slingParticles[0], y: slingParticles[1] }
      vb = { x: slingVelocities[0], y: slingVelocities[1] }
      idxA = 0 // armAngle
      idxB = 1 // P1
    } else {
      pa = {
        x: slingParticles[2 * (i - 1)],
        y: slingParticles[2 * (i - 1) + 1],
      }
      va = {
        x: slingVelocities[2 * (i - 1)],
        y: slingVelocities[2 * (i - 1) + 1],
      }
      pb = { x: slingParticles[2 * i], y: slingParticles[2 * i + 1] }
      vb = { x: slingVelocities[2 * i], y: slingVelocities[2 * i + 1] }
      idxA = 1 + 2 * (i - 1)
      idxB = 1 + 2 * i
    }

    const dx = pb.x - pa.x,
      dy = pb.y - pa.y
    const d = Math.sqrt(dx * dx + dy * dy + 1e-12)
    const C = (d * d - La * La) / (2 * La)
    const relV = { x: vb.x - va.x, y: vb.y - va.y }
    const dC = (dx * relV.x + dy * relV.y) / La

    if (i === 0) {
      J[i][0] = -(dx * xtl_p + dy * ytl_p) / La
      J[i][1] = dx / La
      J[i][2] = dy / La
      gamma[i] =
        (dx * xtl_g + dy * ytl_g) / La -
        ((vb.x - va.x) ** 2 + (vb.y - va.y) ** 2) / La -
        alphaSoft * dC -
        betaSoft * C
    } else {
      J[i][idxA] = -dx / La
      J[i][idxA + 1] = -dy / La
      J[i][idxB] = dx / La
      J[i][idxB + 1] = dy / La
      gamma[i] =
        -((vb.x - va.x) ** 2 + (vb.y - va.y) ** 2) / La -
        alphaSoft * dC -
        betaSoft * C
    }
  }

  // Lock Constraints (PN to Proj)
  const pN = {
    x: slingParticles[2 * (N - 1)],
    y: slingParticles[2 * (N - 1) + 1],
  }
  const vN = {
    x: slingVelocities[2 * (N - 1)],
    y: slingVelocities[2 * (N - 1) + 1],
  }
  const pProj = { x: position[0], y: position[1] }
  const vProj = { x: velocity[0], y: velocity[1] }

  const lockX = pN.x - pProj.x
  const lockY = pN.y - pProj.y
  const dLockX = vN.x - vProj.x
  const dLockY = vN.y - vProj.y

  J[N][1 + 2 * (N - 1)] = 1.0
  J[N][idxProj] = -1.0
  gamma[N] = -alphaHard * dLockX - betaHard * lockX

  J[N + 1][1 + 2 * (N - 1) + 1] = 1.0
  J[N + 1][idxProj + 1] = -1.0
  gamma[N + 1] = -alphaHard * dLockY - betaHard * lockY

  // CW hinge
  const C_cw0 = pCW[0] - (xts + Rcw * sinP)
  const dC_cw0 = vCW[0] - (xts_p * dth + Rcw * cosP * dphi_cw)
  J[N + 2][0] = -xts_p
  J[N + 2][idxCW] = 1.0
  J[N + 2][idxPhi] = -Rcw * cosP
  gamma[N + 2] =
    xts_g - Rcw * sinP * dphi_cw ** 2 - alphaHard * dC_cw0 - betaHard * C_cw0

  const C_cw1 = pCW[1] - (yts - Rcw * cosP)
  const dC_cw1 = vCW[1] - (yts_p * dth + Rcw * sinP * dphi_cw)
  J[N + 3][0] = -yts_p
  J[N + 3][idxCW + 1] = 1.0
  J[N + 3][idxPhi] = -Rcw * sinP
  gamma[N + 3] =
    yts_g + Rcw * cosP * dphi_cw ** 2 - alphaHard * dC_cw1 - betaHard * C_cw1

  // Ground rail
  const onR = position[1] - Rp <= 0.05
  const C_gnd = position[1] - Rp
  J[N + 4][idxProj + 1] = 1.0
  gamma[N + 4] = -100.0 * velocity[1] - 10000.0 * C_gnd

  const solveKKT = (mask: boolean[]) => {
    const totalDim = dimQ + dimC
    const A = Array.from({ length: totalDim }, () =>
      new Array(totalDim).fill(0),
    )
    const B = new Array(totalDim).fill(0)
    for (let i = 0; i < dimQ; i++) {
      A[i][i] = M_diag[i]
      B[i] = Q[i]
    }
    for (let i = 0; i < dimC; i++) {
      if (mask[i]) {
        for (let j = 0; j < dimQ; j++) {
          A[dimQ + i][j] = J[i][j]
          A[j][dimQ + i] = J[i][j]
        }
        B[dimQ + i] = gamma[i]
        A[dimQ + i][dimQ + i] = PHYSICS_CONSTANTS.KKT_REGULARIZATION
      } else A[dimQ + i][dimQ + i] = 1.0
    }
    return solveLinearSystem(A, B)
  }

  const mask = new Array(dimC).fill(true)
  if (isReleased) {
    mask[N] = false
    mask[N + 1] = false
  }
  mask[N + 4] = !isReleased && onR

  let sol = solveKKT(mask)

  for (let iter = 0; iter < 3; iter++) {
    let changed = false
    // Only sling segments (0..N-1) can go slack
    for (let i = 0; i < N; i++) {
      if (mask[i] && sol[dimQ + i] < -1e-3) {
        mask[i] = false
        changed = true
      }
    }
    if (mask[N + 4] && sol[dimQ + N + 4] > 1e-3) {
      mask[N + 4] = false
      changed = true
    }
    if (!changed) break
    sol = solveKKT(mask)
  }

  const q_ddot = sol.slice(0, dimQ)
  const lambda = sol.slice(dimQ)

  const slingDeriv = new Float64Array(2 * N)
  const slingVDeriv = new Float64Array(2 * N)
  for (let i = 0; i < N; i++) {
    slingDeriv[2 * i] = slingVelocities[2 * i]
    slingDeriv[2 * i + 1] = slingVelocities[2 * i + 1]
    slingVDeriv[2 * i] = q_ddot[1 + 2 * i]
    slingVDeriv[2 * i + 1] = q_ddot[2 + 2 * i]
  }

  return {
    derivative: {
      armAngle: dth,
      armAngularVelocity: q_ddot[0],
      cwPosition: new Float64Array([vCW[0], vCW[1]]),
      cwVelocity: new Float64Array([q_ddot[idxCW], q_ddot[idxCW + 1]]),
      cwAngle: dphi_cw,
      cwAngularVelocity: q_ddot[idxPhi],
      slingParticles: slingDeriv,
      slingVelocities: slingVDeriv,
      position: new Float64Array([velocity[0], velocity[1], velocity[2]]),
      velocity: new Float64Array([q_ddot[idxProj], q_ddot[idxProj + 1], 0]),
      orientation: new Float64Array(4),
      angularVelocity: new Float64Array(3),
      windVelocity: new Float64Array(3),
      time: 1,
      isReleased,
    },
    forces: {
      drag: aero.drag,
      magnus: aero.magnus,
      gravity: new Float64Array([0, -Mp * g, 0]),
      tension: !isReleased
        ? new Float64Array([
            lambda[N] || 0, // Simplified visualization
            lambda[N + 1] || 0,
            0,
          ])
        : new Float64Array(3),
      total: new Float64Array([
        q_ddot[idxProj] * Mp,
        q_ddot[idxProj + 1] * Mp,
        0,
      ]),
      groundNormal: mask[N + 4] ? -lambda[N + 4] : 0,
      checkFunction: 0,
      lambda: new Float64Array(lambda),
    },
  }
}
