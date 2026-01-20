/**
 * Aerodynamic Forces Tests
 */

import { describe, expect, it } from 'vitest'
import {
  aerodynamicForce,
  dragCoefficient,
  dragForce,
  machNumber,
  magnusCoefficient,
  magnusForce,
  reynoldsNumber,
} from '../aerodynamics'
import type { ProjectileProperties } from '../types'

describe('aerodynamics', () => {
  describe('reynoldsNumber', () => {
    it('should compute Re for low velocity', () => {
      const velocity = new Float64Array([1, 0, 0])
      const re = reynoldsNumber(velocity, 0.05, 1.225, 1.79e-5)

      expect(re).toBeGreaterThan(0)
      expect(re).toBeCloseTo(6844, 0)
    })

    it('should scale with velocity', () => {
      const v1 = new Float64Array([1, 0, 0])
      const v2 = new Float64Array([2, 0, 0])
      const re1 = reynoldsNumber(v1, 0.1, 1.225, 1.79e-5)
      const re2 = reynoldsNumber(v2, 0.1, 1.225, 1.79e-5)

      expect(re2).toBeCloseTo(2 * re1, 5)
    })

    it('should scale inversely with viscosity', () => {
      const velocity = new Float64Array([1, 0, 0])
      const re1 = reynoldsNumber(velocity, 0.1, 1.225, 1.79e-5)
      const re2 = reynoldsNumber(velocity, 0.1, 1.225, 2e-5)

      expect(re2).toBeCloseTo(0.895 * re1, 3)
    })
  })

  describe('machNumber', () => {
    it('should compute Mach number', () => {
      const velocity = new Float64Array([340, 0, 0])
      const mach = machNumber(velocity, 340.3)

      expect(mach).toBeCloseTo(0.99912, 5)
    })

    it('should handle subsonic velocities', () => {
      const velocity = new Float64Array([170, 0, 0])
      const mach = machNumber(velocity, 340.3)

      expect(mach).toBeCloseTo(0.49956, 5)
    })
  })

  describe('dragCoefficient', () => {
    it('should use Stokes law for low Re', () => {
      const cd = dragCoefficient(1e4, 0.1, 0.47)

      expect(cd).toBeCloseTo(24 / 1e4, 5)
    })

    it('should use base Cd for moderate Re', () => {
      const cd = dragCoefficient(1.5e5, 0.1, 0.47)

      expect(cd).toBeCloseTo(0.47, 5)
    })

    it('should apply Mach correction', () => {
      const cd1 = dragCoefficient(1e5, 0.5, 0.47)
      const cd2 = dragCoefficient(1e5, 1.0, 0.47)

      expect(cd2).toBeGreaterThan(cd1)
    })
  })

  describe('magnusCoefficient', () => {
    it('should increase with spin up to optimal', () => {
      const cl1 = magnusCoefficient(0, 0.05, 1e5, 0.3)
      const cl2 = magnusCoefficient(10, 0.05, 1e5, 0.3)

      expect(cl2).toBeGreaterThan(cl1)
    })

    it('should return base Cl at zero spin', () => {
      const cl = magnusCoefficient(0, 0.05, 1e5, 0.3)

      expect(cl).toBeCloseTo(0, 10)
    })
  })

  describe('dragForce', () => {
    it('should oppose velocity', () => {
      const velocity = new Float64Array([10, 0, 0])
      const drag = dragForce(velocity, 1.225, 0.47, 0.01)

      expect(drag[0]).toBeLessThan(0)
      expect(drag[1]).toBeCloseTo(0, 10)
      expect(drag[2]).toBeCloseTo(0, 10)
    })

    it('should scale with velocity squared', () => {
      const v1 = new Float64Array([10, 0, 0])
      const v2 = new Float64Array([20, 0, 0])
      const drag1 = dragForce(v1, 1.225, 0.47, 0.01)
      const drag2 = dragForce(v2, 1.225, 0.47, 0.01)

      const mag1 = Math.sqrt(drag1[0] ** 2 + drag1[1] ** 2 + drag1[2] ** 2)
      const mag2 = Math.sqrt(drag2[0] ** 2 + drag2[1] ** 2 + drag2[2] ** 2)

      expect(mag2).toBeCloseTo(4 * mag1, 5)
    })
  })

  describe('magnusForce', () => {
    it('should be perpendicular to velocity and spin', () => {
      const velocity = new Float64Array([10, 0, 0])
      const spin = new Float64Array([0, 0, 100])
      const magnus = magnusForce(velocity, spin, 1.225, 0.3, 0.01)

      const cross = new Float64Array(3)
      cross[0] = 0 * 0 - 100 * 0
      cross[1] = 100 * 10 - 0 * 0
      cross[2] = 0 * 0 - 0 * 10

      expect(magnus[0]).toBeCloseTo(cross[0] * 1.225 * 0.3 * 0.01, 5)
      expect(magnus[1]).toBeCloseTo(cross[1] * 1.225 * 0.3 * 0.01, 5)
      expect(magnus[2]).toBeCloseTo(cross[2] * 1.225 * 0.3 * 0.01, 5)
    })
  })

  describe('aerodynamicForce', () => {
    it('should compute total aerodynamic force', () => {
      const velocity = new Float64Array([50, 0, 20])
      const spin = new Float64Array([0, 100, 0])
      const projectile: ProjectileProperties = {
        mass: 10,
        radius: 0.05,
        area: Math.PI * 0.05 ** 2,
        dragCoefficient: 0.47,
        magnusCoefficient: 0.3,
        momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
        spin: 100,
      }

      const result = aerodynamicForce(velocity, spin, projectile, 0, 288.15)

      expect(result.total).toBeDefined()
      expect(result.drag).toBeDefined()
      expect(result.magnus).toBeDefined()
    })
  })
})
