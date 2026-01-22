import re

with open('src/physics/derivatives.ts', 'r') as f:
    content = f.read()

# 1. Fix LU Solver threshold
content = content.replace('if (Math.abs(pV) < 1e-12) U[i][i] = pV < 0 ? -1e-12 : 1e-12', 
                          'if (Math.abs(pV) < 1e-12) U[i][i] = pV < 0 ? -1e-12 : 1e-12')
# (already done or similar)

# 2. Rewrite solveSchur with Scaling and Softer Compliance
solve_schur_pattern = r'const solveSchur = \(mask: boolean\[\]\) => \{([\s\S]+?)return \{ q_ddot: q_ddot_res, lambda: fullLambda \}\s+\}'

def replacement(match):
    new_body = """
    const activeIdx = mask.map((m, i) => (m ? i : -1)).filter((i) => i !== -1),
      m = activeIdx.length
    if (m === 0)
      return {
        q_ddot: Q.map((q, i) => q * Minv[i]),
        lambda: new Float64Array(dimC),
      }
    const S = Array.from({ length: m }, () => new Array(m).fill(0)),
      rhs = new Float64Array(m)
    // Softer compliance (4.0 coefficient) for better stability with light slings
    const compliance = (4.0 * dtRef * dtRef) / m_p,
      eps = PHYSICS_CONSTANTS.KKT_REGULARIZATION_BASE * N
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
      if (idxA_S < N + 2) S[i][i] += compliance
      S[i][i] += eps
    }

    // Diagonal scaling (Equilibration)
    const D = new Float64Array(m)
    for (let i = 0; i < m; i++) {
      D[i] = 1.0 / Math.sqrt(Math.max(S[i][i], 1e-16))
    }
    for (let i = 0; i < m; i++) {
      rhs[i] *= D[i]
      for (let j = 0; j < m; j++) {
        S[i][j] *= D[i] * D[j]
      }
    }

    const solLambdaRaw = solveLinearSystem(S, Array.from(rhs))
    const solLambda = solLambdaRaw.map((val, i) => (isNaN(val) ? 0 : val * D[i]))

    const fullLambda = new Float64Array(dimC)
    for (let i = 0; i < m; i++) fullLambda[activeIdx[i]] = solLambda[i]
    const q_ddot_res = new Float64Array(dimQ)
    for (let j = 0; j < dimQ; j++) {
      let jt_lambda = 0
      for (let i = 0; i < dimC; i++)
        if (mask[i]) jt_lambda += J[i][j] * fullLambda[i]
      q_ddot_res[j] = Minv[j] * (Q[j] - jt_lambda)
    }
    """
    return "const solveSchur = (mask: boolean[]) => {" + new_body + "return { q_ddot: q_ddot_res, lambda: fullLambda }\n  }"

content = re.sub(solve_schur_pattern, replacement, content)

with open('src/physics/derivatives.ts', 'w') as f:
    f.write(content)
