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
  } = trebuchetProps

  const Mp = projectile.mass
  const Rp = projectile.radius
  const g = PHYSICS_CONSTANTS.GRAVITY
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
  const Lseg = Ls / N

  const Msling = Mp * 0.5 // Higher mass for stability
  const m_p = Math.max(Msling / (N - 1), PHYSICS_CONSTANTS.MIN_PARTICLE_MASS)

  const Mp_eff = Mp

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

  const M_inter = N - 1
  const dimQ = 1 + 2 * M_inter + 2 + 2 + 1
  const M_diag = new Float64Array(dimQ)
  const Minv = new Float64Array(dimQ)
  M_diag[0] = Ia
  for (let i = 0; i < M_inter; i++) {
    M_diag[1 + 2 * i] = m_p
    M_diag[2 + 2 * i] = m_p
  }
  M_diag[1 + 2 * M_inter] = Mp_eff
  M_diag[2 + 2 * M_inter] = Mp_eff
  M_diag[1 + 2 * M_inter + 2] = Mcw
  M_diag[2 + 2 * M_inter + 2] = Mcw
  M_diag[1 + 2 * M_inter + 4] = Icw

  for (let i = 0; i < dimQ; i++) Minv[i] = 1.0 / M_diag[i]

  const friction =
    -Math.tanh(dth * 100.0) * jointFriction * Math.abs(normalForce)

  let projGndFric = 0
  if (!isReleased && position[1] - Rp <= 0.05) {
    projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.4 * Mp * g
  }

  const Q = new Float64Array(dimQ)
  Q[0] = -Ma * g * ((L1 - L2) / 2) * cosT + friction
  for (let i = 0; i < M_inter; i++) {
    Q[1 + 2 * i] = 0
    Q[2 + 2 * i] = -m_p * g
  }
  Q[1 + 2 * M_inter] = aero.total[0] + projGndFric
  Q[2 + 2 * M_inter] = aero.total[1] - Mp * g
  Q[1 + 2 * M_inter + 2] = 0
  Q[2 + 2 * M_inter + 2] = -Mcw * g
  Q[1 + 2 * M_inter + 4] = 0

  const dimC = N + 2 + 1
  const J = Array.from({ length: dimC }, () => new Array(dimQ).fill(0))
  const gamma = new Array(dimC).fill(0)
  const alpha = 10.0,
    beta = 100.0 // Softer Baumgarte to avoid energy spikes

  let dxN = 0,
    dyN = 0
  if (N === 1) {
    const pN = { x: position[0], y: position[1] }
    const vN = { x: velocity[0], y: velocity[1] }
    dxN = pN.x - xtl
    dyN = pN.y - ytl
    const dN = Math.sqrt(dxN * dxN + dyN * dyN + 1e-12)
    const CN = (dN * dN - Ls * Ls) / (2 * Ls)
    const dCN = (dxN * (vN.x - xtl_p * dth) + dyN * (vN.y - ytl_p * dth)) / Ls
    J[0][0] = -(dxN * xtl_p + dyN * ytl_p) / Ls
    J[0][1 + 2 * M_inter] = dxN / Ls
    J[0][2 + 2 * M_inter] = dyN / Ls
    gamma[0] =
      (dxN * xtl_g + dyN * ytl_g) / Ls -
      ((vN.x - xtl_p * dth) ** 2 + (vN.y - ytl_p * dth) ** 2) / Ls -
      alpha * dCN -
      beta * CN
  } else {
    const p1 = { x: slingParticles[0], y: slingParticles[1] }
    const v1 = { x: slingVelocities[0], y: slingVelocities[1] }
    const dx1 = p1.x - xtl,
      dy1 = p1.y - ytl
    const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + 1e-12)
    const C0 = (d1 * d1 - Lseg * Lseg) / (2 * Lseg)
    const dC0 = (dx1 * (v1.x - xtl_p * dth) + dy1 * (v1.y - ytl_p * dth)) / Lseg
    J[0][0] = -(dx1 * xtl_p + dy1 * ytl_p) / Lseg
    J[0][1] = dx1 / Lseg
    J[0][2] = dy1 / Lseg
    gamma[0] =
      (dx1 * xtl_g + dy1 * ytl_g) / Lseg -
      ((v1.x - xtl_p * dth) ** 2 + (v1.y - ytl_p * dth) ** 2) / Lseg -
      alpha * dC0 -
      beta * C0

    for (let i = 0; i < M_inter - 1; i++) {
      const pa = { x: slingParticles[2 * i], y: slingParticles[2 * i + 1] }
      const va = { x: slingVelocities[2 * i], y: slingVelocities[2 * i + 1] }
      const pb = {
        x: slingParticles[2 * (i + 1)],
        y: slingParticles[2 * (i + 1) + 1],
      }
      const vb = {
        x: slingVelocities[2 * (i + 1)],
        y: slingVelocities[2 * (i + 1) + 1],
      }
      const dx = pb.x - pa.x,
        dy = pb.y - pa.y
      const d = Math.sqrt(dx * dx + dy * dy + 1e-12)
      const C = (d * d - Lseg * Lseg) / (2 * Lseg)
      const dC = (dx * (vb.x - va.x) + dy * (vb.y - va.y)) / Lseg
      J[i + 1][1 + 2 * i] = -dx / Lseg
      J[i + 1][2 + 2 * i] = -dy / Lseg
      J[i + 1][1 + 2 * (i + 1)] = dx / Lseg
      J[i + 1][2 + 2 * (i + 1)] = dy / Lseg
      gamma[i + 1] =
        -((vb.x - va.x) ** 2 + (vb.y - va.y) ** 2) / Lseg -
        alpha * dC -
        beta * C
    }

    const pM = {
      x: slingParticles[2 * (M_inter - 1)],
      y: slingParticles[2 * (M_inter - 1) + 1],
    }
    const vM = {
      x: slingVelocities[2 * (M_inter - 1)],
      y: slingVelocities[2 * (M_inter - 1) + 1],
    }
    const pN = { x: position[0], y: position[1] }
    const vN = { x: velocity[0], y: velocity[1] }
    dxN = pN.x - pM.x
    dyN = pN.y - pM.y
    const dN = Math.sqrt(dxN * dxN + dyN * dyN + 1e-12)
    const CN = (dN * dN - Lseg * Lseg) / (2 * Lseg)
    const dCN = (dxN * (vN.x - vM.x) + dyN * (vN.y - vM.y)) / Lseg
    J[N - 1][1 + 2 * (M_inter - 1)] = -dxN / Lseg
    J[N - 1][2 + 2 * (M_inter - 1)] = -dyN / Lseg
    J[N - 1][1 + 2 * M_inter] = dxN / Lseg
    J[N - 1][2 + 2 * M_inter] = dyN / Lseg
    gamma[N - 1] =
      -((vN.x - vM.x) ** 2 + (vN.y - vM.y) ** 2) / Lseg -
      alpha * dCN -
      beta * CN
  }

  const idxCW = 1 + 2 * M_inter + 2
  const idxPhi = 1 + 2 * M_inter + 4
  const C_cw0 = pCW[0] - (xts + Rcw * sinP)
  const dC_cw0 = vCW[0] - (xts_p * dth + Rcw * cosP * dphi_cw)
  J[N][0] = -xts_p
  J[N][idxCW] = 1.0
  J[N][idxPhi] = -Rcw * cosP
  gamma[N] = xts_g - Rcw * sinP * dphi_cw ** 2 - alpha * dC_cw0 - beta * C_cw0

  const C_cw1 = pCW[1] - (yts - Rcw * cosP)
  const dC_cw1 = vCW[1] - (yts_p * dth + Rcw * sinP * dphi_cw)
  J[N + 1][0] = -yts_p
  J[N + 1][idxCW + 1] = 1.0
  J[N + 1][idxPhi] = -Rcw * sinP
  gamma[N + 1] =
    yts_g + Rcw * cosP * dphi_cw ** 2 - alpha * dC_cw1 - beta * C_cw1

  const onR = position[1] - Rp <= 0.05
  const C_gnd = position[1] - Rp
  J[N + 2][1 + 2 * M_inter + 1] = 1.0
  gamma[N + 2] = -100.0 * velocity[1] - 10000.0 * C_gnd

  const solveSchur = (mask: boolean[]) => {
    const activeIdx: number[] = []
    for (let i = 0; i < dimC; i++) if (mask[i]) activeIdx.push(i)
    const m = activeIdx.length

    if (m === 0) {
      const q_ddot = new Float64Array(dimQ)
      for (let i = 0; i < dimQ; i++) q_ddot[i] = Q[i] * Minv[i]
      return { q_ddot, lambda: new Float64Array(dimC) }
    }

    const S = Array.from({ length: m }, () => new Array(m).fill(0))
    const rhs = new Float64Array(m)
    for (let i = 0; i < m; i++) {
      const idxA = activeIdx[i]
      const Ji = J[idxA]
      let jm_q = 0
      for (let j = 0; j < dimQ; j++) jm_q += Ji[j] * Minv[j] * Q[j]
      rhs[i] = jm_q - gamma[idxA]
      for (let k = 0; k < m; k++) {
        const Jk = J[activeIdx[k]]
        let sum = 0
        for (let j = 0; j < dimQ; j++) sum += Ji[j] * Minv[j] * Jk[j]
        S[i][k] = sum
      }
      S[i][i] += PHYSICS_CONSTANTS.KKT_REGULARIZATION
    }

    const lambdaActive = solveLinearSystem(S, Array.from(rhs))
    const fullLambda = new Float64Array(dimC).fill(0)
    for (let i = 0; i < m; i++) fullLambda[activeIdx[i]] = lambdaActive[i]

    const q_ddot = new Float64Array(dimQ)
    for (let j = 0; j < dimQ; j++) {
      let jt_lambda = 0
      for (let i = 0; i < dimC; i++) {
        if (mask[i]) jt_lambda += J[i][j] * fullLambda[i]
      }
      q_ddot[j] = Minv[j] * (Q[j] - jt_lambda)
    }
    return { q_ddot, lambda: fullLambda }
  }

  const mask = new Array(dimC).fill(true)
  if (isReleased) {
    for (let i = 0; i < N; i++) mask[i] = false
  }
  mask[N + 2] = !isReleased && onR

  let { q_ddot, lambda } = solveSchur(mask)

  for (let iter = 0; iter < 3; iter++) {
    let changed = false
    if (!isReleased) {
      for (let i = 0; i < N; i++) {
        if (mask[i] && lambda[i] < -1e-3) {
          // Compression
          mask[i] = false
          changed = true
        }
      }
    }
    if (mask[N + 2] && lambda[N + 2] < -1e-3) {
      mask[N + 2] = false
      changed = true
    }
    if (!changed) break
    const res = solveSchur(mask)
    q_ddot = res.q_ddot
    lambda = res.lambda
  }

  const slingDeriv = new Float64Array(2 * M_inter)
  const slingVDeriv = new Float64Array(2 * M_inter)
  for (let i = 0; i < M_inter; i++) {
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
      velocity: new Float64Array([
        q_ddot[1 + 2 * M_inter],
        q_ddot[2 + 2 * M_inter],
        0,
      ]),
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
            (-lambda[N - 1] * dxN) / (Lseg || Ls),
            (-lambda[N - 1] * dyN) / (Lseg || Ls),
            0,
          ])
        : new Float64Array(3),
      total: new Float64Array([
        q_ddot[1 + 2 * M_inter] * Mp,
        q_ddot[2 + 2 * M_inter] * Mp,
        0,
      ]),
      groundNormal: mask[N + 2] ? -lambda[N + 2] : 0,
      checkFunction: 0,
      lambda: new Float64Array(lambda),
    },
  }
}
