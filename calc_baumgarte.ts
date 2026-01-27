const N = 20
const Msling = 5
const m_p = Msling / N

const segmentK = 1e9 // ROPE_YOUNGS_MODULUS
console.log('Rope stiffness (segmentK):', segmentK, 'N/m')
console.log('Sling particle mass (m_p):', m_p, 'kg')

const omegaLimit = 100.0 / Math.sqrt(N / 25.0)
const omegaRest = Math.min(omegaLimit, Math.sqrt(segmentK / m_p))
console.log('omegaLimit:', omegaLimit.toFixed(2))
console.log('omegaRest:', omegaRest.toFixed(2))
console.log('(omegaRest is clamped to omegaLimit)')

const alphaSoft = 2 * 0.02 * omegaRest
const betaSoft = omegaRest * omegaRest

console.log('\nBaumgarte parameters for sling:')
console.log('  alphaSoft:', alphaSoft.toFixed(4))
console.log('  betaSoft:', betaSoft.toFixed(2))

console.log('\nFor comparison, hard constraints use:')
console.log('  alphaHard: 20.0')
console.log('  betaHard: 100.0')

console.log('\nStabilization strength:')
console.log('  Sling alpha is', (alphaSoft / 20 * 100).toFixed(1), '% of hard constraint alpha')
console.log('  Sling beta is', (betaSoft / 100 * 100).toFixed(1), '% of hard constraint beta')
