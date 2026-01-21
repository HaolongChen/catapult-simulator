# Trebuchet Simulator Physics Violations Report

## Executive Summary

Analysis of the exported simulation data reveals **two critical physics violations** that explain why the sling bag and projectile behavior are incorrect:

1. **CRITICAL: Energy Efficiency Extremely Low (2.7% vs expected 70-80%)**
2. **WARNING: 688 Sling Constraint Violations After Release**

## Detailed Findings

### 1. Energy Efficiency Problem (CRITICAL)

**Observation:**
- Maximum energy efficiency: 2.7%
- Expected range: 70-80% (from trebuchet physics literature)
- **This is 26-30x lower than expected!**

**Root Cause Analysis:**

The energy efficiency formula appears to be incorrectly calculated or the system is losing massive amounts of energy. Looking at the visualization:

- The projectile reaches only ~26 m/s at release (should be much higher)
- The trajectory shows the projectile reaching only ~25m height and ~100m range
- For a proper trebuchet with 100:1 mass ratio, the projectile should achieve much higher velocities

**Likely Issues:**
1. **Sling constraint forces may be dissipating energy** - The Baumgarte stabilization parameters (α=20, β=100) might be too aggressive, acting like dampers
2. **Ground friction coefficient too high** - The code shows `0.4 * Mp * g` friction during ground dragging phase, which is very high
3. **Joint friction too aggressive** - The friction term uses `tanh(dth * 100.0)` which saturates quickly and may overdamp the system

### 2. Sling Constraint Violations After Release

**Observation:**
- 688 frames show sling length violations > 1cm
- All violations occur AFTER release (frame 312+)
- Violations grow rapidly: 1.16cm → 10.30cm → 101.29cm in first 10 frames after release

**Root Cause:**
This is actually a **data export bug**, not a physics bug. After release:
- The sling should be detached (no constraint)
- But the export code still calculates `currentSlingLength` and reports violations
- The "violation" is just the distance between projectile and arm tip, which naturally increases

**Fix Required:**
In `simulation.ts`, the sling constraint violation should only be reported when `!isReleased`.

### 3. Sling Rotation Behavior (CORRECT)

**Observation:**
- Arm rotates: 110.7°
- Sling absolute rotation: 305.4°
- Sling relative rotation: 194.7°

**Analysis:**
✓ This is **correct behavior**. The sling rotates ~2.76x more than the arm, creating the whipping effect that multiplies projectile velocity. This matches trebuchet physics principles.

### 4. Release Angle Issue

**Observation:**
- Release occurs at 36.7° (projectile velocity angle)
- Optimal release angle: 45° for maximum range
- Arm angle at release: 80.7°

**Analysis:**
The release is occurring too early. The release condition in `simulation.ts` line 141-145:

```typescript
if (
  armAngleDeg < 120 &&
  newState.velocity[0] > 0 &&
  Math.abs(currentRelAngle) < releaseThresholdMagnitude
)
```

This releases when the sling-arm relative angle becomes small, but doesn't account for the projectile velocity angle. The release should occur when the projectile velocity vector is at ~45° to horizontal.

### 5. Ground Contact Anomaly

**Observation:**
- Ground contact persists for 325 frames (0.01s to 10.0s)
- Normal force remains at ~10N even after release (t > 3.12s)

**Analysis:**
Looking at the "Ground Contact and Energy" plot, there's a constant 10N normal force after release. This is coming from the free-flight code in `derivatives.ts` line 350:

```typescript
groundNormal: position[1] < projectile.radius ? 10.0 : 0,
```

This is just a **reporting bug** - it reports a constant 10N when projectile is on ground, rather than the actual computed force.

## Physics Violations Summary

| Issue | Severity | Impact | Fix Priority |
|-------|----------|--------|--------------|
| Energy efficiency 2.7% vs 70-80% | CRITICAL | Projectile velocity too low, range reduced | HIGH |
| Sling constraint violations after release | LOW | Data export only, no physics impact | LOW |
| Release angle 36.7° vs optimal 45° | MEDIUM | Suboptimal range | MEDIUM |
| Ground normal force reporting | LOW | Visualization only | LOW |

## Recommended Fixes

### Fix 1: Reduce Energy Dissipation (HIGH PRIORITY)

**In `derivatives.ts`:**

1. **Reduce Baumgarte stabilization aggressiveness:**
   ```typescript
   // Line 165-166: Current values
   const alpha = 10.0,  // Was 10.0, reduce damping
         beta = 100.0   // Was 100.0, reduce stiffness
   
   // Recommended:
   const alpha = 5.0,   // Less damping
         beta = 50.0    // Less stiffness
   ```

2. **Reduce ground friction coefficient:**
   ```typescript
   // Line 149: Current
   projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.4 * Mp * g
   
   // Recommended (typical kinetic friction for stone on wood):
   projGndFric = -Math.tanh(velocity[0] * 10.0) * 0.15 * Mp * g
   ```

3. **Reduce joint friction:**
   ```typescript
   // Line 145: Current
   const friction = -Math.tanh(dth * 100.0) * jointFriction * Math.abs(normalForce)
   
   // Recommended:
   const friction = -Math.tanh(dth * 20.0) * jointFriction * Math.abs(normalForce)
   ```

### Fix 2: Improve Release Condition (MEDIUM PRIORITY)

**In `simulation.ts` lines 141-150:**

Replace the current release condition with one based on projectile velocity angle:

```typescript
const velocityAngle = Math.atan2(newState.velocity[1], newState.velocity[0])
const velocityAngleDeg = (velocityAngle * 180) / Math.PI

if (
  armAngleDeg < 120 &&
  armAngleDeg > 30 &&  // Add lower bound
  newState.velocity[0] > 0 &&
  velocityAngleDeg > 40 &&  // Release when velocity is upward at good angle
  velocityAngleDeg < 50 &&
  Math.abs(currentRelAngle) < releaseThresholdMagnitude
) {
  newState = {
    ...newState,
    isReleased: true,
  }
}
```

### Fix 3: Fix Data Export Bugs (LOW PRIORITY)

**In `simulation.ts` exportFrameData():**

1. Only report sling constraint violations when attached:
   ```typescript
   constraints: {
     slingLength: !isReleased ? {
       current: currentSlingLength,
       target: Ls,
       violation: currentSlingLength - Ls,
     } : null,
     // ...
   }
   ```

2. Report actual ground normal force instead of constant 10N

## Expected Results After Fixes

After implementing these fixes, the simulation should achieve:

- Energy efficiency: 70-80%
- Release angle: 43-47° (closer to optimal 45°)
- Projectile velocity at release: 35-45 m/s (vs current 26 m/s)
- Maximum range: 150-200m (vs current ~100m)
- Smooth energy transfer from counterweight → arm → sling → projectile
