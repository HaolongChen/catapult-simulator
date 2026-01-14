# PROJECT AGENT KNOWLEDGE BASE

**Stack:** TanStack Start (React 19 + SSR) + React Three Fiber + @tanstack/store
**Core Focus:** 17-DOF high-fidelity physics simulation of medieval trebuchets.

## 1. COMMANDS

### Development & Maintenance

- `npm run dev` - Start development server on `http://localhost:3000`.
- `npm run build` - Production build via Vite and Nitro.
- `npm run check` - **CRITICAL**: Runs Prettier and ESLint with auto-fix. Run this before finishing any task.
- `npm run lint` - Static analysis check.
- `pnpm dlx shadcn@latest add [component]` - Add new Shadcn components.

### Testing

- `npm run test` - Run all Vitest unit tests.
- `npx vitest run path/to/file.test.ts` - Run a specific test file.
- `npx vitest -t "test name pattern"` - Run tests matching a specific name.
- `npx playwright test` - Run all E2E integration tests.
- `npx playwright test e2e/simulation.spec.ts` - Run a specific E2E test.

---

## 2. PROJECT STRUCTURE

```text
src/
├── components/          # React components
│   ├── ui/              # Shadcn components
│   └── visualization/   # 3D R3F components (Scene, Models, Controls)
├── physics/             # 17-DOF Physics Engine (Pure TS)
│   ├── __tests__/       # Mathematical verification tests
│   ├── aerodynamics.ts  # Drag and Magnus effect models
│   ├── derivatives.ts   # ODE system derivatives
│   ├── simulation.ts    # Main simulation controller
│   └── types.ts         # High-precision type definitions
├── routes/              # TanStack Router file-based routing
│   ├── __root.tsx       # Root layout & Devtools
│   └── index.tsx        # Primary simulator entry point
├── lib/                 # State & Utilities
│   ├── simulation-store.ts # Global @tanstack/store
│   └── utils.ts         # Tailwind merger (cn)
└── styles.css           # Tailwind + Global CSS
```

---

## 3. CODE STYLE & CONVENTIONS

### General

- **No Semicolons**: Do not use semicolons at the end of statements.
- **Quotes**: Use single quotes `'` for strings.
- **Trailing Commas**: Always include trailing commas in multiline objects/arrays.
- **Path Aliases**: Always use `@/` to refer to `./src/`.

### Imports

- Group imports: React first, then external libraries, then internal modules.
- Use `import type` for type-only imports to aid tree-shaking.

### Naming Conventions

- **Components**: PascalCase (e.g., `TrebuchetModel`).
- **Files**: kebab-case (e.g., `rk4-integrator.ts`), except for Route files which follow TanStack conventions.
- **Variables/Functions**: camelCase.
- **Constants**: UPPER_SNAKE_CASE.
- **Types/Interfaces**: PascalCase.

### TypeScript & Types

- Use `interface` for object shapes, `type` for unions/aliases.
- **Strict Typing**: Avoid `any` or `@ts-ignore`.
- **Numerical Precision**: Physics variables must use `number`. Use `Float64Array` for state vectors to ensure 64-bit precision during integration.

### Error Handling

- Use error boundaries for 3D components (`Scene.tsx`).
- In physics code, check for `NaN` or `Infinity` during integration steps.
- Prefer descriptive error messages in `throw new Error()` over generic strings.

---

## 4. PHYSICS ENGINEERING STANDARDS

The simulator implements a high-fidelity Lagrangian DAE (Differential-Algebraic Equation) system.

- **Integrator**: Fixed-timestep RK4 with internal sub-stepping. Default $\Delta t = 0.005s$.
- **Constraint Solver**: Baumgarte-stabilized Penalty Method.
- **Coordinates**:
  - `theta`: Arm angle (radians). $0$ is horizontal-right, positive is CCW.
  - `cwAngle`: Counterweight angle relative to vertical-down.
  - `position`: Projectile world coordinates $[x, y, z]$.
- **Constraint Enforcement**:
  - Sling length error must be monitored. Targets should be $< 0.01m$ deviation.
  - Ground penetration must be handled via penalty forces or unilateral constraints.

---

## 5. REACT & TANSTACK PATTERNS

- **State Management**: Use `@tanstack/store` for performance-sensitive simulation state. Avoid `useState` for frequently changing physics variables.
- **Server Functions**: Use `createServerFn` for any heavy calculation or data fetching that should happen server-side.
- **Route Definitions**: Use `createFileRoute('/')` for route components.
- **React 19**: Use new patterns like `use` hook and improved `ref` handling where appropriate.
- **Optimization**: The React Compiler is enabled. Avoid manual `useMemo` or `useCallback` unless specifically solving a profiling-identified bottleneck.

---

## 6. VISUALIZATION (R3F)

- All 3D models belong in `src/components/visualization/`.
- Use `useFrame` only in components that need to react per-frame (e.g., `SimulationLoop`).
- Keep heavy calculation out of the render loop; move it to the `simulationStore` update logic.
- **Shadcn UI**: Use for all floating panels and control overlays. Positioning should be `absolute` or `fixed` to stay on top of the 3D `<Canvas>`.

---

## 7. ANTI-PATTERNS

- **No Double Quotes**: Except where necessary for JSON or JSX strings containing single quotes.
- **No Component Bloat**: Do not put complex logic in route files; delegate to components or lib/physics.
- **No Mocking without justification**: Always use real physics constants ($g = 9.81$) unless building a specific unit test for scaled environments.
