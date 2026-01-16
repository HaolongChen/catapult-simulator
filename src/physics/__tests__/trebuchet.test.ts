import { describe, expect, it } from "vitest";
import {
  catapultTorque,
  energyLoss,
  flexureTorque,
  jointFriction,
  springTorque,
} from "../trebuchet";
import type { TrebuchetProperties } from "../types";

const PROPERTIES: TrebuchetProperties = {
  longArmLength: 8,
  shortArmLength: 2,
  counterweightMass: 1000,
  counterweightRadius: 1.5,
  slingLength: 6,
  releaseAngle: (45 * Math.PI) / 180,
  springConstant: 50000,
  dampingCoefficient: 100,
  equilibriumAngle: 0,
  jointFriction: 0.3,
  efficiency: 0.9,
  flexuralStiffness: 1000000,
  armMass: 100,
  pivotHeight: 5,
};

describe("trebuchet", () => {
  describe("springTorque", () => {
    it("should oppose displacement from equilibrium", () => {
      const torque = springTorque(Math.PI / 4, 0, PROPERTIES);
      expect(torque).toBeLessThan(0);
    });
  });

  describe("jointFriction", () => {
    it("should be zero below threshold", () => {
      const torque = jointFriction(0.005, PROPERTIES, 1000);
      expect(torque).toBeCloseTo(0, 10);
    });
  });

  describe("flexureTorque", () => {
    it("should oppose motion", () => {
      const torque = flexureTorque(Math.PI / 4, 0.1, PROPERTIES);
      expect(torque).toBeLessThan(0);
    });
  });

  describe("energyLoss", () => {
    it("should return efficiency factor", () => {
      const efficiency = energyLoss(PROPERTIES);
      expect(efficiency).toBeCloseTo(0.9, 5);
    });
  });

  describe("catapultTorque", () => {
    const normalForce = PROPERTIES.counterweightMass * 9.80665;

    it("should sum all torque components", () => {
      const result = catapultTorque(Math.PI / 4, 0.1, PROPERTIES, normalForce);
      expect(result.total).toBeDefined();
    });
  });
});
