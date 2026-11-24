import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DishPathsFromQuery, DishPathsSkeleton } from "@/components/dish-paths";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import { seedKitchen } from "@/lib/data";

export function generateStaticParams() {
  return seedKitchen.dishes.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const dish = seedKitchen.dishes.find((d) => d.id === id);
  return { title: dish ? dish.name : "Dish not found" };
}

// Static per dish: the ?allergen= focus is read on the client by DishPathsFromQuery under
// Suspense, so this page does not read searchParams and the 16 pages prerender.
export default async function DishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dish = seedKitchen.dishes.find((d) => d.id === id);
  if (!dish) notFound();

  const parts = dish.uses.map((u) => {
    const sr = seedKitchen.subRecipes.find((s) => s.id === u);
    return sr ? sr.name : seedKitchen.ingredients.find((i) => i.id === u)?.name ?? u;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dishes">
          <ArrowLeft aria-hidden />
          All dishes
        </Link>
      </Button>
      <section className="sinapis-rise grid items-center gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink/90">
            {dish.section} · {dish.localName} · {dish.price} TL
          </p>
          <h1 className="text-4xl text-ink md:text-5xl">{dish.name}</h1>
          <p className="text-lg leading-relaxed text-ink">
            Built from {parts.join(", ")}. Each flag below follows the chain down to the supplier product that declared it.
          </p>
        </div>
        <div className="hidden overflow-hidden rounded-md sm:block">
          <SceneSlot n={3}
            alt="A tahini tin with a fresh supplier label taped on, next to an open email and three plates marked with red tags"
            width={960}
            height={600}
          />
        </div>
      </section>
      <Suspense fallback={<DishPathsSkeleton />}>
        <DishPathsFromQuery dishId={dish.id} />
      </Suspense>
    </div>
  );
}
