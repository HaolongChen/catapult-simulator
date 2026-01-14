# Master Prompt: Autonomous Trebuchet Simulator Production-Ready Stabilization

**Objective:** You are an expert Senior Software Engineer specializing in computational physics and full-stack web development. Your task is to autonomously analyze, debug, and stabilize a complex trebuchet simulator project, taking it from its current unstable state to a **production-ready, shippable product**. You will work independently without further user input, following this comprehensive plan.

---

## 1. Project Context & Goal

- **Project:** `catapult-simulator` (A university-grade computational physics laboratory)
- **Goal:** Achieve an **extremely realistic and stable** simulation of a trebuchet using Lagrangian Mechanics, suitable for public release.
- **Tech Stack:** React 19, TypeScript, Vite, TanStack, React Three Fiber (R3F).
- **Current State:** The physics engine and 3D visualization are implemented, but the simulation is **unstable and hard to debug** due to a series of critical bugs and architectural flaws.

---

## 2. Mandatory Analysis Phase (Your First Step)

Before writing any code, you must read and fully understand the following files in the repository to grasp the physics and architecture. This is non-negotiable.

1.  **`SLING_PHYSICS.md`**: This is the most important document. It contains the Lagrangian derivations, constraint-based dynamics, and the three phases of the simulation (Ground Dragging, Swinging, Released).
2.  **`PHYSICS_IMPLEMENTATION_SUMMARY.md`**: This provides an overview of the implemented physics modules.
3.  **`PROGRESS.md`**: This gives a high-level overview of the project phases.

---

## 3. Known Critical Issues (Your Bug Hitlist)

My deep analysis has identified the following **8 critical bugs** and **5 architectural issues**. You must address all of them.

| # | Issue | File(s) | Severity |
|---|---|---|---|
| 1 | **Redundant 10x RK4 Sub-Stepping** | `rk4-integrator.ts` | 🔴 Critical |
| 2 | **Duplicate & Incorrect Release Logic** | `derivatives.ts`, `simulation.ts` | 🔴 Critical |
| 3 | **Wrong Baumgarte Parameters** | `derivatives.ts` | 🟡 High |
| 4 | **Angle-Based Release (Not Tension-Based)** | `derivatives.ts` | 🔴 Critical |
| 5 | **Post-Integration Constraint Projection** | `simulation.ts` | 🟡 High |
| 6 | **Incorrect Normal Force in Friction Calc** | `derivatives.ts` | 🟡 Medium |
| 7 | **Quaternion Not Normalized** | `derivatives.ts` | 🟡 Medium |
| 8 | **Improper Release Flag Storage** | `derivatives.ts`, `simulation.ts` | ⚪️ Low |
| A1 | **Physics Loop Coupled with Rendering** | `Scene.tsx` | 🔴 Critical |
| A2 | **No Input Validation** | `simulation-store.ts` | 🟡 High |
| A3 | **No Debug Visualizations** | N/A | 🔴 Critical |
| A4 | **Hardcoded Physics Constants** | `derivatives.ts` | 🟡 Medium |
| A5 | **Inconsistent Energy Dissipation** | `derivatives.ts` | ⚪️ Low |

---

## 4. The Autonomous 5-Hour Action Plan

You will now execute the following plan step-by-step. **Do not skip steps.** The order is critical for success.

### **Hour 1: Foundational Stability & Tooling Prep**

*Goal: Fix the two most critical architectural flaws to create a stable base, and prepare the state for debugging.* 

1.  **Fix the RK4 Integrator:** In `src/physics/rk4-integrator.ts`, remove the redundant inner 10-step loop (lines 39-43). The `rk4Step` function should be called only **once** per `fixedTimestep`, using `this.config.fixedTimestep` as the `dt`.
2.  **Isolate the Physics Loop:** Refactor the simulation to run in a separate **Web Worker**. The main thread (`Scene.tsx` and `simulation-store.ts`) should only communicate with this worker via messages. The worker will run the physics loop independently, preventing it from blocking the rendering thread.
3.  **Expose Full State:** Modify the Web Worker and `simulation-store.ts` to expose not just the simulation state (`PhysicsState17DOF`) but also the calculated forces (`PhysicsForces`) and constraint violations. This is essential for the debug tools you will build next.

### **Hour 2: Build Your "Test-Driven Physics Debugging" Harness**

*Goal: Before you can debug the physics, you must be able to see them. Build the following tools for your own use, based on industry best practices.* 

1.  **Create an Energy Monitor Component:** Build a new React component that displays a real-time line chart of the simulation's energy. It must plot:
    *   Total Kinetic Energy
    *   Total Potential Energy
    *   **Total System Energy** (The sum of the two)
    *In a stable simulation, this total energy line should be nearly flat or decreasing slightly due to damping. If you see it increasing, you have found an instability.*

2.  **Create a Multi-Force Vector Visualizer:** In `Scene.tsx`, add toggleable `THREE.ArrowHelper` objects to visualize the following forces originating from the projectile:
    *   Sling Tension (use the `lambda1` constraint force)
    *   Gravity
    *   Aerodynamic Drag

3.  **Create a Constraint & Phase UI:** Build a simple UI panel that displays:
    *   **Current Phase:** "Ground Dragging", "Swinging", or "Released"
    *   **Sling Constraint Violation:** `|distance - slingLength|` (in meters)
    *   **Ground Constraint Violation:** `|position.y|` (if `y < 0`)

4.  **Create a Master Debug Toggle:** Add a single "Show Debug Tools" toggle to the `SimulationControls.tsx` panel to show/hide all the tools you just built.

### **Hour 3: Systematic Bug Extermination**

*Goal: With the debug harness in place, systematically find and fix the core physics bugs.* 

1.  **Unify and Correct Release Logic:** Remove the duplicate release check from `simulation.ts` (`latchRelease` method). The **single source of truth** for release will be in `derivatives.ts`. Change the release condition from angle-based to **tension-based**. The projectile should release when the sling tension (`lambda1`) drops below a small, positive `releaseThreshold`.
2.  **Correct Baumgarte Parameters:** In `src/physics/derivatives.ts` (line 188), change the Baumgarte stabilization parameters to the documented, more stable values of **`alpha = 20, beta = 100`**.
3.  **Remove Post-Integration Projection:** In `simulation.ts`, remove the call to `this.projectConstraints()`. The Baumgarte solver is sufficient and this extra step introduces energy drift.
4.  **Fix Friction Calculation:** In `derivatives.ts`, modify the friction torque calculation to use the actual ground normal force (`lambda2`) instead of the hardcoded `Mcw * g`.
5.  **Add Quaternion Normalization:** After each integration step in `simulation.ts`, normalize the `orientation` quaternion to ensure its magnitude remains 1.

### **Hour 4: Autonomous Debugging, Tuning & UI Hardening**

*Goal: Use the debug tools you built to tune for stability and harden the user interface.* 

1.  **Autonomous Tuning Session:** Run the simulation and observe your new debug tools.
    *   **Watch the Energy Plot:** Your primary goal is to make the Total System Energy line as flat as possible (or slightly decreasing). If you see it increasing, there is an instability. Pause the simulation and investigate the forces at that moment.
    *   **Tune for Stability:** Adjust parameters like `releaseThreshold`, `jointFriction`, and `dampingCoefficient` until you achieve a stable throw where energy is conserved.
2.  **Harden the UI:** In `simulation-store.ts`, add input validation to the `updateConfig` function. Prevent negative or zero values for mass and length. Also, disable the control panel inputs in `SimulationControls.tsx` while the simulation is playing.
3.  **Log Your Work:** Create a new file named `debugging_log.md` and document the instabilities you find and the parameter changes you make to fix them.

### **Hour 5: Final Validation & Shipping Prep**

*Goal: Verify the fixes with a stricter automated test suite and prepare the project for delivery.* 

1.  **Enhance the Automated Test Suite:** In `src/physics/__tests__/evaluation.test.ts`, make the following changes:
    *   Tighten the energy conservation tolerance from `0.01` (1%) to **`0.001` (0.1%)**.
    *   Tighten the constraint violation tolerance from `0.01` to **`0.001`**.
    *   Add a new test to ensure the `latchRelease` method has been removed and that release is purely tension-based.
    *   Run the full test suite and ensure all tests pass.
2.  **Finalize the UI:** Hide the debug tools by default. Ensure the UI is clean and professional.
3.  **Update Documentation:** In the main `README.md`, add a new section titled "**Autonomous Stabilization (Jan 2026)**" that briefly summarizes the critical fixes you implemented.
4.  **Final Build:** Run `npm run build` to ensure the project builds without errors.

---

## 5. Final Success Criteria (Definition of Done)

This task is complete **only when all** of the following criteria are met:

-   [ ] **Physics Accuracy:**
    -   [ ] Energy conservation: **<0.1% drift** over 10 seconds in a vacuum.
    -   [ ] Constraint satisfaction: **<0.001m** violation during swinging phase.
    -   [ ] No `NaN` values produced under any valid parameter configuration.
    -   [ ] RK4 convergence test passes with a ratio between 12 and 20.
-   [ ] **Performance:**
    -   [ ] Physics update time (in worker) is **<1ms** on average.
    -   [ ] Main thread maintains **60fps** during simulation.
-   [ ] **Architecture:**
    -   [ ] Physics runs entirely in a Web Worker.
    -   [ ] Release logic is 100% tension-based and located only in `derivatives.ts`.
    -   [ ] All automated tests in `evaluation.test.ts` (with tightened tolerances) are passing.
-   [ ] **Shipping:**
    -   [ ] `pnpm build` completes without errors.
    -   [ ] The `README.md` is updated with a summary of your work.

**You have full autonomy. Begin analysis now.**
