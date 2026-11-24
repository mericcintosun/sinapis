# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D20 clayblock
GROUND: #a8432f terracotta-block
SURFACE: #963a28
DEEP: #84311f
LINE: #c96a55
INK: #fff4e6
ACCENT: #1a1210 kiln-black
ON_ACCENT: #fff4e6
SECOND: none
OK: #c8f0c0
WARN: #ffd98a
BAD: #ffd0c4
FONT_DISPLAY: F13 DM Serif Display (next/font/google: DM_Serif_Display, weight: ["400"] is required)
FONT_BODY: DM Sans (next/font/google: DM_Sans)
FONT_MONO: none
STRUCTURE: S4 app-shell
ARCHETYPE: L6 rail
MOTION: M1 rise, prefix sinapis-
KIT: K5 dataviz
RADIUS: soft
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. The most recent projects it differs from: Open Agentic Web Challenge (D15, S3, L1, K2); Build with CMC: API Hackathon (Plushie) (D2, S6, L5, K6). It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D20 clayblock

Full terracotta color blocks with cream type and cream cards.

Surface treatment: Whole sections are flat terracotta blocks, content sits on cream cards with dark ink text, big serif headlines in cream directly on the block, no shadows, no gradients.

Every hex in app/globals.css comes from the key block above. RADIUS soft means 0.375rem on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S4 app-shell

A persistent application shell with a rail on every route; no marketing page anywhere.

Route map (name the bracketed parts with the product's own words):
- `/` : the overview with a welcome state built from the seed
- `/<entities>` : the list of the product's main records, with filter and search
- `/<entities>/[id]` : the record detail, where the core action happens
- `/activity` : the history of what happened (or `/settings` when history makes no sense)

Rules:
- the rail (mark, sections, one primary action) persists on every route and collapses to a bottom bar on mobile
- the overview is useful on first load: seeded records, one obvious next action
- list and detail are real routes; a detail link can be opened cold

## Archetype: L6 rail (the composition of the home route)

A persistent left rail (mark, nav, ONE CTA) with the content pane on the right; the home route IS the app shell with a welcome state; no marketing hero exists.

MUSTs: the rail persists across routes; the welcome state uses real seed data; the rail holds the only CTA.
Bans: a marketing hero above the shell; a second nav in a header.

## Motion: M1 rise (the entrance signature)

translateY(18px) to 0 plus fade, cubic-bezier(0.16, 1, 0.3, 1), 500ms. One keyframe block implements it; every keyframe name starts with `sinapis-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K5 dataviz

D3 for the math, React for the SVG, Motion for the transitions: data as the main visual.

Packages for package.json dependencies: "d3": "^7.9.2", "motion": "^14.14.0". devDependencies: "@types/d3": "^7.4.3".

Typical import: `import * as d3 from "d3"; import { motion } from "motion/react";`

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. a hero chart drawn in SVG from the real seed with d3 scales and shapes, entering by line draw (`pathLength`) or bar growth
2. a brush, scrubber or hover crosshair that rewrites a sentence on the page ("on <date> the value was <n>")
3. an animated switch between two views of the same data (for example per day and cumulative) with interpolated shapes

Rules:
- d3 does math only (scale, shape, array); React renders the SVG; never `d3.select` DOM mutation
- every chart has a text summary for screen readers
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)

- 2026-11-24, Phase 4: kit signature 2 shipped as `components/path-graph.tsx` on `/dishes/[id]`. d3 `scalePoint`, `scaleBand` and `linkHorizontal` do the layout, React renders the SVG, and `motion.path` draws the links with `pathLength`. Hovering or focusing a node rewrites the sentence under the graph. No new package.
- 2026-11-24, Phase 5: kit signature 3 shipped in `components/allergen-load-chart.tsx` on `/`. A `components/ui/toggle-group.tsx` button group (aria-pressed, arrow keys, no tablist) switches "Per allergen" and "Cumulative"; d3 computes the running total with `d3.cumsum` and the step line with `d3.line` and `curveStepAfter`, and Motion interpolates every bar's `d` between the two shapes. No new package.
- 2026-11-24, Phase 5: six scene slots placed through `components/scene-slot.tsx`: 1 on `/`, 2 on `/dishes`, 3 on `/dishes/[id]`, 4 and 5 on `/activity`, 6 on the not-found page. `public/illustrations/scene-4.svg` to `scene-6.svg` added in the key block palette.
