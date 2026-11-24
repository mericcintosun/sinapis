# HANDOFF: Sinapis

Read this file, then `IDENTITY.md` (law), `CLAUDE.md` (permanent rules) and `DEMO.md` (the 90-second demo contract). Do not restart anything.

## Goal

Sinapis is an allergen graph for a restaurant kitchen: it shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before the change is accepted. Entry for the Relate by Neo4j Hackathon (https://relate.devpost.com/), deadline 11 December 2026, 18:00 PT. Judging weighs Relate and connected context most (30), then functionality (25), usefulness (20), documentation (15), creativity (10).

Phase 3 goal (this session): the whole 90-second DEMO.md path is dependable. Step 6 (guest check) runs on Relate in real mode with a mirror fallback, state persists only in the browser, every demo route has Skeleton, ErrorState and EmptyState branches, Apply cannot double-apply, no step waits over 5 seconds, and a reset returns the browser (localStorage and OPFS) to the demo start state.

## Status

All six slices are written. Nothing was built, installed, tested or run by the agent (no shell).

| Slice | State | Evidence |
| --- | --- | --- |
| 1. Store and full reset | written | `lib/store.ts` exports `loadApplied`, `saveApplied`, `clearApplied`, `changeKey` (key `sinapis.applied.v1`); worker op `"reset"` at `lib/relate.worker.ts:178` (one queued job: wipe relationships, wipe nodes, `seedStatements`, seed marker); `resetRelate()` at `lib/relate-client.ts:163`; `resetStore()` in `lib/adapter.ts:36`, `lib/adapter.fake.ts:40`, `lib/adapter.real.ts:142`; `/?reset=1` read once on mount at `components/kitchen-provider.tsx:108`, then `history.replaceState` |
| 2. Apply guards | written | `components/kitchen-provider.tsx:34` `const inFlight = React.useRef<{ key: string; promise: Promise<Engine> } | null>(null);`, `:57` `if (inFlight.current?.key === key) return inFlight.current.promise;`, `:63` `const repeat = !!last && changeKey(last) === key && last.note === change.note;`; `components/supplier-change-form.tsx:180` `disabled={applying}` with label `{applying ? "Writing to the graph" : "Apply to the kitchen graph"}`; preview button `disabled={previewing || applying || !change.note.trim()}` at `:137` |
| 3. State triad | written | see the route table below |
| 4. Guest check on Relate | written, unverified | `CYPHER.guestSafeDishes` (`lib/relate.ts:28`), `CYPHER.guestSwap` (`lib/relate.ts:41`), `rowsToGuest` (`lib/relate.ts:110`); `guestCheck` at `lib/adapter.real.ts:113` holds the `try`, the mirror return and the `[core] parity ok` / `parity mismatch n` log; `EngineNote` on the guest result at `components/dish-browser.tsx:135`; pinned swap line test in `tests/kitchen.test.ts:90`; guest proof in `scripts/proof.mjs` and README `PROOF:BEGIN guest` |
| 5. Five-second rule | written | `lib/config.ts:49` `RELATE_TIMEOUT_MS = 2000`, `:55` `WORKER_INIT_TIMEOUT_MS = 3000`, `:58` `RELATE_BUDGET_MS = 4800`; each attempt's timeout is capped to the budget left (`once` in `lib/relate-client.ts`); pre-warm `adapter.getDishPaths(PREWARM_DISH)` at `components/kitchen-provider.tsx:117`, real mode only, single call |
| 6. demo:reset and docs | written | `scripts/demo-reset.mjs`; `package.json` script `demo:reset`; README "Reset and persistence"; DEMO.md "What runs where" and "Reset between cycles"; CLAUDE.md names `lib/store.ts` |

Route to file (state triad):

| Route | Skeleton | ErrorState (retry) | EmptyState (CTA) |
| --- | --- | --- | --- |
| `/` | `app/loading.tsx` `OverviewSkeleton` | `app/error.tsx` (`reset` as `onRetry`) | `MatrixEmptyState` in `components/overview-board.tsx` (empty menu or reset in progress, CTA "Log supplier change" to `/activity#log-change`) |
| `/dishes` | `app/dishes/loading.tsx` `DishesSkeleton`, `GuestSkeleton` in `components/dish-browser.tsx` | `app/dishes/error.tsx`; guest check failure in `components/dish-browser.tsx` (retry re-runs the same check) | `GuestEmptyState` in `components/dish-browser.tsx` (CTA "Change the allergen picks") |
| `/dishes/[id]` | `app/dishes/[id]/loading.tsx` `DishDetailSkeleton`, `DishPathsSkeleton` (Suspense fallback) | `app/dishes/[id]/error.tsx`; path query failure in `components/dish-paths.tsx` (retry re-issues the same query) | `PathsEmptyState` in `components/dish-paths.tsx` (CTA "Back to the matrix") |
| `/activity` | `app/activity/loading.tsx` `ActivitySkeleton` | `app/activity/error.tsx`; preview and apply failures in `components/supplier-change-form.tsx` (retry re-issues the same preview or apply) | `ChangeLogEmptyState` in `components/change-log.tsx` (CTA "Log a change") |

Step to code path (real path and mirror fallback in the same function):
1. Matrix: `lib/adapter.fake.ts` `matrixOf` / `replay`, by design on the mirror in both modes, labelled by `EngineNote` with `adapter.matrixEngine`.
2. Path click: `getDishPaths` in `lib/adapter.real.ts`.
3. Form: `components/supplier-change-form.tsx` (calls the adapter only).
4. Preview and Apply: `previewImpact` and `applyChange` in `lib/adapter.real.ts`.
5. Cells turn red: `apply` in `components/kitchen-provider.tsx` (replay on the mirror, write through `applyChange`).
6. Guest check: `guestCheck` in `lib/adapter.real.ts`.

## Decisions

- Persistence. Table row used: "one small mutable state", realised as browser storage: the applied change list in `localStorage` (only through `lib/store.ts`) plus the Relate OPFS store `opfs://sinapis-kitchen` in real mode. Rejected: Upstash KV (no step needs state shared across visitors, and a shared store would let one visitor's Apply change another visitor's demo), Postgres (no relational read), on-chain (no chain). There is no server write, so there is no runtime filesystem write and no migration or schema push.
- Idempotency lives at the client write boundary, `apply` in `components/kitchen-provider.tsx`, because there is no server write route. A repeat call with the same `changeKey` while one is pending returns the pending promise; a change equal to the last applied one (same key and note) writes to the engine again but adds no log entry and no `saveApplied`. `applyChange` in `lib/adapter.real.ts` clears before it adds, so a replay is also harmless on the Relate side. The form also keeps an `applyingRef` so two clicks in one frame write once.
- Timeouts (constants in `lib/config.ts`, no env var): worker init 3 s (sticky failure for the session), one attempt 2 s, exactly one retry, whole call capped at 4.8 s. A dead worker falls back to the mirror inside 5 s.
- Reset order: clear React state, `clearApplied()`, then `await adapter.resetStore()`. While the reset runs the overview shows `MatrixEmptyState` in its resetting form. This closes the Phase 2 open question that reset left OPFS stale.
- Relate API corrected from the installed package (read from `node_modules/@relate/relate-wasm/relate.d.ts` and its README, version 1.2.0): default export `init()`, `RelateDb.open(uri)`, `db.execute(query, paramsJson)` returning a JSON envelope `{ columns, rows, stats, error }` that reports engine errors in `error`. The Phase 2 worker never called `init()` when `RelateDb` was exported and passed params as an object, so real mode could not have worked; the Phase 2 proof line in README (`__wbindgen_malloc` of undefined) is that failure. `callDb` in `lib/relate.worker.ts` now stringifies params, parses the envelope and maps `error` to `upstream_error`; a throw from `execute` is treated as a wasm trap and makes every later call answer `not_configured` (no retry, mirror fallback). `scripts/proof.mjs` now uses `initSync` with the wasm bytes and `new RelateDb()` in Node.
- Swap in Cypher: the substitution list lives in `data/kitchen.json`, not in the graph, so `CYPHER.guestSwap` takes it as the `$swaps` parameter (a list of `{from, to}` maps). Which swap a dish shows is picked in `rowsToGuest` in kitchen order, the same order the mirror uses.
- The guest queries match nodes by their `id` property, not `elementId()`, because ids in the app are the seed ids. No APOC.
- `/dishes/[id]` reads `?allergen=` in the client component `DishPathsFromQuery` under `Suspense`, so the 16 pages can prerender (Phase 2 open question 4).
- No visual rule changed, so no IDENTITY.md amendment. `.env.example` and `.farm-live.json` are unchanged: no new secret and no new env key.
- Ask-first items: no new dependency, no new route, no new env variable (defaults taken).

## Failed attempts

None. No correction was attempted twice, because nothing could be run.

## Files changed

Created: `lib/store.ts`, `components/route-states.tsx`, `app/dishes/error.tsx`, `app/dishes/[id]/error.tsx`, `app/activity/error.tsx`, `scripts/demo-reset.mjs`, `.farm-commits.json`.

Edited: `components/kitchen-provider.tsx`, `lib/relate.worker.ts`, `lib/relate-client.ts`, `lib/adapter.ts`, `lib/adapter.fake.ts`, `lib/adapter.real.ts`, `lib/relate.ts`, `lib/config.ts`, `lib/kitchen-graph.ts`, `types/relate-wasm.d.ts`, `components/supplier-change-form.tsx`, `components/overview-board.tsx`, `components/change-log.tsx`, `components/dish-paths.tsx`, `components/dish-browser.tsx`, `components/brand-mark.tsx`, `components/scene-slot.tsx`, `app/error.tsx`, `app/loading.tsx`, `app/dishes/loading.tsx`, `app/dishes/[id]/loading.tsx`, `app/activity/loading.tsx`, `app/dishes/[id]/page.tsx`, `tests/kitchen.test.ts`, `scripts/proof.mjs`, `package.json`, `README.md`, `DEMO.md`, `CLAUDE.md`, `HANDOFF.md`.

Untouched: `data/kitchen.json`, `public/*`, `app/icon.svg`, `package-lock.json`, `IDENTITY.md`, `.farm-live.json`, `.env.example`, `kitchen/`.

## Commands run

None, agent has no shell. Unverified until the runner reports: `npm install`, `npm run build`, `npm test` (including the pinned guest expectation and `changeKey`), `npm run proof` (including the new guest block), `npm run seed`, `npm run demo:reset`, and the live three-cycle walk in a browser with OPFS.

## Acceptance self-check (read from files, not run)

- Met by reading: every item in the Status table; `localStorage` appears in code only in `lib/store.ts`; no `fs` import in `app/`, `components/` or `lib/`; images use `next/image` (`components/brand-mark.tsx`, `components/scene-slot.tsx`), no raw `<img>`; each demo route fetches in one effect at most (`DishPaths`, `DishBrowser`), with no effect that sets state feeding a second fetch effect; sameness, dash and vocabulary greps over `app/`, `components/`, `lib/`, README, DEMO, HANDOFF return nothing; the only `@keyframes` is `sinapis-rise` (`app/globals.css:124`); `BrandMark` renders once, `components/app-rail.tsx:25`.
- Unverified: whether Relate's Cypher accepts the constructs in `guestSafeDishes` and `guestSwap` (OPTIONAL MATCH after a variable-length match, `collect` and `sum(CASE ...)` aggregates, `any(... IN $codes)`, `UNWIND` over a list of maps with `s.from`, an unlabelled `(t {id: s.to})` match, `[:USES*0..6]`). If a query is rejected, `guestCheck` falls back to the mirror and logs `[core] fallback upstream_error step=guest`; `npm run proof` will show the engine error text in the guest block.
- Unverified: the wipe statements `MATCH ()-[r]->() DELETE r` and `MATCH (n) DELETE n` on Relate; whether `init()` finds `relate_bg.wasm` after Next bundles the worker (`new URL('relate_bg.wasm', import.meta.url)` inside `relate.js`); whether the first OPFS open plus a 187 statement seed fits the 3 s init budget on a cold visit.

## Open questions

- Cold first visit: if the wasm download plus the first seed exceed `WORKER_INIT_TIMEOUT_MS` (3 s), the session sticks to the mirror (labelled). If the runner sees `relate open failed upstream_timeout` on a normal connection, seed with one `db.executeScript(...)` call instead of 187 `execute` calls, or let the init keep running in the background and only the first answer fall back.
- A reset whose worker job outlives the 2 s attempt times out on the client and logs a fallback, but the queued job still completes in the worker; a retry queues a second reseed, which is harmless. Confirm the duration on the live URL.
- `RelateDb.reset()` exists in the package typings but is undocumented; the reset uses explicit wipe statements instead.

## Manual checklist (human facts)

- [ ] Add the GitHub topics `relate` and `relate-neo4j-hackathon` to the repository.
- [ ] Run `npm run seed` or `npm run demo:reset` with the `relate` CLI on PATH and commit `kitchen/seed.cypher` and `kitchen/store`.
- [ ] With `ADAPTER_MODE=real`, in a private window: open `/?reset=1`, walk DEMO.md steps 1 to 6 three times, identical results, no step over 5 s; Reset to seed clears the OPFS copy; with the worker blocked, every step ends on the mirror inside 5 s.

## Next best step

The path graph panel on `/dishes/[id]` (d3 layout rendered in React, no new dependency), then kit signatures 2 and 3, then Phase 4 polish (README query output from a real run, video under 2 minutes following DEMO.md).

### Constraints (unchanged)

Next.js 15 App Router, TypeScript strict, Tailwind v4, no API keys, no runtime filesystem writes. IDENTITY.md colors only through `app/globals.css`. All UI through `components/ui/` and `cn()`. Plain English copy with no em or en dashes and none of the cliche words banned in CLAUDE.md. A product without a spec sheet is "unknown", never "free". `npm run build` must pass after every change.
