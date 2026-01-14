# PROJECT TODO

**Updated:** 2026-01-13
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
- [x] **Lagrangian DAE Solver** - Coupled 6x6 matrix solver for rigid constraints
- [x] **Full 17-DOF Integration** - Quaternion-based rotation + translational motion
- [x] **3D Aerodynamic Model** - Magnus lift + quadratic drag in true 3D space
- [x] **A-Frame Trebuchet Model** - Engineering-accurate pivot/axle alignment
- [x] Comprehensive test suite (60+ tests passing)

---

## 🚧 In Progress

### Phase 4: Advanced Visualization & Camera (Current)

- [ ] Post-processing pipeline
  - [ ] ACES Tone Mapping
  - [ ] Motion Blur
  - [ ] Bloom
- [ ] Particle systems
  - [ ] Ground impact debris
  - [ ] Counterweight launch dust
- [ ] Dynamic Camera System
  - [ ] Tracking shot
  - [ ] Target-view

---

## 📋 Planned

### Phase 5: Ultra-Realistic Assets

- [ ] 4K Wood and Iron textures
- [ ] Multi-segment flexible rope model
- [ ] Weather effects (Wind visualization)

### Phase 6: Collision Detection & Targets

- [ ] Rapier integration for environment collision
- [ ] Destructible targets
- [ ] Accuracy scoring

### Phase 7: Validation & Polish

- [ ] Euler-Bernoulli Beam Flexure for arm vibration
- [ ] GPU physics performance optimization
- [ ] API Documentation
