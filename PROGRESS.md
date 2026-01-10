# Catapult Simulator - Development Progress

> Last Updated: 2026-01-10 00:21 (Eastern Time)

## Project Overview

Building an **extremely realistic** university-grade computational physics laboratory (catapult simulator) with Lagrangian Mechanics, RK4 integration, and aerodynamic fluid dynamics.

**Visual Scope**: Only 2 objects - trebuchet (catapult) + projectile (stone/cannonball), but **all forces must be calculated** with extreme realism.

**Tech Stack**: React 19, TypeScript 5.7, Vite 7, TanStack Router/Store, Shadcn UI, React Three Fiber v9, @react-three/rapier, @react-three/drei, @react-three/postprocessing.

---

## What We've Done

### Session 1: Initial Architecture & Research

- Created `AGENTS.md` documentation for project patterns
- Created `TODO.md` with 7-phase roadmap (22 weeks)
- Researched best libraries for physics simulation
- Decided on hybrid architecture: Custom RK4 + Rapier for collisions

### Session 2: Project Structure Discovery

- Analyzed TanStack Start framework patterns
- Identified file-based routing and store patterns
- Created `AGENTS.md` for root, `src/routes/demo`, `src/lib`

### Session 3: Physics Engine Implementation (Current)

**Research Completed**:

1. **RK4 Implementation Patterns** - Pre-allocated scratch arrays, fixed timestep with accumulator pattern, Float64Array for performance
2. **Aerodynamic Models** - Quadratic drag, Magnus effect, Reynolds/Mach corrections
3. **Catapult Mechanics** - Non-linear springs, joint friction, Euler-Bernoulli beam flexure
4. **TDD Patterns** - Custom matchers for floating-point comparisons, performance testing with Vitest
5. **Ballistics Validation Data**:
   - NASA Glenn Research Center: Vacuum trajectories (analytical solutions)
   - Army TM 43-0001-28: Artillery ballistics data
   - DTIC AD0209134: Drag coefficient vs Mach number
   - Accuracy requirements: <0.5% error at 100m, <1% drift

---

## Files Created

### Physics Engine Implementation (`src/physics/`)

| File                | Lines | Status | Description                                                                         |
| ------------------- | ----- | ------ | ----------------------------------------------------------------------------------- |
| `types.ts`          | 201   | ✅     | 17-DOF state vector interfaces, constants                                           |
| `atmosphere.ts`     | 155   | ✅     | US Standard Atmosphere 1976 model                                                   |
| `rk4-integrator.ts` | 263   | ✅     | High-performance RK4 with fixed timestep, sub-stepping, interpolation               |
| `aerodynamics.ts`   | 190   | ✅     | Quadratic drag + Magnus forces                                                      |
| `trebuchet.ts`      | 125   | ❌     | **SYNTAX ERROR at line 42** - non-linear spring torque, joint friction, arm flexure |
| `derivatives.ts`    | 188   | ✅     | Force/torque derivatives, quaternion handling                                       |
| `simulation.ts`     | 110   | ✅     | Complete simulation orchestrator                                                    |

### Test Files (`src/physics/__tests__/`)

| File                     | Tests | Status         |
| ------------------------ | ----- | -------------- |
| `atmosphere.test.ts`     | 21    | ✅ Passing     |
| `rk4-integrator.test.ts` | -     | ⏳ Pending fix |
| `aerodynamics.test.ts`   | -     | ⏳ Pending fix |
| `trebuchet.test.ts`      | -     | ⏳ Pending fix |
| `derivatives.test.ts`    | -     | ⏳ Pending fix |
| `simulation.test.ts`     | -     | ⏳ Pending fix |

### Configuration Files

- `vitest.config.ts` - 60s timeout, slow test threshold, physics test settings
- `src/__tests__/setup.ts` - Custom matchers for floating-point comparisons

### Documentation

- `AGENTS.md` - Project patterns and agent guidelines
- `TODO.md` - 7-phase roadmap
- `PHYSICS_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `PHASE_1_2_COMPLETION.md` - Detailed completion report

---

## Architecture Status

### Module Dependency DAG

```
types.ts (root)
    ├──→ atmosphere.ts
    │         └──→ aerodynamics.ts
    │                    └──→ derivatives.ts (orchestrator)
    │
    ├──→ trebuchet.ts
    │         └──→ derivatives.ts
    │
    └──→ rk4-integrator.ts (independent)
    │
    └──→ simulation.ts (orchestrates RK4 + derivatives)
```

---

## Known Issues

### 🔴 Critical: trebuchet.ts Syntax Error

**File**: `/home/haolong/catapult-simulator/src/physics/trebuchet.ts`
**Error at Line 42**: `ERROR: Unexpected "}"`

**Problem**: There's a duplicate return statement or malformed code structure causing TypeScript compilation failures.

**Impact**: This is blocking all physics tests from running. The `simulation.test.ts` and other tests cannot import trebuchet.ts properly.

---

## Phase Roadmap (from TODO.md)

| Phase | Focus                                               | Status                                |
| ----- | --------------------------------------------------- | ------------------------------------- |
| 1     | Physics Engine Foundation (RK4, Derivatives, State) | ✅ Core done, blocked by trebuchet.ts |
| 2     | Physics Validation (Tests, Ballistics Data)         | ⏳ Blocked                            |
| 3     | Visualization (R3F Scene, 3D Models)                | ⏳ Pending                            |
| 4     | Collision Detection (Rapier Integration)            | ⏳ Pending                            |
| 5     | User Controls (UI, Input Handling)                  | ⏳ Pending                            |
| 6     | Polish & Optimization                               | ⏳ Pending                            |
| 7     | Documentation & Examples                            | ⏳ Pending                            |

---

## Technical Decisions

1. **Float64Array for Performance** - All state vectors use Float64Array for 10-50x better performance than Array
2. **Fixed Timestep RK4** - 1ms timestep with 100 sub-steps for stability
3. **Interpolation Alpha** - Render state interpolation between physics steps for smooth 60fps visualization
4. **Pre-allocated Arrays** - Single-allocation pattern for GC pressure reduction
5. **US Standard Atmosphere 1976** - Standardized atmospheric model for validation compatibility
6. **Type-Safe Interfaces** - All physics functions use strict TypeScript interfaces
7. **TDD Approach** - Test-first development with comprehensive coverage

---

## Success Criteria

### Phase 1 & 2

✅ **Mathematical Rigor**:

- [x] RK4 integrator implemented
- [x] 17-DOF state vector defined
- [x] Lagrangian mechanics foundation
- [x] Aerodynamic forces (drag + Magnus) with Reynolds/Mach
- [x] Variable moments of inertia

✅ **Physics Accuracy Targets**:

- [ ] Validation against ballistics data (pending syntax fix)
- [x] Energy conservation tests written
- [x] RK4 convergence tests written

✅ **Code Quality**:

- [x] Clean TypeScript (no errors in most files)
- [ ] trebuchet.ts has critical syntax error (BLOCKING)
- [x] Modular architecture (8 independent modules)
- [x] Comprehensive test coverage (6 test suites)

---

## Commands

```bash
# Run physics tests
npx vitest run src/physics/__tests__/ --no-coverage

# Type check physics module
npx tsc --noEmit src/physics/trebuchet.ts

# Start dev server
npm run dev

# Build project
npm run build
```

---

## Next Steps

### Immediate Priority (Blocking Tests)

1. **Fix trebuchet.ts syntax error** (line 42)
   - Read the exact content around line 42
   - Identify the malformed code structure
   - Rewrite to remove duplicate/malformed return statements
   - Verify compilation passes

2. **Run All Physics Tests** After fixing syntax error

### After Tests Pass

3. **Complete Phase 1 & 2 Validation**
   - Create ballistics validation tests using research data
   - Implement analytical solution comparisons
   - Test against vacuum trajectories (expected: R = v₀²sin(2θ)/g, etc.)
   - Test energy conservation (<1% drift acceptable)
   - Verify RK4 O(dt⁴) convergence behavior

4. **Move to Phase 3** (Visualization)
   - Setup React Three Fiber scene
   - Implement basic 3D rendering
   - Create catapult and projectile 3D models
   - Set up HDRI skybox
   - Add vector visualization helpers

---

## Constraints & Preferences

1. **Extreme Realism Required** - Every single physical factor must be calculated, no shortcuts
2. **Visual Scope** - Only 2 objects (trebuchet + projectile), but forces remain complex
3. **Performance Target** - 60fps rendering (16.67ms per frame budget)
4. **Validation Standards** - <0.5% error at 100m, <1% energy drift
5. **Test Coverage** - >85% for physics code
6. **Technology Stack** - React 19 + TanStack + R3F ecosystem

---

## Session Log

| Date       | Session   | Work Done                                          | Notes                              |
| ---------- | --------- | -------------------------------------------------- | ---------------------------------- |
| 2026-01-10 | Session 1 | Initial architecture, research, AGENTS.md, TODO.md | -                                  |
| 2026-01-10 | Session 2 | Project structure discovery, TanStack patterns     | -                                  |
| 2026-01-10 | Session 3 | Physics engine implementation (8 modules), tests   | BLOCKED: trebuchet.ts syntax error |
