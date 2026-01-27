import { PHYSICS_CONSTANTS } from './constants'
import { aerodynamicForce } from './aerodynamics'
import { atmosphericModel } from './atmosphere'
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
    if (Math.abs(pV) < 1e-18) U[i][i] = pV < 0 ? -1e-18 : 1e-18
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
  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max)
  const {
    position,
    velocity: velocityRaw,
    armAngle: th,
    armAngularVelocity: dthRaw,
    cwPosition: pCW,
    cwVelocity: vCWRaw,
    cwAngle: phi_cw,
    cwAngularVelocity: dphi_cwRaw,
    slingParticles,
    slingVelocities: slingVelocitiesRaw,
    angularVelocity,
    windVelocity,
    isReleased,
  } = state

  const MAX_ANGULAR_VEL = 10000
  const MAX_LINEAR_VEL = 1000

  if (Math.abs(dthRaw) > MAX_ANGULAR_VEL) {
    console.warn(
      `[NUMERICAL GUARD] Arm angular velocity clamped: ${dthRaw.toFixed(2)} → ${Math.sign(dthRaw) * MAX_ANGULAR_VEL} rad/s`,
    )
  }
  if (Math.abs(dphi_cwRaw) > MAX_ANGULAR_VEL) {
    console.warn(
      `[NUMERICAL GUARD] CW angular velocity clamped: ${dphi_cwRaw.toFixed(2)} → ${Math.sign(dphi_cwRaw) * MAX_ANGULAR_VEL} rad/s`,
    )
  }

  const dth = clamp(dthRaw, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL)
  const dphi_cw = clamp(dphi_cwRaw, -MAX_ANGULAR_VEL, MAX_ANGULAR_VEL)
  const velocity = new Float64Array([
    clamp(velocityRaw[0], -MAX_LINEAR_VEL, MAX_LINEAR_VEL),
    clamp(velocityRaw[1], -MAX_LINEAR_VEL, MAX_LINEAR_VEL),
    clamp(velocityRaw[2], -MAX_LINEAR_VEL, MAX_LINEAR_VEL),
  ])
  const vCW = new Float64Array([
    clamp(vCWRaw[0], -MAX_LINEAR_VEL, MAX_LINEAR_VEL),
    clamp(vCWRaw[1], -MAX_LINEAR_VEL, MAX_LINEAR_VEL),
  ])
  const slingVelocities = new Float64Array(slingVelocitiesRaw.length)
  for (let i = 0; i < slingVelocitiesRaw.length; i++)
    slingVelocities[i] = clamp(
      slingVelocitiesRaw[i],
      -MAX_LINEAR_VEL,
      MAX_LINEAR_VEL,
    )

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
    Lseg = Math.max(1e-6, Ls) / Math.max(1, N)

  const Msling = PHYSICS_CONSTANTS.SLING_MASS
  const m_p = Math.max(1e-6, Msling) / Math.max(1, N)

  // Frequency-based tuning (Erin Catto GDC 2011) - mesh-independent
  // Use material property (natural frequency in Hz) instead of stiffness
  const ropeFrequencyHz = 30.0 // Box2D uses 30Hz for contacts, 20-60Hz for ropes
  const omega = 2.0 * Math.PI * ropeFrequencyHz
  const alphaSoft = 2.0 * PHYSICS_CONSTANTS.ROPE_DAMPING_RATIO * omega
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

  const armLength = Math.max(L1 + L2, 1e-12)
  const Ia = (1 / 3) * (Ma / armLength) * (L1 ** 3 + L2 ** 3)
  const pivotFriction =
    -Math.tanh(dth * 100.0) * jointFriction * Math.abs(normalForce)

  const idxSling = 1,
    idxProj = 1 + 2 * N,
    idxCW = idxProj + 2,
    idxPhi = idxCW + 2,
    dimQ = idxPhi + 1
  const Q = new Float64Array(dimQ)

  Q[0] = -Ma * g * ((L1 - L2) / 2) * cosT + pivotFriction

  const getDamping = (m: number, L: number) => jointFriction * m * L * L * 0.01

  const rs_x = slingParticles[0] - xtl,
    rs_y = slingParticles[1] - ytl
  const rs2 = Math.max(rs_x * rs_x + rs_y * rs_y, 1e-4)
  const omega_s_link =
    (rs_x * (slingVelocities[1] - ytl_p * dth) -
      rs_y * (slingVelocities[0] - xtl_p * dth)) /
    rs2
  const t_s = -getDamping(m_p, Lseg) * (omega_s_link - dth)
  Q[0] += -t_s - (t_s * (rs_x * ytl_p - rs_y * xtl_p)) / rs2
  Q[idxSling] += (t_s * -rs_y) / rs2
  Q[idxSling + 1] += (t_s * rs_x) / rs2

  const t_cw = -getDamping(Mcw, Rcw) * (dphi_cw - dth)
  Q[0] -= t_cw
  Q[idxPhi] += t_cw

  const d_p = 0.05
  for (let i = 0; i < N; i++) {
    Q[idxSling + 2 * i] += -d_p * m_p * slingVelocities[2 * i]
    Q[idxSling + 2 * i + 1] += -m_p * g - d_p * m_p * slingVelocities[2 * i + 1]
  }

  const onR = position[1] - Rp <= 0.05
  let projGndFric = 0
  if (!isReleased && onR)
    projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.4 * Mp * g
  Q[idxProj] += aero.total[0] + projGndFric
  Q[idxProj + 1] += aero.total[1] - Mp * g

  Q[idxCW + 1] += -Mcw * g

  // DISABLED: Inter-segment bending torques
  // Research shows ALL professional trebuchet simulators treat sling as series of
  // distance constraints WITHOUT bending resistance. Adding angular damping between
  // segments causes numerical instability and massive tension spikes.
  // Reference: Box2D, PhysX, academic papers (arXiv 2303.01306)
  //
  // Previous implementation (lines 224-260) computed:
  // - Relative angular velocity between adjacent segments: omegaB - omegaA
  // - Applied damping torque: -getDamping(m_p, Lseg) * (omegaB - omegaA)
  // - Distributed torque to particles via Jacobian transpose
  //
  // Result: 1e12 N tension spikes, test timeouts, DAE solver divergence
  // Solution: Remove bending coupling, rely purely on distance constraints

  const Minv = new Float64Array(dimQ)
  Minv[0] = 1.0 / Math.max(1e-12, Ia)
  for (let i = 0; i < N; i++) {
    Minv[idxSling + 2 * i] = 1.0 / Math.max(1e-12, m_p)
    Minv[idxSling + 2 * i + 1] = 1.0 / Math.max(1e-12, m_p)
  }
  Minv[idxProj] = 1.0 / Math.max(1e-12, Mp)
  Minv[idxProj + 1] = 1.0 / Math.max(1e-12, Mp)
  Minv[idxCW] = 1.0 / Math.max(1e-12, Mcw)
  Minv[idxCW + 1] = 1.0 / Math.max(1e-12, Mcw)
  Minv[idxPhi] = 1.0 / Math.max(1e-12, Icw)

  const dimC = N + 2 + 2 + 1
  const J = Array.from({ length: dimC }, () => new Array(dimQ).fill(0)),
    gamma = new Array(dimC).fill(0)
  const alphaHard = 20.0,
    betaHard = 100.0

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
    const positionError = d - Lseg
    const clampedPosError = clamp(positionError, -Lseg * 0.5, Lseg * 0.5)
    const baumgartePosTerm =
      (betaSoft * clampedPosError * (d + Lseg)) / (2 * Lseg)
    gamma[i] +=
      -((vb.x - va.x) ** 2 + (vb.y - va.y) ** 2) / Lseg -
      alphaSoft * dC_dist -
      baumgartePosTerm
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
    -alphaSoft * (vN_lock.x - vProj_lock.x) -
    betaSoft * (pN_lock.x - pProj_lock.x)
  J[N + 1][idxSling + 2 * (N - 1) + 1] = 1.0
  J[N + 1][idxProj + 1] = -1.0
  gamma[N + 1] =
    -alphaSoft * (vN_lock.y - vProj_lock.y) -
    betaSoft * (pN_lock.y - pProj_lock.y)

  const cosPhi = Math.cos(phi_cw),
    sinPhi = Math.sin(phi_cw)
  const C_cw0 = pCW[0] - (xts + Rcw * sinPhi),
    dC_cw0 = vCW[0] - (xts_p * dth + Rcw * cosPhi * dphi_cw)
  J[N + 2][0] = -xts_p
  J[N + 2][idxCW] = 1.0
  J[N + 2][idxPhi] = -Rcw * cosPhi
  gamma[N + 2] =
    xts_g - Rcw * sinPhi * dphi_cw ** 2 - alphaHard * dC_cw0 - betaHard * C_cw0
  const C_cw1 = pCW[1] - (yts - Rcw * cosPhi),
    dC_cw1 = vCW[1] - (yts_p * dth + Rcw * sinPhi * dphi_cw)
  J[N + 3][0] = -yts_p
  J[N + 3][idxCW + 1] = 1.0
  J[N + 3][idxPhi] = -Rcw * sinPhi
  gamma[N + 3] =
    yts_g + Rcw * cosPhi * dphi_cw ** 2 - alphaHard * dC_cw1 - betaHard * C_cw1

  J[N + 4][idxProj + 1] = 1.0
  gamma[N + 4] = -alphaHard * velocity[1] - betaHard * (position[1] - Rp)

  const solveSchur = (mask: boolean[]) => {
    const activeIdx = mask.map((m, i) => (m ? i : -1)).filter((i) => i !== -1),
      m = activeIdx.length
    if (m === 0)
      return {
        q_ddot: Q.map((q, i) => q * Minv[i]),
        lambda: new Float64Array(dimC),
        check: 0,
      }
    const S = Array.from({ length: m }, () => new Array(m).fill(0)),
      rhs = new Float64Array(m)
    const compliance = 1e-7
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
      const slingCompliance = 5e-7
      const actualCompliance = idxA_S < N ? slingCompliance : compliance
      S[i][i] += actualCompliance
      const eps_c = Math.max(1e-12, S[i][i] * 1e-9)
      S[i][i] += eps_c
    }

    const D = new Float64Array(m)
    for (let i = 0; i < m; i++) D[i] = 1.0 / Math.sqrt(Math.max(S[i][i], 1e-18))
    for (let i = 0; i < m; i++) {
      rhs[i] *= D[i]
      for (let j = 0; j < m; j++) S[i][j] *= D[i] * D[j]
    }

    const solLambdaRaw = solveLinearSystem(S, Array.from(rhs))
    const fullLambda = new Float64Array(dimC)
    for (let i = 0; i < m; i++)
      fullLambda[activeIdx[i]] = solLambdaRaw[i] * D[i]

    let checkVal = 0
    for (let i = 0; i < dimC; i++) {
      if (mask[i]) {
        let Jqdot = 0
        const Ji = J[i]
        const getV = (j: number) => {
          if (j === 0) return dth
          if (j < idxProj) return slingVelocities[j - idxSling]
          if (j < idxCW) return velocity[j - idxProj]
          if (j < idxPhi) return vCW[j - idxCW]
          return dphi_cw
        }
        for (let j = 0; j < dimQ; j++) Jqdot += Ji[j] * getV(j)
        checkVal += Jqdot ** 2
      }
    }

    const q_ddot_res = new Float64Array(dimQ)
    for (let j = 0; j < dimQ; j++) {
      let jt_lambda = 0
      for (let i = 0; i < dimC; i++)
        if (mask[i]) jt_lambda += J[i][j] * fullLambda[i]
      q_ddot_res[j] = Minv[j] * (Q[j] - jt_lambda)
    }
    return {
      q_ddot: q_ddot_res,
      lambda: fullLambda,
      check: Math.sqrt(checkVal),
    }
  }

  const mask_final = new Array(dimC).fill(true)
  if (isReleased) {
    mask_final[N] = false
    mask_final[N + 1] = false
  }
  mask_final[N + 4] = !isReleased && onR
  let { q_ddot, lambda, check } = solveSchur(mask_final)
  const slingTensionMask = new Array(N).fill(true)
  for (let iter = 0; iter < N; iter++) {
    let changed = false
    for (let i = 0; i < N; i++) {
      if (mask_final[i] && lambda[i] < -1e-3) {
        mask_final[i] = false
        slingTensionMask[i] = false
        changed = true
      }
    }
    if (mask_final[N + 4] && lambda[N + 4] > 1e-7) {
      mask_final[N + 4] = false
      changed = true
    }
    if (!changed) break
    const res = solveSchur(mask_final)
    q_ddot = res.q_ddot
    lambda = res.lambda
    check = res.check
  }

  const MAX_ROPE_TENSION = 1e7
  for (let i = 0; i < N; i++) {
    if (mask_final[i]) {
      lambda[i] = clamp(lambda[i], 0, MAX_ROPE_TENSION)
    }
  }

  const slingDeriv = new Float64Array(2 * N),
    slingVDeriv = new Float64Array(2 * N)
  for (let i = 0; i < N; i++) {
    slingDeriv[2 * i] = slingVelocities[2 * i]
    slingDeriv[2 * i + 1] = slingVelocities[2 * i + 1]
    slingVDeriv[2 * i] = q_ddot[idxSling + 2 * i]
    slingVDeriv[2 * i + 1] = q_ddot[idxSling + 2 * i + 1]
  }

  const [wx, wy, wz] = angularVelocity
  const atmosphere = atmosphericModel(
    Math.max(0, position[1]),
    PHYSICS_CONSTANTS.SEA_LEVEL_TEMPERATURE,
    0,
  )
  const vMag_p = Math.sqrt(
    velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2 + 1e-12,
  )
  const c_rot = 0.5 * atmosphere.density * vMag_p * projectile.area * Rp * 0.02
  const I_p = 0.4 * Mp * Rp * Rp
  const invIp = 1.0 / Math.max(I_p, 1e-12)
  const alpha_p = new Float64Array([
    -c_rot * wx * invIp,
    -c_rot * wy * invIp,
    -c_rot * wz * invIp,
  ])
  const [qw, qx, qy, qz] = state.orientation
  const qDot = new Float64Array([
    0.5 * (-qx * wx - qy * wy - qz * wz),
    0.5 * (qw * wx + qy * wz - qz * wy),
    0.5 * (qw * wy + qz * wx - qx * wz),
    0.5 * (qw * wz + qx * wy - qy * wx),
  ])

  // Clamp accelerations to prevent numerical overflow
  const MAX_LINEAR_ACCEL = 10000 // m/s²
  const MAX_ANGULAR_ACCEL = 50000 // rad/s²

  if (Math.abs(q_ddot[0]) > MAX_ANGULAR_ACCEL) {
    console.warn(
      `[NUMERICAL GUARD] Arm angular acceleration clamped: ${q_ddot[0].toFixed(2)} → ${Math.sign(q_ddot[0]) * MAX_ANGULAR_ACCEL} rad/s²`,
    )
  }

  q_ddot[0] = clamp(q_ddot[0], -MAX_ANGULAR_ACCEL, MAX_ANGULAR_ACCEL) // arm
  for (let i = 0; i < N; i++) {
    slingVDeriv[2 * i] = clamp(
      slingVDeriv[2 * i],
      -MAX_LINEAR_ACCEL,
      MAX_LINEAR_ACCEL,
    )
    slingVDeriv[2 * i + 1] = clamp(
      slingVDeriv[2 * i + 1],
      -MAX_LINEAR_ACCEL,
      MAX_LINEAR_ACCEL,
    )
  }
  q_ddot[idxProj] = clamp(q_ddot[idxProj], -MAX_LINEAR_ACCEL, MAX_LINEAR_ACCEL)
  q_ddot[idxProj + 1] = clamp(
    q_ddot[idxProj + 1],
    -MAX_LINEAR_ACCEL,
    MAX_LINEAR_ACCEL,
  )
  q_ddot[idxCW] = clamp(q_ddot[idxCW], -MAX_LINEAR_ACCEL, MAX_LINEAR_ACCEL)
  q_ddot[idxCW + 1] = clamp(
    q_ddot[idxCW + 1],
    -MAX_LINEAR_ACCEL,
    MAX_LINEAR_ACCEL,
  )
  q_ddot[idxPhi] = clamp(q_ddot[idxPhi], -MAX_ANGULAR_ACCEL, MAX_ANGULAR_ACCEL)

  const BUG_THRESHOLDS = PHYSICS_CONSTANTS.COMPUTATIONAL_BUG_THRESHOLDS
  if (Math.abs(pivotFriction) > BUG_THRESHOLDS.SUSPICIOUS_TORQUE) {
    console.warn(
      `[COMPUTATIONAL BUG?] Pivot friction torque suspiciously large: ${pivotFriction.toExponential(2)} N⋅m (threshold: ${BUG_THRESHOLDS.SUSPICIOUS_TORQUE})`,
    )
  }
  if (Math.abs(Q[0]) > BUG_THRESHOLDS.SUSPICIOUS_TORQUE) {
    console.warn(
      `[COMPUTATIONAL BUG?] Total arm torque suspiciously large: ${Q[0].toExponential(2)} N⋅m (threshold: ${BUG_THRESHOLDS.SUSPICIOUS_TORQUE})`,
    )
  }
  for (let i = 0; i < N; i++) {
    if (Math.abs(lambda[i]) > BUG_THRESHOLDS.SUSPICIOUS_FORCE) {
      console.warn(
        `[COMPUTATIONAL BUG?] Sling segment ${i} tension suspiciously large: ${lambda[i].toExponential(2)} N (threshold: ${BUG_THRESHOLDS.SUSPICIOUS_FORCE})`,
      )
      break
    }
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
      angularVelocity: alpha_p,
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
      groundNormal: mask_final[N + 4] ? -lambda[N + 4] : 0,
      checkFunction: check,
      lambda: new Float64Array(lambda),
      armTorques: {
        pivotFriction,
        slingDamping: t_s,
        cwDamping: t_cw,
        total: Q[0],
      },
    },
  }
}
