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
  const Rp = projectile.radius,
    g = PHYSICS_CONSTANTS.GRAVITY
  const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES,
    Lseg = Ls / N

  const Msling = Mp * 0.05
  const m_p = Math.max(Msling / N, PHYSICS_CONSTANTS.MIN_PARTICLE_MASS_BASE)

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
  const friction =
    -Math.tanh(dth * 100.0) * jointFriction * Math.abs(normalForce)

  const rcw_x = pCW[0] - xts,
    rcw_y = pCW[1] - yts
  const rcw2 = Math.max(rcw_x * rcw_x + rcw_y * rcw_y, 1e-4)
  const omega_cw_link =
    (rcw_x * (vCW[1] - yts_p * dth) - rcw_y * (vCW[0] - xts_p * dth)) / rcw2
  const d_joint = jointFriction * 0.1
  const t_cw = -d_joint * (omega_cw_link - dth)

  const rs_x = slingParticles[0] - xtl,
    rs_y = slingParticles[1] - ytl
  const rs2 = Math.max(rs_x * rs_x + rs_y * rs_y, 1e-4)
  const omega_s_link =
    (rs_x * (slingVelocities[1] - ytl_p * dth) -
      rs_y * (slingVelocities[0] - xtl_p * dth)) /
    rs2
  const t_s = -d_joint * (omega_s_link - dth)

  const idxSling = 1,
    idxProj = 1 + 2 * N,
    idxCW = idxProj + 2,
    idxPhi = idxCW + 2,
    dimQ = idxPhi + 1
  const Q = new Float64Array(dimQ)
  Q[0] = -Ma * g * ((L1 - L2) / 2) * cosT + friction - t_cw - t_s

  for (let i = 0; i < N; i++) {
    Q[idxSling + 2 * i] = 0
    Q[idxSling + 2 * i + 1] = -m_p * g
  }

  const onR = position[1] - Rp <= 0.05
  let projGndFric = 0
  if (!isReleased && onR)
    projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.4 * Mp * g

  Q[idxProj] = aero.total[0] + projGndFric
  Q[idxProj + 1] = aero.total[1] - Mp * g
  Q[idxCW] = (t_cw * -rcw_y) / rcw2
  Q[idxCW + 1] = -Mcw * g + (t_cw * rcw_x) / rcw2
  Q[idxPhi] = 0
  Q[idxSling] += (t_s * -rs_y) / rs2
  Q[idxSling + 1] += (t_s * rs_x) / rs2

  const M_diag = new Float64Array(dimQ)
  const Minv = new Float64Array(dimQ)
  M_diag[0] = Ia
  for (let i = 0; i < N; i++) {
    M_diag[idxSling + 2 * i] = m_p
    M_diag[idxSling + 2 * i + 1] = m_p
  }
  M_diag[idxProj] = Mp
  M_diag[idxProj + 1] = Mp
  M_diag[idxCW] = Mcw
  M_diag[idxCW + 1] = Mcw
  M_diag[idxPhi] = Icw
  for (let i = 0; i < dimQ; i++) Minv[i] = 1.0 / M_diag[i]

  const dimC = N + 2 + 2 + 1
  const J = Array.from({ length: dimC }, () => new Array(dimQ).fill(0)),
    gamma = new Array(dimC).fill(0)
  const alpha = 40.0,
    beta = 400.0 // Stiffer stable Baumgarte

  for (let i = 0; i < N; i++) {
    let pa, va, pb, vb, idxA_J, idxB_J
    if (i === 0) {
      pa = { x: xtl, y: ytl }
      va = { x: xtl_p * dth, y: ytl_p * dth }
      pb = { x: slingParticles[0], y: slingParticles[1] }
      vb = { x: slingVelocities[0], y: slingVelocities[1] }
      idxA_J = 0
      idxB_J = idxSling
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
      idxA_J = idxSling + 2 * (i - 1)
      idxB_J = idxSling + 2 * i
    }
    const dx = pb.x - pa.x,
      dy = pb.y - pa.y,
      d = Math.sqrt(dx * dx + dy * dy + 1e-12)
    const dC_dist = (dx * (vb.x - va.x) + dy * (vb.y - va.y)) / Lseg
    if (i === 0) {
      J[i][0] = -(dx * xtl_p + dy * ytl_p) / Lseg
      J[i][idxB_J] = dx / Lseg
      J[i][idxB_J + 1] = dy / Lseg
      gamma[i] = (dx * xtl_g + dy * ytl_g) / Lseg
    } else {
      J[i][idxA_J] = -dx / Lseg
      J[i][idxA_J + 1] = -dy / Lseg
      J[i][idxB_J] = dx / Lseg
      J[i][idxB_J + 1] = dy / Lseg
    }
    gamma[i] +=
      -((vb.x - va.x) ** 2 + (vb.y - va.y) ** 2) / Lseg -
      alpha * dC_dist -
      (beta * (d * d - Lseg * Lseg)) / (2 * Lseg)
  }

  const pN_lock = {
    x: slingParticles[2 * (N - 1)],
    y: slingParticles[2 * (N - 1) + 1],
  }
  const vN_lock = {
    x: slingVelocities[2 * (N - 1)],
    y: slingVelocities[2 * (N - 1) + 1],
  }
  const pProj_lock = { x: position[0], y: position[1] },
    vProj_lock = { x: velocity[0], y: velocity[1] }
  J[N][idxSling + 2 * (N - 1)] = 1.0
  J[N][idxProj] = -1.0
  gamma[N] =
    -alpha * (vN_lock.x - vProj_lock.x) - beta * (pN_lock.x - pProj_lock.x)
  J[N + 1][idxSling + 2 * (N - 1) + 1] = 1.0
  J[N + 1][idxProj + 1] = -1.0
  gamma[N + 1] =
    -alpha * (vN_lock.y - vProj_lock.y) - beta * (pN_lock.y - pProj_lock.y)

  const cosPhi = Math.cos(phi_cw),
    sinPhi = Math.sin(phi_cw)
  const C_cw0 = pCW[0] - (xts + Rcw * sinPhi),
    dC_cw0 = vCW[0] - (xts_p * dth + Rcw * cosPhi * dphi_cw)
  J[N + 2][0] = -xts_p
  J[N + 2][idxCW] = 1.0
  J[N + 2][idxPhi] = -Rcw * cosPhi
  gamma[N + 2] =
    xts_g - Rcw * sinPhi * dphi_cw ** 2 - alpha * dC_cw0 - beta * C_cw0
  const C_cw1 = pCW[1] - (yts - Rcw * cosPhi),
    dC_cw1 = vCW[1] - (yts_p * dth + Rcw * sinPhi * dphi_cw)
  J[N + 3][0] = -yts_p
  J[N + 3][idxCW + 1] = 1.0
  J[N + 3][idxPhi] = -Rcw * sinPhi
  gamma[N + 3] =
    yts_g + Rcw * cosPhi * dphi_cw ** 2 - alpha * dC_cw1 - beta * C_cw1

  J[N + 4][idxProj + 1] = 1.0
  gamma[N + 4] = -alpha * velocity[1] - beta * (position[1] - Rp)

  const solveSchur = (mask: boolean[]) => {
    const activeIdx = mask.map((m, i) => (m ? i : -1)).filter((i) => i !== -1),
      m = activeIdx.length
    if (m === 0)
      return {
        q_ddot: Q.map((q, i) => q * Minv[i]),
        lambda: new Float64Array(dimC),
      }
    const S = Array.from({ length: m }, () => new Array(m).fill(0)),
      rhs = new Float64Array(m)
    const eps = PHYSICS_CONSTANTS.KKT_REGULARIZATION_BASE
    for (let i = 0; i < m; i++) {
      const idxA_S = activeIdx[i],
        Ji = J[idxA_S]
      let jm_q = 0
      for (let j = 0; j < dimQ; j++) jm_q += Ji[j] * Minv[j] * Q[j]
      rhs[i] = jm_q - gamma[idxA_S]
      for (let k = 0; k < m; k++) {
        const Jk = J[activeIdx[k]]
        let sum = 0
        for (let j = 0; j < dimQ; j++) sum += Ji[j] * Minv[j] * Jk[j]
        S[i][k] = sum
      }
      S[i][i] += eps
    }
    const solLambda = solveLinearSystem(S, Array.from(rhs))
    const fullLambda = new Float64Array(dimC)
    for (let i = 0; i < m; i++) fullLambda[activeIdx[i]] = solLambda[i]
    const q_ddot = new Float64Array(dimQ)
    for (let j = 0; j < dimQ; j++) {
      let jt_lambda = 0
      for (let i = 0; i < dimC; i++)
        if (mask[i]) jt_lambda += J[i][j] * fullLambda[i]
      q_ddot[j] = Minv[j] * (Q[j] - jt_lambda)
    }
    return { q_ddot, lambda: fullLambda }
  }

  const mask = new Array(dimC).fill(true)
  if (isReleased) {
    mask[N] = false
    mask[N + 1] = false
  }
  mask[N + 4] = !isReleased && onR
  let { q_ddot, lambda } = solveSchur(mask)
  for (let iter = 0; iter < 3; iter++) {
    let changed = false
    for (let i = 0; i < N; i++)
      if (mask[i] && lambda[i] < -1e-3) {
        mask[i] = false
        changed = true
      }
    if (mask[N + 4] && lambda[N + 4] > 1e-3) {
      mask[N + 4] = false
      changed = true
    }
    if (!changed) break
    const res = solveSchur(mask)
    q_ddot = res.q_ddot
    lambda = res.lambda
  }

  const slingDeriv = new Float64Array(2 * N),
    slingVDeriv = new Float64Array(2 * N)
  for (let i = 0; i < N; i++) {
    slingDeriv[2 * i] = slingVelocities[2 * i]
    slingDeriv[2 * i + 1] = slingVelocities[2 * i + 1]
    slingVDeriv[2 * i] = q_ddot[idxSling + 2 * i]
    slingVDeriv[2 * i + 1] = q_ddot[idxSling + 2 * i + 1]
  }

  const [qw, qx, qy, qz] = state.orientation,
    [wx, wy, wz] = angularVelocity
  const qDot = new Float64Array(4)
  qDot[0] = 0.5 * (-qx * wx - qy * wy - qz * wz)
  qDot[1] = 0.5 * (qw * wx + qy * wz - qz * wy)
  qDot[2] = 0.5 * (qw * wy + qz * wx - qx * wz)
  qDot[3] = 0.5 * (qw * wz + qx * wy - qy * wx)

  let maxViolation = 0
  for (let i = 0; i < N; i++) {
    const pa =
      i === 0
        ? { x: xtl, y: ytl }
        : { x: slingParticles[2 * (i - 1)], y: slingParticles[2 * (i - 1) + 1] }
    const pb = { x: slingParticles[2 * i], y: slingParticles[2 * i + 1] }
    maxViolation = Math.max(
      maxViolation,
      Math.abs(Math.sqrt((pb.x - pa.x) ** 2 + (pb.y - pa.y) ** 2) - Lseg),
    )
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
      orientation: qDot,
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
        ? new Float64Array([lambda[N], lambda[N + 1], 0])
        : new Float64Array(3),
      total: new Float64Array([
        q_ddot[idxProj] * Mp,
        q_ddot[idxProj + 1] * Mp,
        0,
      ]),
      groundNormal: mask[N + 4] ? -lambda[N + 4] : 0,
      checkFunction: maxViolation,
      lambda: new Float64Array(lambda),
    },
  }
}
