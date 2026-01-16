# Sling Physics Implementation

## Overview

This document describes the realistic sling physics implementation for the trebuchet simulator. The implementation uses **Lagrangian DAE (Differential-Algebraic Equation) dynamics** to model the sling as a flexible rope that can only pull, not push.

## Physical Model

### Constraint Equation

The sling constraint is:

```
C(t) = ||r_projectile - r_armtip|| - L_sling = 0
```

When taut, the distance between the projectile and arm tip must equal the sling length.

### Lagrangian DAE Solver

The sling tension is computed as a **Lagrange multiplier (λ1)** in a coupled matrix system:

1.  **LU Decomposition**: The coupled dynamics of the arm, counterweight, and projectile are solved using a high-performance LU decomposition with partial pivoting for numerical stability.
2.  **Baumgarte Stabilization**: Target `C̈ + 2α*Ċ + β²*C = 0` is enforced to prevent numerical drift without non-physical projection hacks.
3.  **Slack Detection**: If the calculated tension `λ1` is negative (pushing force), the constraint is deactivated for that timestep, allowing the sling to go slack.

**Parameters**:

- `α = 20 rad/s` (damping frequency)
- `β = 100 rad/s` (stiffness frequency)

## Three Phases

### Phase 1: Ground Dragging

**Conditions**:

- `y_projectile ≈ 0` and vertical tension is insufficient to lift the mass.

**Dynamics**:

- Projectile constrained to the ground plane (`y = 0`) using a second Lagrange multiplier (`λ2`).
- Slides with kinetic friction if the sling is pulling it.

### Phase 2: Swinging

**Conditions**:

- Projectile airborne, sling taut.

**Dynamics**:

- Coupled 17-DOF arm-projectile system.
- Proper energy transfer from the swinging counterweight to the projectile through the arm-sling linkage.

### Phase 3: Released (Free Flight)

**Conditions**:

- Sling tension drops below release threshold (0.1×Mp×g) while arm is in the upward quadrant.

**Dynamics**:

- Full 6-DOF ballistic motion (position + orientation).
- Only gravity and aerodynamics (Quadratic Drag + Magnus Effect).

## Numerical Stability Features

### 1. Adaptive RK4 Integrator

- RK4 (4th-order) precision for all state variables.
- Adaptive sub-stepping with Richardson Extrapolation ensures 4th-order convergence (Ratio verified at 16.10).

### 2. High-Precision Linear Algebra

- Custom LU decomposition with partial pivoting handles the KKT system of the Lagrangian equations, supporting extreme mass ratios up to $10^{11}:1$.

### 3. Quaternion Normalization

- Explicit unit-length normalization of the projectile orientation quaternion prevents rotational drift over time.

## Code Structure

- `derivatives.ts`: Core Lagrangian derivation and LU solver implementation.
- `rk4-integrator.ts`: 4th-order numerical integration with adaptive error control.
- `simulation.ts`: Orchestrates the simulation phases and 3D geometry export.
