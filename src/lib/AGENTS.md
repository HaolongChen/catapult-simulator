# LIB - UTILITIES & SHARED CODE

**Purpose:** Reusable utilities and shared state

## OVERVIEW

Helper functions and TanStack Store instances used across the app.

## STRUCTURE

```
src/lib/
├── utils.ts           # Utility functions
├── demo-store.ts      # TanStack Store (demo state)
└── [future stores]    # Add more as needed
```

## UTILITIES

### `cn()` - Classname Merger

```typescript
import { cn } from '@/lib/utils'

// Merges Tailwind classes, handles conflicts
cn('px-4 py-2', isActive && 'bg-blue-500', 'text-white')
```

- Uses `clsx` + `tailwind-merge`
- Tailwind classes override defaults
- Useful for conditional styling

## TANSTACK STORES

### Demo Store Pattern

```typescript
// lib/demo-store.ts
export const demoStore = createStore({
  name: 'demo',
  initialState: { count: 0 },
})

// In component
const store = useStore(demoStore)
```

- Type-safe state management
- Optimized reactivity
- Use for global app state

## CONVENTIONS

- One utility per file (keep small)
- Store files end with `-store.ts`
- Export named functions, not default
- Keep utilities pure (no side effects)

## WHERE TO LOOK

| Need              | File                          |
| ----------------- | ----------------------------- |
| Classname merging | `utils.ts` → `cn()`           |
| Global state      | `{name}-store.ts`             |
| Shared logic      | Add to `utils.ts` or new file |
