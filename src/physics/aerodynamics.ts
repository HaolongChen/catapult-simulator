/**
 * Aerodynamic Forces - Drag and Magnus Effect
 *
 * Computes quadratic drag force and Magnus lift force
 * Based on Reynolds number, Mach number, and spin.
 */

import type { AerodynamicForce, ProjectileProperties } from './types'
import { airDensity, airViscosity, atmosphericModel } from './atmosphere'

/**
 * Compute Reynolds number
 * Re = ρvL/μ
 */
export function reynoldsNumber(
  velocity: Float64Array,
  radius: number,
  density: number,
  viscosity: number,
): number {
  const v = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  return (density * v * (2 * radius)) / viscosity
}

/**
 * Compute Mach number
 * Ma = v/c
 */
export function machNumber(
  velocity: Float64Array,
  speedOfSound: number,
): number {
  const v = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  return v / speedOfSound
}

/**
 * Compute drag coefficient based on Reynolds and Mach
 * Simplified sphere drag model
 */
export function dragCoefficient(
  reynolds: number,
  mach: number,
  baseCd: number,
): number {
  // Reynolds effect (transition from laminar to turbulent)
  let cdRe = baseCd
  if (reynolds < 1e5) {
    cdRe = 24 / reynolds // Stokes flow
  } else if (reynolds < 2e5) {
    cdRe = baseCd // Turbulent flow
  } else {
    cdRe = baseCd * (1 - 0.5 * Math.log10(reynolds / 1e6)) // High Re
  }

  // Mach number effect (compressibility)
  let cdMach = cdRe
  if (mach > 0.8) {
    cdMach = cdRe * (1 + 0.2 * Math.pow(mach - 0.8, 2))
  }

  return cdMach
}

/**
 * Compute Magnus lift coefficient
 * Cl = f(S, Re)
 */
export function magnusCoefficient(
  spin: number,
  radius: number,
  reynolds: number,
  baseCl: number,
): number {
  if (reynolds <= 0) {
    return 0
  }

  const spinParameter =
    (spin * radius) /
    Math.sqrt(reynolds * (airViscosity(288.15) / airDensity(0, 288.15, 0)))

  const optimalSpin = 0.5
  const normalizedSpin = Math.min(Math.abs(spinParameter) / optimalSpin, 1.0)

  return baseCl * normalizedSpin
}

/**
 * Compute drag force vector
 * F_d = -½ρv²C_dA * n_v
 */
export function dragForce(
  velocity: Float64Array,
  density: number,
  cd: number,
  area: number,
): Float64Array {
  const vSq = velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2
  const vMag = Math.sqrt(vSq)

  const forceMag = 0.5 * density * vSq * cd * area

  const result = new Float64Array(3)
  if (vMag > 0) {
    result[0] = -forceMag * (velocity[0] / vMag)
    result[1] = -forceMag * (velocity[1] / vMag)
    result[2] = -forceMag * (velocity[2] / vMag)
  }

  return result
}

/**
 * Compute Magnus force vector
 * F_m = ρC_LA(S × v)
 */
export function magnusForce(
  velocity: Float64Array,
  spinVector: Float64Array,
  density: number,
  cl: number,
  area: number,
): Float64Array {
  const result = new Float64Array(3)

  // Cross product S × v
  const sx = spinVector[0]
  const sy = spinVector[1]
  const sz = spinVector[2]
  const vx = velocity[0]
  const vy = velocity[1]
  const vz = velocity[2]

  result[0] = sy * vz - sz * vy
  result[1] = sz * vx - sx * vz
  result[2] = sx * vy - sy * vx

  // Scale by ρ C_l A
  const scale = density * cl * area
  result[0] *= scale
  result[1] *= scale
  result[2] *= scale

  return result
}

/**
 * Compute total aerodynamic force
 */
export function aerodynamicForce(
  velocity: Float64Array,
  spinVector: Float64Array,
  projectile: ProjectileProperties,
  altitude: number,
  surfaceTemperature: number,
): AerodynamicForce {
  const conditions = atmosphericModel(altitude, surfaceTemperature, 0)

  const re = reynoldsNumber(
    velocity,
    projectile.radius,
    conditions.density,
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

  const drag = dragForce(velocity, conditions.density, cd, projectile.area)
  const magnus = magnusForce(
    velocity,
    spinVector,
    conditions.density,
    cl,
    projectile.area,
  )

  const total = new Float64Array(3)
  total[0] = drag[0] + magnus[0]
  total[1] = drag[1] + magnus[1]
  total[2] = drag[2] + magnus[2]

  return { drag, magnus, total }
}
