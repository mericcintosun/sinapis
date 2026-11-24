"use client";

import * as React from "react";
import Link from "next/link";
import { ALLERGEN_CODES, type AllergenCode, type Dish, type MenuSection } from "@/lib/data";
import { swapLine } from "@/lib/kitchen-graph";
import type { GuestAnswer } from "@/lib/types";
import { askRelate, type ShownEngine } from "@/lib/adapter";
import { useKitchen, useKitchenAdapter } from "@/components/kitchen-provider";
import { EngineNote } from "@/components/engine-note";
import { EmptyState, ErrorState } from "@/components/route-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SECTIONS: (MenuSection | "All")[] = ["All", "Meze", "Soup", "Mains", "Dessert"];
const EMPTY_ANSWER: GuestAnswer = { safe: [], swappable: [], unsafe: [] };

type GuestState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; engine: ShownEngine; answer: GuestAnswer };

// Dish list with search, section filter and guest mode: pick the guest's allergens,
// get safe dishes and dishes that become safe with one substitution.
export function DishBrowser() {
  const { kitchen, matrix } = useKitchen();
  const adapter = useKitchenAdapter();
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<MenuSection | "All">("All");
  const [guest, setGuest] = React.useState<AllergenCode[]>([]);
  const [check, setCheck] = React.useState<GuestState>({ kind: "idle" });
  const [attempt, setAttempt] = React.useState(0);

  const match = (d: Dish) =>
    (section === "All" || d.section === section) &&
    `${d.name} ${d.localName}`.toLowerCase().includes(query.trim().toLowerCase());

  // One effect, one call: the adapter answers on Relate in real mode, the mirror otherwise.
  React.useEffect(() => {
    if (guest.length === 0) {
      setCheck({ kind: "idle" });
      return;
    }
    let live = true;
    setCheck({ kind: "loading" });
    askRelate(
      adapter,
      () => adapter.guestCheck(guest, kitchen),
      (engine, answer) => setCheck({ kind: "ready", engine, answer }),
      () => live,
    ).catch((e: unknown) => live && setCheck({ kind: "error", message: e instanceof Error ? e.message : "Guest check failed" }));
    return () => {
      live = false;
    };
  }, [adapter, kitchen, guest, attempt]);

  const answer: GuestAnswer = check.kind === "ready" ? check.answer : EMPTY_ANSWER;
  const toggle = (c: AllergenCode) =>
    setGuest((g) => (g.includes(c) ? g.filter((x) => x !== c) : [...g, c]));
  const nameOf = (c: AllergenCode) => kitchen.allergens.find((a) => a.code === c)?.name ?? c;
  const flagCount = (d: Dish) => ALLERGEN_CODES.filter((c) => matrix[d.id][c] !== "free").length;

  // With no guest allergens picked, this is a plain filtered menu.
  const safe = guest.length ? answer.safe.filter(match) : kitchen.dishes.filter(match);
  const swappable = guest.length ? answer.swappable.filter((s) => match(s.dish)) : [];
  const unsafe = guest.length ? answer.unsafe.filter((u) => match(u.dish)) : [];
  const filtered = query.trim() !== "" || section !== "All";
  const clearFilters = () => {
    setQuery("");
    setSection("All");
  };
  const clearGuest = () => setGuest([]);

  const waiting = guest.length > 0 && check.kind === "loading";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guest at table 6</CardTitle>
          <CardDescription className="max-w-[68ch]">
            Tap the allergens the guest names. Dishes whose spec is unknown are never listed as safe. Sinapis is decision
            support, not a medical guarantee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Guest allergens">
            {kitchen.allergens.map((a) => (
              <Button
                key={a.code}
                size="sm"
                variant="quiet"
                aria-pressed={guest.includes(a.code)}
                onClick={() => toggle(a.code)}
                className={cn(guest.includes(a.code) && "border-kiln bg-kiln text-on-kiln hover:bg-kiln")}
              >
                {a.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, English or Turkish name"
              aria-label="Search dishes"
            />
            <div className="flex flex-wrap gap-1" role="group" aria-label="Menu section">
              {SECTIONS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="quiet"
                  aria-pressed={section === s}
                  onClick={() => setSection(s)}
                  className={cn("h-10", section === s && "bg-kiln text-on-kiln hover:bg-kiln")}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          {guest.length === 0 ? (
            <p className="text-sm text-kiln/80">
              No guest allergens picked yet. Tap the ones the guest names, for example Sesame and Celery.
            </p>
          ) : check.kind === "ready" ? (
            <div className="space-y-2">
              <p className="text-sm text-kiln/80">
                Avoiding {guest.map(nameOf).join(" and ")}: {answer.safe.length} safe, {answer.swappable.length} safe with
                one swap, {answer.unsafe.length} off the table.
              </p>
              <EngineNote engine={check.engine} mode={adapter.mode} className="text-kiln/75" />
            </div>
          ) : (
            <p className="text-sm text-kiln/80" aria-live="polite">
              {check.kind === "loading" ? `Asking the graph about ${guest.map(nameOf).join(" and ")}.` : null}
            </p>
          )}
        </CardContent>
      </Card>

      {check.kind === "error" && guest.length > 0 ? (
        <ErrorState
          title="The guest check did not run"
          hint={`${check.message}. Nothing was written. Try again to ask the same question.`}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : waiting ? (
        <GuestSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <DishColumn
            title={guest.length ? "Safe to serve" : "All dishes"}
            empty={
              filtered ? (
                <EmptyState
                  title="No dish matches this search and section"
                  hint={`Dishes whose English or Turkish name contains the search text show here. Clear the filters to see all ${kitchen.dishes.length}.`}
                  action={
                    <Button size="sm" variant="quiet" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <GuestEmptyState onChange={clearGuest} />
              )
            }
          >
            {safe.map((d) => (
              <DishRow
                key={d.id}
                dish={d}
                note={guest.length ? "No path to the guest's allergens" : `${flagCount(d)} allergens flagged`}
                badge={guest.length ? "free" : undefined}
              />
            ))}
          </DishColumn>
          <DishColumn
            title="Safe with one swap"
            empty={
              <EmptyState
                title={guest.length ? "No single substitution clears another dish" : "Pick a guest allergen to see swaps"}
                hint={
                  guest.length
                    ? "A dish shows here when swapping one sauce removes every path to the picked allergens."
                    : "Tap an allergen above, for example Sesame and Celery. Dishes that clear with one sauce swap appear here."
                }
              />
            }
          >
            {swappable.map(({ dish, swap }) => (
              <DishRow key={dish.id} dish={dish} note={swapLine(dish, swap)} badge="may" />
            ))}
          </DishColumn>
          <DishColumn
            title="Not for this guest"
            empty={
              <EmptyState
                title={guest.length ? "Nothing is off the table" : "Pick a guest allergen to see conflicts"}
                hint={
                  guest.length
                    ? "No dish has a path to the picked allergens or to a product with no spec sheet."
                    : "Tap an allergen above. Dishes with a path to it appear here, with the first step of that path."
                }
              />
            }
          >
            {unsafe.map(({ dish, reasons }) => {
              const first = reasons[0];
              const via = first?.steps[1]?.label ?? "a supplier product";
              const named = reasons.find((r) => r.allergen !== null)?.allergen ?? null;
              const unknown = named === null;
              return (
                <DishRow
                  key={dish.id}
                  dish={dish}
                  note={unknown ? `Unknown spec via ${via}` : `${nameOf(named)} via ${via}`}
                  badge={unknown ? "unknown" : "contains"}
                />
              );
            })}
          </DishColumn>
        </div>
      )}
    </div>
  );
}

/** Zero safe dishes for this guest: the next click is to change the picks. */
function GuestEmptyState({ onChange }: { onChange: () => void }) {
  return (
    <EmptyState
      title="No dish is clear for this guest"
      hint="Every dish reaches one of the picked allergens or a product with no spec sheet. Check the swaps, or change the allergen picks."
      action={
        <Button size="sm" variant="quiet" onClick={onChange}>
          Change the allergen picks
        </Button>
      }
    />
  );
}

function GuestSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-6 lg:grid-cols-3">
      <span className="sr-only">Asking the graph which dishes are safe</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-md bg-card p-5">
          <Skeleton className="h-6 w-40 max-w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

function DishColumn({
  title,
  empty,
  children,
}: {
  title: string;
  empty: React.ReactNode;
  children: React.ReactNode[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl text-ink">
        {title} <span className="font-sans text-base text-ink/70">({children.length})</span>
      </h2>
      {children.length === 0 ? empty : <ul className="sinapis-rise-group space-y-2">{children}</ul>}
    </section>
  );
}

function DishRow({ dish, note, badge }: { dish: Dish; note: string; badge?: "free" | "may" | "contains" | "unknown" }) {
  return (
    <li className="sinapis-rise">
      <Link href={`/dishes/${dish.id}`} className="block rounded-md bg-card p-4 text-card-foreground hover:bg-bad/40">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 break-words font-semibold" title={dish.name}>
            {dish.name}
          </span>
          <span className="shrink-0 text-sm text-kiln/60">{dish.price} TL</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-kiln/75">
          {badge && (
            <Badge variant={badge} className="shrink-0">
              {badge === "free" ? "safe" : badge === "may" ? "swap" : badge}
            </Badge>
          )}
          <span className="min-w-0 break-words">{note}</span>
        </div>
      </Link>
    </li>
  );
}
