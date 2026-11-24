# HANDOFF: Sinapis

Read this file, then `IDENTITY.md` (law), `CLAUDE.md` (permanent rules) and `DEMO.md` (the 90-second demo contract). Do not restart anything.

## Goal

Sinapis is an allergen graph for a restaurant kitchen: it shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before the change is accepted. Entry for the Relate by Neo4j Hackathon (https://relate.devpost.com/), deadline 11 December 2026, 18:00 PT. Judging weighs Relate and connected context most (30), then functionality (25), usefulness (20), documentation (15), creativity (10).

Phase 1 goal (this session): every demo step has a route that renders with seed data, the whole path is clickable, and five seams exist: DEMO.md, the adapter, the API stubs, one tokens file, and a deploy-ready build.

## Status

Phase 1 is complete on the agent side. Everything runs on the local graph mirror; nothing has been built or run by the agent (no shell).

| Route | File | What renders |
| --- | --- | --- |
| `/` | `app/page.tsx` | Welcome state from the seed, allergen load chart, latest change, full matrix |
| `/dishes` | `app/dishes/page.tsx` | Menu list with search, section filter, guest allergen check |
| `/dishes/[id]` | `app/dishes/[id]/page.tsx` | One dish with every allergen path; `?allergen=MUS` focuses one flag; static for all 16 dishes |
| `/activity` | `app/activity/page.tsx` | Supplier change form (preview, then apply) and change history |
| `/api/matrix` | `app/api/matrix/route.ts` | GET, force-static, `ApiResponse<Matrix>` |
| `/api/dishes` | `app/api/dishes/route.ts` | GET, force-static, `ApiResponse<Dish[]>` |
| `/api/dishes/[id]/paths` | `app/api/dishes/[id]/paths/route.ts` | GET, `ApiResponse<AllergenPath[]>` |
| `/api/impact` | `app/api/impact/route.ts` | POST a `SpecChange`, 200 with preview rows, 400 on a malformed body |
| `/api/guest` | `app/api/guest/route.ts` | POST `{ allergens }`, `ApiResponse<GuestAnswer>` |

Seams in place:
- Adapter: `lib/adapter.ts` exports `KitchenAdapter`, `fakeAdapter` (mirror, engine `local-mirror`), `realAdapter` (wraps `fetchDishPaths`, `fetchImpact`, `commitSpecChange` from `lib/relate.ts`), `getAdapter()` (any mode other than `"real"` is fake, see `adapterMode()` in `lib/adapter.ts`).
- Types: `lib/types.ts` re-exports domain and graph types and defines `ApiResponse<T>`.
- Provider: `components/kitchen-provider.tsx` imports only `@/lib/adapter` for graph work; replay, localStorage key `sinapis.applied.v1` and fresh-cell marking are unchanged. `components/dish-paths.tsx` and `components/supplier-change-form.tsx` now ask the adapter through `useKitchenAdapter()` instead of calling `lib/relate.ts`.
- Tokens: `app/globals.css` holds the IDENTITY hexes, radius, spacing, type scale, `sinapis-rise` with the reduced-motion block, and a global `:focus-visible` outline.
- Loading: `app/loading.tsx`, `app/dishes/loading.tsx`, `app/dishes/[id]/loading.tsx`, `app/activity/loading.tsx`, all built from `components/ui/skeleton.tsx`.

Interaction kit K5: signature 1 (allergen load chart, `components/allergen-load-chart.tsx`) ships and still works. Signatures 2 (hover crosshair rewriting the sentence) and 3 (animated by-allergen and by-supplier switch) are Phase 5.

## Decisions

- `lib/data.ts` stays the seed module (typed `seedKitchen` from `data/kitchen.json`). There is no `lib/data/` directory, because it would shadow `@/lib/data`.
- `ADAPTER_MODE` is mirrored to the client through `NEXT_PUBLIC_ADAPTER_MODE` in `next.config.ts` (defaults to `"fake"`). `adapterMode()` reads `ADAPTER_MODE` first (server), then `NEXT_PUBLIC_ADAPTER_MODE` (client).
- Every adapter method takes an optional `kitchen`. The client passes its replayed state (seed plus changes applied in this browser); the API handlers use the seed. The adapter also exposes synchronous `replay()` and `matrixOf()` so the matrix renders in server HTML without waiting on a promise.
- In fake mode, Apply no longer calls `commitSpecChange`. Before this phase the provider always called it (which fell back to the mirror without the WASM URL). With `ADAPTER_MODE=real`, behavior is identical to before.
- `guestCheck` in the adapter answers from the mirror in both modes (no Cypher yet). `components/dish-browser.tsx` still calls the mirror's synchronous `guestCheck` in a `useMemo` so the answer is instant; move it behind the adapter when the Cypher version lands.
- `lib/brand-colors.ts` holds the IDENTITY hexes for `app/opengraph-image.tsx` only, because `ImageResponse` cannot read CSS variables. This is the one place outside `app/globals.css` with hex values, and it is outside `app/` and `components/`.
- The "decision support, not a medical guarantee" line sits in the rail on desktop (`components/app-rail.tsx:54`) and under the page content on mobile (`app/layout.tsx`), since the rail text is hidden on small screens.
- `scripts/seed-store.mjs` was read and left unchanged: no `Date.now`, `Math.random` or `new Date`; statement order follows `data/kitchen.json`; `writeFileSync` overwrites `kitchen/seed.cypher`; a missing `relate` CLI (spawn error, status not 0) exits 0 with a message.

## Failed attempts

None this phase.

## Files changed

Created: `DEMO.md`, `CLAUDE.md`, `lib/types.ts`, `lib/adapter.ts`, `lib/brand-colors.ts`, `app/api/matrix/route.ts`, `app/api/dishes/route.ts`, `app/api/dishes/[id]/paths/route.ts`, `app/api/impact/route.ts`, `app/api/guest/route.ts`, `app/loading.tsx`, `app/dishes/loading.tsx`, `app/dishes/[id]/loading.tsx`, `app/activity/loading.tsx`, `components/ui/skeleton.tsx`, `.farm-commits.json`.

Edited: `next.config.ts`, `components/kitchen-provider.tsx`, `components/dish-paths.tsx`, `components/supplier-change-form.tsx`, `app/layout.tsx` (title template `%s | Sinapis`, mobile disclaimer), `app/globals.css` (spacing, type scale, focus outline), `app/opengraph-image.tsx` (no hex literals), `app/page.tsx` (own `metadata`), `app/error.tsx`, `app/not-found.tsx` (product name, link to `/`), `components/app-rail.tsx` (disclaimer wording), `components/dish-browser.tsx` (clear-filters empty state, guest prompt, wrapping section filter), `components/change-log.tsx` (empty state pointer), `components/allergen-matrix.tsx` (rem min width), `components/allergen-load-chart.tsx` (own `overflow-x-auto` wrapper), `.env.example`, `README.md` (stack line), `HANDOFF.md`.

## Commands run

None, agent has no shell. Unverified until the runner reports: `npm install`, `npm run build` (zero TypeScript errors, all 16 dish pages static), `npm run seed` determinism, the Vercel deploy and `/api/matrix` returning `{ ok: true }`, the 375px check.

## Open questions

- `app/dishes/[id]/page.tsx` reads `searchParams`, which makes the dish route dynamic at request time in Next 15 even with `generateStaticParams`. If the build reports the 16 pages as dynamic, move the `?allergen=` read into a client component under `Suspense` with `useSearchParams`.
- `@/lib/relate.ts` is imported by the server API handlers via `lib/adapter.ts`. Its dynamic `import(url)` is guarded by `typeof window`, so on the server it always answers from the mirror. Confirm the build does not warn about the `webpackIgnore` import in a server bundle.
- Path lists (`components/dish-paths.tsx`, preview rows in `components/supplier-change-form.tsx`) are flex-wrap lists, not tables, so they wrap instead of scrolling and have no `overflow-x-auto` wrapper. Only the matrix and the chart scroll sideways.
- The `/api/*` handlers break the old README claim "Vercel static deploy". The README tech stack line still says it; rewrite it in the Phase 5 README pass.
- Persistence of OPFS and the "Reset to seed" button only covers localStorage in fake mode.

## Next best step

Phase 2: verify the `@relate/relate-wasm` export shape, move it into a dedicated module worker (OPFS needs one), keep the single queue, and add `npm run proof` and `.farm-live.json`. Then fix the `relate` CLI flags in `scripts/seed-store.mjs`, commit `kitchen/`, and replace the DEMO.md step 6 stub with the real `./kitchen` query output.

### Remaining mission after Phase 2 (from the original plan)

1. Wow flow on Relate: apply writes to Relate, survives a reload through OPFS, "Reset to seed" restores it.
2. Guest mode in Cypher: dishes with no path to the chosen allergens, and dishes where removing one substitutable node removes every path.
3. Path panel as a graph on `/dishes/[id]` (d3-computed layout rendered in React, no new dependency).
4. Kit signatures 2 and 3.
5. Docs and submission: real query output in README, `relate` and `relate-neo4j-hackathon` topics, video under 2 minutes following DEMO.md.

### Constraints (unchanged)

Next.js 15 App Router, TypeScript strict, Tailwind v4, no API keys, no runtime filesystem writes. IDENTITY.md colors only through `app/globals.css`. All UI through `components/ui/` and `cn()`. Plain English copy with no em or en dashes and none of the cliche words banned in CLAUDE.md. A product without a spec sheet is "unknown", never "free". `npm run build` must pass after every change.
