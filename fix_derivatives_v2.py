import sys

with open('src/physics/derivatives.ts', 'r') as f:
    content = f.read()

# Fix LU Solver threshold
content = content.replace('if (Math.abs(pV) < 1e-18) U[i][i] = pV < 0 ? -1e-18 : 1e-18', 
                          'if (Math.abs(pV) < 1e-14) U[i][i] = pV < 0 ? -1e-14 : 1e-14')

# Fix lock regularization
content = content.replace('const eps_c = idxA_S === N || idxA_S === N + 1 ? 1e-7 : eps',
                          'const eps_c = eps')

# Ensure the solveSchur scaling is robust and doesn't re-scale if already done
# Actually my previous script already inserted the scaling code. 
# Let me check the current content of derivatives.ts
