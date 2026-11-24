# HANDOFF: Sinapis

Read this file, then `IDENTITY.md` (law), `CLAUDE.md` (permanent rules), `DEMO.md` (the demo contract, 7 steps), `DELIVERY.md` (submission steps), `SECURITY.md` and `SUBMISSION.md` (Devpost fields). Do not restart anything.

## Goal

Sinapis is an allergen graph for a restaurant kitchen: it shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before the change is accepted. Entry for the Relate by Neo4j Hackathon (https://relate.devpost.com/), deadline 11 December 2026, 18:00 PT.

Phase 5 goal (this session): the live site reads as a finished product on a cold open, kit signature 3 ships on `/`, six scene slots are placed, and the submission package (README, SUBMISSION.md, this checklist) is complete. All seven DEMO.md steps keep the same routes, ids and results.

## Status

The agent built, installed, tested and ran nothing (no shell). Everything below was checked by reading files and with the Grep tool.

| Slice | State | Evidence |
| --- | --- | --- |
| A1 tokens, fonts, heading scale | written | `app/globals.css:6` to `:15` equal the IDENTITY key block; `app/globals.css` `@layer base` gives h1 `font-size: var(--text-display)`, h2 `var(--text-headline)`, `main p { max-width: 70ch; }`; `app/layout.tsx:2` imports `DM_Sans, DM_Serif_Display` from `next/font/google`, `:10` `weight: ["400"]` |
| A2 rail shell and welcome state | written | `components/app-rail.tsx`: sections Overview, Dishes, Activity plus "Source on GitHub" in the footer; one `Log supplier change` button to `/activity#log-change`; links left aligned on desktop (`md:justify-start`); bottom bar below md kept. `app/page.tsx`: compact welcome header from the seed (`{k.dishes.length} dishes, {k.allergens.length} allergens, {k.products.length} supplier products`), one-line claim, the five-step walk folded in a `<details>`, no second CTA |
| A3 primitives | written | new `components/ui/toggle-group.tsx` (shadcn form, no Radix); bare `<button`, `<input`, `<select` only in `components/ui/`; no `rounded-xl`; matrix moved onto its own SURFACE block with a cream h2 and a cream card (`components/overview-board.tsx`) |
| A4 brand and responsive | written | one mark: `components/app-rail.tsx` `<BrandMark size={32} />` inside the only home `Link`; matrix dish column `sticky left-0 z-10 bg-card` plus a mobile swipe hint; clear cells tinted `bg-kiln/5`; chart `min-w-[40rem] md:min-w-0` with a mobile swipe hint; mobile footer is one sentence plus the repo link (`app/layout.tsx`); `app/opengraph-image.tsx` untouched |
| B1 entrance and rail awareness | written | `sinapis-rise-group` on the overview wrapper and board (nth-child timing in `app/globals.css`, no inline delay); rail lists "Allergen load" and "Allergen matrix" under Overview on `/` and marks the section in view with `aria-current="location"` (IntersectionObserver in `components/app-rail.tsx`); bars grow with Motion once the chart is in view (`useInView` in `components/allergen-load-chart.tsx`) |
| B2 signature 3 | written, unverified in a browser | `components/allergen-load-chart.tsx`: `"use client"`, `import * as d3 from "d3"`, `motion/react`; `d3.cumsum(totals)`, `d3.line<[number, number]>().curve(d3.curveStepAfter)`, `d3.stack`; every bar's `d` interpolates between per-allergen and cumulative (waterfall) shapes; the step line draws with `pathLength`; the summary sentence (`aria-live="polite"`, also the svg `aria-label`) changes per view; no `d3.select` |
| B3 scene slots | written | six one-line `<SceneSlot n={N}` calls, table below |
| B4 reduced motion | written | `app/globals.css` `@media (prefers-reduced-motion: reduce)` disables `sinapis-rise`; `useReducedMotion()` in `components/allergen-load-chart.tsx` (signatures 1 and 3) and `components/path-graph.tsx` (signature 2) |
| C1 README | written | `README.md`: two sentences, live URL with the DEMO steps, "Try it in 60 seconds", addresses table with one row, mermaid diagram of the real modules, five-command quickstart, prize table unchanged, Relate mode rationale, engine line in the UI's words, declarations, AI policy, decision-support line |
| C2 SUBMISSION.md | written | Devpost fields in order, no video field, no person-only field |
| C3 hygiene | checked | `.gitignore:4` `.env*`, `:5` `!.env.example`; `.env.example` lists all five keys; no key-like string added; `REPO_URL` is a constant in `lib/config.ts`, not an env key |

### Scene slots (slot, route, file)

| Slot | Route | Call site | File rendered |
| --- | --- | --- | --- |
| 1 | `/` (welcome header, right panel, wide 960x640, hidden below sm) | `app/page.tsx` | `public/illustrations/scene-1.svg` (SVG fallback) |
| 2 | `/dishes` (list header, 960x600) | `app/dishes/page.tsx` | `public/illustrations/scene-2.svg` (SVG fallback) |
| 3 | `/dishes/[id]` (header above the path graph, 960x600) | `app/dishes/[id]/page.tsx` | `public/illustrations/scene-3.svg` (SVG fallback) |
| 4 | `/activity` (beside the supplier change form, tall 720x880) | `app/activity/page.tsx` | `public/illustrations/scene-4.svg` (new, SVG fallback) |
| 5 | `/activity` (empty change log state, square 480x480) | `components/change-log.tsx` | `public/illustrations/scene-5.svg` (new, SVG fallback) |
| 6 | not-found page (480x520) | `app/not-found.tsx` | `public/illustrations/scene-6.svg` (new, SVG fallback) |

All six render the SVG fallback: no `public/brand/scene-N.png` exists. An uploaded PNG wins automatically through `lib/brand-files.ts`.

### Interaction to file

- Signature 1, hero chart with bar growth: `components/allergen-load-chart.tsx`, data from `allergenLoad(kitchen, matrix)` in `lib/kitchen-graph.ts`, which counts the matrix replayed on `data/kitchen.json`.
- Signature 2, path graph with read-back: `components/path-graph.tsx` on `/dishes/[id]`.
- Signature 3, per-allergen and cumulative switch: `components/allergen-load-chart.tsx` with `components/ui/toggle-group.tsx`. The running totals are `d3.cumsum` over the same rows, so every number on the chart comes from the matrix.

## Decisions

- The welcome h1 states seed counts in words instead of a slogan. The old headline read as a marketing hero (BEFORE desktop fold) and pushed the matrix two screens down.
- The cumulative view is a waterfall: each allergen's stack sits on the running total of the allergens before it, and a step line traces the total. The bar paths keep the same command structure in both views, so Motion can interpolate `d`.
- Server HTML draws the bars at full height (`initial={false}`). The growth plays once in the browser when the chart scrolls into view, from the baseline back to full height, so nothing is server-rendered empty. Under reduced motion it never plays.
- The chart's bar click targets have no keyboard path of their own; the matrix column header buttons focus the same allergens from the keyboard, and the sr-only caption says so. The toggle buttons are native buttons with arrow-key movement.
- The rail section is labelled "Activity" after its route; the page h1 stays "Change log". DEMO.md names only the rail CTA, which did not change.
- The path graph svg is now `role="group"` with the same label, because its nodes are focusable (Phase 4 open question).
- Scene 1 to 4 are hidden below the sm breakpoint so the mobile fold shows data, not art.
- CLAUDE.md lists `public/illustrations/*` as never-touch; this phase's brief asked for new scene-4 to scene-6 SVGs, so three files were added and scene-1 to scene-3 were not changed.

## Failed attempts

None. Nothing could be run, so no correction was attempted twice.

## Not done or not met (honest list)

- "Grep `useReducedMotion` matches in all three kit components": it matches in the two kit files (`components/allergen-load-chart.tsx` holds signatures 1 and 3, `components/path-graph.tsx` holds signature 2). `components/ui/toggle-group.tsx` has no motion to guard.
- The bar growth replays from the baseline after hydration, so a reader with JavaScript sees full bars, a short drop, then growth. This is a judgment call against "animate from the visible state only"; set `growing` to never turn on in `components/allergen-load-chart.tsx` if the human judges it a flash.
- No LICENSE file exists. Choosing one is a human decision (open question below).
- `kitchen/store` is not in the repo (only `kitchen/seed.cypher`); the README says so through the proof block.
- Build, tests, Lighthouse, live walk: unverified (no shell).

## Files changed

Created: `components/ui/toggle-group.tsx`, `public/illustrations/scene-4.svg`, `public/illustrations/scene-5.svg`, `public/illustrations/scene-6.svg`, `SUBMISSION.md`, `docs/SCREENSHOTS.md`, `.farm-commits.json`.

Edited: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/dishes/page.tsx`, `app/dishes/[id]/page.tsx`, `app/activity/page.tsx`, `app/not-found.tsx`, `components/app-rail.tsx`, `components/overview-board.tsx`, `components/allergen-load-chart.tsx`, `components/allergen-matrix.tsx`, `components/change-log.tsx`, `components/path-graph.tsx`, `lib/config.ts` (one constant), `README.md`, `IDENTITY.md` (Amendments only), `HANDOFF.md`.

Untouched: `package.json`, `package-lock.json`, `data/kitchen.json`, `kitchen/`, `lib/adapter*.ts`, `lib/relate*.ts`, `lib/kitchen-graph.ts`, `app/api/**`, `app/icon.svg`, `app/opengraph-image.tsx`, `public/brand/`, `public/__farm.txt`, `.farm-live.json`, tests.

## Commands run

None, no shell. The runner must verify: `npm install`, `npm run build` with zero TypeScript errors (watch `motion.path` with a keyframe array for `d`, `useInView` with a `RefObject<HTMLDivElement | null>`, and `d3.line<[number, number]>()` in `components/allergen-load-chart.tsx`), `npm test` (no test removed), `npm run proof`, the Vercel redeploy, the three-cycle walk, 360/768/1280 px without page-level horizontal scroll, Lighthouse performance and accessibility at 80 or above, `og:image` as an absolute https URL.

## Open questions

- Which license should the repo carry? No LICENSE file exists, and the README says so.
- Resolved in QA round 1: `ADAPTER_MODE` now defaults to `real` in code. If the Vercel project still sets `ADAPTER_MODE=fake` as an env var, remove it, or the live answers stay on the mirror.
- Carried from Phase 3: whether Relate accepts every guest-check construct. The cold OPFS seed no longer has to fit 3 s (see QA round 1).

## QA round 1 (live crawl, 2026-11-24)

| Finding | Root cause | Fix |
| --- | --- | --- |
| data: "Sample data" badge on `/` | the live build ran `ADAPTER_MODE=fake` (the old code default, `lib/config.ts` and `next.config.ts`), so every answer came from the mirror; and even in real mode the overview matrix was mirror-only by design (`matrixEngine: fakeAdapter.matrixEngine`) | default flipped to `real` (`lib/config.ts`, `next.config.ts`, `.env.example`); the overview matrix is now asked from Relate in the browser: `CYPHER.matrixDeclared` and `CYPHER.matrixUnknown` in `lib/relate.ts`, `rowsToMatrix`, `realAdapter.getMatrix` in `lib/adapter.real.ts`, re-asked after every Apply and reset in `components/kitchen-provider.tsx` |
| data: "Sample data: answered by the local graph mirror, not by Relate." | same as above; plus a second cause waiting behind it: the worker open had a sticky 3 s timeout, and `relate_bg.wasm` is 7.2 MB, so a cold load would have switched Relate off for the whole session | `lib/relate-client.ts`: the open may take up to `WORKER_OPEN_MAX_MS` (30 s, `lib/config.ts`); a single step still gives up after 3 s and uses the mirror, but the open keeps going and later steps use Relate. `getMatrix` waits for the open (`relateReady()`), since the seed matrix is already on screen. Notes in `components/engine-note.tsx`: "Asking Relate" while waiting, "Live engine" when Relate answered, "Local mirror" with one calm sentence on a genuine fallback |
| proof: `npm test` 17 passed | not a failure | none; added a `matrix` proof block (`scripts/proof.mjs`, README) that runs the two new matrix queries on Relate in Node |

Unverified here (no shell): build, tests, and that the crawl sees "Live engine" on `/`. The parity check (`[core] parity ok` in the console) compares Relate's matrix with the mirror's cell by cell.

## QA round 2 (live crawl, 2026-11-24)

| Finding | Root cause | Fix |
| --- | --- | --- |
| proof: `npm test` 17 passed, 0 failed | not a failure | none |
| screenshots of `/dishes/[id]`: "Local mirror. Relate could not open in this browser" on a cold load | the dish page asks `getDishPaths` right away; the 7.2 MB WASM open outlasts the 3 s step budget, so the mirror answered and the note claimed Relate could not open, while the open was still running and later succeeded. The overview never showed this because `getMatrix` already waits for `relateReady()`. The guest check on `/dishes` had the same race | `askRelate` in `lib/adapter.ts` (new `whenReady()` on the adapter seam, `lib/adapter.real.ts`, `lib/adapter.fake.ts`): a mirror answer in real mode is shown at once as "Asking Relate", the call waits for the open and asks again, and switches the note to "Live engine". Only a genuine open failure keeps "Local mirror". Used in `components/dish-paths.tsx` and `components/dish-browser.tsx` |

Unverified here (no shell): build, and that the crawl now sees "Live engine" on a dish page (a crawl that screenshots before the WASM open ends will see "Asking Relate", which is honest).

## QA round 3 (live crawl, 2026-11-24)

| Finding | Root cause | Fix |
| --- | --- | --- |
| proof: `npm test` 17 passed, 0 failed, exit 0 | not a failure | none |

Observation, not a crawl finding: the round 3 screenshots of `/dishes/[id]` still show "Local mirror" after the round 2 fix shipped. Since `askRelate` (`lib/adapter.ts`) now only shows that note when `relateReady()` resolves false, the crawler's headless browser either failed the open or hit `WORKER_OPEN_MAX_MS` (30 s). Its console warn `[sinapis] relate open failed <code> <ms>` (`lib/relate-client.ts`) will tell you which: `not_configured` is the module or WASM instantiation, `upstream_error` is the OPFS open, `upstream_timeout` is the 7.2 MB download. The note is already calm and true, so no code changed in this pass. Check it in a normal browser before deciding whether it needs work.

## QA: external findings

None. Every finding so far had its cause inside this repo.

## Next best step

Phases 6 and 7: the judge rounds on the live URL (compare the live site against the BEFORE shots defect by defect), then the freeze and tag.

## Manual checklist (human facts)

- [ ] Add the GitHub topics `relate` and `relate-neo4j-hackathon` to the repository.
- [ ] Run `npm run demo:reset` with the `relate` CLI on PATH and commit `kitchen/seed.cypher` and `kitchen/store`.
- [ ] With `ADAPTER_MODE=real`, in a private window: open `/?reset=1`, walk DEMO.md steps 1 to 7 three times in a row, identical results, no step over 5 s, no console errors.
- [ ] Work through `DELIVERY.md` "Before submitting".
- [ ] Record the 2 minute video.
- [ ] Fill the person-only Devpost fields (team members, eligibility confirmations) yourself; paste the rest from `SUBMISSION.md`.
- [ ] Confirm the repo stays public until winners are announced.
