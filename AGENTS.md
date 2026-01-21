# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-21 04:00:00
**Commit:** f46d6e6
**Branch:** rebuild

## OVERVIEW

High-fidelity 19-DOF trebuchet simulator featuring a redundant coordinate DAE system, hinged counterweights, and dual-rope sling mechanics. Built with Vite, React 19, and @tanstack/store.

## STRUCTURE

```text
./
├── src/
│   ├── components/      # React UI modules
│   │   └── visualization2d/ # Modular canvas renderer (renderers/hooks)
│   ├── physics/         # 19-DOF Lagrangian Engine (Pure TS)
│   │   └── __tests__/   # Energy conservation & mathematical validation
│   ├── hooks/           # App-level React hooks (trajectory management)
│   └── lib/             # UI utilities (Tailwind cn)
├── public/              # Static assets (trajectory.json)
└── scripts/             # Headless simulation export tools
```

## WHERE TO LOOK

| Task            | Location                          | Notes                                 |
| --------------- | --------------------------------- | ------------------------------------- |
| Physics Engine  | `src/physics/`                    | KKT solver, RK4 integrator, DAE logic |
| 2D Rendering    | `src/components/visualization2d/` | Stateless Canvas drawing              |
| Telemetry UI    | `src/components/DebugOverlay.tsx` | Real-time physics metrics             |
| Sim Data Export | `scripts/export_trajectory.ts`    | Generates public/trajectory.json      |

## CODE MAP

| Symbol                       | Type      | Location                                   | Role                           |
| ---------------------------- | --------- | ------------------------------------------ | ------------------------------ |
| `CatapultSimulation`         | Class     | `src/physics/simulation.ts`                | Main controller & orchestrator |
| `computeDerivatives`         | Function  | `src/physics/derivatives.ts`               | Core DAE/KKT numerical solver  |
| `RK4Integrator`              | Class     | `src/physics/rk4-integrator.ts`            | Adaptive numerical integration |
| `TrebuchetVisualization2D`   | Component | `src/components/visualization2d/index.tsx` | Main renderer component        |
| `computeTrebuchetKinematics` | Function  | `src/physics/kinematics.ts`                | Geometry source of truth       |

## CONVENTIONS

- **19-DOF Model**: Redundant coordinates (Cartesian + Angles) for extreme stability.
- **Natural Release**: Ball separates when $N \le 0$, not at fixed angles.
- **V-Shape Sling**: Dual-rope attachment solved dynamically.
- **No Semicolons**: Prettier/ESLint enforced.
- **Single Source of Truth**: All geometry points MUST derive from `kinematics.ts`.

## ANTI-PATTERNS (THIS PROJECT)

- **Hardcoded constants**: Use `src/physics/constants.ts`.
- **Manual angle calculation**: Do NOT calculate arm/bag points in renderers; use `kinematics.ts`.
- **Legacy Torque**: Avoid penalty-based forces; the DAE solver handles constraints natively.
- **NaN Suppression**: Never use `as any` or `@ts-ignore` to hide numerical instability.

## UNIQUE STYLES

- **Telegraphic Code**: Minimal abstractions in math sections for readability.
- **Stepwise Rendering**: Renderer functions use numbered comments for drawing sequences.

## COMMANDS

```bash
pnpm dev              # Start app
pnpm test             # Run 80+ physics tests
pnpm check            # lint + format + fix
pnpm export-trajectory # Generate fresh JSON data
```

## NOTES

- **Ground Rail**: Projectile is constrained horizontally until vertical tension exceeds weight.
- **Interpolation**: Rendering uses `alpha` interpolation between fixed physics steps for smooth 60fps visuals.
