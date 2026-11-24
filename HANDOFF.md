# HANDOFF: Sinapis

Read this file, then `IDENTITY.md` (law), `CLAUDE.md` (permanent rules) and `DEMO.md` (the 90-second demo contract). Do not restart anything.

## Goal

Sinapis is an allergen graph for a restaurant kitchen: it shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before the change is accepted. Entry for the Relate by Neo4j Hackathon (https://relate.devpost.com/), deadline 11 December 2026, 18:00 PT. Judging weighs Relate and connected context most (30), then functionality (25), usefulness (20), documentation (15), creativity (10).

Phase 2 goal (this session): the DEMO.md wow steps (2 to 5: path click, preview, Apply, cells turn red) run through the Relate WASM engine (`@relate/relate-wasm`) in a dedicated browser worker with OPFS persistence at `opfs://sinapis-kitchen`, while `ADAPTER_MODE=fake` stays the permanent fallback with the same interface.

## Status

All six slices are written on the agent side. Nothing was built, installed, tested or run by the agent (no shell). Whether `@relate/relate-wasm@^1.2.0` installs, what it exports, and whether Next bundles the worker and its WASM asset are unverified until the runner reports.

| Slice | State | Evidence |
| --- | --- | --- |
| 1. Config, errors, schemas | written | `lib/config.ts:34` resolves `ADAPTER_MODE` (default fake); `lib/errors.ts:3` holds the `ErrorCode` union; `lib/schemas.ts` exports `specChangeSchema`, `guestSchema`, `dishIdSchema`; `safeParse` first in `app/api/impact/route.ts:15`, `app/api/guest/route.ts:15`, `app/api/dishes/[id]/paths/route.ts:10` |
| 2. Relate worker | written, unverified | `lib/relate.worker.ts` (queue at line 137, `callDb` at line 94); `lib/relate-client.ts:50` is the only `new Worker`; one retry at `lib/relate-client.ts:123` |
| 3. Adapters and selector | written | `lib/adapter.fake.ts:19`, `lib/adapter.real.ts:42`, selector `lib/adapter.ts:46` |
| 4. Engine note | written | `components/engine-note.tsx`; used at `components/supplier-change-form.tsx:151` (preview) and `:166` (apply), `components/dish-paths.tsx:105`, `components/overview-board.tsx:77` |
| 5. Tests, proof, live contract | written, unverified | `tests/kitchen.test.ts`, `tests/schemas.test.ts`, `scripts/proof.mjs`, `scripts/seed-store.mjs`, `.farm-live.json`, README proof markers |
| 6. Docs | written | `README.md`, `DEMO.md`, `CLAUDE.md` (stack pitfalls), this file |

Methods by engine in real mode:
- On Relate (with mirror fallback): `getDishPaths`, `previewImpact` (Relate decides which dishes are reached; before and after statuses come from the mirror), `applyChange` (clear, add, read-back in one worker round, parity logged).
- Still on fixtures (the local mirror over `data/kitchen.json`): `getKitchen`, `getMatrix`, `guestCheck`, `replay`, `matrixOf`. The overview matrix is therefore always labelled "Sample data", even in real mode, because it is drawn by `matrixOf`.

Live contract: `.farm-live.json` is `{ "requiredEnv": [], "optionalEnv": [] }`. The list is empty on purpose: the real path is Relate WASM running in the visitor's browser and needs no secret, no API key and no server credential. `ADAPTER_MODE` and the `NEXT_PUBLIC_*` keys are build settings, not secrets, so they are not listed.

## Decisions

- `lib/config.ts` is the only reader of `process.env` for app logic (plus `next.config.ts` at build time). `lib/brand-files.ts` now reads `BRAND_FILES` from it. Every read sits in a `try` block because the module also runs in the worker, where `process` may be absent.
- Worker protocol: `{ id, op: "open" | "run" | "batch" }`. `batch` sends several statements in one queued job, so the apply (clear, add, read-back) is one worker round. The worker answers `{ id, ok, rows }` or `{ id, ok: false, error, hint }` with `error` an `ErrorCode`.
- The worker probes the package at runtime because its `.d.ts` was not available: it calls `init()` (or a wasm-bindgen style default export) if present, then `RelateDb.open(uri)` (also `default.RelateDb`, `Relate`, or a top-level `open`), and `callDb` uses the first of `query`, `run`, `execute`. Results are normalised from arrays, `{ columns, rows }`, `{ rows }`, `{ records }` or `{ data }`, with `Map` and `BigInt` turned into plain values. `types/relate-wasm.d.ts` declares the module loosely so the build does not depend on its typings.
- Init failures (module missing, OPFS refused, 20 s init timeout, worker crash) are sticky for the session: the client stops asking and every call falls back to the mirror with a `[core] fallback <code>` log. Query failures get exactly one retry (`RELATE_RETRIES = 1`, 8 s each).
- Parity check after apply compares the Relate read-back (distinct dishes that reach the product through a CONTAINS or MAY_CONTAIN to the allergen) with the dishes the mirror says reach the product after the change. This is the reached set, not only the cells whose colour changed, because a dish can already carry the allergen through another product.
- `KitchenAdapter` gained `matrixEngine`, so the overview note reads its text from an engine value instead of a constant, and renders in server HTML.
- `ApiResponse<T>` failure is now exactly `ApiError` (`{ error, hint }`). No component read the old `error.message` or `error.code` shape.
- The `/api/dishes/[id]/paths` handler rejects ids that are not lowercase words joined by hyphens with 400; a well-formed id that is not on the menu still answers an empty list.
- `scripts/seed-store.mjs` tries five `relate` invocations with `--database kitchen/store --snapshot-format json`, 5 s each, on a fresh store directory, stops at the first exit 0 that leaves `kitchen/store` on disk, otherwise prints one line naming every failure and exits 0. It always writes `kitchen/seed.cypher`.
- `scripts/proof.mjs` reads `CYPHER.productImpact` from `lib/relate.ts` as text, so the Node proof runs the exact query the browser runs. It replays `kitchen/seed.cypher` for the in-memory seed.
- No visual change, so no IDENTITY.md amendment. The engine note uses the existing `Badge` and `sinapis-rise`.

## Failed attempts

None this phase. No correction was attempted twice, because nothing could be run.

## Files changed

Created: `lib/config.ts`, `lib/errors.ts`, `lib/schemas.ts`, `lib/relate.worker.ts`, `lib/relate-client.ts`, `lib/adapter.fake.ts`, `lib/adapter.real.ts`, `types/relate-wasm.d.ts`, `components/engine-note.tsx`, `tests/kitchen.test.ts`, `tests/schemas.test.ts`, `scripts/proof.mjs`, `.farm-live.json`, `.farm-commits.json`.

Edited: `lib/adapter.ts` (selector only), `lib/relate.ts` (pure: `CYPHER` plus `dishCount` and `productReach`, `seedStatements`, `Engine`, `idsToSteps`, `rowsToPaths`, `reachedDishes`; `openRelate`, the dynamic `import(url)` and the queue are gone), `lib/types.ts`, `lib/brand-files.ts`, `lib/kitchen-graph.ts` (header comment), `app/api/impact/route.ts`, `app/api/guest/route.ts`, `app/api/dishes/[id]/paths/route.ts`, `components/supplier-change-form.tsx`, `components/dish-paths.tsx`, `components/overview-board.tsx`, `components/kitchen-provider.tsx` (comment), `scripts/seed-store.mjs`, `package.json`, `.env.example`, `README.md`, `DEMO.md`, `CLAUDE.md`, `HANDOFF.md`.

Untouched: `data/kitchen.json`, `kitchen/` (does not exist yet; `npm run seed` or `npm run proof` creates `kitchen/seed.cypher`), `public/*`, `app/icon.svg`, `package-lock.json`, `IDENTITY.md`.

## Commands run

None, agent has no shell. Unverified until the runner reports: `npm install` (including `@relate/relate-wasm@^1.2.0`, `zod@^3.25.0`, `tsx@^4.19.0`), `npm run build`, `npm test`, `npm run proof`, `npm run seed`, and the live check in a browser with OPFS.

## Acceptance self-check (read from files, not run)

- Same interface: `lib/adapter.fake.ts:19` and `lib/adapter.real.ts:42` are both typed `KitchenAdapter`; `lib/adapter.ts:46` picks one from `ADAPTER_MODE` (`lib/config.ts:34`, fake unless the value is exactly "real").
- No page or client component imports the real adapter or the client; components import `@/lib/adapter` only, through `components/kitchen-provider.tsx`.
- Greps: the string `relate.worker` appears in `lib/relate-client.ts:50` (the worker URL itself, which cannot move) besides docs; `@/lib/relate-client` is imported only by `lib/adapter.real.ts:16`; `adapter.real` appears in code only in `lib/adapter.ts`, and in docs (README, CLAUDE.md, this file).
- Sameness tripwire and copy greps over `app/`, `components/`, `lib/`, README, DEMO, HANDOFF: zero hits at the time of writing. The only `@keyframes` is `sinapis-rise` (`app/globals.css:124`); `BrandMark` renders once in `components/app-rail.tsx:25`.
- Unmet or unverified: everything that needs a command (build, tests, proof, the Relate export shape, the live Relate label on steps 2 and 4, OPFS surviving a reload). Step 5 "survives a reload" is carried by localStorage replay for the matrix; Relate's OPFS copy survives too but the matrix does not read it.

## Open questions

- Export shape of `@relate/relate-wasm`: confirm from `node_modules/@relate/relate-wasm` after install and tighten `openDb` and `callDb` in `lib/relate.worker.ts` to the real names. If the package needs an explicit wasm URL for `init`, pass it there.
- If Next cannot bundle the worker or its `.wasm` asset, the cut protocol applies: make `runCypher` and `runBatch` in `lib/relate-client.ts` reject `not_configured`, record it under Failed attempts, and correct README and DEMO to say the mirror answers.
- "Reset to seed" (`components/overview-board.tsx`) clears localStorage only. In real mode the OPFS store keeps the applied relationships, so after a reset the Relate path list can show a flag the matrix no longer shows. Out of scope this phase (persistence UX polish).
- `app/dishes/[id]/page.tsx` reads `searchParams`; if the build reports the 16 dish pages as dynamic, move the `?allergen=` read into a client component under `Suspense`.

## Manual checklist (human facts)

- [ ] Add the GitHub topics `relate` and `relate-neo4j-hackathon` to the repository.
- [ ] Run `npm run seed` with the `relate` CLI on PATH and confirm `kitchen/seed.cypher` and `kitchen/store` are committed.

## Next best step

Guest mode in Cypher (dishes with no path to the chosen allergens, and dishes where removing one substitutable node removes every path), then the path graph panel on `/dishes/[id]` (d3 layout rendered in React), then kit signatures 2 and 3.

### Remaining mission after Phase 2 (from the original plan)

1. Persistence UX: "Reset to seed" also clears the OPFS store; the matrix reads applied state back from Relate.
2. Guest mode in Cypher.
3. Path panel as a graph on `/dishes/[id]` (d3-computed layout rendered in React, no new dependency).
4. Kit signatures 2 and 3.
5. Docs and submission: real query output in README, `relate` and `relate-neo4j-hackathon` topics, video under 2 minutes following DEMO.md.

### Constraints (unchanged)

Next.js 15 App Router, TypeScript strict, Tailwind v4, no API keys, no runtime filesystem writes. IDENTITY.md colors only through `app/globals.css`. All UI through `components/ui/` and `cn()`. Plain English copy with no em or en dashes and none of the cliche words banned in CLAUDE.md. A product without a spec sheet is "unknown", never "free". `npm run build` must pass after every change.
