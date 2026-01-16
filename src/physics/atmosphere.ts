/**
 * Atmospheric Model - US Standard Atmosphere 1976
 *
 * Computes air density, temperature, and viscosity as functions of altitude,
 * temperature, and humidity.
 */

import type { AtmosphericConstants } from "./types";

// ============================================================================
// Constants
// ============================================================================
// Constants
// ============================================================================

export const ATMOSPHERIC_CONSTANTS: AtmosphericConstants = {
  seaLevelDensity: 1.225, // kg/m³
  seaLevelPressure: 101325, // Pa
  seaLevelTemperature: 288.15, // K (15°C)
  gravity: 9.80665, // m/s²
  scaleHeight: 8500, // m (barometric formula)
  airMolarMass: 0.0289644, // kg/mol
  universalGasConstant: 8.31446, // J/(mol·K)
  sutherlandT0: 273.15, // K
  sutherlandMu0: 1.716e-5, // Pa·s
  sutherlandS: 110.4, // K
};

/**
 * Water vapor pressure saturation (Tetens formula)
 * @param temperature - Temperature in Kelvin
 * @returns Saturation vapor pressure in Pa
 */
export function saturationVaporPressure(temperature: number): number {
  const Tc = temperature - 273.15; // Convert to Celsius
  return 610.94 * Math.exp((17.625 * Tc) / (Tc + 243.04));
}

/**
 * Air density correction for humidity
 * @param dryDensity - Dry air density (kg/m³)
 * @param temperature - Temperature in K
 * @param humidity - Relative humidity (0-1)
 * @returns Density corrected for water vapor (kg/m³)
 */
export function humidityDensityCorrection(
  dryDensity: number,
  temperature: number,
  humidity: number,
): number {
  const pSat = saturationVaporPressure(temperature);
  const pVapor = humidity * pSat;

  // Ideal gas law correction
  const Rv = 461.5; // Specific gas constant for water vapor
  const vaporDensity = pVapor / (Rv * temperature);

  return dryDensity - vaporDensity;
}

/**
 * Air density using barometric formula
 * @param altitude - Altitude in meters
 * @param temperature - Temperature in K
 * @param humidity - Relative humidity (0-1)
 * @returns Air density in kg/m³
 */
export function airDensity(
  altitude: number,
  temperature: number,
  humidity: number = 0,
): number {
  const { seaLevelDensity, scaleHeight } = ATMOSPHERIC_CONSTANTS;

  // Barometric formula (exponential atmosphere)
  const dryDensity = seaLevelDensity * Math.exp(-altitude / scaleHeight);

  // Apply humidity correction
  return humidityDensityCorrection(dryDensity, temperature, humidity);
}

/**
 * Air temperature as function of altitude (troposphere model)
 * @param altitude - Altitude in meters
 * @param surfaceTemperature - Surface temperature in K
 * @returns Temperature in K
 */
export function airTemperature(
  altitude: number,
  surfaceTemperature: number,
): number {
  const L = -0.0065; // Temperature lapse rate (K/m) in troposphere
  const T0 = surfaceTemperature;

  // Linear temperature gradient in troposphere (0-11 km)
  return T0 + L * altitude;
}

/**
 * Dynamic viscosity using Sutherland's law
 * @param temperature - Temperature in K
 * @returns Dynamic viscosity in Pa·s
 */
export function airViscosity(temperature: number): number {
  const { sutherlandT0, sutherlandMu0, sutherlandS } = ATMOSPHERIC_CONSTANTS;

  // Sutherland's formula
  const mu =
    sutherlandMu0 *
    Math.pow(temperature / sutherlandT0, 1.5) *
    ((sutherlandT0 + sutherlandS) / (temperature + sutherlandS));

  return mu;
}

/**
 * Complete atmospheric model
 * @param altitude - Altitude in meters
 * @param surfaceTemperature - Surface temperature in K
 * @param humidity - Relative humidity (0-1)
 * @returns Atmospheric properties object
 */
export interface AtmosphericConditions {
  density: number; // kg/m³
  temperature: number; // K
  viscosity: number; // Pa·s
  pressure: number; // Pa
  speedOfSound: number; // m/s
}

export function atmosphericModel(
  altitude: number,
  surfaceTemperature: number,
  humidity: number = 0,
): AtmosphericConditions {
  const temperature = airTemperature(altitude, surfaceTemperature);
  const density = airDensity(altitude, temperature, humidity);
  const viscosity = airViscosity(temperature);

  // Pressure from ideal gas law
  const { airMolarMass, universalGasConstant } = ATMOSPHERIC_CONSTANTS;
  const pressure =
    (density * universalGasConstant * temperature) / airMolarMass;

  // Speed of sound in air (simplified)
  const speedOfSound = 331.3 * Math.sqrt(temperature / 273.15);

  return {
    density,
    temperature,
    viscosity,
    pressure,
    speedOfSound,
  };
}
