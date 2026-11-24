# Sinapis

An allergen graph for a restaurant kitchen. Sinapis shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before you accept the change.

> Live demo: https://sinapis-nine.vercel.app

## The problem

EU kitchens must declare 14 allergens on every dish. The dish is rarely where it goes wrong. The mistakes hide in nested sub-recipes: a green herb sauce made with ready-made mayonnaise, and mustard inside that mayonnaise. The supplier switches a production line, sends a one-line email saying the tahini "may now contain peanuts", and somebody has to work out which dishes that touches.

An independent chef with an Excel allergen matrix does that by rereading every recipe card. The spreadsheet holds an X in a cell and nothing about why it is there, so a quiet spec change is the most predictable failure in the whole system.

## The solution

Sinapis models the kitchen as a graph:

```
(:Dish)-[:USES]->(:SubRecipe)-[:USES]->(:Ingredient)-[:SUPPLIED_AS]->(:SupplierProduct)-[:CONTAINS|MAY_CONTAIN]->(:Allergen)
                                                                     (:SupplierProduct)-[:SUPPLIED_BY]->(:Supplier)
```

Every flag in the matrix is a path returned by a variable-length Cypher query. Click a cell and you see the chain behind it: *Grilled sea bass > Green herb sauce > Ready-made mayonnaise > Catering mayonnaise, 5 L (Metro Wholesale) > Mustard*.

Three things a chef can do on day one:

1. **Read the matrix.** 16 dishes by 14 allergens for Meyhane Lodos, a small meyhane in Istanbul. Contains, may contain and unknown get different colors.
2. **Log a supplier change.** Pick the product, the allergen and the new declaration. Sinapis walks the graph backwards from that product, lists every dish it reaches with the path, and writes to the graph only after the chef confirms. The changed cells light up in the matrix.
3. **Answer a guest.** On the Dishes page, pick the guest's allergens (sesame and celery, say). You get the dishes that are clear, and the dishes that would be clear if the kitchen swapped one sauce ("Roasted cauliflower: garlic yogurt sauce instead of tahini lemon sauce").

A product with no spec sheet on file is **unknown**, never **free**, and that state travels along every path it sits on. Sinapis supports the chef's decision. It is not a medical guarantee.

## How it uses Relate

Relate is the engine that answers. If you remove the relationships, no cell in the matrix can be computed.

| Question | Graph pattern | Where |
| --- | --- | --- |
| Why does this dish carry this allergen? | forward variable-length path, Dish to Allergen | `CYPHER.dishAllergenPaths` in `lib/relate.ts` |
| Which dishes break if this product changes? | reverse traversal from one SupplierProduct | `CYPHER.productImpact` |
| Which dishes are safe for this guest? | no CONTAINS, MAY_CONTAIN or unknown-spec path to the guest's allergen codes | `CYPHER.guestSafeDishes`, asked by `guestCheck` in `lib/adapter.real.ts` |
| What becomes safe if one sauce is swapped? | every offending path runs through one substitutable node, and the replacement reaches no offending product | `CYPHER.guestSwap` (the substitution list comes from `data/kitchen.json` as the `$swaps` parameter) |
| Accept the supplier's change | delete and merge one relationship, then read back the reached dishes | `CYPHER.clearDeclaration`, `addContains` or `addMayContain`, then `productReach`, sent in one worker round by `applyChange` in `lib/adapter.real.ts` |

### Which Relate mode, and why

We use **two modes on purpose**:

- **Directory store with the JSON codec, committed to this repo** (`./kitchen`). Judges can open the persistent store without running the web app, and because the codec is JSON a change in the seed shows up as a readable git diff. `npm run seed` rebuilds it from `data/kitchen.json`.
- **WebAssembly in the browser with OPFS persistence** (`opfs://sinapis-kitchen`). The live demo needs no server and no API key. The chef's accepted changes survive a reload, and a judge opening the link runs the same engine we do.

In-memory mode is not used for the store. It would leave nothing for a judge to inspect.

With `ADAPTER_MODE=real`, the browser starts one dedicated module worker (`lib/relate.worker.ts`) that loads `@relate/relate-wasm`, runs its `init()`, opens `opfs://sinapis-kitchen` with `RelateDb.open` and seeds it from `data/kitchen.json` when the seed marker is missing. Every statement goes through `db.execute(query, paramsJson)` inside one promise queue, because the WASM build rejects re-entrant calls. The page talks to the worker through `lib/relate-client.ts`. The dish path list, the impact preview, the write and the guest check (safe dishes and one-swap dishes) run on Relate. If the worker cannot load or does not answer, the same question is answered by `lib/kitchen-graph.ts`, a local mirror of the same patterns, and the note under the answer says "Sample data: answered by the local graph mirror, not by Relate." With the default `ADAPTER_MODE=fake`, everything answers from the mirror and says so. The matrix itself and the API routes always answer from the mirror.

Five-second rule: opening the worker (module download, OPFS open, first seed) has 3 s; one query attempt has 2 s, with exactly one retry, and the whole call is capped at 4.8 s. A worker that fails to open stays off for the session and every later question goes straight to the mirror. The provider asks one path query right after the page mounts, so the worker is warm before the first click on a cell.

### Reset and persistence

The only state that changes during the demo is the list of supplier changes applied in this browser. It lives in two places, both in the browser, both behind small wrappers:

- `localStorage` key `sinapis.applied.v1`, read and written only by `lib/store.ts`. The matrix replays this list on the seed, so it survives a reload in either mode.
- The Relate OPFS store `opfs://sinapis-kitchen` (real mode only), written by the apply in the worker.

The server holds no state: there is no database, no KV and no runtime file write, so there is no migration and no schema push. To return a browser to the demo start state, press "Reset to seed" on the overview (shown after a local change) or open `/?reset=1`. Both clear the localStorage list and, in real mode, wipe the OPFS store and write the seed again in one queued worker job. `npm run demo:reset` rebuilds `kitchen/seed.cypher` (and `kitchen/store` when the `relate` CLI is on PATH) and prints the reset URL and the walk list.

### Three queries to paste into `relate` against ./kitchen

```cypher
// 1. Why is the sea bass flagged for mustard?
MATCH p = (d:Dish {id: "grilled-sea-bass"})-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct)-[:CONTAINS]->(:Allergen {code: "MUS"})
RETURN [n IN nodes(p) | coalesce(n.name, n.code)] AS path;

// 2. Which dishes does the tahini tin reach?
MATCH p = (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(:SupplierProduct {id: "p-tahini"})
RETURN d.name AS dish, [n IN nodes(p) | n.name] AS via ORDER BY dish;

// 3. Which dishes depend on a product with no spec sheet?
MATCH (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct {specKnown: false})
RETURN DISTINCT d.name AS dish, sp.name AS unknownProduct;
```

To expose the same store to an agent over MCP, run `relate serve --mcp --database kitchen/store` (check the subcommand against `relate --help` for your version).

## Prize tracks

This hackathon has no sponsor bounty. All three tracks are main placements, entered automatically, and each one rests on the same Relate code.

| Bounty | Prize | Slots | Required tech | Code file | DEMO step |
| --- | --- | --- | --- | --- | --- |
| First place | Mac Studio (M5 Max, 64GB / 1TB) valued at $3,799 | 1 | Relate | `lib/adapter.real.ts` (engine calls through `lib/relate.worker.ts`) | 4, 5, 6 |
| Second place | Mac mini (M6, 32GB / 512GB) valued at $1,499 | 1 | Relate | `lib/adapter.real.ts` (engine calls through `lib/relate.worker.ts`) | 4, 5, 6 |
| Third place | Mac mini (M6, 16GB / 256GB) valued at $899 | 1 | Relate | `lib/adapter.real.ts` (engine calls through `lib/relate.worker.ts`) | 4, 5, 6 |

Deleting `lib/adapter.real.ts` and `lib/relate.worker.ts` breaks DEMO steps 2, 4 and 6, because no mirror-free answer remains. Submission steps per track are in `DELIVERY.md`.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn-style primitives (Radix Slot, class-variance-authority, clsx, tailwind-merge, lucide-react)
- Relate by Neo4j: `@relate/relate-wasm` in a dedicated browser worker with OPFS persistence, `relate` CLI for the directory store
- Cypher 25 (variable-length paths)
- d3 (scales and stacks only) and Motion for the allergen load chart
- zod for input validation at the API edge
- tsx and `node:test` for the tests
- Vercel, no API keys, Relate runs in the browser; API routes answer from the local mirror

## Quickstart

```bash
npm install
npm run dev          # http://localhost:3000, works with zero env vars
npm run seed         # writes kitchen/seed.cypher and, if `relate` is on PATH, rebuilds kitchen/store
npm test             # pinned kitchen facts and input schemas (node:test through tsx)
npm run proof        # runs the tests, the seed and the Relate queries, and rewrites the proof blocks below
npm run demo:reset   # rebuilds the seed, prints the /?reset=1 URL and the three-cycle demo walk
```

To run the browser path on Relate instead of the local mirror, copy `.env.example` to `.env.local` and set `ADAPTER_MODE=real`. The bundled `@relate/relate-wasm` package is used; `NEXT_PUBLIC_RELATE_WASM_URL` is only an optional override for loading the module from another URL. The note under each answer says "Live engine: Relate (WASM, stored in this browser with OPFS)." when Relate answered, and "Sample data: answered by the local graph mirror, not by Relate." when it did not.

## Proof from the last build

`npm run proof` writes these lines from what it actually ran. A line that starts with "Not run in this build" means the check could not run, and says why.

- Tests:
<!-- PROOF:BEGIN tests -->
`npm test` on 2026-11-24: 17 passed, 0 failed, exit 0, 0.7 s.
<!-- PROOF:END tests -->
- Relate engine:
<!-- PROOF:BEGIN relate-engine -->
`CYPHER.productImpact` for `p-tahini` on @relate/relate-wasm 1.2.0 in Node, in-memory store seeded with 187 statements, on 2026-11-24: 8 rows, 7 distinct dishes, 30.7 ms.
<!-- PROOF:END relate-engine -->
- Guest check on Relate (Sesame plus Celery):
<!-- PROOF:BEGIN guest -->
`CYPHER.guestSafeDishes` and `CYPHER.guestSwap` for Sesame plus Celery on @relate/relate-wasm 1.2.0 in Node, in-memory store seeded with 187 statements, on 2026-11-24: 3 safe dishes (cacik, grilled-sea-bass, zucchini-fritters), 3 safe with one swap (baba-ghanoush, fried-calamari, roast-cauliflower), roasted cauliflower with the garlic yogurt sauce swap: yes, 70.6 ms.
<!-- PROOF:END guest -->
- Seed store:
<!-- PROOF:BEGIN seed-store -->
`node scripts/seed-store.mjs` on 2026-11-24: wrote kitchen/seed.cypher with 187 statements for 16 dishes. kitchen/store built: no (seed: store not built, the relate CLI is not on PATH (ENOENT).).
<!-- PROOF:END seed-store -->

## Seed data

`data/kitchen.json` holds 16 dishes, 10 sub-recipes, 22 supplier products from 6 suppliers and the 14 EU allergens. Allergen declarations follow the kind of statements printed on real catering labels (mayonnaise with egg and mustard, stock powder with celery, tahini with sesame). Suppliers and dish names are realistic but invented for the demo. One product (loose pul biber) has no spec sheet, so it shows the "unknown" path.

## What we would build next

- Import a supplier spec sheet PDF and propose the graph change for the chef to confirm.
- A printable allergen card per dish, with the path printed beside each flag for the inspector.
- Several sites sharing one supplier graph, so a change at one supplier warns every kitchen that uses it.
- Draw the suppliers as their own column in the dish path graph, so a supplier with several products shows as one node.

## Declarations

- **Relate capabilities used:** embedded WASM engine with OPFS persistence, directory store with the JSON codec, CLI, variable-length Cypher paths, write transactions.
- **Third-party libraries:** Next.js, React, Tailwind CSS, d3, Motion, zod, lucide-react, class-variance-authority, tailwind-merge, clsx, Radix Slot, and tsx for the tests. All open source. No code written before 11 November 2026.

## AI use

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
