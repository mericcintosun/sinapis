"use client";

import * as React from "react";
import Link from "next/link";
import { ALLERGEN_CODES, type AllergenCode, type Dish, type MenuSection } from "@/lib/data";
import { guestCheck } from "@/lib/kitchen-graph";
import { useKitchen } from "@/components/kitchen-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SECTIONS: (MenuSection | "All")[] = ["All", "Meze", "Soup", "Mains", "Dessert"];

// Dish list with search, section filter and guest mode: pick the guest's allergens,
// get safe dishes and dishes that become safe with one substitution.
export function DishBrowser() {
  const { kitchen, matrix } = useKitchen();
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<MenuSection | "All">("All");
  const [guest, setGuest] = React.useState<AllergenCode[]>([]);

  const match = (d: Dish) =>
    (section === "All" || d.section === section) &&
    `${d.name} ${d.localName}`.toLowerCase().includes(query.trim().toLowerCase());

  const answer = React.useMemo(() => guestCheck(kitchen, guest), [kitchen, guest]);
  const toggle = (c: AllergenCode) =>
    setGuest((g) => (g.includes(c) ? g.filter((x) => x !== c) : [...g, c]));
  const nameOf = (c: AllergenCode) => kitchen.allergens.find((a) => a.code === c)?.name ?? c;
  const flagCount = (d: Dish) => ALLERGEN_CODES.filter((c) => matrix[d.id][c] !== "free").length;

  // With no guest allergens picked, this is a plain filtered menu.
  const safe = guest.length ? answer.safe.filter(match) : kitchen.dishes.filter(match);
  const swappable = guest.length ? answer.swappable.filter((s) => match(s.dish)) : [];
  const unsafe = guest.length ? answer.unsafe.filter((u) => match(u.dish)) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guest at table 6</CardTitle>
          <CardDescription className="max-w-[68ch]">
            Tap the allergens the guest names. Dishes whose spec is unknown are never listed as safe.
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
            <div className="flex gap-1">
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
          {guest.length > 0 && (
            <p className="text-sm text-kiln/80">
              Avoiding {guest.map(nameOf).join(" and ")}: {answer.safe.length} safe, {answer.swappable.length} safe with
              one swap, {answer.unsafe.length} off the table.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <DishColumn title={guest.length ? "Safe to serve" : "All dishes"} empty="No dish matches this search.">
          {safe.map((d) => (
            <DishRow key={d.id} dish={d} note={guest.length ? "No path to the guest's allergens" : `${flagCount(d)} allergens flagged`} badge={guest.length ? "free" : undefined} />
          ))}
        </DishColumn>
        <DishColumn title="Safe with one swap" empty={guest.length ? "No single substitution clears another dish." : "Pick a guest allergen to see swaps."}>
          {swappable.map(({ dish, swap }) => (
            <DishRow key={dish.id} dish={dish} note={swap.note} badge="may" />
          ))}
        </DishColumn>
        <DishColumn title="Not for this guest" empty={guest.length ? "Nothing is off the table." : "Pick a guest allergen to see conflicts."}>
          {unsafe.map(({ dish, reasons }) => {
            const via = reasons[0].steps[1]?.label;
            const unknown = reasons.every((r) => r.allergen === null);
            return (
              <DishRow
                key={dish.id}
                dish={dish}
                note={unknown ? `Unknown spec via ${via}` : `${nameOf(reasons.find((r) => r.allergen)!.allergen!)} via ${via}`}
                badge={unknown ? "unknown" : "contains"}
              />
            );
          })}
        </DishColumn>
      </div>
    </div>
  );
}

function DishColumn({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl text-ink">
        {title} <span className="font-sans text-base text-ink/70">({children.length})</span>
      </h2>
      {children.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/85">{empty}</p>
      ) : (
        <ul className="sinapis-rise-group space-y-2">{children}</ul>
      )}
    </section>
  );
}

function DishRow({ dish, note, badge }: { dish: Dish; note: string; badge?: "free" | "may" | "contains" | "unknown" }) {
  return (
    <li className="sinapis-rise">
      <Link href={`/dishes/${dish.id}`} className="block rounded-md bg-card p-4 text-card-foreground hover:bg-bad/40">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{dish.name}</span>
          <span className="text-sm text-kiln/60">{dish.price} TL</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-kiln/75">
          {badge && <Badge variant={badge}>{badge === "free" ? "safe" : badge === "may" ? "swap" : badge}</Badge>}
          <span>{note}</span>
        </div>
      </Link>
    </li>
  );
}
