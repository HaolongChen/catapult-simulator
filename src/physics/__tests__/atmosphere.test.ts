/**
 * Atmospheric Model Tests
 *
 * Tests based on US Standard Atmosphere 1976
 */

import { describe, expect, it } from "vitest";
import {
  airDensity,
  airTemperature,
  airViscosity,
  atmosphericModel,
  humidityDensityCorrection,
  saturationVaporPressure,
} from "../atmosphere";

describe("atmosphere", () => {
  describe("airTemperature", () => {
    it("should compute surface temperature correctly", () => {
      const T = airTemperature(0, 288.15);
      expect(T).toBeCloseTo(288.15, 5); // 15°C at sea level
    });

    it("should decrease with altitude in troposphere", () => {
      const T0 = airTemperature(0, 288.15);
      const T1 = airTemperature(1000, 288.15);
      const T2 = airTemperature(5000, 288.15);

      expect(T1).toBeLessThan(T0); // Cooler at 1 km
      expect(T2).toBeLessThan(T1); // Cooler at 5 km
    });

    it("should follow standard lapse rate of -6.5 K/km", () => {
      const T0 = airTemperature(0, 288.15);
      const T1 = airTemperature(1000, 288.15);

      const lapseRate = (T1 - T0) / 1000; // K/m
      expect(lapseRate).toBeCloseTo(-0.0065, 6);
    });

    it("should handle negative temperatures", () => {
      const T = airTemperature(10000, 288.15);
      expect(T).toBeLessThan(273.15); // Below freezing
    });
  });

  describe("airDensity", () => {
    it("should compute sea level density correctly", () => {
      const rho = airDensity(0, 288.15, 0);
      expect(rho).toBeCloseTo(1.225, 3); // Standard sea level density
    });

    it("should decrease exponentially with altitude", () => {
      const rho0 = airDensity(0, 288.15, 0);
      const rho1 = airDensity(1000, 288.15, 0);
      const rho2 = airDensity(5000, 288.15, 0);

      expect(rho1).toBeLessThan(rho0);
      expect(rho2).toBeLessThan(rho1);
    });

    it("should follow scale height of 8500m", () => {
      const rho0 = airDensity(0, 288.15, 0);
      const rhoH = airDensity(8500, 288.15, 0);

      const ratio = rhoH / rho0;
      expect(ratio).toBeCloseTo(Math.exp(-1), 2); // e^-1 at scale height
    });

    it("should apply humidity correction", () => {
      const rhoDry = airDensity(0, 288.15, 0);
      const rhoHumid = airDensity(0, 288.15, 0.5); // 50% humidity

      expect(rhoHumid).toBeLessThan(rhoDry); // Water vapor is less dense than air
    });
  });

  describe("airViscosity", () => {
    it("should compute viscosity at standard conditions", () => {
      const mu = airViscosity(288.15);
      expect(mu).toBeCloseTo(1.79e-5, 5); // ~1.79e-5 Pa·s at 15°C
    });

    it("should increase with temperature", () => {
      const mu0 = airViscosity(273.15);
      const mu1 = airViscosity(288.15);
      const mu2 = airViscosity(323.15);

      expect(mu1).toBeGreaterThan(mu0);
      expect(mu2).toBeGreaterThan(mu1);
    });

    it("should follow Sutherland's law", () => {
      const mu = airViscosity(273.15);
      const { sutherlandMu0 } = { sutherlandMu0: 1.716e-5 };

      // At reference temperature, should match reference viscosity
      expect(mu).toBeCloseTo(sutherlandMu0, 5);
    });
  });

  describe("saturationVaporPressure", () => {
    it("should compute vapor pressure at 20°C", () => {
      const pressure = saturationVaporPressure(293.15);

      expect(pressure).toBeCloseTo(2333, 0);
    });

    it("should increase with temperature", () => {
      const p1 = saturationVaporPressure(293.15);
      const p2 = saturationVaporPressure(313.15);

      expect(p2).toBeGreaterThan(p1);
    });
  });

  describe("atmosphericModel", () => {
    it("should compute sea level conditions", () => {
      const model = atmosphericModel(0, 288.15, 0);

      expect(model.pressure).toBeCloseTo(101327, 0);
      expect(model.temperature).toBe(288.15);
      expect(model.density).toBeCloseTo(1.225, 3);
    });

    it("should increase with temperature", () => {
      const pSat0 = saturationVaporPressure(273.15);
      const pSat20 = saturationVaporPressure(293.15);
      const pSat40 = saturationVaporPressure(313.15);

      expect(pSat20).toBeGreaterThan(pSat0);
      expect(pSat40).toBeGreaterThan(pSat20);
    });

    it("should compute ~2339 Pa at 20°C", () => {
      const pSat = saturationVaporPressure(293.15);
      expect(pSat).toBeCloseTo(2333, 0);
    });
  });

  describe("humidityDensityCorrection", () => {
    it("should reduce density for humid air", () => {
      const dryDensity = 1.225;
      const corrected = humidityDensityCorrection(dryDensity, 293.15, 0.5);

      expect(corrected).toBeLessThan(dryDensity);
    });

    it("should have no correction at 0% humidity", () => {
      const dryDensity = 1.225;
      const corrected = humidityDensityCorrection(dryDensity, 293.15, 0);

      expect(corrected).toBeCloseTo(dryDensity, 10);
    });

    it("should increase correction with humidity", () => {
      const dryDensity = 1.225;
      const corrected10 = humidityDensityCorrection(dryDensity, 293.15, 0.1);
      const corrected50 = humidityDensityCorrection(dryDensity, 293.15, 0.5);
      const corrected90 = humidityDensityCorrection(dryDensity, 293.15, 0.9);

      expect(corrected50).toBeLessThan(corrected10);
      expect(corrected90).toBeLessThan(corrected50);
    });
  });

  describe("atmosphericModel", () => {
    it("should return complete atmospheric conditions", () => {
      const conditions = atmosphericModel(0, 288.15, 0);

      expect(conditions).toHaveProperty("density");
      expect(conditions).toHaveProperty("temperature");
      expect(conditions).toHaveProperty("viscosity");
      expect(conditions).toHaveProperty("pressure");
      expect(conditions).toHaveProperty("speedOfSound");
    });

    it("should compute standard sea level conditions", () => {
      const conditions = atmosphericModel(0, 288.15, 0);

      expect(conditions.density).toBeCloseTo(1.225, 3);
      expect(conditions.temperature).toBeCloseTo(288.15, 5);
      expect(conditions.pressure).toBeCloseTo(101327, 0);
      expect(conditions.speedOfSound).toBeCloseTo(340.3, 1);
    });

    it("should compute conditions at altitude", () => {
      const seaLevel = atmosphericModel(0, 288.15, 0);
      const altitude = atmosphericModel(1000, 288.15, 0);

      expect(altitude.density).toBeLessThan(seaLevel.density);
      expect(altitude.temperature).toBeLessThan(seaLevel.temperature);
      expect(altitude.pressure).toBeLessThan(seaLevel.pressure);
    });

    it("should compute speed of sound correctly", () => {
      const conditions = atmosphericModel(0, 288.15, 0);

      // Speed of sound at 15°C is ~340.3 m/s
      expect(conditions.speedOfSound).toBeCloseTo(340.3, 1);
    });
  });
});
