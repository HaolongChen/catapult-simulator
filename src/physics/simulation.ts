import { PHYSICS_CONSTANTS } from "./constants";
import { RK4Integrator } from "./rk4-integrator";
import { computeDerivatives } from "./derivatives";
import { physicsLogger } from "./logging";
import type {
  FrameData,
  PhysicsForces,
  PhysicsState17DOF,
  SimulationConfig,
} from "./types";

export type { SimulationConfig };

const EMPTY_FORCES: PhysicsForces = {
  drag: new Float64Array(3),
  magnus: new Float64Array(3),
  gravity: new Float64Array(3),
  tension: new Float64Array(3),
  total: new Float64Array(3),
  groundNormal: 0,
};

export class CatapultSimulation {
  private integrator: RK4Integrator;
  private state: PhysicsState17DOF;
  private config: SimulationConfig;
  private normalForce: number;
  private lastForces: PhysicsForces = EMPTY_FORCES;

  constructor(initialState: PhysicsState17DOF, config: SimulationConfig) {
    this.state = initialState;
    this.config = config;
    this.normalForce =
      config.trebuchet.counterweightMass * PHYSICS_CONSTANTS.GRAVITY;
    this.integrator = new RK4Integrator(initialState, {
      initialTimestep: config.initialTimestep,
      maxSubsteps: config.maxSubsteps,
      maxAccumulator: config.maxAccumulator,
      tolerance: config.tolerance,
      minTimestep: config.minTimestep,
      maxTimestep: config.maxTimestep,
    });
    physicsLogger.log(this.state, this.lastForces, this.config);
  }

  update(deltaTime: number): PhysicsState17DOF {
    const derivativeFunction = (_t: number, state: PhysicsState17DOF) => {
      const res = computeDerivatives(
        state,
        this.config.projectile,
        this.config.trebuchet,
        this.normalForce,
      );
      this.lastForces = res.forces;
      return res;
    };

    const result = this.integrator.update(deltaTime, derivativeFunction);
    this.state = result.newState;

    const q = this.state.orientation;
    const qMag = Math.sqrt(
      q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3],
    );
    if (qMag > 1e-12) {
      this.state = {
        ...this.state,
        orientation: new Float64Array([
          q[0] / qMag,
          q[1] / qMag,
          q[2] / qMag,
          q[3] / qMag,
        ]),
      };
    }

    // Check for release condition
    if (!this.state.isReleased) {
      const tension = this.lastForces.tension;
      const tensionMag = Math.sqrt(
        tension[0] ** 2 + tension[1] ** 2 + tension[2] ** 2,
      );
      const releaseThreshold =
        0.1 * this.config.projectile.mass * PHYSICS_CONSTANTS.GRAVITY;

      // Get arm angle to check if it's upward
      const normAng =
        ((((this.state.armAngle * 180) / Math.PI) % 360) + 360) % 360;
      const isUpward = normAng > 45 && normAng < 225;

      if (isUpward && tensionMag < releaseThreshold) {
        this.state = {
          ...this.state,
          isReleased: true,
        };
      }
    }

    physicsLogger.log(this.state, this.lastForces, this.config);

    return this.state;
  }

  getLastForces(): PhysicsForces {
    return this.lastForces;
  }

  exportFrameData(): FrameData {
    const {
      longArmLength: L1,
      shortArmLength: L2,
      pivotHeight: H,
      counterweightRadius: Rcw,
      slingLength: Ls,
    } = this.config.trebuchet;
    const {
      armAngle,
      cwAngle,
      position,
      orientation,
      velocity,
      angularVelocity,
      isReleased,
      time,
    } = this.state;

    // Calculate 3D positions
    const pivot: [number, number, number] = [0, H, 0];
    const longArmTip: [number, number, number] = [
      L1 * Math.cos(armAngle),
      H + L1 * Math.sin(armAngle),
      0,
    ];
    const shortArmTip: [number, number, number] = [
      -L2 * Math.cos(armAngle),
      H - L2 * Math.sin(armAngle),
      0,
    ];
    const counterweightPos: [number, number, number] = [
      shortArmTip[0] + Rcw * Math.sin(cwAngle),
      shortArmTip[1] - Rcw * Math.cos(cwAngle),
      0,
    ];

    // Calculate bounding boxes
    const projectileBB = {
      min: [
        position[0] - this.config.projectile.radius,
        position[1] - this.config.projectile.radius,
        position[2] - this.config.projectile.radius,
      ] as [number, number, number],
      max: [
        position[0] + this.config.projectile.radius,
        position[1] + this.config.projectile.radius,
        position[2] + this.config.projectile.radius,
      ] as [number, number, number],
    };
    const armBB = {
      min: [
        Math.min(shortArmTip[0], longArmTip[0]),
        Math.min(shortArmTip[1], longArmTip[1]),
        -0.1,
      ] as [number, number, number],
      max: [
        Math.max(shortArmTip[0], longArmTip[0]),
        Math.max(shortArmTip[1], longArmTip[1]),
        0.1,
      ] as [number, number, number],
    };
    const cwBB = {
      min: [counterweightPos[0] - Rcw, counterweightPos[1] - Rcw, -Rcw] as [
        number,
        number,
        number,
      ],
      max: [counterweightPos[0] + Rcw, counterweightPos[1] + Rcw, Rcw] as [
        number,
        number,
        number,
      ],
    };

    // Calculate sling constraint violation
    const slingStart = longArmTip;
    const slingEnd = [position[0], position[1], position[2]];
    const currentSlingLength = Math.sqrt(
      (slingEnd[0] - slingStart[0]) ** 2 +
        (slingEnd[1] - slingStart[1]) ** 2 +
        (slingEnd[2] - slingStart[2]) ** 2,
    );

    // Determine phase
    let phase = isReleased ? "released" : "swinging";
    if (!isReleased && this.lastForces.groundNormal > 0) {
      phase = "ground_dragging";
    }

    return {
      time,
      timestep: this.config.initialTimestep,
      projectile: {
        position: [position[0], position[1], position[2]],
        orientation: [
          orientation[0],
          orientation[1],
          orientation[2],
          orientation[3],
        ],
        velocity: [velocity[0], velocity[1], velocity[2]],
        angularVelocity: [
          angularVelocity[0],
          angularVelocity[1],
          angularVelocity[2],
        ],
        radius: this.config.projectile.radius,
        boundingBox: projectileBB,
      },
      arm: {
        angle: armAngle,
        angularVelocity: this.state.armAngularVelocity,
        pivot,
        longArmTip,
        shortArmTip,
        longArmLength: L1,
        shortArmLength: L2,
        boundingBox: armBB,
      },
      counterweight: {
        angle: cwAngle,
        angularVelocity: this.state.cwAngularVelocity,
        position: counterweightPos,
        radius: Rcw,
        attachmentPoint: shortArmTip,
        boundingBox: cwBB,
      },
      sling: {
        isAttached: !isReleased,
        startPoint: longArmTip,
        endPoint: slingEnd as [number, number, number],
        length: Ls,
        tension: Math.sqrt(
          this.lastForces.tension[0] ** 2 +
            this.lastForces.tension[1] ** 2 +
            this.lastForces.tension[2] ** 2,
        ),
        tensionVector: [
          this.lastForces.tension[0],
          this.lastForces.tension[1],
          this.lastForces.tension[2],
        ],
      },
      ground: {
        height: 0,
        normalForce: this.lastForces.groundNormal,
      },
      forces: {
        projectile: {
          gravity: [
            this.lastForces.gravity[0],
            this.lastForces.gravity[1],
            this.lastForces.gravity[2],
          ],
          drag: [
            this.lastForces.drag[0],
            this.lastForces.drag[1],
            this.lastForces.drag[2],
          ],
          magnus: [
            this.lastForces.magnus[0],
            this.lastForces.magnus[1],
            this.lastForces.magnus[2],
          ],
          tension: [
            this.lastForces.tension[0],
            this.lastForces.tension[1],
            this.lastForces.tension[2],
          ],
          total: [
            this.lastForces.total[0],
            this.lastForces.total[1],
            this.lastForces.total[2],
          ],
        },
        arm: {
          springTorque: 0, // Not implemented
          dampingTorque: 0, // Not implemented
          frictionTorque: 0, // Not implemented
          totalTorque: 0, // Not implemented
        },
      },
      constraints: {
        slingLength: {
          current: currentSlingLength,
          target: Ls,
          violation: currentSlingLength - Ls,
        },
        groundContact: {
          penetration: Math.min(0, counterweightPos[1] - Rcw),
          isActive: this.lastForces.groundNormal > 0,
        },
      },
      phase,
    };
  }

  getRenderState(): PhysicsState17DOF {
    return this.integrator.getRenderState();
  }

  getInterpolationAlpha(): number {
    return this.integrator.getInterpolationAlpha();
  }

  getState(): PhysicsState17DOF {
    return this.state;
  }

  setState(state: PhysicsState17DOF): void {
    this.state = state;
  }

  reset(): void {
    this.integrator.reset();
    this.lastForces = EMPTY_FORCES;
  }
}
