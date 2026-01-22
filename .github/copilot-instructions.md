# Copilot / AI Agent Instructions for catapult-simulator

Purpose

- Short, actionable guidance to help an AI coding agent be productive immediately in this repo.
- Focus on architecture, important files, conventions, test workflows, and numeric stability rules that are unique to this project.

Big picture (two lines)

- The project is a high-fidelity 7-DOF trebuchet simulator: a pure TypeScript physics engine (src/physics) + a stateless Canvas 2D renderer (src/components/visualization2d). The physics engine (DAE + KKT solver) is the source of truth for geometry and events.

Key files & symbols (quick reference)

- src/physics/simulation.ts — CatapultSimulation (main orchestrator)
- src/physics/derivatives.ts — computeDerivatives (DAE + KKT assembly, Baumgarte stabilization)
- src/physics/rk4-integrator.ts — RK4Integrator (integration + substep constraint enforcement)
- src/physics/trebuchet.ts — getTrebuchetKinematics (single source of geometry)
- src/components/visualization2d/index.tsx and renderers/ — stateless canvas renderers and transformation hooks
- scripts/export_trajectory.ts → pnpm script `export-trajectory` (produces public/trajectory.json and simulation_log.csv)

Project-specific conventions (must follow)

- Single source of truth for geometry: never duplicate kinematic math — use getTrebuchetKinematics from src/physics/trebuchet.ts.
- No semicolons (Prettier config enforces this); run `pnpm check` before pushing.
- Stateless renderers: rendering functions must be pure and take only frame data + alpha. Do not store or compute physics state inside renderers.
- Numeric-first design: Do not suppress NaNs (no `as any`, no `@ts-ignore` to hide instability). Fail loud and write a minimal test reproducing the issue.
- No penalty-based constraint hacks: Constraint forces must come from the DAE/KKT solution in derivatives.ts.

Testing & common commands

- pnpm dev — start the app
- pnpm build — build (tsc + vite)
- pnpm test — run unit/physics tests (vitest)
- pnpm test:e2e — run Playwright e2e tests
- pnpm check — prettier + eslint fixes
- pnpm export-trajectory — run scripts/export_trajectory.ts to generate public/trajectory.json and public/simulation_log.csv (inspect output manually for anomalies)

  Note: CI now runs `pnpm export-trajectory` on master and uploads the generated artifacts. Do not commit these generated files to the repository. If they are currently tracked in your branch, remove them with:

  git rm --cached public/trajectory.json public/simulation_log.csv
  git commit -m "remove generated simulation artifacts from repo"

  Or run the helper script locally:

  bash scripts/remove_tracked_generated.sh

  Also ensure they're present in .gitignore (they have been added by CI).

When making changes (safe update checklist)

- If you change geometry/kinematics: update src/physics/trebuchet.ts and the related tests in src/physics/**tests**/3d-geometry.test.ts and visualization renderers (src/components/visualization2d/renderers/trebuchet.ts).
- If you change derivative/constraint code: update computeDerivatives and add/update tests in src/physics/**tests**/ (derivatives.test.ts, load-transition.test.ts, sling-bag-physics.test.ts, etc.). Include energy or constraint-violation checks where applicable.
- If you change integrator behavior: update RK4Integrator and rk4-integrator.test.ts.
- When adding numeric changes, add a reproducible failing test that demonstrates the issue and a test that shows the fix maintains energy/constraint invariants.
- Always run pnpm test and pnpm export-trajectory and inspect the CSV/log if you touch simulation code. Unit tests capture many regressions but logs can catch subtle regressions in release angle or tunneling.

Stylistic & review notes

- Keep math code readable and telegraphic — prefer small, clear functions over large abstractions in the physics files.
- Follow the "Anti-Patterns" documented in AGENTS.md: no hardcoded constants (use src/physics/constants.ts), no duplicate geometry math in renderers, do not hide numerical errors.
- Update AGENTS.md files in the relevant folder (root, src/physics, src/components/visualization2d) if you change major architecture or conventions.

PR checklist for AI changes

- Add/modify tests (unit +, if applicable, an integration script export check)
- Run pnpm check and pnpm test locally
- For physics changes: run pnpm export-trajectory and open public/simulation_log.csv to sanity check values (release angles, velocities)
- Add brief note in commit/PR describing the numerical verification steps taken (tests, export checks)

If you are unsure / need human guidance

- Failing numeric behavior should be reproduced as a targeted unit test and posted in PR description to request human inspection.
- For UI/renderer questions: reference src/components/visualization2d/AGENTS.md and ensure renderers stay stateless.

Questions or missing details?

- If any area above is unclear or you'd like more granular examples (test snippets, numerical checks, or common failure modes), ask and I'll expand the file with concrete examples or PR templates.
