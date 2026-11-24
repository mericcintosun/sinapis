"use client";

import * as React from "react";
import Link from "next/link";
import type { AllergenCode } from "@/lib/data";
import { allergenLoad } from "@/lib/kitchen-graph";
import { useKitchen, useKitchenAdapter } from "@/components/kitchen-provider";
import { EngineNote } from "@/components/engine-note";
import { AllergenLoadChart } from "@/components/allergen-load-chart";
import { AllergenMatrix } from "@/components/allergen-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/route-states";

// Shown while a reset clears the browser and the engine store, or if the menu is empty.
function MatrixEmptyState({ resetting }: { resetting: boolean }) {
  return (
    <EmptyState
      className="bg-kiln/5"
      title={resetting ? "Returning the kitchen to the seed" : "No dishes on the menu yet"}
      hint={
        resetting
          ? "Clearing the supplier changes stored in this browser and the engine copy. The matrix comes back in a moment."
          : "Once dishes are seeded, every allergen path shows here. Start from a supplier change."
      }
      action={
        <Button asChild size="sm" variant="quiet">
          <Link href="/activity#log-change">Log supplier change</Link>
        </Button>
      }
    />
  );
}

// The overview pane: chart and matrix share one focus allergen, so clicking a bar
// or a column header narrows both to the same question.
export function OverviewBoard() {
  const { kitchen, matrix, fresh, log, reset, resetting } = useKitchen();
  const adapter = useKitchenAdapter();
  const [focus, setFocus] = React.useState<AllergenCode | null>(null);
  const rows = React.useMemo(() => allergenLoad(kitchen, matrix), [kitchen, matrix]);
  const latest = log[0];
  const localChanges = log.length - kitchen.history.length;

  const focusRow = focus ? rows.find((r) => r.code === focus) : null;

  return (
    <div className="space-y-8">
      <section className="sinapis-rise rounded-md bg-deep p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl text-ink">Where the allergens sit</h2>
            <p className="mt-1 max-w-[68ch] text-ink/85">
              {focusRow
                ? `${focusRow.name}: ${focusRow.contains} dishes contain it, ${focusRow.may} may contain it, ${focusRow.unknown} depend on a product with no spec sheet.`
                : "Dishes flagged per allergen, computed from every path through the sub-recipes. Click a bar to focus the matrix."}
            </p>
          </div>
          {focus && (
            <Button variant="outline" size="sm" onClick={() => setFocus(null)}>
              Show all allergens
            </Button>
          )}
        </div>
        <AllergenLoadChart rows={rows} dishCount={kitchen.dishes.length} focus={focus} onFocus={setFocus} />
      </section>

      {latest && (
        <Card className="sinapis-rise">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>Latest supplier change, {latest.date}</CardDescription>
              <CardTitle className="text-lg">{latest.note}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="contains">{latest.affectedDishIds.length} dishes re-checked</Badge>
              {localChanges > 0 && (
                <Button variant="quiet" size="sm" onClick={() => void reset()} disabled={resetting}>
                  {resetting ? "Resetting" : "Reset to seed"}
                </Button>
              )}
              <Button asChild variant="quiet" size="sm">
                <Link href="/activity">Open change log</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="sinapis-rise">
        <CardHeader>
          <CardTitle>Allergen matrix</CardTitle>
          <CardDescription className="max-w-[68ch]">
            {kitchen.dishes.length} dishes by the 14 EU allergens. C contains, M may contain, ? means a supplier never
            sent a spec sheet, so the dish is not cleared. Click any cell to see the path behind it.
          </CardDescription>
          <EngineNote engine={adapter.matrixEngine} mode={adapter.mode} className="pt-1" />
        </CardHeader>
        <CardContent>
          {resetting || kitchen.dishes.length === 0 ? (
            <MatrixEmptyState resetting={resetting} />
          ) : (
            <AllergenMatrix
              dishes={kitchen.dishes}
              allergens={kitchen.allergens}
              matrix={matrix}
              fresh={fresh}
              focus={focus}
              onFocus={setFocus}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
