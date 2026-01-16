import { describe, expect, it } from "vitest";
import { CatapultSimulation } from "../simulation";
import type { PhysicsState17DOF, SimulationConfig } from "../types";

describe("Simulation Soak Test", () => {
  it("should maintain stability over 10 seconds of heavy simulation", () => {
    const initialState: PhysicsState17DOF = {
      position: new Float64Array([14, 0, 0]),
      velocity: new Float64Array([0, 0, 0]),
      orientation: new Float64Array([1, 0, 0, 0]),
      angularVelocity: new Float64Array([0, 0, 0]),
      armAngle: -Math.asin(4.9 / 8),
      armAngularVelocity: 0,
      cwAngle: 0,
      cwAngularVelocity: 0,
      windVelocity: new Float64Array([5, 0, 2]),
      time: 0,
      isReleased: false,
    };

    const config: SimulationConfig = {
      initialTimestep: 0.005,
      maxSubsteps: 10,
      maxAccumulator: 1.0,
      tolerance: 1e-6,
      minTimestep: 1e-7,
      maxTimestep: 0.01,
      projectile: {
        mass: 1,
        radius: 0.05,
        area: Math.PI * 0.05 ** 2,
        dragCoefficient: 0.47,
        magnusCoefficient: 0.3,
        momentOfInertia: new Float64Array([0.01, 0.01, 0.01]),
        spin: 100,
      },
      trebuchet: {
        longArmLength: 8,
        shortArmLength: 2,
        counterweightMass: 2000,
        counterweightRadius: 1.5,
        slingLength: 6,
        releaseAngle: (40 * Math.PI) / 180,
        springConstant: 0,
        dampingCoefficient: 5,
        equilibriumAngle: 0,
        jointFriction: 0.1,
        efficiency: 1.0,
        flexuralStiffness: 0,
        armMass: 100,
        pivotHeight: 5,
      },
    };

    const sim = new CatapultSimulation(initialState, config);

    const dt = 0.016;
    const totalSteps = Math.ceil(10 / dt);

    for (let i = 0; i < totalSteps; i++) {
      const state = sim.update(dt);

      expect(state.armAngle).not.toBeNaN();
      expect(state.position[0]).not.toBeNaN();
      expect(state.position[1]).not.toBeNaN();

      const vMag = Math.sqrt(
        state.velocity[0] ** 2 +
          state.velocity[1] ** 2 +
          state.velocity[2] ** 2,
      );
      expect(vMag).toBeLessThan(500);
    }

    expect(sim.getState().time).toBeGreaterThan(9.9);
  });
});
