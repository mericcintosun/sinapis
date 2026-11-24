# HANDOFF: Sinapis

You are picking up a working Next.js scaffold. Read this file, then `IDENTITY.md`, then start on the Mission list. Do not restart anything.

## 1. Context

- **Product:** Sinapis. An allergen graph for a restaurant kitchen: it shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before the change is accepted.
- **Pitch:** A restaurant owner or head chef opens the app and sees every dish on the menu against the 14 EU allergens in one table. Clicking a cell shows, step by step, which sauce, which ready-made mix and which supplier product brought that allergen in. When a supplier emails "our tahini may now contain peanuts", the chef enters it and every affected dish turns red. When a guest says they are allergic to sesame and celery, the waiter sees the safe dishes, plus the dishes that become safe if one sauce is swapped, in a few seconds.
- **Hackathon:** Relate by Neo4j Hackathon (https://relate.devpost.com/), online.
- **Deadline:** 11 December 2026, 18:00 PT (12 December 02:00 UTC). Winners around 17 December.
- **Target track:** First place (Mac Studio). Second and third place come from the same ranking, so there is one submission and no extra tickets.
- **Judging (overview page):** Relate and connected context 30, Functionality 25, Usefulness 20, Documentation 15, Creativity 10. The rules page says "weighted equally". Plan for the 30-point criterion either way.
- **Submission requirements (verified):**
  1. Devpost description: what it does, why it is useful, the use case and what connects to what.
  2. Public GitHub repo tagged with the `relate` topic (required) and `relate-neo4j-hackathon` (suggested). It must stay public and tagged until winners are announced.
  3. README with install and run steps, and which Relate mode is used (in-memory, directory, single file) and why, following their template.
  4. A persistent Relate store (directory or single file) in the repo, or shown in the demo.
  5. Working code where Relate actually runs. Prompt-only entries are not judged.
  6. Demo video up to 2 minutes (1 to 2 suggested, no login or paywall) or a working demo link.
  7. A declaration of Relate capabilities, third-party tools and AI tools used.
  8. Disclose any pre-existing own code or open source libraries. Project must start on or after 11 November 2026.

## 2. Current state

Identity: see IDENTITY.md (direction D20, structure S4, archetype L6, kit K5)

### Routes (S4 app shell, all linked from the rail in `components/app-rail.tsx`)

| Route | File | What renders |
| --- | --- | --- |
| `/` | `app/page.tsx` | Welcome state from the seed, allergen load chart, latest change, full matrix |
| `/dishes` | `app/dishes/page.tsx` | Menu list with search, section filter and guest allergen check |
| `/dishes/[id]` | `app/dishes/[id]/page.tsx` | One dish with every allergen path; `?allergen=MUS` focuses one flag. Statically generated for all 16 dishes |
| `/activity` | `app/activity/page.tsx` | Supplier change form (preview, then apply) and change history |

The rail holds the only CTA: "Log supplier change" to `/activity#log-change`. It docks to the bottom on mobile.

### File map

- `data/kitchen.json`: the seed. Meyhane Lodos, Istanbul: 16 dishes, 10 sub-recipes, 22 supplier products, 6 suppliers, 14 allergens, 3 substitutions, change history. Single source of truth.
- `lib/data.ts`: types and the typed seed export.
- `lib/kitchen-graph.ts`: the local mirror of the graph queries (`dishPaths`, `buildMatrix`, `previewImpact`, `applySpecChange`, `guestCheck`, `allergenLoad`).
- `lib/relate.ts`: **the Relate adapter.** `CYPHER` holds the real queries, `seedStatements` builds the seed, `fetchDishPaths`, `fetchImpact`, `commitSpecChange` run on `@relate/relate-wasm` when `NEXT_PUBLIC_RELATE_WASM_URL` is set and fall back to the mirror otherwise. One promise queue serializes calls.
- `components/kitchen-provider.tsx`: client state; replays applied changes on top of the seed, persists them in localStorage, marks fresh cells.
- `components/overview-board.tsx`, `allergen-load-chart.tsx`, `allergen-matrix.tsx`: the home pane.
- `components/dish-browser.tsx`, `dish-paths.tsx`: list and detail.
- `components/supplier-change-form.tsx`, `change-log.tsx`: the wow flow.
- `scripts/seed-store.mjs` (`npm run seed`): writes `kitchen/seed.cypher`, then builds `kitchen/store` with the `relate` CLI if it is installed.
- `components/ui/`: button, card, badge, input, select. Clayblock treatment, 0.375rem radius, no shadows.
- Brand: `public/logo.svg`, `app/icon.svg` (mustard flower glyph), `app/opengraph-image.tsx`, `public/illustrations/scene-1..3.svg` used by `<SceneSlot n={1..3}>` on `/`, `/dishes`, `/activity`.

### Real vs mocked

- Real: every computation in the UI (matrix, paths, impact preview, guest check) runs on the seed graph.
- Mocked or unverified:
  - `openRelate` in `lib/relate.ts` assumes `mod.open(uri)` returning `{ run(cypher, params) }`. **Not tested against the real package.** Confirm the export shape first.
  - Without the env var, all answers come from `lib/kitchen-graph.ts` (the UI labels this as "local graph mirror").
  - `guestCheck` (safe dishes and one-swap suggestions) only exists in the mirror. It has no Cypher yet.
  - `scripts/seed-store.mjs`: the `relate run --store --codec json --file` flags are a guess. `kitchen/` is not committed yet.
  - `@relate/relate-wasm` is **not** in package.json because it is loaded by URL. Decide whether to install it and import it from a Web Worker instead.

### Interaction kit K5

- **Shipped (signature 1):** `components/allergen-load-chart.tsx`, a stacked bar chart of dishes per allergen (contains / may / unknown) built with d3 scales and stack, rendered by React, bars grow with Motion. It re-stacks when a supplier change is applied, and clicking a bar focuses the matrix column. Has a screen reader summary.
- **Remaining (signature 2):** a hover crosshair on the chart that rewrites the sentence above it ("Mustard: 4 dishes contain it, via green herb sauce and ..."), naming the sub-recipes responsible.
- **Remaining (signature 3):** an animated switch between "by allergen" and "by supplier" views of the same flags, with interpolated bar shapes.

### One-mark proof (header home link in `components/app-rail.tsx`)

```tsx
<Link href="/" className="flex items-center gap-2.5 font-display text-2xl text-ink">
  <BrandMark size={32} />
  Sinapis
</Link>
```

## 3. Mission (in priority order)

1. **Make Relate WASM real (3.5 h, do this first).** Install or host `@relate/relate-wasm`, move it into a dedicated module worker, keep the single queue. Test the variable-length path on a 5-node toy graph within the first hour. If `[:USES*1..6]` misbehaves, switch to fixed-depth UNION patterns (depth up to 5) the same hour and write that in the README. Done = the engine label on `/dishes/grilled-sea-bass` reads "Relate (WASM, OPFS store)" and matches the mirror on all 16 dishes.
2. **The persistent store (2.5 h).** Fix the CLI flags in `scripts/seed-store.mjs`, run `npm run seed`, commit `kitchen/`. Run the three README queries against it and paste real output into the README. Done = a judge can clone and query without the web app.
3. **Wow moment: supplier change (2.5 h, finish by end of day 1 of build).** On `/activity`: pick "Stone-ground tahini, 2 kg tin", Peanuts, May contain. The preview lists every reached dish with its sauce path, Apply writes to Relate, and the matrix cells and chart bars animate on `/`. Done = the full flow is under 10 seconds on camera, survives a reload (OPFS), and "Reset to seed" restores it.
4. **Guest mode in Cypher (1.5 h).** Port `guestCheck` to a query: dishes with no path to the chosen allergens, and dishes where removing one substitutable node removes every path. Done = sesame + celery shows the safe list and "Roasted cauliflower: garlic yogurt sauce instead of tahini lemon sauce".
5. **Path panel as a graph (2 h).** Draw the dish subgraph on `/dishes/[id]` with the highlighted path. Cytoscape is in the original plan; a d3-computed layout rendered in React fits K5 better and adds no dependency. Pick one.
6. **Kit signatures 2 and 3 (1.5 h)** as described above.
7. **Docs and submission (1.5 h).** README sections already exist: fill real query output, add the `relate` topics on GitHub, record the video (under 2 minutes) following the demo script below.

### Demo script (90 seconds)

- 0 to 15 s: open the live link. "A 16-dish meyhane menu, 14 allergens, all in a Relate graph running in the browser." Matrix on screen.
- 15 to 35 s: click Grilled sea bass x Mustard. Path: sea bass > green herb sauce > ready-made mayonnaise > catering mayonnaise (Metro) > mustard. "In Excel this cell is an X. Here it has a reason."
- 35 to 60 s: the tahini email. Enter it, preview lists the dishes with paths, Apply, cells turn red.
- 60 to 80 s: Dishes page, guest picks sesame + celery, safe list plus the cauliflower swap.
- 80 to 90 s: terminal, query 2 from the README against `./kitchen` returns the same dishes.

## 4. Constraints

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (no tailwind.config), deploys as a static Vercel app. No server, no API keys, no runtime filesystem writes.
- `IDENTITY.md` is law: colors only from its key block via the tokens in `app/globals.css`, DM Serif Display for every h1 and h2, DM Sans body, the S4 routes, the L6 rail with one CTA, the `sinapis-rise` entrance, the K5 kit rules (d3 for math only, no `d3.select`, client components only, readable without JS, reduced motion honored). Append amendments below its Amendments heading; never edit above it.
- All UI goes through `components/ui/` and `cn()`. No raw hex in components.
- Copy: English, no em dashes or en dashes, no AI-cliche words (seamless, leverage, robust, unlock and friends), plain human tone. Always say "unknown", never imply "free", for a product without a spec sheet. Keep the "decision support, not a medical guarantee" line visible.
- If something threatens the deadline, cut scope (path panel graph, kit signature 3) before cutting the Relate integration or the wow flow.
- `npm run build` must pass after every change.

## 5. Definition of done

- Deployed on Vercel at https://sinapis.vercel.app with `NEXT_PUBLIC_RELATE_WASM_URL` set, so the live demo runs on Relate.
- `kitchen/` store committed, README queries verified against it, repo public with `relate` and `relate-neo4j-hackathon` topics.
- The 90-second demo flow works end to end on seed data, the wow moment rehearsed at least twice, video under 2 minutes linked on Devpost.
- README declarations and AI use section reviewed by the team.
