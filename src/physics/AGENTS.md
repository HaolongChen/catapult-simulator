# AGENTS.md for `src/physics`

## OVERVIEW

Core 7-DOF Lagrangian physics engine for trebuchet simulation, featuring a redundant coordinate DAE system, KKT constraint solver, and absolute velocity-based kinematic release.

## STRUCTURE

```text
src/physics/
├── simulation.ts        # CatapultSimulation orchestrator (7-DOF, event & step manager)
├── trebuchet.ts         # Single source kinematics: arm-paths, sling bag geometry
├── derivatives.ts       # DAE system, computes generalized/constraint forces
├── rk4-integrator.ts    # Adaptive RK4 for DAE systems, substep constraint enforcement
├── constants.ts         # Physical & numerical constants
├── types.ts             # Engine shared types/interfaces
└── __tests__/           # Physics validation (energy conservation, constraints)
```

## WHERE TO LOOK

| Topic                         | Location            | Notes                                   |
| ----------------------------- | ------------------- | --------------------------------------- |
| DAE/KKT System                | `derivatives.ts`    | Matrix assembly, constraint solve       |
| Simulation Orchestration      | `simulation.ts`     | 7-DOF step logic, release event         |
| Trebuchet Geometry            | `trebuchet.ts`      | All positions/angles, single-rope sling |
| Integration & Constraint Sync | `rk4-integrator.ts` | RK4, in-step constraint enforcement     |
| Validation & Tests            | `__tests__/`        | Energy/constraint/unit tests            |

## CONVENTIONS

- **Redundant 7-DOF Model**: Coordinates combine Cartesian and rotational DOFs for extreme stability. All geometry derives from `trebuchet.ts`.
- **Absolute Velocity Kinematic Release**: Release triggers based on absolute projectile velocity angle, accounting for arm tangential speed + relative sling speed.
- **Baumgarte Stabilization**: High-stiffness stabilization in `derivatives.ts` prevents numerical drift and tunneling.
- **Unilateral Handling**: KKT solver dynamically masks constraints (e.g., ground rail, sling tension) for realistic state transitions.

## ANTI-PATTERNS

- **Direct State Mutation**: Never manipulate positions/velocities directly; always use update routines.
- **Manual Constraint Forces**: Penalty methods are forbidden. Use the DAE constraint solution exclusively.
- **NaN Suppression**: Never hide numerical instability; all math failures must fail loud and early.
- **Geometry Duplication**: Do not re-implement kinematics; import from `trebuchet.ts`.
