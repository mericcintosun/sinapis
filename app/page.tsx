import type { Metadata } from "next";
import { OverviewBoard } from "@/components/overview-board";
import { SceneSlot } from "@/components/scene-slot";
import { seedKitchen } from "@/lib/data";

export const metadata: Metadata = { title: "Overview" };

// Overview: the app shell's welcome state, built from the seed. No marketing hero;
// the rail holds the only call to action (Log supplier change).
export default function OverviewPage() {
  const k = seedKitchen;
  const unknownSpecs = k.products.filter((p) => !p.specKnown);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="sinapis-rise-group grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="sinapis-rise space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink/75">
            {k.restaurant.name}, {k.restaurant.city}
          </p>
          <h1 className="text-4xl leading-tight text-ink md:text-5xl">
            Every allergen on your menu, traced back to the jar it came from.
          </h1>
          <p className="max-w-[66ch] text-lg leading-relaxed text-ink/90">
            Chef {k.restaurant.chef} runs {k.dishes.length} dishes through {k.subRecipes.length} sub-recipes and{" "}
            {k.products.length} supplier products from {k.suppliers.length} suppliers. Sinapis keeps them as one graph,
            so a mustard flag on the sea bass comes with the sauce and the mayonnaise that put it there. Right now{" "}
            {unknownSpecs.length} product ({unknownSpecs.map((p) => p.name).join(", ")}) has no spec sheet, and every
            dish that touches it stays flagged until one arrives.
          </p>
        </div>
        <div className="sinapis-rise overflow-hidden rounded-md">
          <SceneSlot
            n={1}
            alt="A chef at a steel pass reading a supplier's spec sheet next to a menu card with dishes ticked in red"
            width={960}
            height={640}
          />
        </div>
      </section>

      <OverviewBoard />
    </div>
  );
}
