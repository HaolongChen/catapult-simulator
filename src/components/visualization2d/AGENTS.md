# AGENTS.md

## OVERVIEW

Modular 2D canvas visualization system for trebuchet state, built on a stateless, declarative renderer pattern with robust world/screen transforms and orchestration via hooks.

---

## STRUCTURE

```
src/components/visualization2d/
├── index.tsx                   # Main TrebuchetVisualization2D component (entry point)
├── hooks/
│   ├── useCanvasTransform.ts   # World <-> Canvas coordinate conversions (toCanvasX/Y)
│   ├── useCanvasInteraction.ts # Handles panning, zooming, pointer transforms
│   └── useParticleSystem.ts    # Stateless visual effect system (e.g. impacts)
├── renderers/
│   ├── grid.ts                 # Grid, axes, and ground rail renderer
│   ├── trebuchet.ts            # Trebuchet arm, pivot, & counterweight renderer
│   ├── projectile.ts           # Sling, projectile & velocity/force vectors
│   └── telemetry.ts            # Trajectory line & state badges
└── types.ts                    # Visualization prop and shape types
```

---

## RENDERER PATTERN

- **Stateless, Pure Renderers:**  
  Each `renderX` function accepts canvas context, current physics/data, and coordinate transform methods. No UI state is modified in renderers—side effects and animation state live exclusively at the hook/component level.
- **Hook Orchestration:**
  - `useCanvasTransform`: Manages zoom, pan, and all coordinate math. Always use `toCanvasX`/`toCanvasY` to convert simulation/world units to screen pixel coordinates.
  - `useCanvasInteraction`: Adds world-aware pointer/scroll interactions (scroll-to-zoom, drag-to-pan), mapping events to simulation coordinates.
- **Main Flow:**
  - On every draw: compose stateless renderers in the correct order: grid → rails → trebuchet → projectile → overlays.
  - All drawing operates with real-world meters, only transformed at render time.

---

## CONVENTIONS (Visual)

- **World Units:** All geometry and physics use meters; no pixel offsets in renderers.
- **Coordinate System:** +X = right, +Y = up (world); mapping toCanvasX/Y for all drawing.
- **Layering:** Grid/axes at bottom, then static structures, then projectiles and vectors, overlays last.
- **Visual Style:** Slate/dark backgrounds, gold for highlights (trajectory), muted force/velocity vectors.
- **No DOM/State:** All rendering is via imperative canvas APIs—never mutate React state inside renderers.
- **Extensibility:** Add new visualizations as pure functions under `renderers/`, never coupled to hooks.
