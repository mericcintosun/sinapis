"use client";

import * as React from "react";
import * as d3 from "d3";
import { motion, useReducedMotion } from "motion/react";
import type { AllergenCode, Kitchen } from "@/lib/data";
import type { AllergenPath, NodeKind } from "@/lib/kitchen-graph";
import { cn } from "@/lib/utils";

// Signature interaction 2 (K5), scoped to the dish route: the paths DishPaths already
// fetched, drawn as one graph. d3 does the math (point and band scales, horizontal
// links), React renders the SVG, Motion draws each link with pathLength. Hovering or
// focusing a node rewrites the sentence under the graph from the same paths.

const NO_SPEC = "__no-spec";
const NODE_W = 150;
const NODE_H = 46;
const COL_W = 180;
const ROW_H = 62;
const PAD = 12;
const EASE = [0.16, 1, 0.3, 1] as const;

const KIND_LABEL: Record<NodeKind | "NoSpec", string> = {
  Dish: "Dish",
  SubRecipe: "Sub-recipe",
  Ingredient: "Ingredient",
  SupplierProduct: "Supplier product",
  Supplier: "Supplier",
  Allergen: "Allergen",
  NoSpec: "Unknown spec",
};

interface GraphNode {
  id: string;
  label: string;
  /** Small line above the label: the supplier for a product, the kind otherwise. */
  sub: string;
  kind: NodeKind | "NoSpec";
  status: "contains" | "may" | null;
  allergen: AllergenCode | null;
  paths: Set<number>;
  col: number;
  x: number;
  y: number;
}

interface GraphLink {
  id: string;
  d: string;
  col: number;
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function layout(paths: AllergenPath[], supplierOf: (productId: string) => string | undefined) {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, [string, string]>();

  paths.forEach((p, i) => {
    const chain = p.steps.map((s) => s.id);
    if (p.status === "unknown") chain.push(NO_SPEC);
    chain.forEach((id, j) => {
      let node = nodes.get(id);
      if (!node) {
        const step = p.steps[j];
        const kind: GraphNode["kind"] = id === NO_SPEC ? "NoSpec" : step.kind;
        node = {
          id,
          label: id === NO_SPEC ? "no spec sheet on file" : step.label,
          sub: kind === "SupplierProduct" ? supplierOf(id) ?? KIND_LABEL[kind] : KIND_LABEL[kind],
          kind,
          status: null,
          allergen: kind === "Allergen" ? p.allergen : null,
          paths: new Set(),
          col: 0,
          x: 0,
          y: 0,
        };
        nodes.set(id, node);
      }
      node.paths.add(i);
      if (node.kind === "Allergen" && p.status !== "unknown") {
        node.status = node.status === "contains" || p.status === "contains" ? "contains" : "may";
      }
      if (j > 0) edges.set(`${chain[j - 1]}>${id}`, [chain[j - 1], id]);
    });
  });

  // Longest-path layering, so every link runs left to right even when sub-recipes nest
  // to different depths. The allergens and the no-spec node share the last column.
  for (let pass = 0; pass < nodes.size; pass++) {
    let moved = false;
    for (const [a, b] of edges.values()) {
      const want = nodes.get(a)!.col + 1;
      if (nodes.get(b)!.col < want) {
        nodes.get(b)!.col = want;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const lastCol = d3.max([...nodes.values()], (n) => n.col) ?? 0;
  for (const n of nodes.values()) if (n.kind === "Allergen" || n.kind === "NoSpec") n.col = lastCol;

  const columns = d3.range(lastCol + 1).map((c) =>
    [...nodes.values()]
      .filter((n) => n.col === c)
      .sort((a, b) => (d3.min([...a.paths]) ?? 0) - (d3.min([...b.paths]) ?? 0)),
  );
  const rowCount = d3.max(columns, (c) => c.length) ?? 1;

  const width = (lastCol + 1) * COL_W - (COL_W - NODE_W) + PAD * 2;
  const height = rowCount * ROW_H + PAD * 2;
  const x = d3
    .scalePoint<number>()
    .domain(d3.range(lastCol + 1))
    .range([PAD + NODE_W / 2, width - PAD - NODE_W / 2]);
  const y = d3.scaleBand<number>().domain(d3.range(rowCount)).range([PAD, height - PAD]);

  for (const column of columns) {
    const offset = (rowCount - column.length) / 2;
    column.forEach((n, r) => {
      n.x = x(n.col) ?? PAD + NODE_W / 2;
      n.y = PAD + (offset + r) * y.step() + y.bandwidth() / 2;
    });
  }

  const linkPath = d3.linkHorizontal();
  const links: GraphLink[] = [...edges.entries()].map(([id, [a, b]]) => {
    const s = nodes.get(a)!;
    const t = nodes.get(b)!;
    return {
      id,
      col: s.col,
      d: linkPath({ source: [s.x + NODE_W / 2, s.y], target: [t.x - NODE_W / 2, t.y] }) ?? "",
    };
  });

  return { nodes: [...nodes.values()], links, width, height, cols: lastCol + 1 };
}

export function PathGraph({
  paths,
  focus,
  kitchen,
}: {
  paths: AllergenPath[];
  focus: AllergenCode | null;
  kitchen: Kitchen;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState<string | null>(null);

  const supplierOf = React.useCallback(
    (productId: string) => {
      const p = kitchen.products.find((x) => x.id === productId);
      return kitchen.suppliers.find((s) => s.id === p?.supplierId)?.name;
    },
    [kitchen],
  );
  const allergenName = React.useCallback(
    (code: AllergenCode | null) => (code ? kitchen.allergens.find((a) => a.code === code)?.name ?? code : "an unknown spec"),
    [kitchen],
  );

  // Which paths the graph draws: the focused allergen's paths, else (for a focused cell
  // with no declared path) the no-spec paths that keep it from clearing, else all paths.
  const { direct, noSpec, view, drawn } = React.useMemo(() => {
    const direct = focus ? paths.filter((p) => p.allergen === focus) : [];
    const noSpec = paths.filter((p) => p.status === "unknown");
    const view: "direct" | "unknown" | "clear" | "all" = !focus
      ? "all"
      : direct.length > 0
        ? "direct"
        : noSpec.length > 0
          ? "unknown"
          : "clear";
    const drawn = view === "direct" ? direct : view === "unknown" ? noSpec : paths;
    return { direct, noSpec, view, drawn };
  }, [paths, focus]);

  const graph = React.useMemo(() => layout(drawn, supplierOf), [drawn, supplierOf]);
  const drawKey = `${focus ?? "all"}:${drawn.length}:${graph.links.length}`;

  const full = (n: GraphNode) => (n.kind === "SupplierProduct" && n.sub !== KIND_LABEL.SupplierProduct ? `${n.label} (${n.sub})` : n.label);
  const productsOf = (ps: AllergenPath[]) => [
    ...new Set(
      ps.flatMap((p) => p.steps.filter((s) => s.kind === "SupplierProduct").map((s) => {
        const sup = supplierOf(s.id);
        return sup ? `${s.label} (${sup})` : s.label;
      })),
    ),
  ];

  const total = paths.length;
  const focusName = focus ? allergenName(focus) : "";

  const restingSentence = (() => {
    if (view === "direct") {
      const word = direct.some((p) => p.status === "contains") ? "contains" : "may contain";
      return `${focusName} reaches this dish on ${plural(direct.length, "path")} (${word}), through ${listWords(productsOf(direct))}.`;
    }
    if (view === "unknown") {
      return `No declared path reaches ${focusName}, but ${plural(noSpec.length, "path")} end on ${listWords(productsOf(noSpec))}, which has no spec sheet on file, so the cell is not cleared.`;
    }
    const named = [...new Set(paths.filter((p) => p.allergen).map((p) => allergenName(p.allergen)))];
    const parts = noSpec.length > 0 ? [...named, "an unknown spec"] : named;
    return `${plural(total, "path")} from this dish reach ${listWords(parts)}. Hover or tab to a node to read it back.`;
  })();

  const activeNode = graph.nodes.find((n) => n.id === active) ?? null;
  const sentence = (() => {
    if (!activeNode) return restingSentence;
    const through = drawn.filter((_, i) => activeNode.paths.has(i));
    const n = through.length;
    if (activeNode.kind === "Dish") {
      return `${activeNode.label} starts ${n === 1 ? "the 1 path" : `all ${n} paths`} drawn here, out of ${plural(total, "path")} for this dish.`;
    }
    if (activeNode.kind === "Allergen") {
      const word = activeNode.status === "contains" ? "contains" : "may contain";
      return `${activeNode.label} is reached on ${n} of this dish's ${plural(total, "path")} (${word}), via ${listWords(productsOf(through))}.`;
    }
    if (activeNode.kind === "NoSpec") {
      return `${n} of this dish's ${plural(total, "path")} end on a product with no spec sheet on file, so the dish is not cleared for any allergen it could carry.`;
    }
    const reached = [...new Set(through.map((p) => allergenName(p.allergen)))];
    return `${full(activeNode)} reaches ${listWords(reached)} on ${n} of this dish's ${plural(total, "path")}.`;
  })();

  const summary = drawn
    .map((p) => {
      const chain = p.steps.map((s) => s.label);
      if (p.status === "unknown") chain.push("no spec sheet on file");
      return chain.join(" > ");
    })
    .join(". ");

  // Badge palette: contains on BAD, may contain on WARN, the no-spec node dashed like the
  // "unknown" badge, the dish on kiln-black, every step between on cream.
  const styleOf = (n: GraphNode, on: boolean) => {
    const fill =
      n.kind === "Allergen" ? (n.status === "contains" ? "fill-bad" : "fill-warn") : n.kind === "Dish" ? "fill-kiln" : "fill-ink";
    const stroke = on
      ? "stroke-kiln"
      : n.kind === "NoSpec"
        ? "stroke-kiln"
        : n.kind === "Allergen" || n.kind === "Dish"
          ? "stroke-transparent"
          : "stroke-kiln/25";
    return cn(fill, stroke, n.kind === "NoSpec" && "[stroke-dasharray:4_3]");
  };

  return (
    <figure className="space-y-3">
      {view === "clear" && (
        <p className="text-sm font-semibold text-kiln">No path reaches this allergen. The cell is clear.</p>
      )}
      <div className="max-w-full overflow-x-auto rounded-md bg-kiln/5">
        <div style={{ minWidth: `${Math.max(36, graph.cols * 10)}rem` }}>
          <svg
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            className="h-auto w-full max-w-full"
            role="group"
            aria-label={`Allergen path graph, ${plural(drawn.length, "path")} drawn. ${summary}.`}
          >
            <g key={drawKey}>
              {graph.links.map((l) => (
                <motion.path
                  key={l.id}
                  d={l.d}
                  fill="none"
                  strokeWidth={2}
                  className="stroke-kiln/45"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.5, delay: l.col * 0.18, ease: EASE }}
                />
              ))}
            </g>
            {graph.nodes.map((n) => {
              const on = active === n.id || (n.kind === "Allergen" && n.allergen === focus);
              const dark = n.kind === "Dish";
              return (
                <g
                  key={n.id}
                  tabIndex={0}
                  className="cursor-default outline-none"
                  onMouseEnter={() => setActive(n.id)}
                  onMouseLeave={() => setActive((a) => (a === n.id ? null : a))}
                  onFocus={() => setActive(n.id)}
                  onBlur={() => setActive((a) => (a === n.id ? null : a))}
                >
                  <title>{`${KIND_LABEL[n.kind]}: ${full(n)}`}</title>
                  <rect
                    x={n.x - NODE_W / 2}
                    y={n.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    strokeWidth={on ? 2.5 : 1}
                    className={styleOf(n, on)}
                  />
                  <text
                    x={n.x - NODE_W / 2 + 10}
                    y={n.y - 6}
                    className={cn("text-[9px] font-semibold uppercase tracking-wide", dark ? "fill-on-kiln/70" : "fill-kiln/60")}
                  >
                    {clip(n.sub, 26)}
                  </text>
                  <text
                    x={n.x - NODE_W / 2 + 10}
                    y={n.y + 11}
                    className={cn("text-[12px] font-semibold", dark ? "fill-on-kiln" : "fill-kiln")}
                  >
                    {clip(n.label, 21)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <figcaption className="space-y-1">
        <p className="min-h-11 rounded-md bg-kiln/5 px-3 py-2 text-sm font-medium text-kiln" aria-live="polite">
          {sentence}
        </p>
        <span className="sr-only">Paths drawn: {summary}.</span>
      </figcaption>
    </figure>
  );
}
