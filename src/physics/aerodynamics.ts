/**
 * Aerodynamic Forces - Drag and Magnus Effect
 *
 * Computes quadratic drag force and Magnus lift force
 * Based on Reynolds number, Mach number, and spin.
 * Standard ballistics models for spherical projectiles.
 */

import { atmosphericModel } from './atmosphere'
import type { AerodynamicForce, ProjectileProperties } from './types'

export function reynoldsNumber(
  velocity: Float64Array,
  radius: number,
  density: number,
  viscosity: number,
): number {
  const v = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  return (density * v * (2 * radius)) / viscosity
}

export function machNumber(
  velocity: Float64Array,
  speedOfSound: number,
): number {
  const v = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  return v / speedOfSound
}

export function dragCoefficient(
  reynolds: number,
  mach: number,
  baseCd: number,
): number {
  let cdRe = baseCd
  if (reynolds < 1e4) {
    cdRe = 24 / (reynolds + 1e-6)
  } else if (reynolds < 1e5) {
    // Smooth transition from Stokes to baseCd
    const alpha = (reynolds - 1e4) / (1e5 - 1e4)
    cdRe = (1 - alpha) * (24 / reynolds) + alpha * baseCd
  } else if (reynolds < 2e5) {
    cdRe = baseCd
  } else {
    cdRe = baseCd * (1 - 0.2 * Math.log10(reynolds / 2e5 + 1))
  }

  let cdMach = cdRe
  if (mach > 0.6) {
    cdMach = cdRe * (1 + 0.3 * Math.pow(mach - 0.6, 2))
  }

  return cdMach
}

/**
 * Legacy support for tests
 */
export function magnusCoefficient(
  spin: number,
  radius: number,
  reynolds: number,
  baseCl: number,
): number {
  if (reynolds <= 0) return 0
  // Approximate standard spin parameter behavior
  const v_approx = 10
  const spinParameter = (Math.abs(spin) * radius) / v_approx
  return baseCl * Math.min(spinParameter, 1.0)
}

export function dragForce(
  velocity: Float64Array,
  density: number,
  cd: number,
  area: number,
): Float64Array {
  const vSq = velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2
  const vMag = Math.sqrt(vSq)
  const result = new Float64Array(3)
  if (vMag > 1e-6) {
    let fDrag = 0.5 * density * vSq * cd * area

    fDrag = Math.min(fDrag, 1e7)

    result[0] = -fDrag * (velocity[0] / vMag)
    result[1] = -fDrag * (velocity[1] / vMag)
    result[2] = -fDrag * (velocity[2] / vMag)
  }
  return result
}

export function magnusForce(
  velocity: Float64Array,
  spinVector: Float64Array,
  density: number,
  cl: number,
  area: number,
): Float64Array {
  const vSq = velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2
  const vMag = Math.sqrt(vSq)
  const result = new Float64Array(3)
  if (vMag > 1e-6) {
    const crossX = spinVector[1] * velocity[2] - spinVector[2] * velocity[1]
    const crossY = spinVector[2] * velocity[0] - spinVector[0] * velocity[2]
    const crossZ = spinVector[0] * velocity[1] - spinVector[1] * velocity[0]
    let fMag = density * cl * area * vMag
    fMag = Math.min(fMag, 1e6)
    result[0] = fMag * (crossX / vMag)
    result[1] = fMag * (crossY / vMag)
    result[2] = fMag * (crossZ / vMag)
  }
  return result
}

export function aerodynamicForce(
  velocity: Float64Array,
  spinVector: Float64Array,
  projectile: ProjectileProperties,
  altitude: number,
  surfaceTemperature: number,
): AerodynamicForce {
  const conditions = atmosphericModel(altitude, surfaceTemperature, 0)
  const area = projectile.area
  const density = conditions.density

  const re = reynoldsNumber(
    velocity,
    projectile.radius,
    density,
    conditions.viscosity,
  )
  const mach = machNumber(velocity, conditions.speedOfSound)

  const cd = dragCoefficient(re, mach, projectile.dragCoefficient)
  const cl = magnusCoefficient(
    projectile.spin,
    projectile.radius,
    re,
    projectile.magnusCoefficient,
  )

  const drag = dragForce(velocity, density, cd, area)
  const magnus = magnusForce(velocity, spinVector, density, cl, area)

  const total = new Float64Array(3)
  total[0] = drag[0] + magnus[0]
  total[1] = drag[1] + magnus[1]
  total[2] = drag[2] + magnus[2]

  return { drag, magnus, total }
}
