# CLAUDE.md: permanent rules for agents working on Sinapis

`IDENTITY.md` is law. Colors, fonts, routes, the rail, motion and the K5 kit rules come from it. Append dated lines under its "Amendments" heading; never edit above it.

## Commands

```bash
npm install
npm run build   # must pass after every change
npm run dev     # http://localhost:3000, works with zero env vars
npm run seed    # writes kitchen/seed.cypher, builds kitchen/store if the relate CLI exists
```

## Stack pitfalls

- Next.js 15 App Router. `params` and `searchParams` are Promises in pages, layouts and route handlers: await them.
- Tailwind v4: there is no `tailwind.config`. Tokens live in the `@theme` block of `app/globals.css`, the only file allowed to hold hex colors (plus `lib/brand-colors.ts` for the OG image, which cannot read CSS variables).
- Relate WASM rejects re-entrant calls. Keep the single promise queue in `lib/relate.worker.ts`; never call the database outside its `callDb`.
- `opfs://` stores work only inside a dedicated worker. The page reaches it only through `lib/relate-client.ts`, imported only by `lib/adapter.real.ts`.
- `lib/store.ts` is the only browser-state wrapper: no other module touches `localStorage`. Every access is guarded by `typeof window` and `try`, and nothing reads `window` at module load, so tests can import it.
- `@relate/relate-wasm` 1.2.0 API: default export `init()` must run first; `RelateDb.open("opfs://name")` in the worker; `db.execute(query, paramsJson)` returns a JSON envelope `{ columns, rows, stats, error }` and reports engine errors in `error` instead of throwing.
- `lib/config.ts` is the only reader of `process.env` for app logic. `lib/adapter.ts` is the only module that branches on `ADAPTER_MODE`.
- Tests: `npm test` (node:test through tsx, pure modules only). Proof: `npm run proof` rewrites the README proof blocks.
- Relate Cypher uses `elementId()`, not `id()`. There is no APOC.
- All data access goes through `lib/adapter.ts` (`getAdapter()`). `lib/data.ts` is the seed module; do not create a `lib/data/` directory, it would shadow `@/lib/data`.
- Kit imports (`d3`, `motion/react`) live only in `"use client"` components. d3 does math only, never `d3.select`.

## Never touch

- `public/illustrations/*`, `public/logo.svg`, `app/icon.svg`
- `.farm-*` files (the runner owns them)
- `kitchen/` by hand: regenerate it with `npm run seed`
- `package-lock.json`

## Vercel guardrails

- No runtime filesystem writes in app code. Build-time scripts (`scripts/`, `next.config.ts`) may read or write.
- `useSearchParams` only under a `Suspense` boundary.
- No Node-only APIs in edge paths, no custom server, no `output: export`.
- Every `process.env` key read anywhere is mirrored in `.env.example`.

## Copy rules

English, plain tone, no em or en dashes, no double hyphen used as a dash, none of the banned cliche words listed in the phase briefs. A product without a spec sheet is "unknown", never "free". Keep the line "decision support, not a medical guarantee" visible.

when compacting preserve the list of modified files and test commands
