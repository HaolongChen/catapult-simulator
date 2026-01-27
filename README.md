# Catapult Simulator

A high-fidelity 19-DOF physics simulation of a medieval trebuchet, built with Vite and React.

## ✨ Features

- **Real-Time Physics Configuration** - Adjust 17 physics parameters with instant visual feedback
- **Interactive Control Panel** - Powered by Leva for intuitive parameter tuning
- **Automatic Trajectory Export** - Download simulation data as JSON
- **High-Fidelity Physics** - 19-DOF Lagrangian mechanics with aerodynamics
- **Smooth Visualization** - Canvas 2D rendering with particle effects

## 🚀 Getting Started

1.  **Install dependencies:**

    ```bash
    pnpm install
    ```

2.  **Start development server:**

    ```bash
    pnpm dev
    ```

3.  **Open browser and experiment!**
    - Navigate to `http://localhost:5173/`
    - Use the Leva panel (top-right) to adjust physics parameters
    - Watch the trajectory update automatically in real-time
    - Use toggle buttons (right side) to show/hide visualization elements

### Build & Deployment

```bash
# Production build (excludes large trajectory files)
pnpm build

# Build with pre-generated trajectory (for local testing)
pnpm build:with-trajectory
```

**Note:** The production build automatically excludes `trajectory.json` and `simulation_log.csv` from the output to stay under deployment size limits. The app generates trajectories in real-time in the browser, so pre-generated files are not needed for production.

## 🎮 Interactive Controls

### Configurable Parameters

**Trebuchet:**

- Counterweight Mass (1000-30000 kg)
- Long Arm Length (2-10 m)
- Short Arm Length (0.3-3 m)
- Sling Length (0.1-10 m)
- Release Angle (30-150°)
- And more...

**Projectile:**

- Mass (10-500 kg)
- Radius (0.05-0.5 m)
- Drag & Magnus Coefficients
- Spin Rate

**Physics:**

- Joint Friction (0-1)
- Angular Damping (0-20)

See [QUICK_START.md](QUICK_START.md) for detailed usage guide.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Leva
- **Visualization:** Canvas 2D API
- **Physics Engine:** Custom 19-DOF Lagrangian mechanics solver
- **State Management:** @tanstack/store
- **Testing:** Vitest (107 tests passing)

## 📐 Physics Engineering

The simulator implements a high-fidelity Lagrangian DAE (Differential-Algebraic Equation) system:

- **Integrator:** RK4 (Runge-Kutta 4th order) with adaptive sub-stepping
- **Constraint Solver:** Baumgarte-stabilized penalty method
- **Aerodynamics:** Drag and Magnus effect models for spherical projectiles
- **Degrees of Freedom:** 19-DOF covering arm rotation, counterweight swing, and full 3D projectile motion (position + orientation)
- **Real-Time Simulation:** Generates 2000+ frames in ~1 second

## 🧪 Testing

Run the full verification suite:

```bash
pnpm test
```

Specific validation suites:

- `comprehensive-validation.test.ts`: Energy conservation, convergence, analytical solutions.
- `3d-geometry.test.ts`: Forward kinematics, collision avoidance, visual continuity.
- `useRealTimeSimulation.test.ts`: Real-time trajectory generation and config changes.

## 📚 Documentation

- [Quick Start Guide](QUICK_START.md) - User-friendly tutorial
- [Implementation Details](IMPLEMENTATION_SUMMARY.md) - Technical overview
- [Verification Checklist](LEVA_IMPLEMENTATION.md) - Testing and validation

## 🎯 Use Cases

- Physics education and demonstration
- Medieval siege weapon analysis
- Trajectory optimization experiments
- Machine learning training data generation
- Scientific visualization
