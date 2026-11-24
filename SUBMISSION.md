# Devpost submission fields: Sinapis

Fields in Devpost form order, ready to paste. Character limits are the Devpost defaults; counts are approximate, check them in the form.

## Project title (max 60 characters)

Sinapis: allergens traced to the supplier

## Tagline (max 200 characters)

An allergen graph for restaurant kitchens. When a supplier changes a recipe, Sinapis lists every dish it reaches, with the sauce path, before the change is accepted.

## Description (About the project, markdown)

### The problem

EU kitchens must declare 14 allergens on every dish, and the mistakes hide in nested sub-recipes: a green herb sauce made with ready-made mayonnaise, with mustard inside the mayonnaise. When a supplier emails "our tahini may now contain peanuts", a chef with a spreadsheet rereads every recipe card to find the dishes it touches.

### What it does

Sinapis keeps the kitchen as one graph: dish, sub-recipe, ingredient, supplier product, allergen. In the demo kitchen (Meyhane Lodos, 16 dishes, 10 sub-recipes, 22 supplier products from 6 suppliers):

- The overview shows the allergen load chart (per allergen or cumulative) and the matrix of 16 dishes by the 14 EU allergens. Every cell opens the path that put the allergen there.
- "Log supplier change" takes the supplier's new declaration, walks the graph backwards from the product and lists every reached dish with its sauce path. For "Stone-ground tahini may contain peanuts" that is 7 dishes. Apply writes the change and the 7 Peanuts cells turn red.
- The dish page draws the paths as a graph; hovering or tabbing a node reads the path back in a sentence.
- The guest check lists the dishes that are clear for a guest's allergens, and the dishes one sauce swap away from clear.

A product with no spec sheet is "unknown", never "free". Sinapis is decision support, not a medical guarantee.

### What connects to what

The Next.js pages call one adapter (`lib/adapter.ts`). With `ADAPTER_MODE=real`, it sends Cypher to `@relate/relate-wasm` running in a dedicated browser worker (`lib/relate.worker.ts`) on the store `opfs://sinapis-kitchen`. If the worker cannot answer inside 5 seconds, a local mirror of the same patterns (`lib/kitchen-graph.ts`) answers, and the UI says which engine answered under every result. `npm run seed` writes `kitchen/seed.cypher` from `data/kitchen.json` and builds the JSON directory store in `kitchen/store` with the `relate` CLI.

## Relate mode and why

Two modes on purpose. In the browser, Relate runs as WebAssembly with OPFS persistence: the live demo needs no server and no API key, accepted changes survive a reload, and a judge runs the same engine we do. In the repo, the directory store with the JSON codec (`kitchen/store`) lets judges open the graph without the web app, and a change to the seed shows up as a readable git diff.

## Relate capabilities used

Embedded WASM engine with OPFS persistence, directory store with the JSON codec, the `relate` CLI, variable-length Cypher paths (forward from a dish, reverse from a supplier product), write transactions for the supplier change.

## Third-party tools

Next.js 15, React 19, Tailwind CSS 4, d3 7, Motion 14, zod 3, Radix Slot, lucide-react, class-variance-authority, tailwind-merge, clsx, tsx. All open source.

## AI tools disclosure

The hackathon rules allow AI tools; the participant is responsible for the result, its originality and its license fit, and significant use must be disclosed. We used AI coding assistants for scaffolding, boilerplate, the interface pass and documentation drafts. Architecture, product decisions and final review are our own.

## Pre-existing code statement

No code in this repository was written before 11 November 2026. Third-party packages are used through npm under their own licenses.

## Public repo URL

https://github.com/mericcintosun/sinapis

## Live demo URL

https://sinapis-nine.vercel.app

## Topics line

relate, relate-neo4j-hackathon

## Tracks

All three tracks are main placements, entered automatically: First place, Second place, Third place.
