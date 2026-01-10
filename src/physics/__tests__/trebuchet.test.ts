/**
 * Trebuchet Mechanics Tests
 */

import { describe, it, expect } from 'vitest'
import {
  catapultTorque,
  energyLoss,
  flexureTorque,
  jointFriction,
  springTorque,
} from '../trebuchet'
import type { TrebuchetProperties } from '../types'

const PROPERTIES: TrebuchetProperties = {
  armLength: 10,
  counterweightMass: 1000,
  springConstant: 50000,
  dampingCoefficient: 100,
  equilibriumAngle: 0,
  jointFriction: 0.3,
  efficiency: 0.9,
  flexuralStiffness: 1000000,
}

describe('trebuchet', () => {
  describe('springTorque', () => {
    it('should oppose displacement from equilibrium', () => {
      const torque = springTorque(Math.PI / 4, 0, PROPERTIES)

      // Displacement is π/4, torque should oppose it
      expect(torque).toBeLessThan(0)
    })

    it('should include damping', () => {
      const torque1 = springTorque(Math.PI / 4, 0, PROPERTIES)
      const torque2 = springTorque(Math.PI / 4, 1, PROPERTIES)

      expect(torque2).toBeLessThan(torque1)
    })

    it('should apply hysteresis', () => {
      const previousAngle = Math.PI / 8
      const torque1 = springTorque(Math.PI / 4, 0, PROPERTIES, previousAngle)
      const torque2 = springTorque(Math.PI / 4, 0, PROPERTIES)

      // Moving from previous angle should add hysteresis resistance
      expect(torque1).toBeGreaterThan(torque2)
    })
  })

  describe('jointFriction', () => {
    it('should be zero below threshold', () => {
      const torque = jointFriction(0.005, PROPERTIES, 1000)

      expect(torque).toBeCloseTo(0, 10)
    })

    it('should oppose motion', () => {
      const torque1 = jointFriction(0.1, PROPERTIES, 1000)
      const torque2 = jointFriction(-0.1, PROPERTIES, 1000)

      expect(torque1).toBeLessThan(0)
      expect(torque2).toBeGreaterThan(0)
    })

    it('should scale with normal force', () => {
      const torque1 = jointFriction(0.1, PROPERTIES, 500)
      const torque2 = jointFriction(0.1, PROPERTIES, 1000)

      expect(Math.abs(torque2)).toBeCloseTo(2 * Math.abs(torque1), 5)
    })
  })

  describe('flexureTorque', () => {
    it('should oppose motion', () => {
      const torque = flexureTorque(Math.PI / 4, 0.1, PROPERTIES)

      expect(torque).toBeLessThan(0)
    })

    it('should scale with angular velocity', () => {
      const torque1 = flexureTorque(Math.PI / 4, 0.1, PROPERTIES)
      const torque2 = flexureTorque(Math.PI / 4, 0.2, PROPERTIES)

      expect(Math.abs(torque2)).toBeCloseTo(2 * Math.abs(torque1), 5)
    })

    it('should follow first mode shape', () => {
      const torque1 = flexureTorque(Math.PI / 4, 0.1, PROPERTIES)
      const torque2 = flexureTorque(Math.PI / 2, 0.1, PROPERTIES)

      expect(Math.abs(torque2)).toBeGreaterThan(Math.abs(torque1))
    })
  })

  describe('energyLoss', () => {
    it('should return efficiency factor', () => {
      const efficiency = energyLoss(PROPERTIES, 1000, 2000)

      expect(efficiency).toBeCloseTo(0.9, 5)
    })
  })

  describe('catapultTorque', () => {
    it('should sum all torque components', () => {
      const result = catapultTorque(Math.PI / 4, 0.1, PROPERTIES)

      expect(result.total).toBeDefined()
      expect(result.spring).toBeDefined()
      expect(result.friction).toBeDefined()
      expect(result.flexure).toBeDefined()
    })

    it('should apply energy loss efficiency', () => {
      const result1 = catapultTorque(Math.PI / 4, 0.1, PROPERTIES, 1000, 2000)
      const result2 = catapultTorque(Math.PI / 4, 0.1, PROPERTIES)

      expect(Math.abs(result2.total)).toBeCloseTo(
        0.9 * Math.abs(result1.total),
        5,
      )
    })
  })
})
