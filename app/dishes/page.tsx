import type { Metadata } from "next";
import { DishBrowser } from "@/components/dish-browser";
import { SceneSlot } from "@/components/scene-slot";
import { seedKitchen } from "@/lib/data";

export const metadata: Metadata = { title: "Dishes" };

export default function DishesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="sinapis-rise grid items-center gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <h1 className="text-4xl text-ink md:text-5xl">The menu, {seedKitchen.dishes.length} dishes</h1>
          <p className="text-lg leading-relaxed text-ink">
            Pick a guest&apos;s allergens and the graph lists the clear dishes, the dishes one sauce swap away, and the
            path that rules out the rest.
          </p>
        </div>
        <div className="hidden overflow-hidden rounded-md sm:block">
          <SceneSlot n={2}
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
