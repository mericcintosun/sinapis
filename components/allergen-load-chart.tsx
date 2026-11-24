"use client";

import * as d3 from "d3";
import { motion, useReducedMotion } from "motion/react";
import type { AllergenCode } from "@/lib/data";
import { cn } from "@/lib/utils";

export interface LoadRow {
  code: AllergenCode;
  name: string;
  contains: number;
  may: number;
  unknown: number;
}

const KEYS = ["contains", "may", "unknown"] as const;
const FILL: Record<(typeof KEYS)[number], string> = {
  contains: "fill-bad",
  may: "fill-warn",
  unknown: "fill-transparent stroke-ink [stroke-dasharray:3_3]",
};
const W = 720;
const H = 280;
const M = { t: 14, r: 8, b: 40, l: 30 };

// Signature interaction 1 (K5): the hero chart. d3 does the math (band + linear
// scales, stack), React renders the SVG, Motion grows each segment when the graph
// changes (a supplier change applied in the change log re-stacks these bars).
export function AllergenLoadChart({
  rows,
  dishCount,
  focus,
  onFocus,
}: {
  rows: LoadRow[];
  dishCount: number;
  focus: AllergenCode | null;
  onFocus: (code: AllergenCode | null) => void;
}) {
  const reduce = useReducedMotion();
  const x = d3.scaleBand<string>().domain(rows.map((r) => r.code)).range([M.l, W - M.r]).padding(0.28);
  const y = d3.scaleLinear().domain([0, dishCount]).range([H - M.b, M.t]);
  const series = d3.stack<LoadRow, (typeof KEYS)[number]>().keys(KEYS)(rows);
  const bar = (x0: number, w: number, top: number, bottom: number) =>
    `M${x0.toFixed(1)},${bottom.toFixed(1)} V${top.toFixed(1)} H${(x0 + w).toFixed(1)} V${bottom.toFixed(1)} Z`;

  const worst = [...rows].sort((a, b) => b.contains + b.may - (a.contains + a.may))[0];
  const summary = `${worst.name} is the heaviest allergen on the menu: ${worst.contains} dishes contain it and ${worst.may} may contain it, out of ${dishCount}.`;

  return (
    <figure className="space-y-3">
      <div className="max-w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[30rem]" role="img" aria-label={summary}>
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink/70 text-[11px]">
              {t}
            </text>
          </g>
        ))}
        {series.map((s) =>
          s.map((seg) => {
            const code = seg.data.code;
            const x0 = x(code) ?? 0;
            return (
              <motion.path
                key={`${s.key}-${code}`}
                initial={false}
                animate={{ d: bar(x0, x.bandwidth(), y(seg[1]), y(seg[0])) }}
                transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={cn(FILL[s.key], focus && focus !== code && "opacity-35")}
              />
            );
          }),
        )}
        {rows.map((r) => (
          <g key={r.code}>
            <text
              x={(x(r.code) ?? 0) + x.bandwidth() / 2}
              y={H - M.b + 18}
              textAnchor="middle"
              className={cn("text-[11px] font-semibold", focus === r.code ? "fill-ink" : "fill-ink/75")}
            >
              {r.code}
            </text>
            <rect
              x={(x(r.code) ?? 0) - 4}
              y={M.t}
              width={x.bandwidth() + 8}
              height={H - M.t}
              className="cursor-pointer fill-transparent"
              onClick={() => onFocus(focus === r.code ? null : r.code)}
            >
              <title>{`${r.name}: ${r.contains} contain, ${r.may} may contain, ${r.unknown} unknown`}</title>
            </rect>
          </g>
        ))}
      </svg>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/85">
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-bad" />Contains</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-warn" />May contain</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm border border-dashed border-ink" />Unknown spec</span>
        <span className="sr-only">{summary}</span>
      </figcaption>
    </figure>
  );
}
