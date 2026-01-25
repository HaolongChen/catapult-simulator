# AGENTS.md for `src/components/visualization2d`

## OVERVIEW

Modular 2D Canvas renderer using a high-frequency rAF loop for smooth physics visualization.

## STRUCTURE

```text
src/components/visualization2d/
├── index.tsx                   # Composition root; manages rAF and lifecycle
├── hooks/
│   ├── useCanvasTransform.ts   # Projection logic (meters to pixels)
│   ├── useCanvasInteraction.ts # Camera controls (zoom, pan, world-coords)
│   └── useParticleSystem.ts    # Ephemeral VFX (impact smoke, trails)
└── renderers/
    ├── grid.ts                 # Dynamic metric background and ground line
    ├── trebuchet.ts            # Machine state (arm, sling, counterweight)
    ├── projectile.ts           # Projectile, velocity/force vector overlays
    └── telemetry.ts            # Trajectory trails and historical data
```

## WHERE TO LOOK

| Task                | Location                | Notes                                                                    |
| :------------------ | :---------------------- | :----------------------------------------------------------------------- |
| **Render Loop**     | `index.tsx`             | Order: Grid → Trajectory → Trebuchet → Projectile → Particles → Vectors. |
| **Coordinates**     | `useCanvasTransform.ts` | Source of truth for `toCanvasX` and `toCanvasY`.                         |
| **Physics Mapping** | `renderers/`            | Maps physics frame data to canvas drawing commands.                      |

## CONVENTIONS

- **Ref-Based Updates**: Use `refs` inside `requestAnimationFrame` to avoid React re-render overhead.
- **Stateless Renderers**: `renderX` functions must be pure, receiving `ctx` and data as arguments.
- **Inverted Y-Axis**: World `+Y` is up; Canvas `+Y` is down. Handle strictly via `toCanvasY`.
- **Meter-First**: Logic operates in meters; pixel conversion happens only at the final draw call.

## ANTI-PATTERNS

- **React State for Physics**: Do NOT use `useState` for frame-by-frame position updates.
- **Direct Canvas Math**: Never hardcode pixel offsets; always use the transform hook's API.
- **Local Physics Logic**: Renderers must not calculate dynamics; only draw provided state.
- **DOM Manip in Loop**: Keep the render loop restricted to Canvas context operations.
