# PROJECT AGENT KNOWLEDGE BASE

**Stack:** Vite + React 19 + @tanstack/store
**Core Focus:** 17-DOF high-fidelity physics simulation of medieval trebuchets.

## 1. COMMANDS

### Development & Maintenance

- `pnpm dev` - Start development server on `http://localhost:5173` (default).
- `pnpm build` - Production build via Vite.
- `pnpm check` - **CRITICAL**: Runs Prettier and ESLint with auto-fix. Run this before finishing any task.
- `pnpm lint` - Static analysis check.
- `pnpm test` - Run all Vitest unit tests.
- `pnpm export-trajectory` - Export simulation data to `public/trajectory.json`.

### Testing

- `pnpm test` - Run all tests.
- `npx vitest run src/physics/__tests__/3d-geometry.test.ts` - Run a specific test file.

---

## 2. PROJECT STRUCTURE

```text
src/
├── components/          # React components
│   ├── TrebuchetVisualization2D.tsx # 2D Canvas visualization
│   ├── AnimationControls.tsx      # Playback controls
│   └── DebugOverlay.tsx           # Physics telemetry overlay
├── physics/             # 17-DOF Physics Engine (Pure TS)
│   ├── __tests__/       # Mathematical verification tests
│   ├── aerodynamics.ts  # Drag and Magnus effect models
│   ├── derivatives.ts   # ODE system derivatives
│   ├── simulation.ts    # Main simulation controller
│   └── types.ts         # High-precision type definitions
├── hooks/               # Custom React hooks
│   └── useTrajectory.ts # Trajectory data management
├── lib/                 # Utilities
│   └── utils.ts         # Tailwind merger (cn)
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
├── index.css            # Global styles (Tailwind)
└── styles.css           # Additional styles
```

---

## 3. CODE STYLE & CONVENTIONS

### General

- **No Semicolons**: Do not use semicolons at the end of statements.
- **Quotes**: Use single quotes `'` for strings.
- **Trailing Commas**: Always include trailing commas in multiline objects/arrays.
- **Path Aliases**: Always use `@/` to refer to `./src/`.

### Naming Conventions

- **Components**: PascalCase.
- **Files**: kebab-case.
- **Variables/Functions**: camelCase.
- **Constants**: UPPER_SNAKE_CASE.
- **Types/Interfaces**: PascalCase.

### TypeScript & Types

- Use `interface` for object shapes, `type` for unions/aliases.
- **Strict Typing**: Avoid `any` or `@ts-ignore`.
- **Numerical Precision**: Physics variables must use `number`. Use `Float64Array` for state vectors to ensure 64-bit precision during integration.

---

## 4. PHYSICS ENGINEERING STANDARDS

The simulator implements a high-fidelity Lagrangian DAE (Differential-Algebraic Equation) system.

- **Integrator**: Fixed-timestep RK4 with internal sub-stepping. Default $\Delta t = 0.005s$.
- **Constraint Solver**: Baumgarte-stabilized Penalty Method.
- **Coordinates**:
  - `theta`: Arm angle (radians). $0$ is horizontal-right, positive is CCW.
  - `cwAngle`: Counterweight angle relative to vertical-down.
  - `position`: Projectile world coordinates $[x, y, z]$.

---

## 5. REACT PATTERNS

- **State Management**: Use `@tanstack/store` for performance-sensitive simulation state.
- **React 19**: Use new patterns where appropriate.
- **Optimization**: Avoid unnecessary re-renders. Heavy physics logic should stay in the physics engine.

---

## 7. ANTI-PATTERNS

- **No Double Quotes**: Except where necessary.
- **No Component Bloat**: Keep components focused.
- **No Mocking without justification**: Always use real physics constants ($g = 9.81$).
