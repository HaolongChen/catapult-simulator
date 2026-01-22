# AGENTS.md for `src/physics/__tests__`

## OVERVIEW

Exhaustive physics engine test suite ensuring numerical stability, geometric accuracy, and rigorous energy validation.

## STRUCTURE

```text
src/physics/__tests__/
├── rk4-integrator.test.ts        # Integrator stability & regression
├── 3d-geometry.test.ts           # Spatial/kinematic geometry validation
├── simulation.test.ts            # E2E physics checks, energy drift
├── perfection.test.ts            # Edge case probe for machine precision
├── evaluation.test.ts            # System-wide performance/physics metrics
├── derivatives.test.ts           # DAE time derivatives, error boundaries
├── soak.test.ts                  # Long-run stability and NaN detection
└── repro-nan.test.ts             # Regression for DAE/NaN instability
```

## WHERE TO LOOK

| Validation Focus    | Key Test Files                                             | What It Ensures                                                   |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Energy Conservation | `simulation.test.ts`, `evaluation.test.ts`                 | Total system energy drift ≤ 1e-8 over simulation.                 |
| Geometry Validation | `3d-geometry.test.ts`                                      | Kinematic integrity, 3D point distances, system config stability. |
| DAE Stability       | `derivatives.test.ts`, `repro-nan.test.ts`, `soak.test.ts` | DAE stability, NaN/singularity regression, boundary checks.       |

## CONVENTIONS

- **Energy Drift Budget**: All engine updates must prove total energy drift ≤ 1e-8.
- **Regression-Driven**: Every numeric failure (NaN, energy spike) requires a dedicated regression test.
- **Geometry Is Canon**: Verify geometry strictly via `getTrebuchetKinematics`.
- **No Magic Tolerances**: Tolerances must be explicit and traceable—never silently widen bounds to "pass".

## ANTI-PATTERNS

- **Skipping Long Integrations**: Soaks are required for stability validation.
- **Silent Math Fails**: No try/catch around math code; failures must be surfaced.
- **Local Kinematics**: Never re-implement geometric logic in tests; use shared utilities.
