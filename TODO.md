# PROJECT TODO

**Updated:** 2026-01-14
**Project:** Catapult Simulator (University-Grade Computational Physics Laboratory)

---

## 🎯 Project Goal

Build an **extremely realistic** university-grade computational physics laboratory disguised as a web app.

**Three Pillars of Success:**

1. **Mathematical Rigor** - Lagrangian Mechanics + RK4 integration, variable moments of inertia, non-linear springs, aerodynamic fluid dynamics (Drag + Magnus)
2. **Visual Intuition** - 3D interface with vectors, forces, ghost trajectories, high-fidelity animations
3. **Educational Empowerment** - Real-time experimentation with variables (mass, spring constant, spin) to foster deep physics understanding

**Reality Level:** Research-grade computational physics with cinema-quality visualization. Every physical factor must be calculated.

---

## ✅ Completed

- [x] Project initialization with TanStack Start stack
- [x] Lagrangian Mechanics foundation (17-DOF state space)
- [x] **Lagrangian DAE Solver** - Coupled matrix solver for rigid constraints
- [x] **Full 17-DOF Integration** - Quaternion-based rotation + translational motion
- [x] **3D Aerodynamic Model** - Magnus lift + quadratic drag in true 3D space
- [x] **A-Frame Trebuchet Model** - Engineering-accurate pivot/axle alignment
- [x] Comprehensive test suite (86+ tests passing)

---

## 🚧 In Progress

### Phase 1-2: Physics Engine Perfection (Current)

The goal is to achieve research-grade accuracy and numerical stability before any visualization.

- [x] **Numerical Stability & Robustness**
  - [x] Implement adaptive time-stepping (Richardson Extrapolation) in RK4 integrator
  - [x] Refactor DAE solver to use LU decomposition with partial pivoting
  - [ ] Make Baumgarte stabilization parameters (alpha, beta) configurable
  - [ ] Implement singularity handling for vertical arm and aligned sling positions
- [ ] **Physical Rigor & Fidelity**
  - [ ] Integrate `catapultTorque` from `trebuchet.ts` into `derivatives.ts` for consistency
  - [ ] Implement Euler-Bernoulli arm flexure (vibration modes) in derivative calculations
  - [ ] Fix Magnus coefficient to use dynamic spin parameter based on actual velocity
  - [ ] Fully integrate `atmosphericModel` with dynamic surface temperature and pressure
- [ ] **Sling & Rope Dynamics**
  - [ ] Transition from rigid constraint to multi-segment lumped-mass cable model
- [ ] **Verification & Validation**
  - [ ] Implement Hamiltonian (Energy) monitoring to verify conservation
  - [ ] Add Richardson Extrapolation convergence analysis tests
  - [ ] Performance optimization (GC pressure reduction, pre-allocated Float64Arrays)

---

## 📋 Planned

### Phase 3: Collision Detection & Environment (Rapier)

- [ ] Rapier integration for ground and object collisions
- [ ] Impulse-based collision resolution for projectile bounces
- [ ] Destructible targets and environment interaction

### Phase 4: 3D Visualization (R3F)

- [ ] 3D Rendering of Trebuchet and Projectile
- [ ] Scene lighting, HDRI, and shadows
- [ ] Vector visualization (forces, velocity, acceleration)
- [ ] Ghost trajectories and historical data display

### Phase 5: UI & Educational Controls

- [ ] Advanced parameter control panel (Shadcn UI)
- [ ] Real-time graphing of energy and force vectors
- [ ] Tutorial system and physics explanations

### Phase 6: Visual Polish & Advanced Assets

- [ ] Post-processing (Bloom, ACES, Motion Blur)
- [ ] Particle systems (Dust, Debris, Air displacement)
- [ ] 4K PBR textures and high-fidelity models

### Phase 7: Final Validation & API

- [ ] API Documentation
- [ ] Final performance benchmarking
- [ ] Browser compatibility and responsiveness
