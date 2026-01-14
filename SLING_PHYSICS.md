# Sling Physics Implementation

## Overview

This document describes the realistic sling physics implementation for the trebuchet simulator. The previous implementation treated the projectile as rigidly attached to the arm tip, which is physically incorrect. The new implementation uses **constraint-based dynamics** to model the sling as a flexible rope that can only pull, not push.

## Physical Model

### Constraint Equation

The sling constraint is:

```
C(t) = ||r_projectile - r_armtip|| - L_sling = 0
```

When taut, the distance between the projectile and arm tip must equal the sling length.

### Tension Calculation

The sling tension is computed using the **Lagrange multiplier method** with **Baumgarte stabilization**:

1. **Constraint violation**: `C = dist - L_sling`
2. **Constraint velocity**: `Ċ = (r_rel · v_rel) / dist`
3. **Constraint acceleration**: `C̈ = (v_rel · v_rel) / dist + (r_rel · a_rel) / dist`
4. **Baumgarte stabilization**: Target `C̈ + 2α*Ċ + β²*C = 0`
5. **Tension**: `T = -m * (C̈_target - C̈_unconstrained)`

**Parameters**:

- `α = 20 rad/s` (damping frequency, critical damping)
- `β = 100 rad/s` (stiffness frequency, should be >> α)

### Force Application

**On Projectile**:

```
F_sling = -T * (r_rel / dist)  // Points toward arm tip
a_projectile += F_sling / m_projectile
```

**On Arm (torque)**:

```
τ_sling = r_armtip × F_reaction
where F_reaction = T * (r_rel / dist)  // Reaction force on arm tip
```

## Three Phases

### Phase 1: Ground Dragging

**Conditions**:

- `y_projectile ≤ 0.001` and `vy_projectile ≤ 0`

**Dynamics**:

- Projectile constrained to ground (`y = 0`, `vy = 0`)
- If sling taut: projectile follows arm tip in x-direction
- If sling slack: projectile slides with kinetic friction (`μ = 0.3`)
- Arm rotates freely (no projectile inertia contribution)

**Transition to Swinging**:

- Occurs when vertical component of sling tension overcomes gravity
- Automatic through constraint solver (projectile lifts off when tension vertical component > mg)

### Phase 2: Swinging

**Conditions**:

- `y_projectile > 0.001` and `dist ≤ L_sling * 1.05` and `slingAngle ≤ releaseAngle`

**Dynamics**:

- Coupled arm-projectile system
- Sling tension computed from constraint dynamics
- Tension affects both arm rotation (as torque) and projectile motion (as force)
- Includes gravity, aerodynamics, spring/damping/friction on arm

**Key Features**:

- Realistic energy transfer from counterweight to projectile
- Proper centripetal acceleration from sling tension
- Smooth constraint enforcement via Baumgarte stabilization

### Phase 3: Released (Free Flight)

**Conditions**:

- `dist > L_sling * 1.05` or `slingAngle > releaseAngle`

**Dynamics**:

- No sling forces
- Only gravity and aerodynamics (drag + Magnus effect)
- Standard ballistic trajectory

## Numerical Stability Features

### 1. Baumgarte Stabilization

- Prevents constraint drift from numerical integration errors
- Adds corrective forces proportional to position and velocity error
- Parameters tuned for stability with RK4 integrator (dt = 0.01s)

### 2. Penalty Forces

- Backup constraint enforcement if Lagrange multiplier fails
- Stiff spring (`k = 10000 N/m`) pulls projectile back if overstretched
- Only active when constraint violated (safety mechanism)

### 3. Minimum Distance Threshold

- Prevents division by zero when projectile very close to arm tip
- `MIN_DIST = 0.001 m`

### 4. Maximum Tension Limit

- Caps tension at `100 * m_projectile * g` to prevent instability
- Physically reasonable for trebuchet mechanics

### 5. Slack Detection

- Sling only pulls, never pushes
- Tension set to zero if `dist < L_sling - 0.001`
- Smooth transition between slack and taut states

## Code Structure

### Main Functions

1. **`computeGeometry()`**
   - Computes arm tip position from arm angle
   - Calculates projectile-to-tip vector and distance
   - Returns sling angle

2. **`computeSlingTension()`**
   - Implements constraint dynamics with Baumgarte stabilization
   - Returns tension magnitude and taut/slack state
   - Includes numerical stability safeguards

3. **`computePenaltyForce()`**
   - Backup spring force for constraint violations
   - Stiff spring restoring force

4. **`detectPhase()`**
   - Determines current simulation phase
   - Handles transitions between ground/swinging/released

5. **`computeSwingingPhase()`**
   - Main coupled dynamics solver
   - Iterative: computes arm accel → sling tension → final arm accel
   - Applies tension to both arm and projectile

6. **`computeGroundPhase()`**
   - Ground-constrained dynamics
   - Handles both taut sling (following arm) and slack sling (sliding)

## Validation

### Expected Behavior

1. **Initial swing**: Projectile drags on ground, following arm tip
2. **Liftoff**: When sling tension vertical component > mg, projectile lifts
3. **Acceleration**: Projectile accelerates due to sling tension (centripetal + tangential)
4. **Release**: When angle exceeds release angle or sling overstretched
5. **Trajectory**: Parabolic path with aerodynamic effects

### Test Cases

- **Energy conservation** (within 5% due to friction/damping)
- **Constraint satisfaction** (distance ≈ sling length ± 0.1%)
- **Smooth phase transitions** (no discontinuities in velocity)
- **Numerical stability** (no oscillations, no NaN values)

## Tuning Parameters

### Baumgarte Parameters

- **Too small** (`α < 10`, `β < 50`): Constraint drift, sling stretches unrealistically
- **Too large** (`α > 50`, `β > 500`): High-frequency oscillations, requires tiny timestep
- **Recommended**: `α = 20`, `β = 100` (for `dt = 0.01s`)

### Release Tolerance

- **Current**: `1.05 * L_sling` (5% overshoot allowed)
- **Tighter** (`1.02`): Earlier release, more sensitive to numerical errors
- **Looser** (`1.10`): More forgiving, but less realistic

### Ground Friction

- **Current**: `μ = 0.3` (concrete-like)
- **Lower** (`0.1-0.2`): Slippery surface, faster initial acceleration
- **Higher** (`0.5-0.7`): Rough surface, slower dragging phase

## Performance

- **Computation cost**: ~2× slower than rigid attachment (due to iterative tension solve)
- **Timestep**: Stable with `dt = 0.01s` (RK4)
- **Memory**: Negligible increase (few extra floats)

## Future Enhancements

1. **Sling elasticity**: Model as slightly stretchy (Young's modulus)
2. **Sling mass**: Include distributed mass of rope
3. **Sling aerodynamics**: Drag on the sling itself
4. **3D sling motion**: Allow out-of-plane swinging
5. **Sling release mechanism**: Model actual pin/hook release physics

## References

- Baumgarte, J. (1972). "Stabilization of constraints and integrals of motion in dynamical systems". _Computer Methods in Applied Mechanics and Engineering_.
- Baraff, D. (1996). "Physically Based Modeling: Rigid Body Simulation". SIGGRAPH Course Notes.
- Witkin, A. & Baraff, D. (2001). "Physically Based Modeling: Constrained Dynamics". SIGGRAPH Course Notes.
