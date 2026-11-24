// Pure Relate pieces: the Cypher the app asks, the seed statements, the Engine label
// and helpers that turn Relate rows into the app's path types. Nothing here opens a
// database; only the dedicated Relate worker does that, one call at a time.
import { ALLERGEN_CODES, type AllergenCode, type Kitchen } from "@/lib/data";
import {
  dishPaths,
  stepFor,
  type AllergenPath,
  type CellStatus,
  type GuestAnswer,
  type Matrix,
  type PathStep,
} from "@/lib/kitchen-graph";

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
  /**
   * Guest mode, step 6: dishes with no CONTAINS, MAY_CONTAIN or unknown-spec path to any of
   * the allergen codes in $codes. A product with specKnown false blocks every guest.
   */
  guestSafeDishes: `MATCH (d:Dish)
OPTIONAL MATCH (d)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct)
OPTIONAL MATCH (sp)-[:CONTAINS|MAY_CONTAIN]->(a:Allergen)
WITH d, sp, collect(a.code) AS codes
WITH d, sum(CASE WHEN sp IS NOT NULL AND (sp.specKnown = false OR any(c IN codes WHERE c IN $codes)) THEN 1 ELSE 0 END) AS blocked
WHERE blocked = 0
RETURN d.id AS dish ORDER BY dish`,
  /**
   * Guest mode, step 6: dishes whose every offending path goes through one substitutable
   * node ($swaps is the kitchen's list of {from, to}), and whose replacement node reaches
   * no offending product. The substitution list lives in data/kitchen.json, not in the
   * graph, so it is passed in as a parameter.
   */
  guestSwap: `MATCH p = (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct)
OPTIONAL MATCH (sp)-[:CONTAINS|MAY_CONTAIN]->(a:Allergen)
WITH d, [n IN nodes(p) | n.id] AS ids, sp, collect(a.code) AS codes
WHERE sp.specKnown = false OR any(c IN codes WHERE c IN $codes)
WITH d, collect(ids) AS bad
UNWIND $swaps AS s
WITH d, bad, s
WHERE all(ids IN bad WHERE s.from IN ids)
OPTIONAL MATCH (t {id: s.to})-[:USES*0..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp2:SupplierProduct)
OPTIONAL MATCH (sp2)-[:CONTAINS|MAY_CONTAIN]->(a2:Allergen)
WITH d, s, sp2, collect(a2.code) AS codes2
WITH d, s, sum(CASE WHEN sp2 IS NOT NULL AND (sp2.specKnown = false OR any(c IN codes2 WHERE c IN $codes)) THEN 1 ELSE 0 END) AS dirty
WHERE dirty = 0
RETURN d.id AS dish, s.from AS swapFrom, s.to AS swapTo`,
  /** Overview matrix: every declared allergen each dish reaches, one row per dish and allergen. */
  matrixDeclared: `MATCH (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(:SupplierProduct)-[r:CONTAINS|MAY_CONTAIN]->(a:Allergen)
RETURN DISTINCT d.id AS dish, a.code AS allergen, type(r) AS rel`,
  /** Overview matrix: dishes that reach a product with no spec sheet (every cell unknown at least). */
  matrixUnknown: `MATCH (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(:SupplierProduct {specKnown: false})
RETURN DISTINCT d.id AS dish`,
  /** Written last by the worker after a full seed; a store without it is re-seeded. */
  seedMarkCount: `MATCH (m:SeedMark) RETURN count(m) AS n`,
  seedMarkCreate: `CREATE (:SeedMark {version: 1})`,
  /** Full wipe for the demo reset: relationships first, then nodes. */
  wipeRelationships: `MATCH ()-[r]->() DELETE r`,
  wipeNodes: `MATCH (n) DELETE n`,
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

/**
 * Rows of CYPHER.guestSafeDishes and CYPHER.guestSwap as a GuestAnswer. Relate decides
 * which dishes are safe and which are one swap away; the reasons listed for the rest are
 * the blocking paths of the mirror over the same kitchen state (display only).
 */
export function rowsToGuest(k: Kitchen, codes: AllergenCode[], safeRows: Row[], swapRows: Row[]): GuestAnswer {
  const safeIds = new Set(safeRows.map((r) => String(r.dish)));
  const swapByDish = new Map<string, Set<string>>();
  for (const r of swapRows) {
    const dish = String(r.dish);
    const key = `${String(r.swapFrom)}>${String(r.swapTo)}`;
    swapByDish.set(dish, (swapByDish.get(dish) ?? new Set()).add(key));
  }
  const answer: GuestAnswer = { safe: [], swappable: [], unsafe: [] };
  for (const dish of k.dishes) {
    if (safeIds.has(dish.id)) {
      answer.safe.push(dish);
      continue;
    }
    const keys = swapByDish.get(dish.id);
    // Same pick as the mirror: the first substitution in kitchen order that clears the dish.
    const swap = keys ? k.substitutions.find((s) => keys.has(`${s.from}>${s.to}`)) : undefined;
    if (swap) {
      answer.swappable.push({ dish, swap });
      continue;
    }
    const reasons = dishPaths(k, dish.id).filter((p) => p.allergen === null || codes.includes(p.allergen));
    answer.unsafe.push({ dish, reasons });
  }
  return answer;
}

/**
 * Rows of CYPHER.matrixDeclared and CYPHER.matrixUnknown as a Matrix, with the same rule as
 * statusFromPaths in the mirror: contains beats may contain, may contain beats unknown, and
 * a dish that reaches a product with no spec sheet is unknown for every allergen it does
 * not reach through a declaration.
 */
export function rowsToMatrix(k: Kitchen, declared: Row[], unknown: Row[]): Matrix {
  const unknownDishes = new Set(unknown.map((r) => String(r.dish)));
  const m: Matrix = {};
  for (const d of k.dishes) {
    const base: CellStatus = unknownDishes.has(d.id) ? "unknown" : "free";
    m[d.id] = Object.fromEntries(ALLERGEN_CODES.map((c) => [c, base])) as Record<AllergenCode, CellStatus>;
  }
  for (const r of declared) {
    const row = m[String(r.dish)];
    const code = String(r.allergen) as AllergenCode;
    if (!row || !(code in row)) continue;
    const status: CellStatus = r.rel === "CONTAINS" ? "contains" : "may";
    if (CELL_RANK[status] > CELL_RANK[row[code]]) row[code] = status;
  }
  return m;
}

const CELL_RANK: Record<CellStatus, number> = { contains: 3, may: 2, unknown: 1, free: 0 };

/** Rows of CYPHER.productImpact: the first path per reached dish. */
export function reachedDishes(k: Kitchen, rows: Row[]): Map<string, PathStep[]> {
  const out = new Map<string, PathStep[]>();
  for (const r of rows) {
    const dish = String(r.dish);
    if (!out.has(dish)) out.set(dish, idsToSteps(k, r.ids));
  }
  return out;
}
