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
          : "Each dish appears here as one row of 14 allergen cells. Open /?reset=1 to load the seed menu again, then log a supplier change to see cells turn red."
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
  const { kitchen, matrix, matrixEngine, fresh, log, reset, resetting } = useKitchen();
  const adapter = useKitchenAdapter();
  const [focus, setFocus] = React.useState<AllergenCode | null>(null);
  const rows = React.useMemo(() => allergenLoad(kitchen, matrix), [kitchen, matrix]);
  const latest = log[0];
  const localChanges = log.length - kitchen.history.length;

  const focusRow = focus ? rows.find((r) => r.code === focus) : null;

  return (
    <div className="sinapis-rise-group space-y-8">
      <section id="load" className="sinapis-rise scroll-mt-24 rounded-md bg-deep p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl text-ink md:text-4xl">Where the allergens sit</h2>
            {focusRow && (
              <p className="mt-1 text-ink">
                {`${focusRow.name}: ${focusRow.contains} dishes contain it, ${focusRow.may} may contain it, ${focusRow.unknown} depend on a product with no spec sheet.`}
              </p>
            )}
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

      <section id="matrix" className="sinapis-rise scroll-mt-24 space-y-4 rounded-md bg-surface p-5 md:p-7">
        <div className="space-y-1">
          <h2 className="text-3xl text-ink md:text-4xl">Allergen matrix</h2>
          <p className="text-ink">
            {kitchen.dishes.length} dishes by the 14 EU allergens. C contains, M may contain, ? means a supplier never
            sent a spec sheet, so the dish is not cleared. Click any cell to see the path behind it.
          </p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <EngineNote engine={matrixEngine} mode={adapter.mode} />
          </CardHeader>
          <CardContent className="px-2 sm:px-5">
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
      </section>
    </div>
  );
}
