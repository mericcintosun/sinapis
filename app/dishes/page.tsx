import type { Metadata } from "next";
import { DishBrowser } from "@/components/dish-browser";
import { SceneSlot } from "@/components/scene-slot";
import { seedKitchen } from "@/lib/data";

export const metadata: Metadata = { title: "Dishes" };

export default function DishesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="sinapis-rise grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <h1 className="text-4xl text-ink md:text-5xl">The menu, {seedKitchen.dishes.length} dishes</h1>
          <p className="max-w-[66ch] text-lg leading-relaxed text-ink/90">
            A guest says sesame and celery. Pick both, and the graph answers in one pass: which dishes are clear, which
            become clear if the kitchen swaps one sauce, and which path rules out the rest.
          </p>
        </div>
        <div className="overflow-hidden rounded-md">
          <SceneSlot
            n={2}
            alt="A waiter leaning over a table, pointing at a short list of safe dishes while a guest names her allergies"
            width={960}
            height={600}
          />
        </div>
      </section>
      <DishBrowser />
    </div>
  );
}
