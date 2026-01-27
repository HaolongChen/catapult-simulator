import { CatapultSimulation } from './src/physics/simulation.ts'
import { createInitialState, createConfig } from './src/physics/config.ts'
import { PHYSICS_CONSTANTS } from './src/physics/constants.ts'

const config = createConfig()
const state = createInitialState(config)
const sim = new CatapultSimulation(state, config)

console.log('=== CONSTRAINT VIOLATION ANALYSIS ===\n')

const dt = 0.016
const N = PHYSICS_CONSTANTS.NUM_SLING_PARTICLES
const targetLen = config.trebuchet.slingLength / N

for (let step = 1; step <= 100; step++) {
  sim.update(dt)
  
  if ([10, 30, 60, 100].includes(step)) {
    const frame = sim.exportFrameData()
    const forces = sim.getLastForces()
    
    console.log(`\nAfter ${step} steps (${(step*dt).toFixed(3)}s):`)
    console.log(`  Sling length violation: ${frame.constraints.slingLength.violation.toFixed(6)} m`)
    console.log(`  Target: ${frame.constraints.slingLength.target.toFixed(3)} m, Current: ${frame.constraints.slingLength.current.toFixed(3)} m`)
    console.log(`  Check function (J·q_dot norm): ${forces.checkFunction.toFixed(6)}`)
    
    const state = sim.update(0)
    let maxSegmentError = 0
    for (let i = 0; i < N-1; i++) {
      const x1 = state.slingParticles[2*i]
      const y1 = state.slingParticles[2*i+1]
      const x2 = state.slingParticles[2*(i+1)]
      const y2 = state.slingParticles[2*(i+1)+1]
      const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2)
      const error = Math.abs(len - targetLen)
      if (error > maxSegmentError) maxSegmentError = error
    }
    console.log(`  Max segment length error: ${maxSegmentError.toFixed(6)} m`)
    
    if (maxSegmentError > 0.1) {
      console.log('  ⚠️  WARNING: Large constraint violation!')
    }
  }
}
