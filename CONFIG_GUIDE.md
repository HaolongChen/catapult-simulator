# Configuration Guide

## Issue: Simulation Can't Reach 20 Seconds

### Problem Description

When modifying config parameters in `src/physics/config.ts`, the simulation may enter **degraded mode** due to numerical instability and fail to complete the full 20-second trajectory export.

### Symptoms

- Export completes but generates fewer than 2001 frames
- Simulation time stops advancing around 2-5 seconds
- Warning message: "Simulation got stuck at t=X.XXs"

### Root Cause

The physics engine uses an **explicit RK4 integrator** with a **19-DOF redundant coordinate system**. This combination is sensitive to extreme parameter values that create:

- **Stiff systems** (equations with widely varying time scales)
- **Numerical singularities** (when constraint Jacobians become ill-conditioned)
- **Error accumulation** over long simulation times (20s = 2000 timesteps)

### Safe Parameter Ranges

Based on testing, these ranges are known to work reliably:

| Parameter           | Safe Range     | Default | Notes                                  |
| ------------------- | -------------- | ------- | -------------------------------------- |
| `counterweightMass` | 1000 - 8000 kg | 4000 kg | Values > 8000 kg may cause instability |
| `slingLength`       | 1.0 - 7.0 m    | 3.5 m   | Values > 7 m increase stiffness        |
| `longArmLength`     | 2.0 - 10.0 m   | 4.4 m   | Affects moment arm leverage            |
| `shortArmLength`    | 0.3 - 2.0 m    | 0.8 m   | Should be < longArmLength              |
| `projectileMass`    | 0.5 - 10.0 kg  | 2.0 kg  | Very high values stress constraints    |
| `releaseAngle`      | 90° - 150°     | 120°    | Angle in radians: (degrees \* π / 180) |

### How to Modify Config Safely

1. **Edit `src/physics/config.ts`**
2. **Start with small changes** (±20% from defaults)
3. **Test with export**: `pnpm export-trajectory`
4. **Check for warnings** in output
5. **Verify full 20s**: Should generate 2001 frames

### Example: Safe Modification

```typescript
// src/physics/config.ts
export function createConfig(): SimulationConfig {
  return {
    // ... other config ...
    trebuchet: {
      longArmLength: 5.0, // +13% from default
      shortArmLength: 0.8, // unchanged
      counterweightMass: 5000, // +25% from default
      slingLength: 4.0, // +14% from default
      // ... rest unchanged ...
    },
  }
}
```

### Example: Unsafe Modification (Will Fail)

```typescript
trebuchet: {
  counterweightMass: 15000,  // ✗ TOO HIGH - will enter degraded mode
  slingLength: 10,           // ✗ TOO LONG - creates stiff system
}
```

### What Happens with Unsafe Configs

The export script now detects stuck simulations and provides helpful warnings:

```
⚠️  WARNING: Simulation got stuck at t=2.41s (frame 251)
The simulation entered degraded mode due to numerical instability.
This often happens with extreme config parameters:

  - Very high counterweightMass (> 8000 kg)
  - Very long slingLength (> 7 m)
  - Very high projectile mass or very low friction

Try reducing these values in src/physics/config.ts
Stopping export early. Generated 253 frames.
```

### Troubleshooting

**Q: My config changes don't appear in the app**

- A: You must run `pnpm export-trajectory` to regenerate `public/trajectory.json`
- The React app loads a pre-generated trajectory, not live simulation

**Q: Can I make the simulation more stable?**

- A: Yes, but requires code changes:
  1. Increase `maxSubsteps` in config (trades speed for stability)
  2. Reduce `initialTimestep` (smaller steps = more accurate)
  3. Consider implementing implicit integrators (BDF methods)

**Q: Why does 20 seconds matter?**

- A: The UI duration is set to 2000 frames at 0.01s/frame = 20 seconds
- This is defined in `src/physics/constants.ts` as `UI_CONSTANTS.CONTROLS.DURATION`

**Q: Can I change the simulation duration?**

- A: Yes, edit `DURATION` in `src/physics/constants.ts`
- Note: Longer durations increase risk of numerical issues
- Shorter durations (5-10s) are more stable

### Technical Details

#### What is "Degraded Mode"?

The RK4 integrator includes a safety mechanism that detects NaN (Not a Number) values during integration. When NaN is detected:

1. Integration stops advancing time
2. State freezes at last valid value
3. `degraded` flag is set to `true`
4. Prevents NaN from propagating through the simulation

This is **intentional** - it's better to freeze than corrupt the entire trajectory with invalid values.

#### Why RK4 Struggles with Long Simulations

- **Explicit methods** accumulate floating-point error linearly with time
- **High-index DAE systems** (like our 19-DOF redundant coordinates) are harder to integrate than simple ODEs
- **Stiff systems** require very small timesteps to remain stable
- **Constraint drift** accumulates despite Baumgarte stabilization

#### Future Improvements

- Implement adaptive timestep based on error estimation (Richardson extrapolation)
- Add DAE index reduction techniques
- Consider implicit integrators (BDF, RADAU) for better long-term stability
- Add constraint violation telemetry to predict instability

### Need Help?

If you're trying to simulate a specific trebuchet design and can't find stable parameters, open an issue with:

- Your target config values
- Physical rationale (e.g., "Medieval trebuchet with 2-ton counterweight")
- How far the simulation gets before failing
