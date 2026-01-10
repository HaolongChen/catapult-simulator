# DEMO ROUTES - SSR VARIANTS

**Purpose:** Examples of SSR vs SPA patterns in TanStack Start

## OVERVIEW

Demonstrates 3 rendering modes: Full SSR, SPA-only, Data-only SSR.

## STRUCTURE

```
src/routes/demo/
├── index.tsx              # Route index (lists demos)
├── start.spa-mode.tsx    # SPA-only (no SSR)
├── start.full-ssr.tsx     # Full SSR
├── start.data-only.tsx    # Data fetch SSR, no streaming
└── demo-store.ts          # Shared TanStack Store
```

## PATTERNS

### SPA-Only Routes

```typescript
// File: start.spa-mode.{name}.tsx
// Pattern: No loader/action, pure client rendering
export default function Component() {
  return <div>Client-only content</div>
}
```

### Full SSR Routes

```typescript
// File: start.full-ssr.{name}.tsx
// Pattern: Server loader + streaming
export const loader = async () => {
  return { data: await fetchData() }
}

export default function Component() {
  const { data } = useLoaderData()
  return <div>{data}</div>
}
```

### Data-Only SSR

```typescript
// File: start.data-only.{name}.tsx
// Pattern: Pre-fetch data, stream nothing
export const loader = async () => {
  return { data: await fetchData() }
}

// Use defer for non-blocking data
```

## CONVENTIONS

- Prefix SSR routes with `start.`
- Use `.spa-mode.` for client-only
- Use `.full-ssr.` for server-rendered
- Use `.data-only.` for pre-fetch without streaming
- Shared state in `demo-store.ts`

## WHERE TO LOOK

| Need             | Example              |
| ---------------- | -------------------- |
| SPA pattern      | `start.spa-mode.tsx` |
| SSR pattern      | `start.full-ssr.tsx` |
| Data fetch       | `loader()` function  |
| State management | `demo-store.ts`      |
