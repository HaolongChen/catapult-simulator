# Numerical Safeguards Reference

This document lists **all numerical guards** implemented to prevent degraded mode.

## Summary

**4-Layer Defense System:**

1. **Config Validation** - Safe default values
2. **Input Clamping** - Limit velocities entering computations
3. **Division Guards** - Prevent NaN from zero divisions
4. **Output Clamping** - Cap computed accelerations

## Layer 1: Config Validation (config.ts)

### Safe Ranges

```typescript
counterweightMass: 4000 kg     // Safe: 2000-8000 kg
projectileMass: 2.0 kg         // Safe: 0.5-10 kg
armMass: 200.0 kg              // Safe: 100-500 kg
slingLength: 3.5 m             // Safe: 2.0-7.0 m
```

### RK4 Timestep Validation (rk4-integrator.ts:29-37)

```typescript
if (initialTimestep <= 0 || !isFinite(initialTimestep)) {
  console.warn(`Invalid initialTimestep, clamping to 1e-6`)
  initialTimestep = Math.max(initialTimestep, 1e-6)
}
```

## Layer 2: Input Clamping (derivatives.ts:85-111)

### Velocity Limits

```typescript
MAX_ANGULAR_VEL = 10000 rad/s   // ~95,500 RPM
MAX_LINEAR_VEL = 1000 m/s       // ~Mach 3
```

### What's Clamped

- `armAngularVelocity` (dth)
- `cwAngularVelocity` (dphi_cw)
- `projectile.velocity` (3D vector)
- `cwVelocity` (2D vector)
- `slingVelocities` (all N particles × 2)

### Detection

When clamping occurs, warns:

```
[NUMERICAL GUARD] Arm angular velocity clamped: {value} → {limit} rad/s
```

## Layer 3: Division Guards (derivatives.ts)

### All Guarded Divisions

| Line    | Expression                         | Guard                      | Purpose                  |
| ------- | ---------------------------------- | -------------------------- | ------------------------ |
| 165     | `Ma / (L1 + L2)`                   | `Math.max(L1 + L2, 1e-12)` | Arm moment of inertia    |
| 189     | `t_s / rs2`                        | `rs2 = Math.max(...)`      | Sling tension torque     |
| 222-223 | `1 / ra2_b`, `1 / rb2_b`           | `Math.max(..., 1e-4)`      | Rope bending torque      |
| 232-233 | `omegaA / ra2_b`, `omegaB / rb2_b` | `Math.max(..., 1e-4)`      | Angular velocities       |
| 239-247 | Various `/ ra2_b`, `/ rb2_b`       | `Math.max(..., 1e-4)`      | Torque distribution      |
| 294-308 | `dx / Lseg`, `dy / Lseg`           | Lseg is const              | Constraint Jacobian      |
| 361     | `1 / sqrt(S[i][i])`                | `Math.max(S[i][i], 1e-18)` | Schur complement scaling |
| 472     | `1 / I_p`                          | `Math.max(I_p, 1e-12)`     | Projectile angular accel |
| 41      | `U[k][i] / U[i][i]`                | Line 39 clamps pivot       | LU decomposition         |
| 56      | `y[i] / U[i][i]`                   | Line 39 clamps pivot       | LU back-substitution     |

### LU Solver Pivot Protection (derivatives.ts:39)

```typescript
const pV = U[i][i]
if (Math.abs(pV) < 1e-18) {
  U[i][i] = pV < 0 ? -1e-18 : 1e-18
}
```

## Layer 4: Output Clamping (derivatives.ts:499-527)

### Acceleration Limits

```typescript
MAX_LINEAR_ACCEL = 10000 m/s²   // ~1000g
MAX_ANGULAR_ACCEL = 50000 rad/s²
```

### What's Clamped

- `q_ddot[0]` - Arm angular acceleration
- `slingVDeriv[2*i]`, `slingVDeriv[2*i+1]` - All N sling particles
- `q_ddot[idxProj]`, `q_ddot[idxProj+1]` - Projectile X,Y acceleration
- `q_ddot[idxCW]`, `q_ddot[idxCW+1]` - Counterweight X,Y acceleration
- `q_ddot[idxPhi]` - Counterweight angular acceleration

### Detection

When clamping occurs, warns:

```
[NUMERICAL GUARD] Arm angular acceleration clamped: {value} → {limit} rad/s²
```

## RK4 Integrator Guards (rk4-integrator.ts)

### Interpolation Alpha Guard (Lines 78, 358)

```typescript
interpolationAlpha = accumulator / Math.max(initialTimestep, 1e-12)
```

Prevents `Infinity` if timestep becomes zero.

### Degraded Mode Recovery (Lines 53-68)

```typescript
if (!isFiniteState(res.newState)) {
  // Try 10 sub-steps with dt × 0.1
  if (sub-stepping succeeds) {
    use sub-stepped state
  } else {
    degraded = true  // Last resort
    freeze simulation
  }
}
```

## Physical Justification

### Why These Limits Work

**Velocity Limits:**

- Real trebuchet arm: 0.5-5 rad/s
- Our limit: 10,000 rad/s (2000x realistic)
- Real projectile: 50-100 m/s
- Our limit: 1000 m/s (10x realistic)

**Acceleration Limits:**

- Real arm accel: 10-100 rad/s²
- Our limit: 50,000 rad/s² (500x realistic)
- Real projectile: 100-1000 m/s²
- Our limit: 10,000 m/s² (10x realistic)

**Conclusion:** Limits are generous enough to never affect realistic simulations, but prevent numerical overflow in extreme cases.

## Testing Coverage

### Unit Tests (105 total)

- Energy conservation: ±1e-8 over full cycle
- NaN reproduction: Extreme configs (10,000kg counterweight)
- Soak test: 10,000+ steps, no drift
- Fuzzer: 100 random configurations

### Extreme Config Tests

- ✅ 8000 kg counterweight
- ✅ 6.0 m sling length
- ✅ 6000 kg + 5.0 m combined
- ✅ 10 kg projectile

## Verification Commands

```bash
# Run all tests
pnpm test

# Test extreme configs
npx tsx test_extreme_config.ts

# Check for degraded mode with specific config
npx tsx reproduce_degraded.ts

# Test logging (should show warnings if clamping occurs)
npx tsx test_logging.ts
```

## When Guards Activate

### Normal Operation (Safe Config)

- No clamping occurs
- No warnings logged
- Simulation runs at full accuracy

### Extreme Config (e.g., 15000kg counterweight)

- Velocity clamping activates: Prevents explosion
- Acceleration clamping activates: Caps integration rates
- Warnings logged: User sees what's being limited
- **No degraded mode**: Simulation continues safely

### Truly Pathological Config (e.g., 1e10 kg)

- All clamps saturate immediately
- Multiple warnings per frame
- Simulation becomes physically unrealistic but numerically stable
- **Still no degraded mode**: Never crashes

## Summary Table

| Guard Type            | Location                   | Trigger Condition  | Effect          |
| --------------------- | -------------------------- | ------------------ | --------------- |
| Timestep validation   | rk4-integrator.ts:33       | dt ≤ 0             | Clamp to 1e-6   |
| Velocity clamping     | derivatives.ts:87-111      | \|v\| > 1000 m/s   | Cap at ±1000    |
| Acceleration clamping | derivatives.ts:499-527     | \|a\| > 10000 m/s² | Cap at ±10000   |
| Division guards       | derivatives.ts:165,472,etc | denominator → 0    | Add 1e-12       |
| LU pivot protection   | derivatives.ts:39          | \|pivot\| < 1e-18  | Clamp to ±1e-18 |
| Interpolation guard   | rk4-integrator.ts:78       | dt → 0             | Add 1e-12       |
| Degraded recovery     | rk4-integrator.ts:53-68    | State → NaN        | Sub-stepping    |

## Maintenance Notes

### Adding New Computations

When adding new physics code:

1. **Check for divisions**: Any `a / b` must guard `b` with `Math.max(b, 1e-12)`
2. **Check for sqrt**: Any `Math.sqrt(x)` must ensure `x ≥ 0`
3. **Check for velocities**: If storing velocity, consider if it needs clamping
4. **Check for accelerations**: If computing acceleration, clamp before returning
5. **Add tests**: Create repro test for any new extreme parameter

### When Limits Need Adjustment

If you see legitimate warnings (not due to extreme config):

1. Check if the physical model is correct
2. Consider if the limit is too conservative
3. Run full test suite after any limit changes
4. Document the reason for the new limit

**DO NOT** remove guards to "fix" warnings. Fix the underlying physics instead.
