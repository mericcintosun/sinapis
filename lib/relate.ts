// Pure Relate pieces: the Cypher the app asks, the seed statements, the Engine label
// and helpers that turn Relate rows into the app's path types. Nothing here opens a
// database; only the dedicated Relate worker does that, one call at a time.
import type { AllergenCode, Kitchen } from "@/lib/data";
import { stepFor, type AllergenPath, type PathStep } from "@/lib/kitchen-graph";

export type Engine = "relate-wasm" | "local-mirror";

/** The queries judges can paste into `relate` against ./kitchen (see README). */
export const CYPHER = {
  dishCount: `MATCH (d:Dish) RETURN count(d) AS n`,
  dishAllergenPaths: `MATCH p = (d:Dish {id: $dishId})-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct)-[r:CONTAINS|MAY_CONTAIN]->(a:Allergen)
RETURN a.code AS allergen, type(r) AS rel, [n IN nodes(p) | coalesce(n.id, n.code)] AS ids`,
  dishUnknownPaths: `MATCH p = (d:Dish {id: $dishId})-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct {specKnown: false})
RETURN [n IN nodes(p) | n.id] AS ids`,
  productImpact: `MATCH p = (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct {id: $productId})
RETURN d.id AS dish, [n IN nodes(p) | n.id] AS ids`,
  /** Read-back after a write: distinct dishes that reach the product through the new relationship. */
  productReach: `MATCH (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct {id: $productId})-[:CONTAINS|MAY_CONTAIN]->(:Allergen {code: $allergen})
RETURN DISTINCT d.id AS dish`,
  clearDeclaration: `MATCH (sp:SupplierProduct {id: $productId})-[r:CONTAINS|MAY_CONTAIN]->(:Allergen {code: $allergen}) DELETE r`,
  addContains: `MATCH (sp:SupplierProduct {id: $productId}), (a:Allergen {code: $allergen}) MERGE (sp)-[:CONTAINS]->(a)`,
  addMayContain: `MATCH (sp:SupplierProduct {id: $productId}), (a:Allergen {code: $allergen}) MERGE (sp)-[:MAY_CONTAIN]->(a)`,
} as const;

/** Seed statements, mirrored by scripts/seed-store.mjs for the on-disk ./kitchen store. */
export function seedStatements(k: Kitchen): string[] {
  const q = (s: string) => JSON.stringify(s);
  const out: string[] = [];
  k.allergens.forEach((a) => out.push(`CREATE (:Allergen {code: ${q(a.code)}, name: ${q(a.name)}})`));
  k.suppliers.forEach((s) => out.push(`CREATE (:Supplier {id: ${q(s.id)}, name: ${q(s.name)}})`));
  k.products.forEach((p) => {
    out.push(`MATCH (s:Supplier {id: ${q(p.supplierId)}}) CREATE (:SupplierProduct {id: ${q(p.id)}, name: ${q(p.name)}, specKnown: ${p.specKnown}})-[:SUPPLIED_BY]->(s)`);
    p.contains.forEach((a) => out.push(`MATCH (p:SupplierProduct {id: ${q(p.id)}}), (a:Allergen {code: ${q(a)}}) CREATE (p)-[:CONTAINS]->(a)`));
    p.mayContain.forEach((a) => out.push(`MATCH (p:SupplierProduct {id: ${q(p.id)}}), (a:Allergen {code: ${q(a)}}) CREATE (p)-[:MAY_CONTAIN]->(a)`));
  });
  k.ingredients.forEach((i) => out.push(`MATCH (p:SupplierProduct {id: ${q(i.productId)}}) CREATE (:Ingredient {id: ${q(i.id)}, name: ${q(i.name)}})-[:SUPPLIED_AS]->(p)`));
  k.subRecipes.forEach((r) => out.push(`CREATE (:SubRecipe {id: ${q(r.id)}, name: ${q(r.name)}})`));
  k.dishes.forEach((d) => out.push(`CREATE (:Dish {id: ${q(d.id)}, name: ${q(d.name)}, section: ${q(d.section)}})`));
  const uses = (from: string, to: string) =>
    `MATCH (a {id: ${q(from)}}), (b {id: ${q(to)}}) CREATE (a)-[:USES]->(b)`;
  k.subRecipes.forEach((r) => r.uses.forEach((u) => out.push(uses(r.id, u))));
  k.dishes.forEach((d) => d.uses.forEach((u) => out.push(uses(d.id, u))));
  return out;
}

export type Row = Record<string, unknown>;

const asIds = (ids: unknown): string[] => (Array.isArray(ids) ? ids.map((x) => String(x)) : []);

/** Relate returns node ids along a path; the kitchen turns them into labelled steps. */
export function idsToSteps(k: Kitchen, ids: unknown): PathStep[] {
  return asIds(ids).map((id) => stepFor(k, id));
}

/** Rows of CYPHER.dishAllergenPaths and CYPHER.dishUnknownPaths, as AllergenPath[]. */
export function rowsToPaths(k: Kitchen, known: Row[], unknown: Row[]): AllergenPath[] {
  return [
    ...known.map((r) => ({
      allergen: String(r.allergen) as AllergenCode,
      status: r.rel === "CONTAINS" ? ("contains" as const) : ("may" as const),
      steps: idsToSteps(k, r.ids),
    })),
    ...unknown.map((r) => ({ allergen: null, status: "unknown" as const, steps: idsToSteps(k, r.ids) })),
  ];
}

/** Rows of CYPHER.productImpact: the first path per reached dish. */
export function reachedDishes(k: Kitchen, rows: Row[]): Map<string, PathStep[]> {
  const out = new Map<string, PathStep[]>();
  for (const r of rows) {
    const dish = String(r.dish);
    if (!out.has(dish)) out.set(dish, idsToSteps(k, r.ids));
  }
  return out;
}
