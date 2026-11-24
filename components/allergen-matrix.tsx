"use client";

import Link from "next/link";
import type { Allergen, AllergenCode, Dish } from "@/lib/data";
import type { CellStatus, Matrix } from "@/lib/kitchen-graph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CELL: Record<CellStatus, { glyph: string; cls: string; word: string }> = {
  contains: { glyph: "C", cls: "bg-bad text-kiln", word: "contains" },
  may: { glyph: "M", cls: "bg-warn text-kiln", word: "may contain" },
  unknown: { glyph: "?", cls: "border border-dashed border-kiln/70 text-kiln", word: "unknown spec, treated as a risk for" },
  free: { glyph: "", cls: "text-kiln/30 hover:bg-kiln/5", word: "has no declared" },
};

// Dishes x 14 allergens. Every flagged cell links to the dish page, where the
// path that produced it (dish > sauce > product > allergen) is drawn.
export function AllergenMatrix({
  dishes,
  allergens,
  matrix,
  fresh,
  focus,
  onFocus,
}: {
  dishes: Dish[];
  allergens: Allergen[];
  matrix: Matrix;
  fresh: Set<string>;
  focus: AllergenCode | null;
  onFocus: (code: AllergenCode | null) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[47.5rem] border-separate border-spacing-1 text-sm">
        <caption className="sr-only">
          Allergen matrix: C means contains, M means may contain, a question mark means the supplier spec is unknown.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-56 text-left text-xs font-semibold uppercase tracking-wide text-kiln/60">
              Dish
            </th>
            {allergens.map((a) => (
              <th key={a.code} scope="col" className="p-0">
                <Button
                  variant="quiet"
                  size="sm"
                  title={a.name}
                  aria-pressed={focus === a.code}
                  onClick={() => onFocus(focus === a.code ? null : a.code)}
                  className={cn("h-7 w-full border-transparent px-1 text-[11px]", focus === a.code && "bg-kiln text-on-kiln hover:bg-kiln")}
                >
                  {a.code}
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dishes.map((d) => (
            <tr key={d.id}>
              <th scope="row" className="pr-2 text-left font-medium">
                <Link href={`/dishes/${d.id}`} className="underline decoration-kiln/20 underline-offset-4 hover:decoration-kiln">
                  {d.name}
                </Link>
              </th>
              {allergens.map((a) => {
                const status = matrix[d.id][a.code];
                const c = CELL[status];
                const isFresh = fresh.has(`${d.id}:${a.code}`);
                return (
                  <td key={a.code} className="p-0">
                    <Link
                      href={`/dishes/${d.id}?allergen=${a.code}`}
                      aria-label={`${d.name} ${c.word} ${a.name}`}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md text-xs font-bold",
                        c.cls,
                        focus && focus !== a.code && "opacity-40",
                        isFresh && "sinapis-rise ring-2 ring-kiln",
                      )}
                    >
                      {c.glyph}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
