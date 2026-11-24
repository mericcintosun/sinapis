"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AllergenCode } from "@/lib/data";
import type { Engine, ImpactRow, SpecChange } from "@/lib/types";
import { useKitchen, useKitchenAdapter } from "@/components/kitchen-provider";
import { EngineNote } from "@/components/engine-note";
import { ErrorState } from "@/components/route-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Phase =
  | { kind: "editing" }
  | { kind: "preview"; engine: Engine; rows: ImpactRow[] }
  | { kind: "applied"; engine: Engine; count: number }
  /** `retry` re-issues exactly the call that failed: the preview, or the apply of these rows. */
  | { kind: "error"; message: string; retry: { op: "preview" } | { op: "apply"; rows: ImpactRow[]; engine: Engine } };

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
  // Pending flags bound to the buttons: set before the await, cleared in finally.
  const [previewing, setPreviewing] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  // Same guard as a ref, so two clicks in one frame (before the re-render) still write once.
  const applyingRef = React.useRef(false);
  const busy = previewing || applying;
  const set = (patch: Partial<SpecChange>) => {
    if (busy) return;
    setChange((c) => ({ ...c, ...patch }));
    setPhase({ kind: "editing" });
  };

  const preview = async () => {
    if (previewing || applying) return;
    setPreviewing(true);
    try {
      const r = await adapter.previewImpact(change, kitchen);
      setPhase({ kind: "preview", engine: r.engine, rows: r.data });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Preview failed", retry: { op: "preview" } });
    } finally {
      setPreviewing(false);
    }
  };

  const commit = async (rows: ImpactRow[], previewEngine: Engine) => {
    if (applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      const engine = await apply(change, rows.map((r) => r.dish.id));
      setPhase({ kind: "applied", engine, count: rows.length });
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Write failed",
        retry: { op: "apply", rows, engine: previewEngine },
      });
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  };

  const retry = () => {
    if (phase.kind !== "error") return;
    const r = phase.retry;
    if (r.op === "preview") void preview();
    else void commit(r.rows, r.engine);
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
          <Button onClick={() => void preview()} disabled={previewing || applying || !change.note.trim()} aria-busy={previewing}>
            {previewing ? "Walking the graph" : "Preview impact"}
          </Button>
          <span className="text-sm text-kiln/70">Supplier: {supplier?.name}</span>
        </div>

        {phase.kind === "error" && (
          <ErrorState
            className="bg-bad"
            title={phase.retry.op === "apply" ? "The write did not go through" : "The preview did not run"}
            hint={`${phase.message}. Your menu was not changed. Try again to send the same ${phase.retry.op === "apply" ? "change" : "question"}.`}
            retryLabel={phase.retry.op === "apply" ? "Apply again" : "Preview again"}
            onRetry={retry}
          />
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
                  <Button
                    onClick={() => void commit(phase.rows, phase.engine)}
                    disabled={applying}
                    aria-busy={applying}
                  >
                    {applying ? "Writing to the graph" : "Apply to the kitchen graph"}
                  </Button>
                  <Button variant="quiet" disabled={applying} onClick={() => setPhase({ kind: "editing" })}>
                    Discard
                  </Button>
                </div>
              </>
            )}
            <EngineNote engine={phase.engine} mode={adapter.mode} className="text-kiln/75" />
          </div>
        )}

        {phase.kind === "applied" && (
          <div className="sinapis-rise space-y-3 rounded-md bg-ok p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Written to {phase.engine === "relate-wasm" ? "Relate" : "the local graph mirror"}. {phase.count}{" "}
                {phase.count === 1 ? "dish" : "dishes"} re-flagged on the matrix.
              </span>
              <Button asChild size="sm">
                <Link href="/">See the matrix</Link>
              </Button>
            </div>
            <EngineNote engine={phase.engine} mode={adapter.mode} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
