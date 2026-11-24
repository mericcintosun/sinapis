"use client";

import * as React from "react";
import * as d3 from "d3";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { AllergenCode } from "@/lib/data";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface LoadRow {
  code: AllergenCode;
  name: string;
  contains: number;
  may: number;
  unknown: number;
}

type View = "per" | "cumulative";

const KEYS = ["contains", "may", "unknown"] as const;
const FILL: Record<(typeof KEYS)[number], string> = {
  contains: "fill-bad",
  may: "fill-warn",
  unknown: "fill-transparent stroke-ink [stroke-dasharray:3_3]",
};
const W = 720;
const H = 290;
const M = { t: 24, r: 8, b: 40, l: 34 };
const EASE = [0.16, 1, 0.3, 1] as const;

function bar(x0: number, w: number, top: number, bottom: number): string {
  return `M${x0.toFixed(1)},${bottom.toFixed(1)} V${top.toFixed(1)} H${(x0 + w).toFixed(1)} V${bottom.toFixed(1)} Z`;
}

// Signatures 1 and 3 (K5). d3 does the math: band and linear scales, the stack, the running
// total (d3.cumsum) and the step line (d3.line with curveStepAfter). React renders the SVG.
// Motion grows the bars once when the chart scrolls into view (the server HTML already holds
// them at full height), interpolates every bar between the per-allergen view and the
// cumulative view, and draws the running-total line. Both views read the same matrix rows.
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
  const [view, setView] = React.useState<View>("per");
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [growing, setGrowing] = React.useState(false);
  const [grown, setGrown] = React.useState(false);

  React.useEffect(() => {
    if (inView && !reduce) setGrowing(true);
  }, [inView, reduce]);
  React.useEffect(() => {
    if (!growing) return;
    const t = window.setTimeout(() => setGrown(true), 1100);
    return () => window.clearTimeout(t);
  }, [growing]);

  const totals = rows.map((r) => r.contains + r.may + r.unknown);
  const running = Array.from(d3.cumsum(totals));
  const grand = running[running.length - 1] ?? 0;
  const cells = dishCount * rows.length;

  const x = d3.scaleBand<string>().domain(rows.map((r) => r.code)).range([M.l, W - M.r]).padding(0.28);
  const y = d3
    .scaleLinear()
    .domain([0, view === "per" ? Math.max(dishCount, 1) : Math.max(grand, 1)])
    .range([H - M.b, M.t]);
  const series = d3.stack<LoadRow, (typeof KEYS)[number]>().keys(KEYS)(rows);
  const offsetOf = (i: number) => (view === "cumulative" ? running[i] - totals[i] : 0);

  const stepPoints: [number, number][] = [
    [M.l, y(0)],
    ...rows.map((r, i): [number, number] => [x(r.code) ?? 0, y(running[i])]),
    [W - M.r, y(grand)],
  ];
  const stepLine = d3.line<[number, number]>().curve(d3.curveStepAfter)(stepPoints) ?? "";

  const sum = (k: (typeof KEYS)[number]) => d3.sum(rows, (r) => r[k]);
  const worst = [...rows].sort((a, b) => b.contains + b.may - (a.contains + a.may))[0];
  const summary =
    view === "per"
      ? worst
        ? `Per allergen: ${worst.name} carries the most flags, ${worst.contains} of ${dishCount} dishes contain it and ${worst.may} may contain it. Click a bar to focus the matrix.`
        : "Per allergen: no dishes on the menu."
      : `Cumulative: added up across the ${rows.length} allergens, the matrix holds ${grand} flagged cells out of ${cells}. ${sum("contains")} contain, ${sum("may")} may contain, ${sum("unknown")} rest on a product with no spec sheet.`;

  const motionFor = (target: string, base: string) => ({
    animate: { d: growing && !grown ? [base, target] : target },
    transition: reduce ? { duration: 0 } : { duration: growing && !grown ? 0.8 : 0.6, ease: EASE },
  });

  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-12 text-ink" aria-live="polite">
          {summary}
        </p>
        <ToggleGroup value={view} onValueChange={(v) => setView(v as View)} aria-label="Chart view">
          <ToggleGroupItem value="per">Per allergen</ToggleGroupItem>
          <ToggleGroupItem value="cumulative">Cumulative</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p className="text-xs text-ink md:hidden">Swipe sideways for all 14 allergens.</p>
      <div ref={ref} className="max-w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[40rem] md:min-w-0" role="img" aria-label={summary}>
          {y.ticks(4).map((t) => (
            <g key={`${view}-${t}`}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
              <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink/85 text-[12px]">
                {t}
              </text>
            </g>
          ))}
          {series.map((s) =>
            s.map((seg, i) => {
              const code = seg.data.code;
              const x0 = x(code) ?? 0;
              const off = offsetOf(i);
              const target = bar(x0, x.bandwidth(), y(off + seg[1]), y(off + seg[0]));
              const base = bar(x0, x.bandwidth(), y(off), y(off));
              return (
                <motion.path
                  key={`${s.key}-${code}`}
                  initial={false}
                  {...motionFor(target, base)}
                  className={cn(FILL[s.key], focus && focus !== code && "opacity-35")}
                />
              );
            }),
          )}
          {view === "cumulative" && (
            <>
              <motion.path
                d={stepLine}
                fill="none"
                strokeWidth={2.5}
                className="stroke-ink"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.25, ease: EASE }}
              />
              {rows.map((r, i) => (
                <text
                  key={`total-${r.code}`}
                  x={(x(r.code) ?? 0) + x.bandwidth() / 2}
                  y={y(running[i]) - 7}
                  textAnchor="middle"
                  className="fill-ink text-[12px] font-semibold"
                >
                  {running[i]}
                </text>
              ))}
            </>
          )}
          {rows.map((r) => (
            <g key={r.code}>
              <text
                x={(x(r.code) ?? 0) + x.bandwidth() / 2}
                y={H - M.b + 20}
                textAnchor="middle"
                className={cn("text-[12px] font-semibold", focus === r.code ? "fill-ink" : "fill-ink/85")}
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
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-bad" />Contains</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-warn" />May contain</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm border border-dashed border-ink" />Unknown spec</span>
        {view === "cumulative" && (
          <span className="flex items-center gap-2"><span className="h-0.5 w-4 bg-ink" />Running total of flagged cells</span>
        )}
        <span className="sr-only">{summary} The column headers of the matrix below focus the same allergens from the keyboard.</span>
      </figcaption>
    </figure>
  );
}
