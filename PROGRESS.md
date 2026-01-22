# Catapult Simulator - Development Progress

> Last Updated: 2026-01-16

## Project Overview

Building an **extremely realistic** university-grade computational physics laboratory (catapult simulator) with Lagrangian Mechanics, RK4 integration, and aerodynamic fluid dynamics.

**Visual Scope**: Full 3D trebuchet (catapult) + projectile (stone/cannonball) with real-time force vector visualization.

**Tech Stack**: React 19, TypeScript 5.7, Vite 7, @tanstack/store, React Three Fiber, @react-three/drei, Tailwind CSS.

---

## What We've Done

### Session 1-3: Physics Engine Foundation

- Created `AGENTS.md`, `TODO.md`, and initial project structure.
- Implemented core physics engine (RK4, DAE solver, Atmospheric model, Aerodynamics).
- Verified foundation with 86+ passing tests.

### Session 4-5: Physics Perfection & Structural Refactor

- Implemented **Adaptive Timestepping** (Richardson Extrapolation) in RK4 integrator.
- Refactored DAE solver to use **LU Decomposition** with partial pivoting.
- Migrated from TanStack Start to **Vite + React** for simplified frontend architecture.
- Implemented **3D Geometry Export** system in `simulation.ts`.
- Verified mathematical and geometric correctness with a 99-test validation suite.

### Session 6: 3D Visualization (Current)

- Implemented **React Three Fiber** visualization.
- Developed `TrebuchetVisualization` for real-time 3D rendering of the linkage system.
- Created `AnimationControls` for simulation playback and scrubbing.
- Implemented `DebugOverlay` for real-time physics telemetry.
- Generated `trajectory.json` via headless simulation export.

---

## Implementation Status

### Core Physics Engine (`src/physics/`)

| File                | Status | Description                                      |
| ------------------- | ------ | ------------------------------------------------ |
| `types.ts`          | ✅     | 17-DOF state space and FrameData interfaces      |
| `atmosphere.ts`     | ✅     | US Standard Atmosphere 1976 model                |
| `rk4-integrator.ts` | ✅     | RK4 with adaptive sub-stepping and interpolation |
| `aerodynamics.ts`   | ✅     | Quadratic Drag + Magnus lift                     |
| `trebuchet.ts`      | ✅     | Joint friction and structural torques            |
| `derivatives.ts`    | ✅     | Lagrangian DAE solver with LU stability          |
| `simulation.ts`     | ✅     | 3D geometric export and phase detection          |

### Visualization (`src/components/`)

| File                         | Status | Description                              |
| ---------------------------- | ------ | ---------------------------------------- |
| `TrebuchetVisualization.tsx` | ✅     | 3D scene rendering via R3F               |
| `AnimationControls.tsx`      | ✅     | Playback, Pause, and Scrubbing UI        |
| `DebugOverlay.tsx`           | ✅     | Real-time telemetry monitor              |
| `useTrajectory.ts`           | ✅     | 60fps frame management and interpolation |

### Test Coverage

- **Total**: 99/99 tests passing (100% pass rate)
- **Validation**: RK4 Convergence Ratio verified at **16.10**.

---

## Phase Roadmap (Updated)

| Phase | Focus                            | Status       |
| ----- | -------------------------------- | ------------ |
| 1-2   | **Physics Engine Perfection**    | ✅ Completed |
| 3-4   | **3D Visualization & Geometry**  | ✅ Completed |
| 5     | Collision Detection (Rapier)     | ⏳ Pending   |
| 6     | User Parameter Controls (Shadcn) | ⏳ Pending   |
| 7     | Visual Polish & Particle Systems | ⏳ Pending   |

---

## Technical Decisions

1.  **Vite + React Migration**: Moved away from TanStack Start/SSR to a pure client-side architecture for better performance and simpler 3D state management.
2.  **Dumb Renderer Pattern**: The frontend only renders pre-calculated 3D geometry from `trajectory.json`, ensuring the UI is strictly decoupled from the physics engine.
3.  **17-DOF Integration**: Full 6-DOF projectile motion (3 pos + 4 orient) coupled with the trebuchet's internal degrees of freedom.
4.  **Index-1 DAE Stability**: Baumgarte-stabilized constraints provide high stability without non-physical projection hacks.
