"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AllergenCode } from "@/lib/data";
import type { Engine, ImpactRow, SpecChange } from "@/lib/types";
import { useKitchen, useKitchenAdapter } from "@/components/kitchen-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Phase =
  | { kind: "editing" }
  | { kind: "previewing" }
  | { kind: "preview"; engine: Engine; rows: ImpactRow[] }
  | { kind: "applied"; engine: Engine; count: number }
  | { kind: "error"; message: string };

const STATUS_WORD = { contains: "contains", may: "may contain", unknown: "unknown", free: "clear" } as const;

// Wow moment: the chef types in the supplier's email, previews which dishes it
// breaks (reverse traversal, read only), then commits it as a write.
export function SupplierChangeForm() {
  const { kitchen, apply } = useKitchen();
  const adapter = useKitchenAdapter();
  const [change, setChange] = React.useState<SpecChange>({
    productId: "p-tahini",
    allergen: "PNT",
    kind: "may",
    note: "Antep Tahin Evi, 24 Nov: tahini is now roasted on a line shared with peanuts.",
  });
  const [phase, setPhase] = React.useState<Phase>({ kind: "editing" });
  const set = (patch: Partial<SpecChange>) => {
    setChange((c) => ({ ...c, ...patch }));
    setPhase({ kind: "editing" });
  };

  const preview = async () => {
    setPhase({ kind: "previewing" });
    try {
      const r = await adapter.previewImpact(change, kitchen);
      setPhase({ kind: "preview", engine: r.engine, rows: r.data });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Preview failed" });
    }
  };

  const commit = async (rows: ImpactRow[]) => {
    try {
      const engine = await apply(change, rows.map((r) => r.dish.id));
      setPhase({ kind: "applied", engine, count: rows.length });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Write failed" });
    }
  };

  const product = kitchen.products.find((p) => p.id === change.productId);
  const supplier = kitchen.suppliers.find((s) => s.id === product?.supplierId);

  return (
    <Card id="log-change" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Log a supplier change</CardTitle>
        <CardDescription className="max-w-[68ch]">
          Enter what the supplier told you. Sinapis walks the graph backwards from the product and lists every dish it
          reaches before anything is written.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[2fr_1.2fr_1.2fr]">
          <label className="space-y-1 text-sm font-medium">
            Supplier product
            <Select value={change.productId} onChange={(e) => set({ productId: e.target.value })}>
              {kitchen.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            Declaration
            <Select value={change.kind} onChange={(e) => set({ kind: e.target.value as SpecChange["kind"] })}>
              <option value="may">May contain</option>
              <option value="contains">Contains</option>
              <option value="clear">No longer declared</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            Allergen
            <Select value={change.allergen} onChange={(e) => set({ allergen: e.target.value as AllergenCode })}>
              {kitchen.allergens.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="block space-y-1 text-sm font-medium">
          What the supplier said
          <Input value={change.note} onChange={(e) => set({ note: e.target.value })} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={preview} disabled={phase.kind === "previewing" || !change.note.trim()}>
            {phase.kind === "previewing" ? "Walking the graph" : "Preview impact"}
          </Button>
          <span className="text-sm text-kiln/70">Supplier: {supplier?.name}</span>
        </div>

        {phase.kind === "error" && (
          <p className="rounded-md bg-bad p-3 text-sm">Something failed: {phase.message}. Your menu was not changed.</p>
        )}

        {phase.kind === "preview" && (
          <div className="space-y-3 border-t border-kiln/15 pt-5">
            {phase.rows.length === 0 ? (
              <p className="text-sm">
                No dish changes status. Either no dish uses {product?.name}, or the declaration already says this.
              </p>
            ) : (
              <>
                <p className="font-display text-2xl">
                  {phase.rows.length} {phase.rows.length === 1 ? "dish changes" : "dishes change"}
                </p>
                <ul className="sinapis-rise-group space-y-2">
                  {phase.rows.map((r) => (
                    <li key={r.dish.id} className="sinapis-rise rounded-md bg-kiln/5 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.dish.name}</span>
                        <Badge variant={r.before}>{STATUS_WORD[r.before]}</Badge>
                        <ChevronRight className="size-3.5" aria-hidden />
                        <Badge variant={r.after}>{STATUS_WORD[r.after]}</Badge>
                      </div>
                      <p className="mt-1 text-kiln/70">via {r.via.slice(1).map((s) => s.label).join(" > ")}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => commit(phase.rows)}>Apply to the kitchen graph</Button>
                  <Button variant="quiet" onClick={() => setPhase({ kind: "editing" })}>
                    Discard
                  </Button>
                </div>
                <p className="text-xs text-kiln/60">
                  Preview answered by {phase.engine === "relate-wasm" ? "Relate WASM" : "the local graph mirror"}.
                </p>
              </>
            )}
          </div>
        )}

        {phase.kind === "applied" && (
          <div className="sinapis-rise flex flex-wrap items-center justify-between gap-3 rounded-md bg-ok p-4 text-sm">
            <span>
              Written to {phase.engine === "relate-wasm" ? "Relate" : "the local graph"}. {phase.count} dishes re-flagged
              on the matrix.
            </span>
            <Button asChild size="sm">
              <Link href="/">See the matrix</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
