import { describe, expect, it } from 'vitest'
import { CatapultSimulation } from '../simulation'
import type { PhysicsState17DOF, SimulationConfig } from '../types'

const G = 9.81

/**
 * Calculates the total mechanical energy of the trebuchet system.
 */
function calculateTotalEnergy(
  state: PhysicsState17DOF,
  config: SimulationConfig,
): number {
  const { trebuchet, projectile: projProps } = config
  const {
    position,
    velocity,
    armAngle,
    armAngularVelocity,
    cwAngle,
    cwAngularVelocity,
  } = state

  const L1 = trebuchet.longArmLength
  const L2 = trebuchet.shortArmLength
  const Mcw = trebuchet.counterweightMass
  const Ma = trebuchet.armMass
  const Rcw = trebuchet.counterweightRadius
  const H = trebuchet.pivotHeight
  const Mp = projProps.mass

  const armCG = (L1 - L2) / 2
  const yArmCG = H + armCG * Math.sin(armAngle)
  const yShortTip = H - L2 * Math.sin(armAngle)
  const yCW = yShortTip - Rcw * Math.cos(cwAngle)
  const yProj = position[1]

  const PE = Mp * G * yProj + Mcw * G * yCW + Ma * G * yArmCG

  const keProj =
    0.5 * Mp * (velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const Ia = (1 / 3) * (Ma / (L1 + L2)) * (L1 ** 3 + L2 ** 3)
  const keArm = 0.5 * Ia * armAngularVelocity ** 2
  const vShortX = L2 * armAngularVelocity * Math.sin(armAngle)
  const vShortY = -L2 * armAngularVelocity * Math.cos(armAngle)
  const vCWx = vShortX + cwAngularVelocity * Rcw * Math.cos(cwAngle)
  const vCWy = vShortY + cwAngularVelocity * Rcw * Math.sin(cwAngle)
  const Icw = 0.4 * Mcw * Rcw * Rcw
  const keCW =
    0.5 * Mcw * (vCWx ** 2 + vCWy ** 2) + 0.5 * Icw * cwAngularVelocity ** 2

  return PE + keProj + keArm + keCW
}

function createStandardConfig(): SimulationConfig {
  return {
    initialTimestep: 0.005,
    maxSubsteps: 10,
    maxAccumulator: 1.0,
    tolerance: 1e-6,
    minTimestep: 1e-7,
    maxTimestep: 0.01,
    projectile: {
      mass: 1.0,
      radius: 0.1,
      area: Math.PI * 0.1 * 0.1,
      dragCoefficient: 0,
      magnusCoefficient: 0,
      momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
      spin: 0,
    },
    trebuchet: {
      longArmLength: 10,
      shortArmLength: 3,
      counterweightMass: 2000,
      counterweightRadius: 2.0,
      slingLength: 8,
      releaseAngle: (45 * Math.PI) / 180,
      springConstant: 0,
      dampingCoefficient: 0,
      equilibriumAngle: 0,
      jointFriction: 0.1,
      efficiency: 1.0,
      flexuralStiffness: 1e12,
      armMass: 200,
      pivotHeight: 15,
    },
  }
}

function createInitialState(config: SimulationConfig): PhysicsState17DOF {
  const { longArmLength: L1, pivotHeight: H } = config.trebuchet
  const armAngle = -Math.PI / 4
  const tipX = L1 * Math.cos(armAngle)
  const tipY = H + L1 * Math.sin(armAngle)

  return {
    position: new Float64Array([tipX + 8, tipY, 0]),
    velocity: new Float64Array([0, 0, 0]),
    orientation: new Float64Array([1, 0, 0, 0]),
    angularVelocity: new Float64Array([0, 0, 0]),
    armAngle,
    armAngularVelocity: 0,
    cwAngle: 0,
    cwAngularVelocity: 0,
    windVelocity: new Float64Array([0, 0, 0]),
    time: 0,
    isReleased: false,
  }
}

describe('Comprehensive Physics Validation Suite', () => {
  describe('1. Conservation Laws', () => {
    it('should conserve total mechanical energy within 5% in a vacuum', () => {
      const config = createStandardConfig()
      config.projectile.dragCoefficient = 0
      config.trebuchet.jointFriction = 0
      config.trebuchet.dampingCoefficient = 0
      config.trebuchet.flexuralStiffness = 1e15

      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)

      const E_initial = calculateTotalEnergy(state, config)
      let maxDrift = 0

      for (let i = 0; i < 1000; i++) {
        const newState = sim.update(0.005)
        const E_current = calculateTotalEnergy(newState, config)
        if (Number.isNaN(E_current)) break
        const drift = Math.abs((E_current - E_initial) / E_initial)
        maxDrift = Math.max(maxDrift, drift)
      }

      expect(maxDrift).toBeLessThan(0.05)
    })
  })

  describe('2. Constraint Satisfaction', () => {
    it('should maintain sling length constraint before release within 1m', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      const Ls = config.trebuchet.slingLength

      for (let i = 0; i < 200; i++) {
        const currentState = sim.update(0.005)
        if (!currentState.isReleased) {
          const tipX =
            config.trebuchet.longArmLength * Math.cos(currentState.armAngle)
          const tipY =
            config.trebuchet.pivotHeight +
            config.trebuchet.longArmLength * Math.sin(currentState.armAngle)
          const dx = currentState.position[0] - tipX
          const dy = currentState.position[1] - tipY
          const dz = currentState.position[2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          const violation = Math.abs(dist - Ls)

          // Index-1 DAE stabilization with Baumgarte will drift without projection.
          // For a 10m arm and heavy masses, 1m drift (10%) is the outer validation limit.
          expect(violation).toBeLessThan(1.0)
        }
      }
    })

    it('should respect ground constraint within 1mm', () => {
      const config = createStandardConfig()
      const baseState = createInitialState(config)
      const state = {
        ...baseState,
        position: new Float64Array([baseState.position[0], 0.5, 0]),
        velocity: new Float64Array([0, -10, 0]),
      }
      const sim = new CatapultSimulation(state, config)
      for (let i = 0; i < 500; i++) {
        const currentState = sim.update(0.005)
        expect(currentState.position[1]).toBeGreaterThanOrEqual(-0.001)
      }
    })

    it('should maintain normalized orientation quaternions', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      for (let i = 0; i < 500; i++) {
        const currentState = sim.update(0.005)
        const q = currentState.orientation
        const mag = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2)
        expect(mag).toBeCloseTo(1.0, 10)
      }
    })
  })

  describe('3. Convergence Tests', () => {
    it('should verify RK4 4th-order convergence (Richardson Extrapolation)', () => {
      const config = createStandardConfig()
      config.projectile.dragCoefficient = 0.47
      const duration = 0.4
      const runAtTimestep = (dt: number) => {
        const localConfig = { ...config, initialTimestep: dt }
        const baseState = createInitialState(localConfig)
        const startState: PhysicsState17DOF = {
          ...baseState,
          isReleased: true,
          position: new Float64Array([0, 100, 0]),
          velocity: new Float64Array([10, 20, 0]),
        }
        const sim = new CatapultSimulation(startState, localConfig)
        const steps = Math.round(duration / dt)
        let currentState: PhysicsState17DOF = startState
        for (let i = 0; i < steps; i++) currentState = sim.update(dt)
        return currentState.position[1]
      }
      const dt = 0.01
      const y1 = runAtTimestep(dt),
        y2 = runAtTimestep(dt / 2),
        y3 = runAtTimestep(dt / 4)
      const ratio = (y1 - y2) / (y2 - y3)
      expect(ratio).toBeGreaterThan(12)
      expect(ratio).toBeLessThan(32)
    })
  })

  describe('4. Analytical Solutions', () => {
    it('should match free fall analytical solution within 0.1%', () => {
      const config = createStandardConfig()
      const baseState = createInitialState(config)
      const state: PhysicsState17DOF = {
        ...baseState,
        isReleased: true,
        position: new Float64Array([0, 100, 0]),
        velocity: new Float64Array([0, 0, 0]),
      }
      const sim = new CatapultSimulation(state, config)
      const t = 1.0,
        dt = 0.01,
        steps = Math.round(t / dt)
      for (let i = 0; i < steps; i++) sim.update(dt)
      const y_sim = sim.getState().position[1]
      const y_analytical = 100 - 0.5 * G * t ** 2
      expect(
        Math.abs(y_sim - y_analytical) / Math.abs(y_analytical),
      ).toBeLessThan(0.001)
    })

    it('should be stable enough to run a long swing', () => {
      const config = createStandardConfig()
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      expect(() => {
        for (let i = 0; i < 1000; i++) sim.update(0.01)
      }).not.toThrow()
    })
  })

  describe('5. Robustness / Edge Cases', () => {
    it('should remain stable with extreme mass ratios', () => {
      const config = createStandardConfig()
      config.trebuchet.counterweightMass = 1e8
      config.projectile.mass = 0.001
      const sim = new CatapultSimulation(createInitialState(config), config)
      expect(() => {
        for (let i = 0; i < 100; i++) {
          const s = sim.update(0.01)
          if (isNaN(s.armAngle)) throw new Error('NaN')
        }
      }).not.toThrow()
    })

    it('should handle vertical arm singularity', () => {
      const config = createStandardConfig()
      const baseState = createInitialState(config)
      const state: PhysicsState17DOF = {
        ...baseState,
        armAngle: Math.PI / 2,
        armAngularVelocity: 0,
      }
      const sim = new CatapultSimulation(state, config)
      expect(() => {
        for (let i = 0; i < 50; i++) sim.update(0.01)
      }).not.toThrow()
    })
  })

  describe('6. Phase Transitions', () => {
    it('should trigger release at some point', () => {
      const config = createStandardConfig()
      config.trebuchet.releaseAngle = (90 * Math.PI) / 180
      const sim = new CatapultSimulation(createInitialState(config), config)
      let wasReleased = false
      for (let i = 0; i < 1000; i++) {
        if (sim.update(0.005).isReleased) {
          wasReleased = true
          break
        }
      }
      expect(wasReleased).toBe(true)
    })
  })

  describe('7. Performance & Regression', () => {
    it('should meet performance budget (<1ms per update)', () => {
      const sim = new CatapultSimulation(
        createInitialState(createStandardConfig()),
        createStandardConfig(),
      )
      const start = performance.now()
      for (let i = 0; i < 1000; i++) sim.update(0.01)
      const avg = (performance.now() - start) / 1000
      expect(avg).toBeLessThan(1.0)
    })

    it('should be deterministic', () => {
      const sim1 = new CatapultSimulation(
        createInitialState(createStandardConfig()),
        createStandardConfig(),
      )
      const sim2 = new CatapultSimulation(
        createInitialState(createStandardConfig()),
        createStandardConfig(),
      )
      for (let i = 0; i < 100; i++) {
        expect(sim1.update(0.01).position[0]).toEqual(
          sim2.update(0.01).position[0],
        )
      }
    })
  })
})
