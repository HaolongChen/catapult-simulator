# AGENTS.md for `src/physics`

## OVERVIEW

High-fidelity 19-DOF Lagrangian DAE engine with multi-particle sling dynamics and 3D aero-ballistics.

## WHERE TO LOOK

| Topic                   | Location            | Notes                                                   |
| ----------------------- | ------------------- | ------------------------------------------------------- |
| DAE/KKT System          | `derivatives.ts`    | LU-based solve for accelerations & Lagrange multipliers |
| Aero-ballistics         | `aerodynamics.ts`   | Drag/Magnus forces using Reynolds/Mach number scaling   |
| Atmospheric Model       | `atmosphere.ts`     | ISA 1976 model for altitude-dependent density/viscosity |
| Adaptive Integration    | `rk4-integrator.ts` | Error-bounded RK4 with adaptive sub-stepping            |
| Trebuchet Geometry      | `trebuchet.ts`      | Source of truth for 3D kinematics and joint constraints |
| Simulation Orchestrator | `simulation.ts`     | Event manager, release logic, and renormalization       |

## CONVENTIONS

- **19-DOF Redundant State**: Represents 3D world-space coordinates, angles, and quaternions for extreme stability. See `types.ts`.
- **Float64 Memory Layout**: Heavy use of `Float64Array` for all vector quantities to ensure precision and cache efficiency.
- **Baumgarte Stabilization**: Algebraic constraints are stabilized in the DAE system to prevent numerical "tunneling."
- **Unit Quaternions**: Projectile orientation MUST be renormalized in `simulation.ts` after every integration step.
- **Unilateral KKT Masking**: Constraints (e.g., ground rail, sling tension) are dynamically enabled/disabled in the solver.

## ANTI-PATTERNS

- **Direct State Nudging**: Never manually correct positions to satisfy constraints; let the DAE solver maintain manifold.
- **Penalty-based Forces**: Do not use spring-dampers for rigid constraints. Use Lagrange multipliers.
- **Scalar Math Loops**: Avoid manual `x, y, z` arithmetic where vector-ready `Float64Array` offsets are possible.
- **Hardcoded Environment**: Never assume constant air density; use the `atmosphere.ts` lookup.
- **Geometric Hardcoding**: Do not calculate arm or attachment points outside of `trebuchet.ts`.

## PERFORMANCE NOTES

- **Matrix Assembly**: Constraint Jacobians are rebuilt every derivative call.
- **LU Factorization**: Matrix inversion is performed via LU decomposition with partial pivoting for numerical safety.
- **Sub-stepping**: The integrator may run multiple sub-steps per frame to maintain energy conservation within `tolerance`.
