# HANDOFF: Sinapis

Read this file, then `IDENTITY.md` (law), `CLAUDE.md` (permanent rules), `DEMO.md` (the demo contract, now 7 steps), `DELIVERY.md` (submission steps) and `SECURITY.md`. Do not restart anything.

## Goal

Sinapis is an allergen graph for a restaurant kitchen: it shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before the change is accepted. Entry for the Relate by Neo4j Hackathon (https://relate.devpost.com/), deadline 11 December 2026, 18:00 PT.

Phase 4 goal (this session): prize documentation, the path graph as DEMO step 7, a responsive and touch target audit at 360, 768 and 1280 px, site meta and empty-state copy, an orientation block on `/`, then the security pass (Part B).

## Status

Part A and Part B are written. The agent built, installed, tested and ran nothing (no shell).

| Slice | State | Evidence |
| --- | --- | --- |
| 1. Prize table and DELIVERY.md | written | `README.md:88` header row `\| Bounty \| Prize \| Slots \| Required tech \| Code file \| DEMO step \|`, three rows below it with the Bounty and Prize cells copied from the phase brief's track record; `DELIVERY.md:5`, `:11`, `:17` headings "First place", "Second place", "Third place"; `watch:` 4, 5, 7 at `DELIVERY.md:9`, `:15`, `:21`, all present in `DEMO.md` (steps 4, 5 and 7) |
| 2. Path graph, step 7 | written, unverified in a browser | `components/path-graph.tsx:1` `"use client"`, `:4` `import * as d3 from "d3"`, `:5` `motion/react`, `d3.scalePoint` (columns), `:127` `d3.scaleBand` (rows), `:137` `d3.linkHorizontal()`, `:277` `motion.path` with `pathLength` 0 to 1 staggered by column, `:160` `useReducedMotion()`, `:272` `role="img"`, `:267` `overflow-x-auto` wrapper, `:302` `<title>` per node, `:333` read-back sentence with `aria-live`, `:265` "No path reaches this allergen. The cell is clear."; wired at `components/dish-paths.tsx:12` (import) and `:153` (render, ready branch only, `state.paths.length > 0`); loading `:124` `DishPathsSkeleton`, error `:127` `ErrorState` with retry, empty `:158` to `:171` `PathsEmptyState`; DEMO step 7 at `DEMO.md:23` |
| 3. Responsive audit | written | table below |
| 4. Meta and microcopy | written | `lib/config.ts:72` `SITE_URL`; `.env.example:24` `NEXT_PUBLIC_SITE_URL=`; `app/layout.tsx:36` `metadataBase`, `:37` template `%s \| Sinapis`, `:39` `openGraph`, `:40` `twitter.card: "summary_large_image"`; description is 145 characters (counted by hand); `app/opengraph-image.tsx` claim line now starts with the title claim "Allergens traced to the supplier" |
| 5. Orientation block | written | `app/page.tsx:13` to `:17` five links: `/#matrix` (app/page.tsx), `/dishes/grilled-sea-bass?allergen=MUS` and `/dishes/lamb-shish?allergen=PNT` (app/dishes/[id]/page.tsx, ids confirmed at `data/kitchen.json:102` and `:103`), `/activity#log-change` (app/activity/page.tsx), `/dishes` (app/dishes/page.tsx) |
| 6. Security pass | written | `SECURITY.md` four sections plus data note; findings under "Security sweep" below |

### Path graph behaviour

`PathGraph({ paths, focus, kitchen })` gets the `AllergenPath[]` that `DishPaths` already fetched: no new query, no new adapter method. With a focused allergen that has paths, it draws only those paths. With a focused allergen whose matrix cell is "unknown", it draws the no-spec paths and says the cell is not cleared. With a focused allergen and no path at all, it shows the "cell is clear" line and draws every path of the dish. With no focus it draws every path. Nodes merge by `step.id`, so a shared sauce is one node. Columns come from longest-path layering, so allergens and the dashed "no spec sheet on file" node always sit in the last column, and every link runs left to right.

### Responsive audit (rule 2: overflow wrapper, rule 4: truncate or break plus title, rule 5: fixed width with a max-w companion, touch: 44 px)

| Route | Element | Rule | Result |
| --- | --- | --- | --- |
| `/dishes/[id]` | path graph SVG | 2, 5 | fine: `path-graph.tsx:267` `max-w-full overflow-x-auto`, inner min width `max(36rem, columns x 10rem)`, svg `h-auto w-full max-w-full` |
| `/dishes/[id]` | node labels | 4 | fine: clipped in code to 21 characters with a `<title>` carrying the full label and supplier |
| `/dishes/[id]` | path step chips in the group cards | 4 | fixed: `dish-paths.tsx` chip has `max-w-full break-words` and `title={s.label}` |
| `/dishes/[id]` | "All dishes" back button (`Button size="sm"`) | touch | fixed: `button.tsx:23` `max-md:min-h-11` |
| `/dishes/[id]`, `/` | `PathsEmptyState` and `MatrixEmptyState` buttons (`sm`) | touch | fixed by `button.tsx:23` |
| `/dishes/[id]` | path query retry (`ErrorState`, default size) | touch | fixed: `button.tsx:22` `max-md:min-h-11` |
| `/activity` | product select with long product names | 4, 5 | fixed: grid `grid-cols-1` below md, labels `min-w-0`, select `max-w-full truncate` with `title={product?.name}` (`supplier-change-form.tsx`) |
| `/activity` | supplier name, preview dish names, "via" path line | 4 | fixed: `min-w-0 break-words`, dish name has `title` |
| `/activity` | selects and note input | touch | fixed: `select.tsx:9` and `input.tsx:10` `max-md:min-h-11` |
| `/activity` | Preview, Apply, Discard, retry buttons (default size) | touch | fixed by `button.tsx:22` |
| `/activity` | change log dish badge links | touch, 4 | fixed: `change-log.tsx:57` `inline-flex min-h-11 max-w-full items-center` plus `title`; card title and description `break-words` |
| `/dishes` | guest allergen toggles (`sm`) | touch | fixed by `button.tsx:23` |
| `/dishes` | section filter buttons (`sm` with `h-10`) | touch | fixed by `button.tsx:23` (min-height wins over `h-10`) |
| `/dishes` | search input | touch | fixed by `input.tsx:10` |
| `/dishes` | dish row name and note | 4 | fixed: `min-w-0 break-words`, `title={dish.name}`, price and badge `shrink-0`; the row link itself is `p-4` (well over 44 px) |
| `/dishes`, `/dishes/[id]` | guest check and path retries | touch | fixed by `button.tsx:22` |
| `/` | allergen matrix table | 2, 5 | fine: `allergen-matrix.tsx:34` `max-w-full overflow-x-auto`; table min width raised to `min-w-[56rem]` (`:35`) to fit 44 px cells |
| `/` | matrix cell links | touch | fixed: `allergen-matrix.tsx:82` `min-h-11 min-w-11` (was `h-8`) |
| `/` | matrix column header buttons | touch | fixed: `allergen-matrix.tsx:52` `h-11 min-h-11 min-w-11` (was `h-7`) |
| `/` | matrix dish name links | touch, 4 | fixed: `allergen-matrix.tsx:67` `inline-flex min-h-11 break-words` plus `title` |
| `/` | allergen load chart | 2 | fine: `allergen-load-chart.tsx:52` `overflow-x-auto`, svg `min-w-[30rem]` inside it |
| `/` | "Show all allergens", "Reset to seed", "Open change log" (`sm`) | touch | fixed by `button.tsx:23` |
| `/` | orientation links | touch | fine: `app/page.tsx:67` `inline-flex min-h-11` |
| `/` | scene image | 5 | fine: `scene-slot.tsx` `h-auto w-full max-w-full` |
| all | rail section links | touch | fixed: `app-rail.tsx:39` `min-h-11` (mobile was 56 px already; desktop row was 40 px) |
| all | rail CTA "Log supplier change" (`sm`) | touch | fixed: `app-rail.tsx:50` `min-h-11` |
| all | bottom bar | nav | fine: Overview, Dishes, Change log all in `SECTIONS` at `app-rail.tsx:10` to `:14`, `md:` variants kept; added `pb-[env(safe-area-inset-bottom)]` (`:31`); `main` has `pb-28` (`layout.tsx:50`), which clears the bar of about 60 px |
| all | sticky top bar plus fixed bottom bar at 360 px | nav | fine by reading: top bar is mark plus CTA in one row (`py-3`), bottom bar one row; content scrolls between them |
| all | error and not-found | shell | fine: rendered inside `app/layout.tsx`, so the rail stays; links to `/` added in `app/error.tsx:16` (`/?reset=1`), `app/dishes/error.tsx:14`, `app/dishes/[id]/error.tsx:14`, `app/activity/error.tsx:14`; `app/not-found.tsx` already links to `/` |

## Decisions

- No `targetTracks` entry is `sponsor-bounty`. The repo holds no track file (no `targetTracks` string anywhere). The record in the phase brief lists three `main-placement` tracks with `entryMode: automatic`, so no bounty was dropped and nothing was skipped. No sponsor key was added and `.farm-live.json` is unchanged.
- Relate in an import and at a call site: `lib/relate.worker.ts:52` `await import("@relate/relate-wasm")` (a dynamic import, so the module loads only inside the worker), `:71` `mod.RelateDb!.open(RELATE_STORE_URI)`, `:111` `db.execute(cypher, ...)`.
- Path graph rows: `d3.scaleBand` spaces the rows, and each column centres its nodes on that band grid instead of giving every path its own row. Merged nodes would otherwise sit between rows, and a single chain (the wow case) stays on one straight line.
- Path graph columns: longest-path layering instead of the raw step index, because paths of different depth (dish to ingredient against dish to sauce to ingredient) would put allergens in different columns and send merged links backwards.
- The graph's links start at `pathLength` 0. That is not a server HTML issue: the paths are fetched on the client, so the graph never appears in server HTML. Under reduced motion `initial={false}` draws the final state at once.
- `DishPaths` used to say "This cell is clear" for a focused cell whose matrix state is "unknown" (a `?` cell). That broke the rule that unknown is never free. It now shows a "not cleared" empty state for that case (`dish-paths.tsx:158` to `:171`).
- Touch targets below md come from the `Button` variants (`max-md:min-h-11`) rather than per call site, so every demo-path button is covered once. Desktop heights are unchanged.
- Title claim "Allergens traced to the supplier" (five words). The OG image claim line was changed to start with the same words, because the old line disagreed with the new title.
- IDENTITY amendment added: kit signature 2 (hover read-back) now exists on the dish route.

## Failed attempts

None. No correction was attempted twice, because nothing could be run.

## Security sweep (Part B)

- Contract front skipped: no contracts/ directory, Relate is an embedded database.
- Wallet front: grep over `app/`, `components/`, `lib/` for `eth_requestAccounts|eth_sign|personal_sign|ethereum|wallet_|connect\(|approve` returned no matches.
- Key-like strings: grep over `app/`, `components/`, `lib/` for `sk-|PRIVATE_KEY|API_KEY|SECRET|[0-9a-fA-F]{64}|[A-Za-z0-9+/]{80,}={0,2}` returned no matches.
- Public env keys: `process.env` is read only in `lib/config.ts` (`ADAPTER_MODE`, `NEXT_PUBLIC_ADAPTER_MODE`, `NEXT_PUBLIC_RELATE_WASM_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BRAND_FILES`) and in `next.config.ts:20` (`ADAPTER_MODE`). All five keys are listed in `.env.example`, and none is a secret.
- `target="_blank"`: grep returned no matches, so no `rel` is missing. No new external link was added.
- `http://` in app code: one hit, `app/icon.svg:1`, the `xmlns="http://www.w3.org/2000/svg"` namespace. That is an XML identifier, not a request, and the file is on the never-touch list. Nothing else.
- Hardcoded URLs: `lib/relate.worker.ts` loads either the bundled package or `NEXT_PUBLIC_RELATE_WASM_URL` (`:50` to `:52`), with no literal URL. `next.config.ts` has none. The only literal URL in `lib/` is the https default for `SITE_URL` (`lib/config.ts:72`).
- Forms: `supplier-change-form.tsx` calls only `adapter.previewImpact` and the provider's `apply` (which writes through the adapter). The guest check in `dish-browser.tsx` calls only `adapter.guestCheck`. Grep for `fetch\(|XMLHttpRequest|sendBeacon|WebSocket` over `app/`, `components/`, `lib/` returned no matches, so nothing sends data to a third party or to a server.
- API routes: `app/api/dishes/[id]/paths/route.ts:10` `dishIdSchema.safeParse`, `app/api/guest/route.ts:15` `guestSchema.safeParse`, `app/api/impact/route.ts:15` `specChangeSchema.safeParse`, all from `lib/schemas.ts`. `app/api/dishes/route.ts` and `app/api/matrix/route.ts` take no input.
- Found but not fixed: nothing. Everything above is clean.
- Part B added no route, no dependency and no feature module. The only files it touched are `SECURITY.md` and this file.

### Note for the builder's demo video

There is no wallet, so Blockaid is not expected to flag the site. The video should show steps 1 to 7 on the live URL.

## Acceptance self-check (read from files, not run)

- Met by reading: every row of the Status table; `components/app-rail.tsx` keeps the `md:` variants and all three sections; `BrandMark` renders once (`components/app-rail.tsx:25`); `app/icon.svg` untouched; `app/opengraph-image.tsx` uses `BRAND` only; `useSearchParams` appears only in `components/dish-paths.tsx:51`, rendered under `Suspense` at `app/dishes/[id]/page.tsx:50`, and `app/dishes/page.tsx` does not use it; no `fs` write in `app/`, `components/`, `lib/`; no `console` call in `components/` or `app/` (the `[core]` lines in `lib/` are `console.info` or `console.warn` and short); no new `package.json` entry.
- Tripwire greps over `app/`, `components/`, `lib/`, README.md, DEMO.md, DELIVERY.md returned nothing for: the dead hexes, `fade-up|float-y|glow-pulse|caret-blink|pulse-dot|backdrop-blur|--delay|--d:`, the em dash, the en dash and ` -- `, and the banned vocabulary. Hex literals appear only in `app/globals.css` and `lib/brand-colors.ts`. The only `@keyframes` is `sinapis-rise` (`app/globals.css:124`).
- Unverified (needs the runner): that the build is green (especially the `d3.linkHorizontal()` and `motion.path` typings in `path-graph.tsx`); the graph's look at 360, 768 and 1280 px; that the lamb shish read-back sentence matches DEMO step 7 on the live URL; Lighthouse scores; `og:image` as an absolute URL in view-source.

## Not done

Nothing in Part A or Part B was cut.

## Files changed

Created: `DELIVERY.md`, `SECURITY.md`, `components/path-graph.tsx`, `.farm-commits.json`.

Edited: `README.md`, `DEMO.md`, `HANDOFF.md`, `IDENTITY.md` (Amendments only), `components/dish-paths.tsx`, `components/app-rail.tsx`, `components/allergen-matrix.tsx`, `components/change-log.tsx`, `components/supplier-change-form.tsx`, `components/dish-browser.tsx`, `components/overview-board.tsx`, `components/ui/button.tsx`, `components/ui/select.tsx`, `components/ui/input.tsx`, `app/error.tsx`, `app/dishes/error.tsx`, `app/dishes/[id]/error.tsx`, `app/activity/error.tsx`, `app/layout.tsx`, `app/opengraph-image.tsx`, `app/page.tsx`, `lib/config.ts`, `.env.example`.

Untouched: `data/kitchen.json`, `public/*`, `app/icon.svg`, `package.json`, `package-lock.json`, `.farm-live.json`, `kitchen/`, `app/globals.css`.

## Commands run

None, no shell. The runner must verify: `npm install`, `npm run build` (zero TypeScript errors), `npm test` (no test removed), `npm run proof`, the Vercel redeploy to the same project, the three-cycle walk of DEMO steps 1 to 7 on the live URL with `ADAPTER_MODE=real` in a private window, 360/768/1280 px with no page-level horizontal scroll, `og:image` absolute https and `twitter:card` `summary_large_image` in view-source, Lighthouse performance and accessibility at 80 or above.

## Open questions

- The path graph's `<g tabIndex={0}>` nodes sit inside an `svg role="img"`, so screen readers treat the graph as one image (the full path list is in its label and in an `sr-only` caption), while keyboard users still tab through nodes and hear the sentence through `aria-live`. If an accessibility audit flags focusable children inside `role="img"`, switch the svg to `role="group"` with the same label.
- Carried from Phase 3: whether Relate accepts every guest-check construct, and whether a cold OPFS seed fits the 3 s init budget.

## Manual checklist (human facts)

- [ ] Add the GitHub topics `relate` and `relate-neo4j-hackathon` to the repository.
- [ ] Run `npm run seed` or `npm run demo:reset` with the `relate` CLI on PATH and commit `kitchen/seed.cypher` and `kitchen/store`.
- [ ] With `ADAPTER_MODE=real`, in a private window: open `/?reset=1`, walk DEMO.md steps 1 to 7 three times, identical results, no step over 5 s, no console errors.
- [ ] Work through `DELIVERY.md` "Before submitting".
- [ ] Record the 2 minute video.

## Next best step

Phase 5, the frontend pass: kit signature 3 (an animated switch between two views of the same data, for example the load chart per allergen and cumulative), then visual polish on the graph node sizes after the runner's screenshots at 360 px.
