# PROJECT TODO

**Updated:** 2026-01-10
**Project:** Catapult Simulator (University-Grade Computational Physics Laboratory)

---

## 🎯 Project Goal

Build an **extremely realistic** university-grade computational physics laboratory disguised as a web app.

**Three Pillars of Success:**

1. **Mathematical Rigor** - Lagrangian Mechanics + RK4 integration, variable moments of inertia, non-linear springs, aerodynamic fluid dynamics (Drag + Magnus)
2. **Visual Intuition** - 3D interface with vectors, forces, ghost trajectories, high-fidelity animations
3. **Educational Empowerment** - Real-time experimentation with variables (mass, spring constant, spin) to foster deep physics understanding

**Reality Level:** Research-grade computational physics with cinema-quality visualization. Every physical factor must be calculated.

**Visual Scope:** Only 2 objects:

- Trebuchet (catapult mechanism)
- Projectile (stone/cannonball)

All forces and physics remain extremely realistic.

---

## ✅ Completed

- [x] Project initialization with TanStack Start stack
- [x] Architecture analysis and planning
- [x] Tech stack finalized (R3F + Rapier + Drei + custom RK4)
- [x] Documentation infrastructure (AGENTS.md, TODO.md)

---

## 🚧 In Progress

### Phase 0: Foundation (Current)

- [ ] Install 3D/physics dependencies
  - [ ] `@react-three/fiber` v9
  - [ ] `@react-three/rapier`
  - [ ] `@react-three/drei`
  - [ ] `@react-three/postprocessing`
  - [ ] `@react-spring/three`
  - [ ] `framer-motion`
- [ ] Set up basic 3D scene
  - [ ] Canvas with OrbitControls
  - [ ] Basic lighting setup
  - [ ] Ground plane with PBR material
- [ ] Create physics state management
  - [ ] TanStack Store for physics parameters
  - [ ] Type definitions for state

---

## 📋 Planned

### Phase 1: Core Physics Engine (4 weeks)

- [ ] RK4 integrator implementation
  - [ ] 17-DOF state vector
  - [ ] Fixed timestep (1ms)
  - [ ] Sub-stepping (100 steps/frame)
- [ ] Aerodynamic force model
  - [ ] Quadratic drag: F_d = -½ρv²C_dA
  - [ ] Reynolds number calculation
  - [ ] Mach number effects
  - [ ] Magnus effect: F_m = ρC_LA(S × v)
- [ ] Atmospheric model
  - [ ] Density variation vs altitude
  - [ ] Temperature gradient
  - [ ] Humidity corrections
  - [ ] Viscosity from Sutherland's law
- [ ] Unit tests + validation
  - [ ] Compare against Army TM 43-0001-28
  - [ ] Trajectory error <0.5% at 100m

### Phase 2: Catapult Mechanics (3 weeks)

- [ ] Non-linear spring torque model
  - [ ] τ = -k(θ - θ₀) - cθ̇ (hysteresis)
- [ ] Joint friction + energy loss
  - [ ] Static/dynamic friction
  - [ ] Efficiency modeling (η = 0.85-0.95)
- [ ] Arm flexure (Euler-Bernoulli beam)
  - [ ] Elastic deformation
  - [ ] Vibration modes
- [ ] Collision detection with Rapier

### Phase 3: 3D Rendering Foundation (3 weeks)

- [ ] PBR material system
  - [ ] Albedo + normal + roughness + AO maps
  - [ ] Clearcoat + anisotropy
- [ ] HDRI skybox
  - [ ] Sun positioning system
  - [ ] Real-time shadows (PCF)
- [ ] Basic catapult 3D model
  - [ ] Procedural geometry or scanned asset
  - [ ] Material mapping
- [ ] 60fps rendering baseline

### Phase 4: Advanced Visualization (4 weeks)

- [ ] Post-processing pipeline
  - [ ] Depth of field
  - [ ] Motion blur (curved shutter)
  - [ ] Chromatic aberration
  - [ ] Bloom + lens flare
  - [ ] Vignette
  - [ ] ACES tone mapping
- [ ] Particle systems
  - [ ] Dust particles (turbulence)
  - [ ] Air displacement trails
  - [ ] Impact debris
  - [ ] Atmospheric fog
- [ ] LOD system (5 levels)
  - [ ] Distance-based switching
  - [ ] HLOD for distant objects
- [ ] Performance optimization
  - [ ] Frustum culling
  - [ ] Occlusion culling (HIZ)
  - [ ] InstancedMesh

### Phase 5: Ultra-Realistic Assets (2 weeks)

**Only 2 objects to model:**

- [ ] Trebuchet (high-poly model)
  - [ ] Photorealistic wood grain textures (4K)
  - [ ] Metal hardware (iron brackets, pins)
  - [ ] Rope/cable system with realistic tension visualization
  - [ ] Detailed joint mechanics (counterweight, sling release)
- [ ] Projectile
  - [ ] Stone/cannonball material (roughness, surface detail)
  - [ ] Spin axis visualization
- [ ] Environment (minimal)
  - [ ] Simple ground plane with PBR material
  - [ ] HDRI skybox only (no trees, grass, or detailed scenery)
- [ ] Weather effects (only physics-related)
  - [ ] Wind visualization (vector arrows, particle flow)

### Phase 6: UI & Controls (2 weeks)

- [ ] Parameter control panel
  - [ ] All 17 state variables
  - [ ] Real-time value updates
  - [ ] Preset scenarios
- [ ] Visualization controls
  - [ ] Vector toggles (force, velocity, acceleration)
  - [ ] Ghost trail settings
  - [ ] Camera modes
- [ ] Data visualization
  - [ ] Real-time graphs
  - [ ] Trajectory prediction
  - [ ] Energy conservation plot

### Phase 7: Validation & Polish (3 weeks)

- [ ] Physics validation
  - [ ] Ballistics comparison (reference data)
  - [ ] Energy conservation check
  - [ ] C_d validation (CFD comparison)
- [ ] Performance profiling
  - [ ] GPU physics via WebGPU (if needed)
  - [ ] Adaptive quality scaling
  - [ ] Mobile optimization
- [ ] Visual fidelity testing
  - [ ] SSIM >0.95 vs reference
  - [ ] Path-traced comparison
- [ ] Documentation
  - [ ] Physics model documentation
  - [ ] User guide
  - [ ] API reference

---

## 🔧 Technical Debt

- [ ] Add comprehensive test coverage (currently 0 tests)
- [ ] Set up CI/CD pipeline
- [ ] Add performance monitoring (Web Vitals)
- [ ] Create storybook for UI components

---

## 📊 Progress Tracking

**Total Duration:** ~20 weeks (5 months) - reduced from 22 weeks due to simplified visual scope

| Phase                           | Duration | Status         |
| ------------------------------- | -------- | -------------- |
| Phase 0: Foundation             | 1 week   | 🚧 In Progress |
| Phase 1: Core Physics           | 4 weeks  | 📋 Planned     |
| Phase 2: Catapult Mechanics     | 3 weeks  | 📋 Planned     |
| Phase 3: 3D Rendering           | 3 weeks  | 📋 Planned     |
| Phase 4: Advanced Viz           | 4 weeks  | 📋 Planned     |
| Phase 5: Ultra-Realistic Assets | 2 weeks  | 📋 Planned     |
| Phase 6: UI & Controls          | 2 weeks  | 📋 Planned     |
| Phase 7: Validation & Polish    | 3 weeks  | 📋 Planned     |

---

## 🎓 Research References

- **Ballistics Data:** Army TM 43-0001-28 (artillery trajectory reference)
- **Atmosphere:** US Standard Atmosphere 1976 tables
- **Aerodynamics:** NASA TRC wind tunnel data
- **CFD Validation:** ANSYS Fluent comparison

---

## 💡 Ideas for Future

- [ ] Historical catapult presets (mangonel, ballista, onager) - reuse physics, swap 3D model
- [ ] Advanced projectile designs (aerodynamic shapes, finned projectiles)
- [ ] Wind tunnel simulation mode (pure visualization mode)
- [ ] Educational mode with guided lessons (step-by-step physics concepts)
- [ ] Slow-motion replay with frame-by-frame force analysis
- [ ] Trajectory comparison mode (multiple launches on one graph)
