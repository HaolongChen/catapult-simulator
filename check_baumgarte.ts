import { createConfig } from './src/physics/config'
import { PHYSICS_CONSTANTS } from './src/physics/constants'

const config = createConfig()
const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
const Msling = PHYSICS_CONSTANTS.SLING_MASS
const m_p = Math.max(1e-6, Msling) / Math.max(1, N)

// From config
const segmentK = config.trebuchet.ropeStiffness
console.log('Rope stiffness (segmentK):', segmentK, 'N/m')
console.log('Sling particle mass (m_p):', m_p, 'kg')

const omegaLimit = PHYSICS_CONSTANTS.MAX_STABILITY_OMEGA / Math.sqrt(N / 25.0)
const omegaRest = Math.min(omegaLimit, Math.sqrt(segmentK / m_p))
console.log('omegaLimit:', omegaLimit)
console.log('omegaRest:', omegaRest)

const alphaSoft = 2 * PHYSICS_CONSTANTS.ROPE_DAMPING_RATIO * omegaRest
const betaSoft = omegaRest * omegaRest

console.log('\nBaumgarte parameters for sling:')
console.log('  alphaSoft:', alphaSoft)
console.log('  betaSoft:', betaSoft)
console.log('  ROPE_DAMPING_RATIO:', PHYSICS_CONSTANTS.ROPE_DAMPING_RATIO)

console.log('\nFor comparison, hard constraints use:')
console.log('  alphaHard: 20.0')
console.log('  betaHard: 100.0')

console.log('\nStabilization strength ratio (soft/hard):')
console.log('  alpha:', (alphaSoft / 20).toFixed(4))
console.log('  beta:', (betaSoft / 100).toFixed(4))
