# Catapult Simulator

A high-fidelity 19-DOF physics simulation of a medieval trebuchet, built with Vite and React.

## 🚀 Getting Started

1.  **Install dependencies:**

    ```bash
    pnpm install
    ```

2.  **Export simulation trajectory:**

    ```bash
    pnpm export-trajectory
    ```

3.  **Start development server:**
    ```bash
    pnpm dev
    ```

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- Visualization: Canvas 2D API
- Physics Engine: Custom 19-DOF Lagrangian mechanics solver
- State Management: @tanstack/store
- Testing: Vitest

## 📐 Physics Engineering

The simulator implements a high-fidelity Lagrangian DAE (Differential-Algebraic Equation) system:

- Integrator: RK4 (Runge-Kutta 4th order) with adaptive sub-stepping
- Constraint Solver: Baumgarte-stabilized penalty method
- Aerodynamics: Drag and Magnus effect models for spherical projectiles
- Degrees of Freedom: 19-DOF covering arm rotation, counterweight swing, and full 3D projectile motion (position + orientation)

## 🧪 Testing

Run the full verification suite:

```bash
pnpm test
```

Specific validation suites:

- `comprehensive-validation.test.ts`: Energy conservation, convergence, analytical solutions.
- `3d-geometry.test.ts`: Forward kinematics, collision avoidance, visual continuity.
