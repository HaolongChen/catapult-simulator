# AGENTS.md for `src/components/visualization2d`

## OVERVIEW

Canvas-based modular 2D renderer for trebuchet simulation, enforcing stateless drawing and strict separation between geometry and visualization logic.

## STRUCTURE

```text
src/components/visualization2d/
├── index.tsx                   # Main component (composes all renderers)
├── hooks/
│   ├── useCanvasTransform.ts   # World <-> canvas coordinate conversions
│   ├── useCanvasInteraction.ts # Zoom/pan interaction handlers
│   └── useParticleSystem.ts    # Visual effects (impacts, alpha-fade)
└── renderers/
    ├── grid.ts                 # Metric grid and axes
    ├── trebuchet.ts            # Arm and counterweight display
    ├── projectile.ts           # Projectile + velocity/force vectors
    └── telemetry.ts            # Trajectory trail, indicators
```

## WHERE TO LOOK

| Task             | Location                      | Notes                                                     |
| ---------------- | ----------------------------- | --------------------------------------------------------- |
| Main Composition | `index.tsx`                   | Order: grid → ground → trebuchet → projectile → overlays. |
| World Transforms | `hooks/useCanvasTransform.ts` | Source for `toCanvasX`/`toCanvasY`. Never bypass.         |
| Alpha Smoothing  | `index.tsx` / Renderers       | Interpolates between simulation steps for smooth 60fps.   |

## CONVENTIONS

- **Stateless Renderers**: `renderX` functions are referentially transparent—no internal state or side effects.
- **World-Driven Geometry**: All geometry (arm, sling, pivots) is sourced strictly from `src/physics/trebuchet.ts`.
- **Alpha Interpolation**: Smooth dynamic movement via `alpha` (0…1) between simulation states.
- **No Pixel Units**: All renderer logic is world-based (meters); pixel math happens only at render-call time.

## ANTI-PATTERNS

- **Manual Geometry Math**: Never compute endpoints or angles in renderers; use frame data results.
- **React State in Renderers**: Never interact with state, refs, or DOM inside renderer functions.
- **Mixing Transforms**: Keep world <-> screen conversions centralized in transforms logic.
