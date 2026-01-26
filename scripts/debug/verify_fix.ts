import { CatapultSimulation } from '../src/physics/simulation'
import { createInitialState, createConfig } from '../src/physics/config'

console.log('=== Config Persistence Fix Verification ===\n')

// Test 1: Normal config (should complete 20s)
console.log('Test 1: Normal config')
const normalConfig = createConfig()
const normalSim = new CatapultSimulation(
  createInitialState(normalConfig),
  normalConfig,
)
let normalFrames = 0
for (let i = 0; i < 2000; i++) {
  normalSim.update(0.01)
  normalFrames++
}
const normalTime = normalSim.getState().time
console.log(
  `  Result: ${normalFrames} frames, ${normalTime.toFixed(2)}s - ${normalTime >= 19.5 ? '✓ PASS' : '✗ FAIL'}`,
)

// Test 2: Moderate extreme config (should complete 20s)
console.log('\nTest 2: Moderate extreme config')
const moderateConfig = createConfig()
moderateConfig.trebuchet.counterweightMass = 6000
moderateConfig.trebuchet.slingLength = 5
const moderateSim = new CatapultSimulation(
  createInitialState(moderateConfig),
  moderateConfig,
)
let moderateFrames = 0
for (let i = 0; i < 2000; i++) {
  moderateSim.update(0.01)
  moderateFrames++
}
const moderateTime = moderateSim.getState().time
console.log(`  CW: 6000kg, Sling: 5m`)
console.log(
  `  Result: ${moderateFrames} frames, ${moderateTime.toFixed(2)}s - ${moderateTime >= 19.5 ? '✓ PASS' : '✗ FAIL'}`,
)

// Test 3: Extreme config (should detect stuck and warn)
console.log('\nTest 3: Extreme config (should detect stuck)')
const extremeConfig = createConfig()
extremeConfig.trebuchet.counterweightMass = 10000
extremeConfig.trebuchet.slingLength = 8
const extremeSim = new CatapultSimulation(
  createInitialState(extremeConfig),
  extremeConfig,
)
let _extremeFrames = 0
let stuckFrames = 0
let lastTime = 0
let detectedStuck = false

for (let i = 0; i < 2000; i++) {
  extremeSim.update(0.01)
  const time = extremeSim.getState().time
  _extremeFrames++

  if (time === lastTime) {
    stuckFrames++
    if (stuckFrames >= 10 && !detectedStuck) {
      console.log(`  CW: 10000kg, Sling: 8m`)
      console.log(`  Stuck detected at frame ${i}, time ${time.toFixed(2)}s`)
      detectedStuck = true
      break
    }
  } else {
    stuckFrames = 0
    lastTime = time
  }
}
console.log(
  `  Result: ${detectedStuck ? '✓ PASS - Detected stuck simulation' : '✗ FAIL - Did not detect stuck'}`,
)

void _extremeFrames // Intentionally unused, kept for potential debug logging

console.log('\n=== All Tests Complete ===')
