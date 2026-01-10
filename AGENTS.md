# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-10
**Stack:** TanStack Start (React 19 + SSR)

## OVERVIEW

Full-stack React app with TanStack Start framework. File-based routing, server-side rendering, and TanStack Store for state.

## STRUCTURE

```
catapult-simulator/
├── src/
│   ├── routes/          # File-based routing (TanStack Router)
│   │   ├── __root.tsx   # Root layout + providers
│   │   ├── index.tsx    # Home page
│   │   └── demo/        # SSR variant examples
│   ├── lib/             # Shared utilities
│   └── router.tsx       # Router config
├── public/              # Static assets
└── [config files]
```

## WHERE TO LOOK

| Task             | Location                | Notes                        |
| ---------------- | ----------------------- | ---------------------------- |
| Add new route    | `src/routes/{path}.tsx` | `createFileRoute()`          |
| Server functions | Any route file          | `export const loader/action` |
| Global state     | `src/lib/*store.ts`     | TanStack Store               |
| Shared utilities | `src/lib/utils.ts`      | `cn()` function              |

## CONVENTIONS

- **No semicolons** - Airbnb style without semicolons
- **Single quotes** - Use `'` not `"`
- **Trailing commas** - Yes
- **Path alias** - `@/` = `./src/`
- **React Compiler** - Enabled via babel-plugin-react-compiler
- **SSR patterns** - See `src/routes/demo/` for SPA/SSR variants

## ANTI-PATTERNS (THIS PROJECT)

- Don't add semicolons
- Don't use double quotes
- Don't skip trailing commas
- Don't create separate components in route files if server-only
- Don't bypass React Compiler automatic optimizations

## COMMANDS

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run test     # Run Vitest (no tests yet)
npm run lint     # ESLint check
npm run check    # Format + lint auto-fix
```

## NOTES

- **TanStack Start = SSR by default** - Use `start.spa-mode.{file}.tsx` for SPA routes
- **Server handlers** use `server.handlers.GET()`, return `Response` or JSON
- **Client routes** use `createFileRoute()` with `Component` + optional `loader/action`
- **Nitro** handles server-side, TanStack Router handles client routing
