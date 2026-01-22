# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-21 21:32:21
**Commit:** 8164699
**Branch:** rebuild

## OVERVIEW

High-fidelity 7-DOF trebuchet simulator featuring a redundant coordinate DAE system and absolute velocity-based kinematic release. Built with Vite, React 19, and @tanstack/store.

## STRUCTURE

```text
./
├── public/              # Static assets (trajectory.json, simulation_log.csv)
├── scripts/             # Headless simulation export tools
├── src/
│   ├── components/      # React UI modules
│   │   └── visualization2d/ # Modular canvas renderer
│   ├── hooks/           # App-level React hooks (trajectory management)
│   ├── lib/             # UI utilities (Tailwind cn)
│   └── physics/         # 7-DOF Lagrangian Engine (Pure TS)
│       └── __tests__/   # Energy conservation & mathematical validation
└── tests/               # E2e and integration tests
```

## WHERE TO LOOK

| Task            | Location                          | Notes                                 |
| --------------- | --------------------------------- | ------------------------------------- |
| Physics Engine  | `src/physics/`                    | KKT solver, RK4 integrator, DAE logic |
| 2D Rendering    | `src/components/visualization2d/` | Stateless Canvas drawing              |
| Telemetry UI    | `src/components/DebugOverlay.tsx` | Real-time physics metrics             |
| Sim Data Export | `scripts/export_trajectory.ts`    | Generates trajectory and CSV logs     |

## CODE MAP

| Symbol                     | Type      | Location                                   | Role                           |
| -------------------------- | --------- | ------------------------------------------ | ------------------------------ |
| `CatapultSimulation`       | Class     | `src/physics/simulation.ts`                | Main controller & orchestrator |
| `computeDerivatives`       | Function  | `src/physics/derivatives.ts`               | Core DAE/KKT numerical solver  |
| `RK4Integrator`            | Class     | `src/physics/rk4-integrator.ts`            | Adaptive numerical integration |
| `getTrebuchetKinematics`   | Function  | `src/physics/trebuchet.ts`                 | Geometry source of truth       |
| `TrebuchetVisualization2D` | Component | `src/components/visualization2d/index.tsx` | Main renderer component        |

## CONVENTIONS

- **7-DOF Model**: Redundant coordinates (Cartesian + Angles) for extreme stability.
- **Kinematic Release**: Separation triggered by absolute projectile velocity angle.
- **Single Source of Truth**: All geometry points MUST derive from `trebuchet.ts`.
- **No Semicolons**: Enforced by Prettier.

## ANTI-PATTERNS (THIS PROJECT)

- **Hardcoded constants**: Use `src/physics/constants.ts`.
- **Manual angle calculation**: Do NOT calculate arm/sling points in renderers; use `trebuchet.ts`.
- **Legacy V-Shape**: Do not use dual-rope attachment; the sling is now a single dynamic link.
- **NaN Suppression**: Never use `as any` or `@ts-ignore` to hide numerical instability.

## UNIQUE STYLES

- **Telegraphic Code**: Minimal abstractions in math sections for readability.
- **Stepwise Rendering**: Renderer functions use numbered comments for drawing sequences.

## COMMANDS

```bash
pnpm dev              # Start app
pnpm test             # Run 75+ physics tests
pnpm check            # lint + format + fix
pnpm export-trajectory # Generate JSON trajectory and VT-compatible CSV log
```

## NOTES

- **Velocity Triangle**: Release angle accounts for arm tangential speed + relative sling speed.
- **Interpolation**: Rendering uses `alpha` interpolation between fixed physics steps for smooth visuals.
