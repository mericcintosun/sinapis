"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ALLERGEN_CODES, type AllergenCode } from "@/lib/data";
import type { AllergenPath, Engine } from "@/lib/types";
import { useKitchen, useKitchenAdapter } from "@/components/kitchen-provider";
import { EngineNote } from "@/components/engine-note";
import { EmptyState, ErrorState } from "@/components/route-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Placeholder while the path query runs (also the Suspense fallback on /dishes/[id]). */
export function DishPathsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-3 rounded-md bg-card p-5">
      <span className="sr-only">Walking the graph from this dish to every allergen</span>
      <Skeleton className="h-6 w-56 max-w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function PathsEmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <EmptyState
      title={title}
      hint={hint}
      action={
        <Button asChild size="sm" variant="quiet">
          <Link href="/">Back to the matrix</Link>
        </Button>
      }
    />
  );
}

/**
 * Reads ?allergen= on the client, so the 16 dish pages stay static. Render it under a
 * Suspense boundary (useSearchParams).
 */
export function DishPathsFromQuery({ dishId }: { dishId: string }) {
  const allergen = useSearchParams().get("allergen");
  const focus = ALLERGEN_CODES.includes(allergen as AllergenCode) ? (allergen as AllergenCode) : null;
  return <DishPaths dishId={dishId} focus={focus} />;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; engine: Engine; paths: AllergenPath[] };

const KIND_LABEL: Record<string, string> = {
  Dish: "Dish",
  SubRecipe: "Sub-recipe",
  Ingredient: "Ingredient",
  SupplierProduct: "Supplier product",
  Allergen: "Allergen",
};

// The "why" behind every matrix cell: each path the graph walked from this dish to
// an allergen, or to a product with no spec sheet.
export function DishPaths({ dishId, focus }: { dishId: string; focus: AllergenCode | null }) {
  const { kitchen, matrix } = useKitchen();
  const adapter = useKitchenAdapter();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    setState({ kind: "loading" });
    adapter
      .getDishPaths(dishId, kitchen)
      .then((r) => live && setState({ kind: "ready", engine: r.engine, paths: r.data }))
      .catch((e: unknown) => live && setState({ kind: "error", message: e instanceof Error ? e.message : "Query failed" }));
    return () => {
      live = false;
    };
  }, [adapter, kitchen, dishId, attempt]);

  const supplierOf = (productId: string) => {
    const p = kitchen.products.find((x) => x.id === productId);
    return kitchen.suppliers.find((s) => s.id === p?.supplierId)?.name;
  };

  const groups = React.useMemo(() => {
    if (state.kind !== "ready") return [];
    const by = new Map<string, AllergenPath[]>();
    for (const p of state.paths) {
      const key = p.allergen ?? "UNKNOWN";
      by.set(key, [...(by.get(key) ?? []), p]);
    }
    return [...by.entries()].sort(([a], [b]) => (a === focus ? -1 : b === focus ? 1 : a.localeCompare(b)));
  }, [state, focus]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All 14 allergens</CardTitle>
          <CardDescription>Contains, may contain, unknown, or nothing declared on any path.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {kitchen.allergens.map((a) => {
            const s = matrix[dishId][a.code];
            return (
              <Badge key={a.code} variant={s} className={cn(focus === a.code && "ring-2 ring-kiln")}>
                {a.name}
                <span className="font-normal">{s === "free" ? "clear" : s === "may" ? "may contain" : s}</span>
              </Badge>
            );
          })}
        </CardContent>
      </Card>

      {state.kind === "loading" && <DishPathsSkeleton />}

      {state.kind === "error" && (
        <ErrorState
          title="The path query failed"
          hint={`${state.message}. Nothing was written. Try again to ask the graph for the same dish.`}
          retryLabel="Run it again"
          onRetry={() => setAttempt((n) => n + 1)}
        />
      )}

      {state.kind === "ready" && (
        <>
          <div className="space-y-1 text-ink/85">
            <p className="text-sm">
              {state.paths.length} {state.paths.length === 1 ? "path" : "paths"} from this dish.
            </p>
            <EngineNote engine={state.engine} mode={adapter.mode} />
          </div>
          {groups.length === 0 ? (
            <PathsEmptyState title="No path reaches a declared allergen or an unknown spec" hint="Nothing to flag on this dish." />
          ) : (
            focus &&
            !groups.some(([key]) => key === focus) && (
              <PathsEmptyState
                title={`No path to ${kitchen.allergens.find((a) => a.code === focus)?.name ?? focus}`}
                hint="This cell is clear: no supplier product on any path declares it. The other flags of this dish are listed below."
              />
            )
          )}
          <div className="sinapis-rise-group space-y-4">
            {groups.map(([key, paths]) => {
              const name = key === "UNKNOWN" ? "Unknown spec" : kitchen.allergens.find((a) => a.code === key)?.name;
              return (
                <Card key={key} className={cn("sinapis-rise", key === focus && "ring-2 ring-ink ring-offset-2 ring-offset-ground")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      {name}
                      <Badge variant={paths[0].status}>{paths.length === 1 ? "1 path" : `${paths.length} paths`}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paths.map((p, i) => (
                      <ol key={i} className="flex flex-wrap items-center gap-1.5 text-sm" aria-label={`Path ${i + 1} to ${name}`}>
                        {p.steps.map((s, j) => (
                          <li key={`${s.id}-${j}`} className="flex items-center gap-1.5">
                            {j > 0 && <ChevronRight className="size-3.5 text-kiln/40" aria-hidden />}
                            <span
                              className={cn(
                                "rounded-md px-2 py-1",
                                s.kind === "Allergen" ? (p.status === "contains" ? "bg-bad" : "bg-warn") : "bg-kiln/5",
                              )}
                            >
                              <span className="block text-[10px] uppercase tracking-wide text-kiln/55">
                                {s.kind === "SupplierProduct" ? supplierOf(s.id) ?? KIND_LABEL[s.kind] : KIND_LABEL[s.kind]}
                              </span>
                              {s.label}
                            </span>
                          </li>
                        ))}
                        {p.status === "unknown" && (
                          <li className="flex items-center gap-1.5">
                            <ChevronRight className="size-3.5 text-kiln/40" aria-hidden />
                            <Badge variant="unknown">no spec sheet on file</Badge>
                          </li>
                        )}
                      </ol>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
