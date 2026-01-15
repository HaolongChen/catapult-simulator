# Catapult Simulator - Development Progress

> Last Updated: 2026-01-14 18:30 (Eastern Time)

## Project Overview

Building an **extremely realistic** university-grade computational physics laboratory (catapult simulator) with Lagrangian Mechanics, RK4 integration, and aerodynamic fluid dynamics.

**Visual Scope**: Only 2 objects - trebuchet (catapult) + projectile (stone/cannonball), but **all forces must be calculated** with extreme realism.

**Tech Stack**: React 19, TypeScript 5.7, Vite 7, TanStack Router/Store, Shadcn UI, React Three Fiber v9, @react-three/rapier, @react-three/drei, @react-three/postprocessing.

---

## What We've Done

### Session 1-3: Physics Engine Foundation

- Created `AGENTS.md`, `TODO.md`, and initial project structure.
- Implemented core physics engine (RK4, DAE solver, Atmospheric model, Aerodynamics).
- Verified foundation with 86+ passing tests.

### Session 4: Initial Visualization (REVERTED TO PENDING)

- Basic 3D models and R3F scene created.
- Decision made to revert this phase and prioritize **Physics Engine Perfection** to ensure a rock-solid mathematical foundation before visual polish.

### Session 5: Physics Perfection Strategy & Computation Focus (Current)

- Analyzed codebase for numerical stability and physical rigor.
- Identified critical areas for "Perfection": Adaptive stepping, robust DAE solving, arm flexure, and multi-segment sling models.
- **Removed all frontend files** (moved to `deprecated/frontend`) to focus exclusively on computation.
- Implemented **PhysicsLogger** in `src/physics/logging.ts` for real-time debugging and parameter recording.
- Integrated logging into the `CatapultSimulation` update loop.
- Updated roadmap to move Visualization and UI to later stages.

---

## Implementation Status

### Core Physics Engine (`src/physics/`)

| File                | Status | Description                                         |
| ------------------- | ------ | --------------------------------------------------- |
| `types.ts`          | ✅     | 17-DOF state vector interfaces                      |
| `atmosphere.ts`     | ✅     | US Standard Atmosphere 1976 model                   |
| `rk4-integrator.ts` | 🚧     | RK4 with fixed timestep (Adaptive stepping planned) |
| `aerodynamics.ts`   | 🚧     | Drag + Magnus (Spin parameter fix planned)          |
| `trebuchet.ts`      | ✅     | Non-linear springs, joint friction                  |
| `derivatives.ts`    | 🚧     | Lagrangian DAE solver (LU decomposition planned)    |
| `simulation.ts`     | ✅     | Simulation orchestrator with real-time logging      |
| `logging.ts`        | ✅     | Real-time state and parameter recorder              |

### Test Coverage

- **Total**: 91/91 tests passing (100% pass rate)
- **New Tests**: Verified `PhysicsLogger` integration in `simulation.test.ts`.

---

## Phase Roadmap (Updated)

| Phase | Focus                                    | Status         |
| ----- | ---------------------------------------- | -------------- |
| 1-2   | **Physics Engine Perfection**            | 🚧 In Progress |
| 3     | Collision Detection (Rapier Integration) | ⏳ Pending     |
| 4     | 3D Visualization (R3F Scene, Models)     | ⏳ Pending     |
| 5     | User Controls & Educational UI           | ⏳ Pending     |
| 6     | Visual Polish & Particles                | ⏳ Pending     |
| 7     | Validation & Documentation               | ⏳ Pending     |

---

## Session Log

| Date       | Session     | Work Done                            | Notes                           |
| ---------- | ----------- | ------------------------------------ | ------------------------------- |
| 2026-01-10 | Session 1-3 | Physics foundation and initial tests | 62 tests passing                |
| 2026-01-10 | Session 4   | Initial R3F Visualization            | Reverted to focus on physics    |
| 2026-01-14 | Session 5   | Strategy Pivot & Computation Focus   | Removed frontend, added logging |

---

## Technical Decisions

1. **Physics-First Architecture**: Computation must be perfect before rendering.
2. **Real-time Debugging**: Integrated logger to record 17-DOF state, forces, and config for ogni frame.
3. **Richardson Extrapolation**: Moving to adaptive stepping for variable precision.
4. **LU Decomposition**: Replacing simple Gaussian elimination for KKT stability.
5. **Lumped-Mass Sling**: Future transition to flexible rope model for higher realism.
