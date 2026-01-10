/**
 * Physics Type Definitions
 *
 * Central type system for 17-DOF catapult physics simulation.
 * Uses Float64Array for high-performance numerical operations.
 */

// ============================================================================
// State Vector (17 Degrees of Freedom)
// ============================================================================

/**
 * 17-DOF State Vector for Trebuchet + Projectile System
 *
 * Projectile DOFs (13):
 * - Position (3): x, y, z
 * - Velocity (3): vx, vy, vz
 * - Orientation (4): quaternion (w, x, y, z)
 * - Angular Velocity (3): ωx, ωy, ωz
 *
 * Catapult DOFs (4):
 * - Arm Angle (1): θ (radians)
 * - Arm Angular Velocity (1): θ̇ (rad/s)
 * - Wind Velocity (3): Wx, Wy, Wz
 */
export interface PhysicsState17DOF {
  // Projectile state (13 DOFs)
  readonly position: Float64Array // [x, y, z]
  readonly velocity: Float64Array // [vx, vy, vz]
  readonly orientation: Float64Array // [w, x, y, z] quaternion
  readonly angularVelocity: Float64Array // [ωx, ωy, ωz]

  // Catapult state (4 DOFs)
  readonly armAngle: number // θ (radians)
  readonly armAngularVelocity: number // θ̇ (rad/s)
  readonly windVelocity: Float64Array // [Wx, Wy, Wz] (m/s)

  // Time tracker
  readonly time: number // Simulation time (seconds)
}

/**
 * Time derivative of the state vector
 * Used by RK4 integrator
 */
export interface PhysicsDerivative17DOF {
  // Projectile derivatives (13)
  readonly position: Float64Array // [vx, vy, vz]
  readonly velocity: Float64Array // [ax, ay, az]
  readonly orientation: Float64Array // [qw, qx, qy, qz] quaternion derivative
  readonly angularVelocity: Float64Array // [αx, αy, αz] angular acceleration

  // Catapult derivatives (4)
  readonly armAngle: number // θ̇ (angular velocity)
  readonly armAngularVelocity: number // θ̈ (angular acceleration)
  readonly windVelocity: Float64Array // [0, 0, 0] (wind is constant during step)

  readonly time: number // Time derivative = 1
}

// ============================================================================
// Constants and Parameters
// ============================================================================

/**
 * Atmospheric constants (US Standard Atmosphere 1976)
 */
export interface AtmosphericConstants {
  seaLevelDensity: number // ρ₀ = 1.225 kg/m³
  seaLevelPressure: number // P₀ = 101325 Pa
  seaLevelTemperature: number // T₀ = 288.15 K (15°C)
  gravity: number // g = 9.80665 m/s²
  scaleHeight: number // H = 8500 m
  airMolarMass: number // M = 0.0289644 kg/mol
  universalGasConstant: number // R = 8.31446 J/(mol·K)
  sutherlandT0: number // T₀ for Sutherland's law = 273.15 K
  sutherlandMu0: number // μ₀ = 1.716e-5 Pa·s
  sutherlandS: number // S = 110.4 K
}

/**
 * Projectile properties
 */
export interface ProjectileProperties {
  mass: number // kg
  radius: number // m
  area: number // m² (cross-sectional area)
  dragCoefficient: number // C_d (function of Reynolds number)
  magnusCoefficient: number // C_l (function of spin parameter)
  momentOfInertia: Float64Array // [Ixx, Iyy, Izz] (kg·m²)
  spin: number // S (rad/s)
}

/**
 * Trebuchet properties
 */
export interface TrebuchetProperties {
  armLength: number // m
  counterweightMass: number // kg
  springConstant: number // k (N·m/rad)
  dampingCoefficient: number // c (N·m·s/rad)
  equilibriumAngle: number // θ₀ (radians)
  jointFriction: number // μ_f
  efficiency: number // η (0.85-0.95)
  flexuralStiffness: number // EI (N·m²)
}

/**
 * Environment properties
 */
export interface EnvironmentProperties {
  temperature: number // K
  humidity: number // 0-1 (relative humidity)
  altitude: number // m
  windSpeed: number // m/s
  windDirection: Float64Array // [dx, dy, dz] unit vector
}

// ============================================================================
// RK4 Integrator Types
// ============================================================================

/**
 * Derivative function for RK4 integration
 * Computes d(state)/dt given current state and time
 */
export type DerivativeFunction = (
  t: number,
  state: PhysicsState17DOF,
) => PhysicsDerivative17DOF

/**
 * RK4 integrator configuration
 */
export interface RK4Config {
  fixedTimestep: number // Δt in seconds (default: 0.01)
  maxSubsteps: number // Maximum steps per frame (default: 100)
  maxAccumulator: number // Max accumulated time (default: 1.0)
}

/**
 * RK4 integration result
 */
export interface RK4Result {
  newState: PhysicsState17DOF
  stepsTaken: number
  interpolationAlpha: number // For smooth rendering
}

// ============================================================================
// Force and Torque Types
// ============================================================================

/**
 * Aerodynamic force vector
 */
export interface AerodynamicForce {
  readonly drag: Float64Array // [Fx, Fy, Fz] drag force
  readonly magnus: Float64Array // [Fx, Fy, Fz] Magnus force
  readonly total: Float64Array // [Fx, Fy, Fz] total aerodynamic force
}

/**
 * Catapult torque
 */
export interface CatapultTorque {
  readonly spring: number // Spring restoring torque (N·m)
  readonly damping: number // Damping torque (N·m)
  readonly friction: number // Friction torque (N·m)
  readonly flexure: number // Flexural correction torque (N·m)
  readonly total: number // Total torque (N·m)
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Ballistics reference data for validation
 * From Army TM 43-0001-28
 */
export interface BallisticsReference {
  range: number // m
  muzzleVelocity: number // m/s
  launchAngle: number // degrees
  flightTime: number // s
  impactVelocity: number // m/s
  maxHeight: number // m
}

/**
 * Validation result
 */
export interface ValidationResult {
  passed: boolean
  rangeError: number // % error in range
  heightError: number // % error in max height
  timeError: number // % error in flight time
  energyError: number // % error in energy conservation
}
