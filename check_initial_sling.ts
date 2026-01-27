import { createConfig, createInitialState } from './src/physics/config'
import { getTrebuchetKinematics } from './src/physics/trebuchet'

const config = createConfig()
const state = createInitialState(config)

console.log('=== INITIAL SLING CONFIGURATION ===\n')
console.log('Sling length:', config.trebuchet.slingLength, 'm')
console.log('Num particles:', 20)
console.log('Target segment length:', config.trebuchet.slingLength / 20, 'm')

const kinematics = getTrebuchetKinematics(state.armAngle, config.trebuchet)
console.log('\nArm angle:', state.armAngle, 'rad')
console.log('Long arm tip:', kinematics.longArmTip)
console.log('Projectile position:', state.position)

console.log('\nSling particle positions:')
for (let i = 0; i < 20; i++) {
  const x = state.slingParticles[2 * i]
  const y = state.slingParticles[2 * i + 1]
  console.log(`  Particle ${i}: [${x.toFixed(4)}, ${y.toFixed(4)}]`)
}

// Check segment lengths
console.log('\nSegment lengths:')
let prevX = kinematics.longArmTip.x
let prevY = kinematics.longArmTip.y
let totalLength = 0
for (let i = 0; i < 20; i++) {
  const x = state.slingParticles[2 * i]
  const y = state.slingParticles[2 * i + 1]
  const dx = x - prevX
  const dy = y - prevY
  const dist = Math.sqrt(dx * dx + dy * dy)
  totalLength += dist
  console.log(`  Segment ${i}: ${dist.toFixed(6)} m`)
  prevX = x
  prevY = y
}
console.log('Total sling length:', totalLength.toFixed(6), 'm')
console.log('Target length:', config.trebuchet.slingLength, 'm')
console.log(
  'Error:',
  (totalLength - config.trebuchet.slingLength).toFixed(6),
  'm',
)
