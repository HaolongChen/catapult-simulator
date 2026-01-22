# PROJECT TODO

**Updated:** 2026-01-16
**Project:** Catapult Simulator (High-Fidelity Computational Physics Lab)

---

## 🎯 Project Goal

Build an **extremely realistic** university-grade computational physics laboratory disguised as a web app.

## ✅ Completed

- [x] **17-DOF Core Physics Engine**
  - [x] Lagrangian Mechanics formulation
  - [x] Quaternion-based rotational integration
  - [x] 3D Aerodynamic model (Drag + Magnus)
  - [x] US Standard Atmosphere 1976 integration
- [x] **Numerical Stability**
  - [x] Adaptive RK4 integration (Richardson Extrapolation)
  - [x] LU Decomposition DAE solver with partial pivoting
  - [x] Baumgarte constraint stabilization
- [x] **3D Infrastructure**
  - [x] Headless 3D geometric export system
  - [x] React Three Fiber visualization dashboard
  - [x] Playback, Seek, and Scrubbing controls
- [x] **Vite + React Migration**
  - [x] Refactored from TanStack Start to simplified client-side stack

---

## 🚧 In Progress

### Phase 5: Advanced Collision & Interaction

- [ ] **Rapier Physics Integration**
  - [ ] Ground collision for projectile bounces
  - [ ] Interaction with destructible targets
- [ ] **Physical Refinement**
  - [ ] Euler-Bernoulli arm flexure vibration modes
  - [ ] Multi-segment lumped-mass cable model for sling rope

---

## 📋 Planned

### Phase 6: Educational UI & Controls

- [ ] Advanced parameter dashboard (Shadcn UI)
- [ ] Real-time vector visualization overlay
- [ ] Historical trajectory "Ghost" trails
- [ ] Dynamic graphing of energy conservation and forces

### Phase 7: Visual Polish

- [ ] Particle systems for air displacement and ground impact
- [ ] ACES Tone mapping and Motion Blur
- [ ] 4K PBR material textures for the Trebuchet
- [ ] Browser performance benchmarking and mobile optimization
