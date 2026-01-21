# AGENTS.md

## OVERVIEW

High-dimensional physics engine implementing a redundant coordinate DAE system for stable trebuchet simulation.

---

## STRUCTURE

```
src/physics/
├── simulation.ts        # `CatapultSimulation` orchestrator
├── kinematics.ts        # Full geometry source of truth
├── derivatives.ts       # Dynamics & constraint calculations
├── rk4-integrator.ts    # Adaptive Runge-Kutta solver
├── constants.ts         # Project-wide physical/machine constants
├── __tests__/           # Sandboxed physics validation suite
```

---

## PHYSICS SOLVER

- **Coordinate System:**
  - 9 independent DOFs (physical state)
  - 10 constraint equations → 19 redundant coordinates (Cartesian + angles)
  - Redundancy ensures constraint stability under rapid motion and impact

- **DAE/KKT Logic:**
  - System evolution governed by coupled differential-algebraic equations (DAEs)
  - `computeDerivatives`: Assembles mass, velocity, constraint, and force matrices
  - `solveLinearSystem`: KKT-style solve for acceleration and constraint forces (Lagrange multipliers) in one step
  - All solver routines expect and preserve correct constraint stabilization (index-3 DAE)

- **Integrator:**
  - `RK4Integrator` provides adaptive fixed-step integration
  - Constraints enforced at every substep (no projection)

---

## CONVENTIONS

- **Single Source Geometry:**
  - Any coordinate or attachment point is derived from `kinematics.ts`
  - Never reconstruct geometry in engine or UI layers

- **Validation:**
  - `__tests__` directory contains energy conservation and DAE-index tests
  - All new solvers/features require energy conservation and constraint consistency validation
  - Test baseline: accept ≤ 1e-8 energy drift over multi-second simulations

---

## ANTI-PATTERNS (ENGINE SPECIFIC)

- **Direct State Mutation:**
  - Never manipulate positions/velocities directly; always use update routines
- **Manual Constraint Forces:**
  - Forcing/penalty methods are forbidden. Always use the DAE constraint solution.
- **Geometry Duplication:**
  - Do not copy geometry calculations; import all positions/angles from `kinematics.ts`
- **NaN Suppression:**
  - Never use hacks to silence instabilities; all NaN/constraint violation paths must fail loud and early
