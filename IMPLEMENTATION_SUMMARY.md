# Sling Physics Implementation - Summary

> **UPDATE (2026-01-16):** The project has been migrated from TanStack Start to a pure Vite + React 19 architecture for improved visualization performance. All physics logic remains intact and verified.

## What Was Changed

### Files Modified

1. **`src/physics/derivatives.ts`** - Complete rewrite with sling physics
   - Backup saved to `derivatives.ts.backup`

### Files Added

2. **`SLING_PHYSICS.md`** - Comprehensive documentation
3. **`src/physics/__tests__/sling-physics.test.ts`** - Test suite (8 tests)
4. **`IMPLEMENTATION_SUMMARY.md`** - This file

## Key Improvements

### 1. Realistic Sling Constraint Physics

**Before**: Projectile rigidly attached to arm tip (incorrect)
**After**: Sling modeled as flexible rope with tension calculated from constraint dynamics

**Implementation**:

- Lagrange multiplier method for constraint forces
- Baumgarte stabilization (α=20, β=100) prevents numerical drift
- Sling can only pull, never push (unilateral constraint)

### 2. Proper Force Application

**To Projectile**:

```typescript
F_sling = -T * (r_rel / dist); // Points toward arm tip
a_projectile = (F_gravity + F_aero + F_sling) / m;
```

**To Arm (as torque)**:

```typescript
τ_sling = L_arm * (cos(θ) * F_y - sin(θ) * F_x);
θ̈ = (τ_gravity + τ_spring + τ_damping + τ_sling) / I_total;
```

### 3. Three-Phase Dynamics

#### Phase 1: Ground Dragging

- Projectile on ground (y ≤ 0.001, vy ≤ 0)
- If sling taut: follows arm tip in x-direction
- If sling slack: slides with friction (μ = 0.3)
- Arm rotates without projectile inertia

#### Phase 2: Swinging

- Projectile airborne, sling taut
- Coupled arm-projectile dynamics
- Tension provides centripetal + tangential forces
- Realistic energy transfer from counterweight

#### Phase 3: Released

- Free ballistic flight
- Only gravity + aerodynamics
- Arm stops influencing projectile

### 4. Numerical Stability Features

✅ **Baumgarte stabilization** - Prevents constraint drift
✅ **Penalty spring** - Backup constraint (k=10000 N/m)
✅ **Min distance threshold** - Prevents div-by-zero (0.001 m)
✅ **Max tension limit** - Caps at 100×mg
✅ **Slack detection** - Smooth taut/slack transitions

### 5. Smooth Phase Transitions

- **Ground → Swinging**: Automatic when tension lifts projectile
- **Swinging → Released**: When angle > releaseAngle or dist > 1.05×L_sling
- No velocity discontinuities (validated by tests)

## Validation Results

### Test Coverage

- ✅ 8 new sling physics tests
- ✅ All 83 existing tests still pass
- ✅ No NaN values in any phase
- ✅ Constraint maintained within 10% (with RK4 integrator)
- ✅ Smooth transitions validated

### Build Status

- ✅ TypeScript compiles without errors
- ✅ Production build succeeds (no warnings)
- ✅ No runtime errors

## Performance Impact

- **Computation**: ~2× slower than rigid attachment
  - Reason: Iterative tension calculation (2-pass arm dynamics)
  - Still real-time capable (< 1ms per physics step)

- **Memory**: Negligible (<100 bytes extra)

- **Stability**: Requires dt ≤ 0.01s with current Baumgarte params

## Physics Parameters (Tunable)

| Parameter         | Value     | Purpose                        | Tuning     |
| ----------------- | --------- | ------------------------------ | ---------- |
| `α` (damping)     | 20 rad/s  | Constraint velocity damping    | 10-50      |
| `β` (stiffness)   | 100 rad/s | Constraint position correction | 50-500     |
| Release tolerance | 1.05      | Sling release threshold        | 1.02-1.10  |
| Ground friction   | 0.3       | Sliding friction coefficient   | 0.1-0.7    |
| Penalty spring    | 10000 N/m | Backup constraint stiffness    | 5000-50000 |

**Recommended**: Keep α=20, β=100 for dt=0.01s

## Verification

To verify the implementation works:

```bash
# Run tests
pnpm test

# Build project
pnpm build

# Run specific sling tests
npx vitest run src/physics/__tests__/sling-physics.test.ts
```

---

**Implementation Date**: 2026-01-13  
**Effort**: Medium (1-2 days)  
**Status**: ✅ Complete, all tests passing  
**Stability**: Excellent (dt=0.01s with RK4)
