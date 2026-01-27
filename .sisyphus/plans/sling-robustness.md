# Sling Coefficient Robustness

## Context

### Original Request

Make sling physics robust so modifying sling properties (stiffness, length) doesn't produce NaN or bugs. Currently the simulation only works with specific coefficient settings from commit 3ff8dd4.

### Interview Summary

**Key Discussions**:

- User wants sling parameters modifiable: **stiffness and length** (damping is NOT wired to physics)
- Valid range: WIDE experimental - allow extreme values but handle gracefully
- Expected behavior: GRACEFUL DEGRADATION - no NaN, no crashes, adapt/clamp internally

**Scope Clarification**:

- `ropeStiffness` and `slingLength` are user-modifiable (in `TrebuchetProperties`)
- `ropeDamping` exists in types but is **dead code** - NOT used by physics engine
- `NUM_SLING_PARTICLES` and `ROPE_DAMPING_RATIO` are engine constants, not user-configurable
- This plan focuses ONLY on `ropeStiffness` and `slingLength` robustness

### Metis Review

**Identified Gaps** (addressed):

1. NaN acceptance bug in integrator - fallback accepts NaN state
2. Unguarded mass/inertia inversions in derivatives.ts
3. Quaternion degeneracy when qMag ≤ 1e-12
4. No input validation layer for sling parameters
5. Missing tests for extreme coefficient ranges

---

## Work Objectives

### Core Objective

Make the sling physics solver robust against any reasonable `ropeStiffness` and `slingLength` values, preventing NaN/crashes through input validation, internal limiting, and graceful recovery.

### Concrete Deliverables

- Modified `src/physics/rk4-integrator.ts` with proper NaN recovery and `degraded` flag
- Modified `src/physics/derivatives.ts` with guards on all division operations
- Modified `src/physics/simulation.ts` with quaternion degeneracy fix and validation
- New test file `src/physics/__tests__/extreme-coefficients.test.ts`

### Definition of Done

- [x] `pnpm test` passes (all existing + new tests)
- [x] New extreme coefficient tests pass (10+ new tests in Task 5)
- [x] Fuzzer test with 100 seeded random coefficients produces 0 NaN in ANY state field
- [x] Energy drift for high-pivot vacuum config ≤ threshold (per Energy Drift Threshold Rule)
- [x] `assertStateIsFinite` helper verifies ALL numeric/Float64Array PhysicsState fields (14 fields; `isReleased: boolean` excluded by design)
- [x] `RK4Integrator.isFiniteState()` checks ALL numeric/Float64Array PhysicsState fields (14 fields)

### Must Have

- Guards on ALL division operations in derivatives.ts (see complete list below)
- Fix NaN acceptance bug in integrator fallback (line 52-53)
- `degraded` flag on `RK4Integrator` class with defined lifecycle
- Quaternion degeneracy recovery
- Validation of `ropeStiffness` and `slingLength` in `CatapultSimulation` constructor
- Test coverage for extreme coefficients

### Must NOT Have (Guardrails)

- Change physics behavior for configs within current "safe" ranges
- Remove existing guards (omegaLimit, compliance, etc.)
- Add guards that mask real bugs - guards prevent crash, not hide errors
- Use `as any` or `@ts-ignore` for NaN suppression
- Changes to UI or visualization components
- Add `degraded` to `PhysicsState` or `RK4Result` types
- Wire `ropeDamping` to physics (out of scope - dead property)
- Make `NUM_SLING_PARTICLES` configurable (out of scope - engine constant)

---

## Parameter Model Clarification

### User-Modifiable Parameters (in TrebuchetProperties)

| Property                 | Type     | Location      | Used In                      | Units                    |
| ------------------------ | -------- | ------------- | ---------------------------- | ------------------------ |
| `ropeStiffness?: number` | Optional | `types.ts:84` | `derivatives.ts:102` as `E`  | **Pa (Young's modulus)** |
| `slingLength: number`    | Required | `types.ts:79` | `derivatives.ts:100` as `Ls` | meters                   |

### CRITICAL: ropeStiffness Semantics

The `types.ts:84` comment says "Elastic stiffness (N/m per segment)" but this is **INCORRECT**.
The code at `derivatives.ts:102-104` uses it as Young's modulus `E`:

```typescript
const E = ropeStiffness || PHYSICS_CONSTANTS.ROPE_YOUNGS_MODULUS // Pa
const Area = Math.PI * (PHYSICS_CONSTANTS.ROPE_DIAMETER / 2) ** 2 // m^2
const segmentK = (E * Area) / Lseg // N/m (spring constant per segment)
```

**For this plan, we treat `ropeStiffness` as Pa (Pascals, Young's modulus).**

### Validation Ranges

| Parameter       | Lower Bound | Upper Bound | Behavior Outside |
| --------------- | ----------- | ----------- | ---------------- |
| `ropeStiffness` | 1e6 Pa      | 1e12 Pa     | Clamp + warn     |
| `slingLength`   | 0.1 m       | 100 m       | Clamp + warn     |

### Non-Finite Input Handling (CRITICAL)

For robustness, validation MUST handle non-finite inputs:

| Input Type    | ropeStiffness Behavior                            | slingLength Behavior                           |
| ------------- | ------------------------------------------------- | ---------------------------------------------- |
| `NaN`         | Replace with default (ROPE_YOUNGS_MODULUS), warn  | Replace with config default (3.5m), warn       |
| `Infinity`    | Replace with upper bound (1e12), warn             | Replace with upper bound (100m), warn          |
| `-Infinity`   | Replace with lower bound (1e6), warn              | Replace with lower bound (0.1m), warn          |
| Negative/Zero | Replace with lower bound (1e6), warn              | Replace with lower bound (0.1m), warn          |
| `undefined`   | Use engine default (ROPE_YOUNGS_MODULUS), no warn | **TypeScript ERROR** - slingLength is required |
| Valid number  | Clamp to range if outside, warn if clamped        | Clamp to range if outside, warn if clamped     |

**Note on defaults:**

- `slingLength` default: 3.5m (from `createConfig()` line 27)
- `ropeStiffness` default: `PHYSICS_CONSTANTS.ROPE_YOUNGS_MODULUS` (1e9 Pa)
- `slingLength` is REQUIRED in `TrebuchetProperties` type, so undefined is a TypeScript error
- `ropeStiffness` is OPTIONAL (`ropeStiffness?: number`), so undefined is valid and uses engine default

**Why slingLength validation default is fixed at 3.5m:**

The validation layer uses a **fixed default of 3.5m** regardless of what config factory the caller used.
This is intentional because:

1. Validation runs at `CatapultSimulation` construction time, after config is already created
2. The default must be a safe, well-tested value that works with all physics scenarios
3. 3.5m is the default from `createConfig()`, the primary config factory
4. Other config factories (like test helpers with slingLength=8) would have already set a valid value
5. The default only applies when slingLength is NaN/undefined at runtime (a bug/edge case), not normal usage

### Validation Order (State/Config Consistency)

**CRITICAL**: Validation SHOULD occur BEFORE `createInitialState(config)` is called.

**The Problem**: If config is validated AFTER `createInitialState()`, the state was computed with invalid values, but config now has clamped values → geometry mismatch.

**The Recommended Pattern**: Export a static validation function that can be called externally:

```typescript
// In simulation.ts - STATIC method, callable without constructing
static validateTrebuchetProperties(props: TrebuchetProperties): TrebuchetProperties

// Recommended usage in tests and app code:
const rawConfig = createConfig()  // Use createConfig() from config.ts
rawConfig.trebuchet.ropeStiffness = 1e15  // Invalid
rawConfig.trebuchet = CatapultSimulation.validateTrebuchetProperties(rawConfig.trebuchet)
const state = createInitialState(rawConfig)  // Uses validated config
const sim = new CatapultSimulation(state, rawConfig)  // Config matches state
```

**Constructor behavior**:

1. Call `validateTrebuchetProperties(config.trebuchet)`
2. Store validated config (overwrites original)
3. If caller created state with unvalidated config, there IS a mismatch

**State/Config Mismatch Handling (Intentional Mismatch Test):**

When state is created with extreme config BEFORE validation, then simulation is constructed (which validates):

- The config will be clamped, but state geometry was computed with original values
- **Expected behavior**: Simulation runs without NaN for at least 50 updates
- **Rationale**: The DAE solver's constraint projections and stabilization should "heal" minor geometric mismatches
- **This is a robustness test, not a correctness test** - we're verifying graceful degradation, not perfect physics

```typescript
it('should handle state/config mismatch gracefully', () => {
  const config = createConfig() // Use createConfig() from config.ts
  config.trebuchet.ropeStiffness = 1e15 // Extreme - will be clamped in constructor
  config.trebuchet.slingLength = 0.01 // Extreme - will be clamped in constructor

  // State created with ORIGINAL (extreme) config - intentional mismatch
  const state = createInitialState(config)

  // Constructor validates and clamps config, creating mismatch
  const sim = new CatapultSimulation(state, config)

  // Should not produce NaN despite mismatch
  for (let i = 0; i < 50; i++) {
    sim.update(1 / 60)
  }
  assertStateIsFinite(sim.getState())

  // Optionally verify a warning was logged about clamping
  // (implementation detail - not strictly required)
})
```

---

## Complete Division Guard Checklist

### ALL divisions in derivatives.ts that require guarding:

**Guarded at source (compute `Lseg` and `m_p` with floor):**

```typescript
// Line 100: Guard Lseg at computation
const Lseg = Math.max(1e-6, Ls) / Math.max(1, N)

// Line 107: Guard m_p at computation
const m_p = Math.max(1e-6, Msling) / Math.max(1, N)
```

**Mass inversions (lines 227-236):**
| Line | Expression | Guard |
|------|------------|-------|
| 227 | `1.0 / Ia` | `1.0 / Math.max(1e-12, Ia)` |
| 229-230 | `1.0 / m_p` | Already guarded via m_p floor |
| 232-233 | `1.0 / Mp` | `1.0 / Math.max(1e-12, Mp)` |
| 234-235 | `1.0 / Mcw` | `1.0 / Math.max(1e-12, Mcw)` |
| 236 | `1.0 / Icw` | `1.0 / Math.max(1e-12, Icw)` |

**Lseg divisions (lines 270-285):**
All these divide by `Lseg`. Since `Lseg` is already floored at line 100, no additional guards needed.

**Other guarded divisions:**
| Line | Expression | Status |
|------|------------|--------|
| 104 | `segmentK / m_p` | Guarded via m_p floor |
| 110 | `segmentK / m_p` in sqrt | Guarded via m_p floor |
| 361 | `1.0 / sqrt(...)` | Already guarded: `Math.max(S[i][i], 1e-18)` |

**Verification Instruction**:
After implementing guards, search `derivatives.ts` for `/` (division operator) and confirm:

1. Literal constant divisions (e.g., `dt / 6`) → safe, ignore
2. Divisions where denominator already uses `Math.max(..., epsilon)` → already guarded
3. Divisions where denominator is a guarded value (Lseg, m_p, Ia, Mp, Mcw, Icw) → guarded via source
4. Any other runtime divisions → must be evaluated for guard necessity

This ensures "ALL divisions guarded" is verifiable.

---

## Degraded Flag Design (Complete Specification)

### Location

The `degraded` flag is **internal to `RK4Integrator` class**, NOT part of `PhysicsState`.

### Implementation

```typescript
// In RK4Integrator class
private _degraded = false

get degraded(): boolean { return this._degraded }

// Clear on explicit state reset
resetDegraded(): void { this._degraded = false }
```

### Exact Control Flow in update()

```typescript
update(frameTime: number, derivative: DerivativeFunction): RK4Result {
  // If already degraded, return immediately without consuming time
  if (this._degraded) {
    return {
      newState: this.state,
      stepsTaken: 0,
      interpolationAlpha: 0,
    }
  }

  this.accumulator += frameTime
  let steps = 0

  while (this.accumulator >= this.config.initialTimestep) {
    const dt = this.config.initialTimestep
    this.previousState = this.cloneState(this.state)

    const res = this.adaptiveStep(this.state, derivative, dt)

    if (!this.isFiniteState(res.newState)) {
      // Try substeps
      const subDt = dt * 0.1
      let subState = this.cloneState(this.state)
      for (let i = 0; i < 10; i++) {
        const subRes = this.adaptiveStep(subState, derivative, subDt)
        subState = subRes.newState
      }

      if (this.isFiniteState(subState)) {
        this.state = subState
      } else {
        // BOTH failed - enter degraded mode
        this.state = this.previousState  // Keep last good state
        this._degraded = true
        this.accumulator = 0  // Zero accumulator to prevent huge jump on recovery
        break
      }
    } else {
      this.state = res.newState
    }

    this.accumulator -= dt
    steps++
    if (steps >= this.config.maxSubsteps) break
  }

  const interpolationAlpha = this.accumulator / this.config.initialTimestep
  return {
    newState: this.state,
    stepsTaken: steps,
    interpolationAlpha,
  }
}
```

### Lifecycle

- **Initial**: `_degraded = false`
- **On NaN failure**: Set to `true`, state frozen at `previousState`
- **Subsequent updates**: Return immediately with `stepsTaken: 0`
- **Reset via `resetDegraded()`**: Explicit method to clear flag, accumulator unchanged
- **Reset via `setState(state)`**: Clears `_degraded` (new state assumed valid), accumulator zeroed
- **Reset via `reset()`**: Does NOT clear `_degraded` (only affects accumulator)

### Accumulator Behavior When Degraded (CRITICAL)

**When degraded triggers (both full and substep fail):**

1. `this.state = this.previousState` (keep last good state)
2. `this._degraded = true`
3. `break` immediately (do NOT consume accumulator time)
4. Return with current accumulated values

**Problem**: Accumulator keeps backlogged time if we don't consume it.

**Solution**: **Zero the accumulator when entering degraded mode.**

```typescript
} else {
  // BOTH failed - enter degraded mode
  this.state = this.previousState  // Keep last good state
  this._degraded = true
  this.accumulator = 0  // Discard backlog - prevents huge jump on recovery
  break
}
```

**Rationale**:

- Keeping backlog would cause massive time jump on recovery
- User expects simulation to resume smoothly after reset
- Zeroing is consistent with `setState()` behavior

**On recovery via `setState(state)` or `resetDegraded()`:**

- `setState()` already zeros accumulator (existing behavior)
- `resetDegraded()` leaves accumulator as-is (already zeroed when degraded)

### Integration with Existing Reset Methods

The `RK4Integrator` class has these existing methods (verified from code):

- `setState(state: PhysicsState)`: Sets new state, clones to previousState, resets accumulator to 0
- `reset()`: Resets accumulator to 0 (no state change)

**Changes needed:**

```typescript
// In setState(state: PhysicsState) - ADD degraded clear
setState(state: PhysicsState): void {
  this.state = this.cloneState(state)
  this.previousState = this.cloneState(state)
  this.accumulator = 0
  this._degraded = false  // ADD THIS LINE
}

// reset() does NOT change state, so degraded persists
// This is intentional - reset() is for accumulator only
reset(): void {
  this.accumulator = 0
  // _degraded NOT cleared - caller must use setState() or resetDegraded()
}
```

**Why `setState()` clears degraded but `reset()` doesn't:**

- `setState()` = new simulation state (e.g., user clicked "Reset" button) → fresh start
- `reset()` = accumulator sync only (used by CatapultSimulation.reset()) → preserves degraded state
- `resetDegraded()` = explicit recovery request → clears flag without new state

**`CatapultSimulation.reset()` integration (lines 383-386):**

Current signature: `reset(): void` (no parameters)
Current behavior: Calls `this.integrator.reset()` which only zeros accumulator

**To clear degraded on simulation reset, we have TWO options:**

**Option A (Minimal change - RECOMMENDED):**
Keep `reset()` signature unchanged, add `resetDegraded()` call:

```typescript
reset(): void {
  this.integrator.reset()
  this.integrator.resetDegraded()  // ADD: Clear degraded flag
  this.lastForces = EMPTY_FORCES
}
```

**Option B (More invasive - NOT recommended):**
Would require `reset(state?: PhysicsState)` which changes API.

**For this plan, use Option A** - minimal API change, no caller updates needed.

**Note**: `CatapultSimulation.setState(state)` already calls `integrator.setState(state)`, which will clear degraded (per our changes to `RK4Integrator.setState`).

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Vitest, 76+ tests)
- **User wants tests**: TDD approach
- **Framework**: Vitest (`pnpm test`)

### Triggering NaN for Testing

**CRITICAL**: The current `isFiniteState()` in `rk4-integrator.ts:71-87` does NOT check all fields.

**Fields CHECKED by isFiniteState():**

- `armAngle` (scalar)
- `cwAngle` (scalar)
- `position` (Float64Array)
- `velocity` (Float64Array)
- `cwPosition` (Float64Array)
- `cwVelocity` (Float64Array)
- `slingParticles` (Float64Array)
- `slingVelocities` (Float64Array)

**Fields NOT CHECKED (vulnerabilities):**

- `armAngularVelocity` (scalar)
- `cwAngularVelocity` (scalar)
- `orientation` (Float64Array)
- `angularVelocity` (Float64Array)
- `windVelocity` (Float64Array)
- `time` (scalar)

**Test Strategy**: Inject NaN into a field that IS checked to trigger the fallback path:

```typescript
function createNaNDerivative(): DerivativeFunction {
  return (_t, _state) => ({
    derivative: {
      ...createZeroDerivative(),
      position: new Float64Array([NaN, NaN, NaN]), // Checked by isFiniteState
    },
    forces: EMPTY_FORCES,
  })
}
```

**REQUIRED**: Task 1 MUST expand `isFiniteState()` to check ALL 14 numeric/Float64Array fields
for consistency with `assertStateIsFinite()`. This is specified in NaN Containment Strategy section
and is part of Task 1 acceptance criteria and DoD.

---

## NaN Containment Strategy (CRITICAL)

### The Problem

`RK4Integrator.isFiniteState()` currently checks only a SUBSET of `PhysicsState` fields:

- ✓ `armAngle`, `cwAngle` (scalars)
- ✓ `position`, `velocity`, `cwPosition`, `cwVelocity`, `slingParticles`, `slingVelocities` (Float64Array)

**UNCHECKED fields** (NaN can propagate undetected):

- ✗ `armAngularVelocity`, `cwAngularVelocity` (scalars)
- ✗ `orientation`, `angularVelocity`, `windVelocity` (Float64Array)
- ✗ `time` (scalar)

### The Solution: Expand isFiniteState() in Task 1

As part of Task 1, **expand `RK4Integrator.isFiniteState()` to check ALL PhysicsState fields**:

```typescript
private isFiniteState(s: PhysicsState): boolean {
  const check = (a: Float64Array) => {
    for (let i = 0; i < a.length; i++)
      if (!Number.isFinite(a[i])) return false
    return true
  }
  return (
    // Scalars (all)
    Number.isFinite(s.armAngle) &&
    Number.isFinite(s.armAngularVelocity) &&  // ADD
    Number.isFinite(s.cwAngle) &&
    Number.isFinite(s.cwAngularVelocity) &&   // ADD
    Number.isFinite(s.time) &&                 // ADD
    // Arrays (all)
    check(s.position) &&
    check(s.velocity) &&
    check(s.orientation) &&                    // ADD
    check(s.angularVelocity) &&                // ADD
    check(s.cwPosition) &&
    check(s.cwVelocity) &&
    check(s.slingParticles) &&
    check(s.slingVelocities) &&
    check(s.windVelocity)                      // ADD
  )
}
```

### Complete PhysicsState Field List (from types.ts:18-43)

| Field                | Type               | Checked Before | Checked After |
| -------------------- | ------------------ | -------------- | ------------- |
| `position`           | Float64Array(3)    | ✓              | ✓             |
| `velocity`           | Float64Array(3)    | ✓              | ✓             |
| `orientation`        | Float64Array(4)    | ✗              | ✓             |
| `angularVelocity`    | Float64Array(3)    | ✗              | ✓             |
| `cwPosition`         | Float64Array(2)    | ✓              | ✓             |
| `cwVelocity`         | Float64Array(2)    | ✓              | ✓             |
| `slingParticles`     | Float64Array(2\*N) | ✓              | ✓             |
| `slingVelocities`    | Float64Array(2\*N) | ✓              | ✓             |
| `armAngle`           | number             | ✓              | ✓             |
| `armAngularVelocity` | number             | ✗              | ✓             |
| `cwAngle`            | number             | ✓              | ✓             |
| `cwAngularVelocity`  | number             | ✗              | ✓             |
| `windVelocity`       | Float64Array(3)    | ✗              | ✓             |
| `time`               | number             | ✗              | ✓             |
| `isReleased`         | boolean            | N/A            | N/A           |

**Total numeric/Float64Array fields to check: 14**
**Excluded: `isReleased` (boolean - cannot be NaN)**

### Interaction with Degraded Mode

Once `isFiniteState()` checks ALL 14 numeric/Float64Array fields, the degraded mode will trigger correctly for NaN in ANY field, satisfying DoD "0 NaN in ANY state field."

### Degraded-Mode Semantics Boundary

**Important clarification**: The "freeze at previousState" guarantee applies to **integrator output**.
After the integrator returns, `CatapultSimulation.update()` may still apply post-step operations:

- Quaternion renormalization (line 74-82)
- Constraint projections
- Event detection

These operations run on the frozen (last-good) state and should remain stable since that state was finite.

### Fuzzer Strategy (Deterministic, Reproducible)

Use a seeded PRNG for reproducibility:

**CRITICAL: Config Factory Usage**

The tests MUST use `createConfig()` from `src/physics/config.ts` (NOT `createDefaultConfig` which is
a local helper in evaluation.test.ts and not exported). Example:

```typescript
import { createConfig, createInitialState } from '@/physics/config'
import { CatapultSimulation } from '@/physics/simulation'
```

```typescript
// Helper: Check ALL state fields are finite (not just armAngle)
// NOTE: slingParticles/slingVelocities are Float64Array, NOT 2D arrays
function assertStateIsFinite(state: PhysicsState): void {
  // Scalars
  expect(Number.isFinite(state.armAngle)).toBe(true)
  expect(Number.isFinite(state.armAngularVelocity)).toBe(true)
  expect(Number.isFinite(state.cwAngle)).toBe(true)
  expect(Number.isFinite(state.cwAngularVelocity)).toBe(true)
  expect(Number.isFinite(state.time)).toBe(true)

  // Float64Array fields - iterate directly (flat arrays)
  const checkArray = (arr: Float64Array, name: string) => {
    for (let i = 0; i < arr.length; i++) {
      expect(Number.isFinite(arr[i])).toBe(true)
    }
  }

  checkArray(state.position, 'position')
  checkArray(state.velocity, 'velocity')
  checkArray(state.orientation, 'orientation')
  checkArray(state.angularVelocity, 'angularVelocity')
  checkArray(state.cwPosition, 'cwPosition')
  checkArray(state.cwVelocity, 'cwVelocity')
  checkArray(state.slingParticles, 'slingParticles') // Float64Array, not 2D
  checkArray(state.slingVelocities, 'slingVelocities') // Float64Array, not 2D
  checkArray(state.windVelocity, 'windVelocity')
}

describe('Fuzzer', () => {
  // Fixed seed for reproducibility
  const seed = 42
  const rng = createSeededRandom(seed)

  // Pre-generate 100 cases (deterministic)
  const cases = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    stiffness: Math.pow(10, 3 + rng() * 12), // 1e3 to 1e15 (will be clamped)
    length: rng() * 250, // 0 to 250 (will be clamped)
  }))

  it.each(cases)(
    'case $id: stiffness=$stiffness, length=$length',
    ({ stiffness, length }) => {
      const config = createConfig() // Use createConfig() from config.ts
      config.trebuchet.ropeStiffness = stiffness
      config.trebuchet.slingLength = length
      // Validate BEFORE creating state
      config.trebuchet = CatapultSimulation.validateTrebuchetProperties(
        config.trebuchet,
      )
      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)
      for (let i = 0; i < 50; i++) sim.update(1 / 60)
      assertStateIsFinite(sim.getState()) // Check ALL fields, not just armAngle
    },
  )
})

// Simple seeded random for reproducibility
function createSeededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}
```

### Performance Requirement (Removed from DoD)

Performance regression testing is removed from Definition of Done because:

- Wall-clock timing is non-deterministic and CI-flaky
- The guards add minimal overhead (Math.max calls)
- Visual inspection of test duration is sufficient

If performance regression is suspected post-implementation, manual profiling can be done.

---

## Energy Drift Measurement Specification (High-Pivot Vacuum Config)

> **Terminology Clarification**: This is NOT "default config" - it's the **high-pivot vacuum config** from `energy-analysis.test.ts`.

### Exact Test Configuration

The energy drift baseline uses the **exact configuration from `energy-analysis.test.ts:79-86`**:

```typescript
// Config factory: createConfig() from src/physics/config.ts (NOT createDefaultConfig)
const config = createConfig()

// Modifications (vacuum + high pivot):
config.projectile.dragCoefficient = 0
config.trebuchet.ropeDragCoefficient = 0 // NOTE: This property doesn't exist in TrebuchetProperties type - it's a historical no-op assignment in the test. Safe to keep for consistency with original test, but has no effect.
config.trebuchet.jointFriction = 0
config.trebuchet.pivotHeight = 15.0 // No ground contact
config.initialTimestep = 0.0005

// Time horizon:
const dt = 0.01 // 10ms per update call
const steps = 150 // 150 updates = 1.5s simulated time
```

### Drift Computation

```typescript
// From energy-analysis.test.ts:103-104
const drift = Math.abs(current.total - initial.total) / Math.abs(initial.total)
maxDrift = Math.max(maxDrift, drift)

// Report: maxDrift * 100 = percentage
```

### Baseline Source

Run `pnpm test energy-analysis` and capture stdout:

```
Max Energy Drift (High Pivot): 0.1880%
```

### DoD Threshold

- **Baseline**: 0.1880% (from current passing test, captured in Task 0)
- **Threshold**: ≤ 0.2% (allow 0.02% margin for numerical variance)
- **Measurement**: Same config, same computation, same time horizon

### Energy Drift Test (NEW - in extreme-coefficients.test.ts)

Rather than parsing stdout, add a concrete test that asserts the threshold:

```typescript
it('should maintain energy drift below threshold (high-pivot vacuum config)', () => {
  // Use exact config from energy-analysis.test.ts:79-86
  const config = createConfig()
  config.projectile.dragCoefficient = 0
  config.trebuchet.ropeDragCoefficient = 0
  config.trebuchet.jointFriction = 0
  config.trebuchet.pivotHeight = 15.0
  config.initialTimestep = 0.0005

  const state = createInitialState(config)
  const sim = new CatapultSimulation(state, config)
  const initial = getEnergy(state, config)
  let maxDrift = 0

  const dt = 0.01
  for (let i = 0; i < 150; i++) {
    const s = sim.update(dt)
    const current = getEnergy(s, config)
    const drift =
      Math.abs(current.total - initial.total) / Math.abs(initial.total)
    maxDrift = Math.max(maxDrift, drift)
  }

  // Threshold: 0.2% (0.002) for high-pivot vacuum config
  expect(maxDrift).toBeLessThan(0.002)
})
```

**Note**: Copy `getEnergy()` function from `energy-analysis.test.ts:9-76` into `extreme-coefficients.test.ts`.
Do NOT extract to a shared helper (out of scope for this plan - keeps changes minimal).

### Task 0 Must Record

After running `pnpm test energy-analysis`, record the EXACT percentage from stdout.

**Energy Drift Threshold Rule:**

1. Record baseline `B` from stdout (e.g., 0.1880%)
2. Compute threshold: `T = max(B * 1.1, 0.002)` (10% margin above baseline, floor of 0.2%)
3. Round `T` to 4 decimal places
4. **After Task 0, update the energy drift test assertion to use computed `T`**:
   - Open `extreme-coefficients.test.ts` during Task 5
   - Set `expect(maxDrift).toBeLessThan(T)`
   - If baseline `B ≤ 0.1818%`, use `T = 0.002` (the floor)
   - If baseline `B > 0.1818%`, use `T = round(B * 1.1, 4)`

5. If baseline `B > 0.20%`, the existing code already has energy issues:
   - Document this in Baseline Values
   - Set threshold to `B * 1.1` (accept current behavior as baseline)
   - Add a note that energy improvement is out of scope for this plan

Example: If baseline is 0.1880%, threshold = max(0.002068, 0.002) = 0.002068 → round to 0.0021 (0.21%)

---

## Task Flow

```
Task 0 (Baseline) → Task 1 (Integrator) → Task 2 (Derivatives) → Task 3 (Simulation)
                                                                          ↓
                                                         Task 4 (Validation) → Task 5 (Tests)
```

---

## TODOs

- [x] 0. Capture Regression Baseline

  **What to do**:
  - Run `pnpm test` and record pass count
  - Run `pnpm export-trajectory` and record that it completes
  - Record energy drift from `energy-analysis.test.ts` output
  - **Update the "Baseline Values" section below**

  **Must NOT do**:
  - Modify any **source** files (only this plan file is updated)
  - Create git commits

  **Parallelizable**: NO (must complete first)

  **References**:
  - `package.json:scripts.test` - Test command: `"test": "vitest run"`
  - `src/physics/__tests__/energy-analysis.test.ts` - Energy baseline (stdout output)

  **Acceptance Criteria**:
  - [ ] `pnpm test` → All tests pass, count recorded below
  - [ ] `pnpm export-trajectory` → Completes without error
  - [ ] Energy drift recorded in Baseline Values below
  - [ ] No source files modified

  **Commit**: NO

  **Baseline Values** (updated after Task 0):

  ```
  Test Count: 76 tests in 20 files
  Energy Drift: 0.1880%
  Export: PASS
  Energy Threshold for new test: 0.0021 (0.21%) per Energy Drift Threshold Rule
  Calculation: max(0.001880 * 1.1, 0.002) = max(0.002068, 0.002) = 0.0021
  ```

---

- [x] 1. Fix NaN Acceptance Bug in Integrator

  **What to do**:
  - Create new test file `src/physics/__tests__/extreme-coefficients.test.ts`
  - Write tests for degraded mode behavior (see acceptance criteria)
  - Implement the exact control flow from "Degraded Flag Design" section
  - Add `_degraded` field, `degraded` getter, and `resetDegraded()` method
  - **Expand `isFiniteState()` to check ALL PhysicsState fields** (see NaN Containment Strategy section)
  - Update `setState(state)` to clear `_degraded`

  **Tests to add in this task** (degraded mode only):
  1. "should not accept NaN state from fallback"
  2. "should set degraded flag when NaN recovery fails"
  3. "should freeze at previousState when degraded"
  4. "should return stepsTaken=0 when already degraded"
  5. "should clear degraded flag on resetDegraded()"
  6. "should clear degraded flag on setState(state)"
  7. "should NOT clear degraded flag on reset()"
  8. "should zero accumulator when entering degraded mode"

  **Accumulator Assertion Mechanism** (for test 8):

  Since `accumulator` is a private field, assert via the observable `interpolationAlpha` return value:

  ```typescript
  it('should zero accumulator when entering degraded mode', () => {
    // Setup: Create integrator with config where initialTimestep = 0.01
    const integrator = new RK4Integrator(createTestState(), {
      initialTimestep: 0.01,
      maxSubsteps: 100,
    })

    // Call update with frameTime that would normally accumulate
    // Use a NaN-producing derivative to trigger degraded mode
    const result = integrator.update(0.05, createNaNDerivative())

    // When degraded triggers:
    // 1. accumulator is set to 0 (per design)
    // 2. interpolationAlpha = accumulator / initialTimestep = 0 / 0.01 = 0
    expect(result.interpolationAlpha).toBe(0)
    expect(integrator.degraded).toBe(true)

    // Bonus: verify subsequent updates still return interpolationAlpha = 0
    // because early return doesn't consume time
    const result2 = integrator.update(0.1, createNaNDerivative())
    expect(result2.interpolationAlpha).toBe(0)
  })
  ```

  **Must NOT do**:
  - Change successful integration path
  - Modify RK4 coefficients or step logic
  - Add `degraded` to `PhysicsState` or `RK4Result` types

  **Parallelizable**: NO (depends on 0)

  **References**:
  - `src/physics/__tests__/rk4-integrator.test.ts:17-57` - Test helpers to copy
  - `src/physics/rk4-integrator.ts:43-57` - Bug location (fallback accepts NaN)
  - `src/physics/rk4-integrator.ts:71-87` - `isFiniteState()` to expand
  - `src/physics/types.ts:18-43` - Complete PhysicsState field list
  - `src/physics/types.ts:110-116` - `DerivativeFunction` type for mock

  **Acceptance Criteria**:
  - [ ] `isFiniteState()` checks ALL 14 PhysicsState fields (see NaN Containment Strategy table)
  - [ ] Test: "should not accept NaN state from fallback" → PASS
  - [ ] Test: "should set degraded flag when NaN recovery fails" → PASS
  - [ ] Test: "should freeze at previousState when degraded" → PASS
  - [ ] Test: "should return stepsTaken=0 when already degraded" → PASS
  - [ ] Test: "should clear degraded flag on resetDegraded()" → PASS
  - [ ] Test: "should clear degraded flag on setState(state)" → PASS
  - [ ] Test: "should NOT clear degraded flag on reset()" → PASS (reset() only affects accumulator)
  - [ ] Test: "should zero accumulator when entering degraded mode" → PASS
  - [ ] `pnpm test` → All previous tests still pass

  **Commit**: YES
  - Message: `fix(physics): prevent integrator from accepting NaN state in fallback`
  - Files: `src/physics/rk4-integrator.ts`, `src/physics/__tests__/extreme-coefficients.test.ts`
  - Pre-commit: `pnpm test`

---

- [x] 2. Guard All Division Operations in Derivatives

  **What to do**:
  - Guard `Lseg` at line 100: `Math.max(1e-6, Ls) / Math.max(1, N)`
  - Guard `m_p` at line 107: `Math.max(1e-6, Msling) / Math.max(1, N)`
  - Guard ALL Minv inversions at lines 227-236 with `Math.max(1e-12, value)`
  - Write tests for zero slingLength and zero counterweightMass (see test harness specification below)

  **Test Harness Specification for Task 2**:

  These are **integration tests** using `CatapultSimulation.update()`, NOT unit tests of `computeDerivatives()`.
  This approach verifies the guards work in the full simulation pipeline.

  **IMPORTANT: These tests do NOT use `validateTrebuchetProperties()`** (introduced in Task 4).
  Instead, they verify the division guards in `derivatives.ts` handle extreme values directly:

  ```typescript
  describe('Division guards in derivatives', () => {
    it('should handle very small slingLength without NaN', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const config = createConfig()
      config.trebuchet.slingLength = 0.001 // Very small - tests Lseg guard (Math.max(1e-6, Ls))
      // Note: 0 exactly would cause createInitialState issues, so use very small value
      // The derivatives.ts guard ensures Lseg >= 1e-6 even if config has tiny value

      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)

      // Run 50 updates - should not produce NaN due to division guards
      for (let i = 0; i < 50; i++) {
        sim.update(1 / 60)
      }
      assertStateIsFinite(sim.getState())

      warnSpy.mockRestore()
    })

    it('should handle zero counterweightMass without NaN', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const config = createConfig()
      config.trebuchet.counterweightMass = 0 // Guards in derivatives.ts protect against 1/Mcw

      const state = createInitialState(config)
      const sim = new CatapultSimulation(state, config)

      // Run 50 updates - should not produce NaN due to 1/Math.max(1e-12, Mcw) guard
      for (let i = 0; i < 50; i++) {
        sim.update(1 / 60)
      }
      assertStateIsFinite(sim.getState())

      warnSpy.mockRestore()
    })
  })
  ```

  **Rationale**:
  - These tests verify the **division guards in derivatives.ts** work correctly
  - They do NOT depend on Task 4's validation API - they test the guards directly
  - Integration tests exercise the full path from config → state → derivatives → integrator

  **Complete Guard List**:
  | Line | Original | Guarded |
  |------|----------|---------|
  | 100 | `Ls / N` | `Math.max(1e-6, Ls) / Math.max(1, N)` |
  | 107 | `Msling / N` | `Math.max(1e-6, Msling) / Math.max(1, N)` |
  | 227 | `1.0 / Ia` | `1.0 / Math.max(1e-12, Ia)` |
  | 232 | `1.0 / Mp` | `1.0 / Math.max(1e-12, Mp)` |
  | 233 | `1.0 / Mp` | `1.0 / Math.max(1e-12, Mp)` |
  | 234 | `1.0 / Mcw` | `1.0 / Math.max(1e-12, Mcw)` |
  | 235 | `1.0 / Mcw` | `1.0 / Math.max(1e-12, Mcw)` |
  | 236 | `1.0 / Icw` | `1.0 / Math.max(1e-12, Icw)` |

  **Must NOT do**:
  - Change the physics equations themselves
  - Modify working code paths for valid inputs

  **Parallelizable**: NO (depends on 1)

  **References**:
  - `src/physics/derivatives.ts:100` - Lseg computation
  - `src/physics/derivatives.ts:107` - m_p computation
  - `src/physics/derivatives.ts:227-236` - Minv inversions
  - `src/physics/derivatives.ts:159,198-199` - Existing guard patterns

  **Acceptance Criteria**:
  - [ ] Test: "should handle very small slingLength without NaN" → PASS
  - [ ] Test: "should handle zero counterweightMass without NaN" → PASS
  - [ ] `pnpm test` → All tests pass
  - [ ] All 8 guards implemented per table above
  - [ ] Existing `energy-analysis.test.ts` still passes (existing threshold: < 0.1 = 10%)

  **Commit**: YES
  - Message: `fix(physics): guard all division operations in derivatives solver`
  - Files: `src/physics/derivatives.ts`, `src/physics/__tests__/extreme-coefficients.test.ts`
  - Pre-commit: `pnpm test`

---

- [x] 3. Fix Quaternion Degeneracy in Simulation

  **What to do**:
  - Add else branch to quaternion renormalization at lines 74-82
  - When qMag ≤ 1e-12, reset to identity [1, 0, 0, 0]
  - Write test with degenerate quaternion input

  **Must NOT do**:
  - Change quaternion math for normal cases (qMag > 1e-12)

  **Parallelizable**: NO (depends on 2)

  **References**:
  - `src/physics/simulation.ts:74-82` - Bug location (no else branch)

  **Implementation**:

  ```typescript
  // Current (buggy):
  if (qMag > 1e-12) {
    q[0] /= qMag
    q[1] /= qMag
    q[2] /= qMag
    q[3] /= qMag
  }
  // Missing else!

  // Fixed:
  if (qMag > 1e-12) {
    q[0] /= qMag
    q[1] /= qMag
    q[2] /= qMag
    q[3] /= qMag
  } else {
    // Reset to identity quaternion
    q[0] = 1
    q[1] = 0
    q[2] = 0
    q[3] = 0
  }
  ```

  **Acceptance Criteria**:
  - [ ] Test: "should recover from degenerate quaternion" → PASS
  - [ ] `pnpm test` → All tests pass

  **Commit**: YES
  - Message: `fix(physics): reset degenerate quaternion to identity`
  - Files: `src/physics/simulation.ts`, `src/physics/__tests__/extreme-coefficients.test.ts`
  - Pre-commit: `pnpm test`

---

- [x] 4. Add Parameter Validation Layer

  **What to do**:
  - Add STATIC method `static validateTrebuchetProperties(props: TrebuchetProperties): TrebuchetProperties`
  - Handle non-finite inputs per "Non-Finite Input Handling" table above
  - Clamp `ropeStiffness` to [1e6, 1e12] Pa (if provided and finite)
  - Clamp `slingLength` to [0.1, 100] m (if provided and finite)
  - Log `console.warn` when clamping or replacing non-finite values
  - Call at start of constructor, store validated config
  - Export method so tests can validate BEFORE `createInitialState()`

  **Implementation**:

  **Authoritative Validation Rules** (code MUST match these):
  1. `ropeStiffness === undefined` → leave undefined (engine uses default via `||` fallback)
  2. `ropeStiffness === NaN` → set to ROPE_YOUNGS_MODULUS (default), warn
  3. `ropeStiffness === Infinity` → set to 1e12 (upper bound), warn
  4. `ropeStiffness === -Infinity` or `≤ 0` → set to 1e6 (lower bound), warn
  5. `ropeStiffness` in range [1e6, 1e12] → keep as-is
  6. `ropeStiffness < 1e6` (but > 0) → clamp to 1e6, warn
  7. `ropeStiffness > 1e12` → clamp to 1e12, warn
  8. `slingLength === undefined` or `slingLength === NaN` → set to 3.5 (from createConfig), warn
     - Note: TypeScript says slingLength is required, but we handle undefined for JS callers / `as any` casts
  9. `slingLength === Infinity` → set to 100 (upper bound), warn
  10. `slingLength === -Infinity` or `≤ 0` → set to 0.1 (lower bound), warn
  11. `slingLength` in range [0.1, 100] → keep as-is
  12. `slingLength < 0.1` (but > 0) → clamp to 0.1, warn
  13. `slingLength > 100` → clamp to 100, warn

  ```typescript
  static validateTrebuchetProperties(props: TrebuchetProperties): TrebuchetProperties {
    const result = { ...props }
    const DEFAULT_SLING_LENGTH = 3.5  // From createConfig()

    // ropeStiffness validation (optional property)
    if (result.ropeStiffness !== undefined) {
      if (Number.isNaN(result.ropeStiffness)) {
        console.warn(`ropeStiffness is NaN, using default ${PHYSICS_CONSTANTS.ROPE_YOUNGS_MODULUS}`)
        result.ropeStiffness = PHYSICS_CONSTANTS.ROPE_YOUNGS_MODULUS
      } else if (result.ropeStiffness === Infinity) {
        console.warn(`ropeStiffness is Infinity, clamping to 1e12`)
        result.ropeStiffness = 1e12
      } else if (result.ropeStiffness === -Infinity || result.ropeStiffness <= 0) {
        console.warn(`ropeStiffness ${result.ropeStiffness} is invalid, clamping to 1e6`)
        result.ropeStiffness = 1e6
      } else if (result.ropeStiffness < 1e6) {
        console.warn(`ropeStiffness ${result.ropeStiffness} below minimum, clamping to 1e6`)
        result.ropeStiffness = 1e6
      } else if (result.ropeStiffness > 1e12) {
        console.warn(`ropeStiffness ${result.ropeStiffness} above maximum, clamping to 1e12`)
        result.ropeStiffness = 1e12
      }
    }

    // slingLength validation (required property, but handle invalid values at runtime)
    // Check undefined first (for JS callers, `as any` casts, or runtime edge cases)
    // Then check NaN, Infinity, etc. in order
    if (result.slingLength === undefined || Number.isNaN(result.slingLength)) {
      console.warn(`slingLength is ${result.slingLength}, using default ${DEFAULT_SLING_LENGTH}`)
      result.slingLength = DEFAULT_SLING_LENGTH
    } else if (result.slingLength === Infinity) {
      console.warn(`slingLength is Infinity, clamping to 100`)
      result.slingLength = 100
    } else if (result.slingLength === -Infinity) {
      console.warn(`slingLength is -Infinity, clamping to 0.1`)
      result.slingLength = 0.1
    } else if (result.slingLength <= 0) {
      console.warn(`slingLength ${result.slingLength} is non-positive, clamping to 0.1`)
      result.slingLength = 0.1
    } else if (result.slingLength < 0.1) {
      console.warn(`slingLength ${result.slingLength} below minimum, clamping to 0.1`)
      result.slingLength = 0.1
    } else if (result.slingLength > 100) {
      console.warn(`slingLength ${result.slingLength} above maximum, clamping to 100`)
      result.slingLength = 100
    }

    return result
  }
  ```

  **Must NOT do**:
  - Throw exceptions
  - Validate dead properties (`ropeDamping`)
  - Change `createInitialState`

  **Parallelizable**: NO (depends on 3)

  **References**:
  - `src/physics/simulation.ts:33-35` - Constructor
  - `src/physics/types.ts:73-86` - TrebuchetProperties
  - `src/physics/constants.ts` - ROPE_YOUNGS_MODULUS default

  **Acceptance Criteria**:
  - [ ] Test: "should clamp extreme ropeStiffness to safe range" → PASS
  - [ ] Test: "should clamp extreme slingLength to safe range" → PASS
  - [ ] Test: "should warn when parameters are clamped" → PASS
  - [ ] Test: "should replace NaN ropeStiffness with default" → PASS
  - [ ] Test: "should replace Infinity slingLength with upper bound" → PASS
  - [ ] Test: "should replace negative slingLength with lower bound" → PASS
  - [ ] Test: "should handle state/config mismatch gracefully" → PASS (create state with extreme values before validation, then construct sim)
  - [ ] `pnpm test` → All tests pass

  **Warning Test Pattern** (to avoid console spam and enable assertion):

  ```typescript
  it('should warn when parameters are clamped', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = createConfig()
    const props = { ...config.trebuchet, ropeStiffness: 1e15 }
    CatapultSimulation.validateTrebuchetProperties(props)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('clamping'))
    warnSpy.mockRestore()
  })
  ```

  **Commit**: YES
  - Message: `feat(physics): add parameter validation with graceful clamping`
  - Files: `src/physics/simulation.ts`, `src/physics/__tests__/extreme-coefficients.test.ts`
  - Pre-commit: `pnpm test`

---

- [x] 5. Comprehensive Extreme Coefficient Tests

  **What to do**:
  - Add `assertStateIsFinite(state)` helper that checks ALL state fields (per Fuzzer Strategy section)
  - Add parameterized edge case tests (scenarios 1-7, 9-10 from list below)
  - Add seeded fuzzer test (100 deterministic cases) using `assertStateIsFinite`
  - Add regression test for energy drift (scenario 8)

  **Tests to add in this task** (edge cases and fuzzer):
  (Note: Tasks 1-4 already added their specific unit tests. This task adds integration/fuzz tests.)
  1. "should handle very high ropeStiffness (1e15)"
  2. "should handle very low ropeStiffness (1e3)"
  3. "should handle zero slingLength"
  4. "should handle very long slingLength (200m)"
  5. "should handle undefined ropeStiffness"
  6. "should handle combined high stiffness + short length"
  7. "should handle combined low stiffness + long length"
  8. "should maintain energy drift ≤ threshold (high-pivot vacuum)"
  9. "should handle NaN ropeStiffness"
  10. "should handle Infinity slingLength"
  11. Fuzzer: 100 seeded cases

  **Must NOT do**:
  - Use unseeded Math.random()
  - Test NUM_SLING_PARTICLES (engine constant)
  - Only check `armAngle` - must check ALL state fields

  **Parallelizable**: NO (depends on 4)

  **References**:
  - `src/physics/config.ts` - `createConfig()` factory (USE THIS, not `createDefaultConfig`)
  - `src/physics/__tests__/repro-nan.test.ts` - NaN test pattern
  - `src/physics/__tests__/energy-analysis.test.ts` - Energy drift config and `getEnergy()` function to copy
  - `src/physics/types.ts:14-50` - PhysicsState structure (all fields to check)

  **Test Scenarios**:
  1. Very high ropeStiffness (1e15 → clamped to 1e12)
  2. Very low ropeStiffness (1e3 → clamped to 1e6)
  3. Zero slingLength (0 → clamped to 0.1)
  4. Very long slingLength (200 → clamped to 100)
  5. Undefined ropeStiffness (uses default)
  6. Combined: high stiffness + short length
  7. Combined: low stiffness + long length
  8. Energy regression: high-pivot vacuum config ≤ threshold (per Energy Drift Threshold Rule)
  9. NaN ropeStiffness → replaced with default
  10. Infinity slingLength → replaced with upper bound

  **Full State Check Helper**:

  ```typescript
  // MUST check ALL fields, not just armAngle
  // NOTE: All array fields are Float64Array (flat arrays, not 2D)
  function assertStateIsFinite(state: PhysicsState): void {
    // Scalars
    expect(Number.isFinite(state.armAngle)).toBe(true)
    expect(Number.isFinite(state.armAngularVelocity)).toBe(true)
    expect(Number.isFinite(state.cwAngle)).toBe(true)
    expect(Number.isFinite(state.cwAngularVelocity)).toBe(true)
    expect(Number.isFinite(state.time)).toBe(true)

    // Float64Array fields - all are flat arrays
    const checkArray = (arr: Float64Array) => {
      for (let i = 0; i < arr.length; i++) {
        expect(Number.isFinite(arr[i])).toBe(true)
      }
    }

    checkArray(state.position) // 3D position
    checkArray(state.velocity) // 3D velocity
    checkArray(state.orientation) // Quaternion
    checkArray(state.angularVelocity) // 3D angular velocity
    checkArray(state.cwPosition) // Counterweight 2D position
    checkArray(state.cwVelocity) // Counterweight 2D velocity
    checkArray(state.slingParticles) // Flat array: [x0,y0,x1,y1,...] for N particles
    checkArray(state.slingVelocities) // Flat array: [vx0,vy0,vx1,vy1,...]
    checkArray(state.windVelocity) // 3D wind
  }
  ```

  **Acceptance Criteria**:
  - [ ] 10+ parameterized test cases → all PASS
  - [ ] Fuzzer: 100 seeded random cases → 0 NaN in ANY state field
  - [ ] Energy drift test passes (threshold per Energy Drift Threshold Rule)
  - [ ] `pnpm test` → All tests pass
  - [ ] `assertStateIsFinite` helper checks ALL fields per PhysicsState type
  - [ ] All tests use `vi.spyOn(console, 'warn').mockImplementation()` to prevent spam

  **Commit**: YES
  - Message: `test(physics): add comprehensive extreme coefficient tests`
  - Files: `src/physics/__tests__/extreme-coefficients.test.ts`
  - Pre-commit: `pnpm test`

---

## Commit Strategy

| After Task | Message                                                                 | Files                                           | Verification |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------- | ------------ |
| 0          | (no commit)                                                             | -                                               | pnpm test    |
| 1          | `fix(physics): prevent integrator from accepting NaN state in fallback` | rk4-integrator.ts, extreme-coefficients.test.ts | pnpm test    |
| 2          | `fix(physics): guard all division operations in derivatives solver`     | derivatives.ts, extreme-coefficients.test.ts    | pnpm test    |
| 3          | `fix(physics): reset degenerate quaternion to identity`                 | simulation.ts, extreme-coefficients.test.ts     | pnpm test    |
| 4          | `feat(physics): add parameter validation with graceful clamping`        | simulation.ts, extreme-coefficients.test.ts     | pnpm test    |
| 5          | `test(physics): add comprehensive extreme coefficient tests`            | extreme-coefficients.test.ts                    | pnpm test    |

---

## Success Criteria

### Verification Commands

```bash
pnpm test                                    # Expected: All 84+ tests pass
pnpm test extreme-coefficients               # Expected: All new tests pass
pnpm export-trajectory                       # Expected: Valid trajectory.json
```

### Final Checklist

- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All original tests pass (regression)
- [x] 10+ new extreme coefficient tests pass
- [x] Fuzzer test: 100 seeded cases → 0 NaN in ANY state field
- [x] Energy drift for high-pivot vacuum config ≤ threshold (computed per rule)
- [x] `RK4Integrator.degraded` getter works correctly
- [x] `RK4Integrator.resetDegraded()` clears flag
- [x] `RK4Integrator.setState(state)` clears degraded flag
- [x] `RK4Integrator.isFiniteState()` checks ALL 14 numeric/Float64Array PhysicsState fields
- [x] `CatapultSimulation.reset()` calls `integrator.resetDegraded()` to clear flag
- [x] `CatapultSimulation.validateTrebuchetProperties()` is static and exported
- [x] Non-finite inputs (NaN, Infinity, negative) are handled gracefully
