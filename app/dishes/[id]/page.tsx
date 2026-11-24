import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DishPaths } from "@/components/dish-paths";
import { Button } from "@/components/ui/button";
import { ALLERGEN_CODES, seedKitchen, type AllergenCode } from "@/lib/data";

export function generateStaticParams() {
  return seedKitchen.dishes.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const dish = seedKitchen.dishes.find((d) => d.id === id);
  return { title: dish ? dish.name : "Dish not found" };
}

export default async function DishPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ allergen?: string }>;
}) {
  const { id } = await params;
  const { allergen } = await searchParams;
  const dish = seedKitchen.dishes.find((d) => d.id === id);
  if (!dish) notFound();

  const focus = ALLERGEN_CODES.includes(allergen as AllergenCode) ? (allergen as AllergenCode) : null;
  const parts = dish.uses.map((u) => {
    const sr = seedKitchen.subRecipes.find((s) => s.id === u);
    return sr ? sr.name : seedKitchen.ingredients.find((i) => i.id === u)?.name ?? u;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dishes">
          <ArrowLeft aria-hidden />
          All dishes
        </Link>
      </Button>
      <section className="sinapis-rise space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/75">
          {dish.section} · {dish.localName} · {dish.price} TL
        </p>
        <h1 className="text-4xl text-ink md:text-5xl">{dish.name}</h1>
        <p className="max-w-[66ch] text-lg leading-relaxed text-ink/90">
          Built from {parts.join(", ")}. Each flag below shows the full chain the graph followed, down to the supplier
          product whose spec sheet declared it.
        </p>
      </section>
      <DishPaths dishId={dish.id} focus={focus} />
    </div>
  );
}
