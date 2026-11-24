# Sinapis

An allergen graph for a restaurant kitchen. Sinapis shows which sauce and which supplier product put each allergen on each dish, and when a supplier changes a recipe it lists the affected dishes before you accept the change.

> Live demo: https://sinapis.vercel.app

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
| What becomes safe if one sauce is swapped? | path minus one node, re-evaluated | `guestCheck` in `lib/kitchen-graph.ts` (moves to Cypher next) |
| Accept the supplier's change | write transaction: delete and merge one relationship | `commitSpecChange` |

### Which Relate mode, and why

We use **two modes on purpose**:

- **Directory store with the JSON codec, committed to this repo** (`./kitchen`). Judges can open the persistent store without running the web app, and because the codec is JSON a change in the seed shows up as a readable git diff. `npm run seed` rebuilds it from `data/kitchen.json`.
- **WebAssembly in the browser with OPFS persistence** (`opfs://sinapis-kitchen`). The live demo needs no server and no API key. The chef's accepted changes survive a reload, and a judge opening the link runs the same engine we do.

In-memory mode is not used for the store. It would leave nothing for a judge to inspect.

All queries go through one promise queue in `lib/relate.ts`, because the WASM build rejects re-entrant calls. When `NEXT_PUBLIC_RELATE_WASM_URL` is not set, the UI falls back to `lib/kitchen-graph.ts`, a local mirror of the same patterns, and labels every answer with the engine that produced it.

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

To expose the same store to an agent over MCP, run `relate serve --mcp --store kitchen/store` (check the flag names against `relate --help` for your version).

## Tech stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn-style primitives
- Relate by Neo4j: `@relate/relate-wasm` in the browser, loaded from `NEXT_PUBLIC_RELATE_WASM_URL` when set (not bundled), `relate` CLI for the directory store
- Cypher 25 (variable-length paths)
- d3 (scales and stacks only) and Motion for the allergen load chart
- Vercel static deploy, no API keys

## Quickstart

```bash
npm install
npm run dev          # http://localhost:3000, works with zero env vars
npm run seed         # writes kitchen/seed.cypher and, if `relate` is on PATH, rebuilds kitchen/store
```

To run the browser path on Relate instead of the local mirror, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_RELATE_WASM_URL` to the `@relate/relate-wasm` module URL. The recorded demo runs with this variable set. The engine label under each answer says `relate-wasm`.

## Seed data

`data/kitchen.json` holds 16 dishes, 10 sub-recipes, 22 supplier products from 6 suppliers and the 14 EU allergens. Allergen declarations follow the kind of statements printed on real catering labels (mayonnaise with egg and mustard, stock powder with celery, tahini with sesame). Suppliers and dish names are realistic but invented for the demo. One product (loose pul biber) has no spec sheet, so it shows the "unknown" path.

## What we would build next

- Import a supplier spec sheet PDF and propose the graph change for the chef to confirm.
- A printable allergen card per dish, with the path printed beside each flag for the inspector.
- Several sites sharing one supplier graph, so a change at one supplier warns every kitchen that uses it.
- A Cytoscape panel that draws the dish subgraph instead of the text path.

## Declarations

- **Relate capabilities used:** embedded WASM engine with OPFS persistence, directory store with the JSON codec, CLI, variable-length Cypher paths, write transactions.
- **Third-party libraries:** Next.js, React, Tailwind CSS, d3, Motion, lucide-react, class-variance-authority, tailwind-merge, clsx, Radix Slot. All open source. No code written before 11 November 2026.

## AI use

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
