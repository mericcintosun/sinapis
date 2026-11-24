"use client";

import Link from "next/link";
import { useKitchen } from "@/components/kitchen-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KIND_WORD = { contains: "now contains", may: "may now contain", clear: "no longer declares", unknown: "spec unknown" } as const;

// History of supplier changes: seeded entries plus anything applied in this browser.
export function ChangeLog() {
  const { kitchen, log } = useKitchen();
  if (log.length === 0) {
    return <p className="rounded-md border border-dashed border-line p-4 text-ink/85">No supplier changes logged yet.</p>;
  }
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
                <CardDescription>
                  {e.date} · {supplier?.name}
                </CardDescription>
                <CardTitle className="text-lg">
                  {product?.name}: {KIND_WORD[e.kind]} {allergen?.name ?? ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="max-w-[68ch] text-kiln/80">{e.note}</p>
                <div className="flex flex-wrap gap-2">
                  {e.affectedDishIds.map((id) => {
                    const dish = kitchen.dishes.find((d) => d.id === id);
                    return (
                      <Link key={id} href={`/dishes/${id}${e.allergen ? `?allergen=${e.allergen}` : ""}`}>
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
