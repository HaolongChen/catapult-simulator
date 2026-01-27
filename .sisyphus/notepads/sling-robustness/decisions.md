## 2026-01-26: Architectural Decisions

### AD-001: Degraded Flag Location

**Decision**: Keep degraded flag internal to RK4Integrator, do NOT add to PhysicsState or RK4Result

**Rationale**:

- Degraded mode is an integration implementation detail, not a physics state property
- PhysicsState represents the trebuchet's physical configuration, not integrator health
- Exposing in RK4Result would pollute the API with transient integration status
- Keeps separation of concerns: integrator manages its own error state

**Alternatives Considered**:

- Add to PhysicsState: Rejected (physics state should be pure state, not solver status)
- Add to RK4Result: Rejected (result is per-update, degraded is persistent)
- Global flag: Rejected (not thread-safe, breaks encapsulation)

**Consequences**:

- Integrator provides degraded getter for external inspection if needed
- CatapultSimulation.reset() must explicitly call resetDegraded()
- Tests can check degraded state via integrator.degraded getter

---

### AD-002: Validation in Constructor vs Factory

**Decision**: Validate in CatapultSimulation constructor using static method

**Rationale**:

- Constructor is the single entry point for all config validation
- Static method allows pre-validation in tests before createInitialState()
- Graceful clamping prevents crashes from external/user input
- Console warnings inform users without throwing exceptions

**Alternatives Considered**:

- Validate in createConfig(): Rejected (factory is for defaults, not validation)
- Validate in update(): Rejected (too late, config is immutable after construction)
- TypeScript constraints: Insufficient (can't enforce numerical ranges at type level)

**Consequences**:

- All external configs automatically clamped to safe ranges
- Tests can validate properties before state creation
- Warning logs help debug unexpected clamping

---

### AD-003: Complete State Validation

**Decision**: isFiniteState() must check ALL 14 numeric/Float64Array PhysicsState fields

**Rationale**:

- Original implementation only checked 8 fields (missing 6 critical fields)
- NaN can propagate through unchecked fields (armAngularVelocity, orientation, etc.)
- Incomplete checks create silent failure modes
- Plan explicitly documents all 14 fields that must be checked

**Fields Added**:

- armAngularVelocity (scalar)
- cwAngularVelocity (scalar)
- time (scalar)
- orientation (Float64Array - quaternion)
- angularVelocity (Float64Array - 3D)
- windVelocity (Float64Array - 3D)

**Consequences**:

- NaN detection is now comprehensive
- Degraded mode triggers on ANY field becoming non-finite
- Tests verify all fields via assertStateIsFinite helper

---

### AD-004: Division Guard Epsilon Selection

**Decision**: Use epsilon appropriate to physical quantity (1e-6 for mass, 1e-12 for inertia)

**Rationale**:

- Single epsilon (e.g., 1e-12) too strict for mass (can be legitimately < 1e-12 in edge cases)
- Physics-aware epsilons prevent false positives while catching real degeneracies
- Mass: 1e-6 kg is atomic-scale (physically impossible for trebuchet components)
- Inertia: 1e-12 kg·m² is appropriate for numerical stability

**Consequences**:

- Division guards tuned to physical context
- No false degraded mode triggers from valid edge cases
- Guards protect against zero/near-zero without over-constraining

---

### AD-005: Seeded Fuzzer for Reproducibility

**Decision**: Use seeded LCG (seed=42) instead of unseeded Math.random()

**Rationale**:

- Reproducibility critical for regression testing
- Unseeded random makes failures non-deterministic (hard to debug)
- Seed=42 chosen arbitrarily but consistently used
- LCG algorithm simple and sufficient for test coverage

**Implementation**:

```typescript
let seed = 42
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
```

**Consequences**:

- Fuzzer produces identical test cases every run
- Failures are reproducible and debuggable
- CI/CD can detect regressions reliably
