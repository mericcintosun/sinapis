"use client";

import Link from "next/link";
import { useKitchen } from "@/components/kitchen-provider";
import { EmptyState } from "@/components/route-states";
import { SceneSlot } from "@/components/scene-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KIND_WORD = { contains: "now contains", may: "may now contain", clear: "no longer declares", unknown: "spec unknown" } as const;

function ChangeLogEmptyState() {
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_12rem]">
      <EmptyState
        title="No supplier changes logged yet"
        hint="Enter the next supplier email in the form above and preview the dishes it reaches before you apply it."
        action={
          <Button asChild size="sm" variant="quiet">
            <Link href="/activity#log-change">Log a change</Link>
          </Button>
        }
      />
      <div className="mx-auto w-40 overflow-hidden rounded-md sm:w-full">
        <SceneSlot n={5}
          alt="An empty clipboard hanging on a hook above a clean plate, waiting for the next supplier note"
          width={480}
          height={480}
        />
      </div>
    </div>
  );
}

// History of supplier changes: seeded entries plus anything applied in this browser.
export function ChangeLog() {
  const { kitchen, log } = useKitchen();
  if (log.length === 0) return <ChangeLogEmptyState />;
  return (
    <ol className="sinapis-rise-group space-y-3">
      {log.map((e) => {
        const product = kitchen.products.find((p) => p.id === e.productId);
        const supplier = kitchen.suppliers.find((s) => s.id === product?.supplierId);
        const allergen = kitchen.allergens.find((a) => a.code === e.allergen);
        return (
          <li key={e.id} className="sinapis-rise">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="break-words">
                  {e.date} · {supplier?.name}
                </CardDescription>
                <CardTitle className="break-words text-lg">
                  {product?.name}: {KIND_WORD[e.kind]} {allergen?.name ?? ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="max-w-[68ch] text-kiln/80">{e.note}</p>
                <div className="flex flex-wrap gap-2">
                  {e.affectedDishIds.map((id) => {
                    const dish = kitchen.dishes.find((d) => d.id === id);
                    return (
                      <Link
                        key={id}
                        href={`/dishes/${id}${e.allergen ? `?allergen=${e.allergen}` : ""}`}
                        title={dish?.name ?? id}
                        className="inline-flex min-h-11 max-w-full items-center"
                      >
                        <Badge variant={e.kind === "unknown" ? "unknown" : e.kind === "clear" ? "free" : e.kind}>{dish?.name ?? id}</Badge>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
