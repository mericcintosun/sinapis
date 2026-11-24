// Relate adapter: the one module that talks to the Neo4j Relate embedded graph.
//
// Path 1 (submission path): NEXT_PUBLIC_RELATE_WASM_URL points at the @relate/relate-wasm
// ES module. We import it at runtime, open an OPFS-backed store (opfs://sinapis-kitchen),
// seed it from data/kitchen.json on first open, and run the Cypher below.
// Path 2 (fallback): the env var is not set, or the module fails to load. The same
// questions are answered by lib/kitchen-graph.ts, which walks the identical pattern.
// Every call returns which engine answered, and the UI shows it.
import type { AllergenCode, Kitchen } from "@/lib/data";
import {
  dishPaths,
  previewImpact,
  stepFor,
  type AllergenPath,
  type ImpactRow,
  type SpecChange,
} from "@/lib/kitchen-graph";

export type Engine = "relate-wasm" | "local-mirror";

/** The queries judges can paste into `relate` against ./kitchen (see README). */
export const CYPHER = {
  dishAllergenPaths: `MATCH p = (d:Dish {id: $dishId})-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct)-[r:CONTAINS|MAY_CONTAIN]->(a:Allergen)
RETURN a.code AS allergen, type(r) AS rel, [n IN nodes(p) | coalesce(n.id, n.code)] AS ids`,
  dishUnknownPaths: `MATCH p = (d:Dish {id: $dishId})-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct {specKnown: false})
RETURN [n IN nodes(p) | n.id] AS ids`,
  productImpact: `MATCH p = (d:Dish)-[:USES*1..6]->(:Ingredient)-[:SUPPLIED_AS]->(sp:SupplierProduct {id: $productId})
RETURN d.id AS dish, [n IN nodes(p) | n.id] AS ids`,
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

type Row = Record<string, unknown>;
interface RelateDb { run(cypher: string, params?: Row): Promise<Row[]> }

let dbPromise: Promise<RelateDb | null> | null = null;
// Relate WASM rejects re-entrant calls, so every query goes through one promise queue.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

async function openRelate(k: Kitchen): Promise<RelateDb | null> {
  const url = process.env.NEXT_PUBLIC_RELATE_WASM_URL;
  if (!url || typeof window === "undefined") return null;
  try {
    const mod = await import(/* webpackIgnore: true */ url);
    // TODO: confirm the exact @relate/relate-wasm export once pinned; we expect
    // `open(uri)` returning an object with `run(cypher, params) => rows`.
    const db: RelateDb = await mod.open("opfs://sinapis-kitchen");
    const rows = await db.run("MATCH (d:Dish) RETURN count(d) AS n");
    if (Number(rows[0]?.n ?? 0) === 0) {
      for (const stmt of seedStatements(k)) await db.run(stmt);
    }
    return db;
  } catch (err) {
    console.warn("Relate WASM unavailable, using the local mirror", err);
    return null;
  }
}

function relate(k: Kitchen) {
  if (!dbPromise) dbPromise = openRelate(k);
  return dbPromise;
}

const idsToSteps = (k: Kitchen, ids: unknown) => (ids as string[]).map((id) => stepFor(k, id));

export async function fetchDishPaths(k: Kitchen, dishId: string): Promise<{ engine: Engine; paths: AllergenPath[] }> {
  const db = await relate(k);
  if (!db) return { engine: "local-mirror", paths: dishPaths(k, dishId) };
  return enqueue(async () => {
    const known = await db.run(CYPHER.dishAllergenPaths, { dishId });
    const unknown = await db.run(CYPHER.dishUnknownPaths, { dishId });
    const paths: AllergenPath[] = [
      ...known.map((r) => ({
        allergen: r.allergen as AllergenCode,
        status: r.rel === "CONTAINS" ? ("contains" as const) : ("may" as const),
        steps: idsToSteps(k, r.ids),
      })),
      ...unknown.map((r) => ({ allergen: null, status: "unknown" as const, steps: idsToSteps(k, r.ids) })),
    ];
    return { engine: "relate-wasm" as const, paths };
  });
}

export async function fetchImpact(k: Kitchen, c: SpecChange): Promise<{ engine: Engine; rows: ImpactRow[] }> {
  const local = previewImpact(k, c);
  const db = await relate(k);
  if (!db) return { engine: "local-mirror", rows: local };
  return enqueue(async () => {
    // Reverse traversal in Relate decides WHICH dishes are reached; statuses come from paths.
    const hits = await db.run(CYPHER.productImpact, { productId: c.productId });
    const reached = new Map(hits.map((h) => [h.dish as string, idsToSteps(k, h.ids)]));
    const rows = local
      .filter((r) => reached.has(r.dish.id))
      .map((r) => ({ ...r, via: reached.get(r.dish.id) ?? r.via }));
    return { engine: "relate-wasm" as const, rows };
  });
}

/** Write transaction after the chef confirms. The local mirror is updated by the caller. */
export async function commitSpecChange(k: Kitchen, c: SpecChange): Promise<Engine> {
  const db = await relate(k);
  if (!db) return "local-mirror";
  await enqueue(async () => {
    await db.run(CYPHER.clearDeclaration, { productId: c.productId, allergen: c.allergen });
    if (c.kind === "contains") await db.run(CYPHER.addContains, { productId: c.productId, allergen: c.allergen });
    if (c.kind === "may") await db.run(CYPHER.addMayContain, { productId: c.productId, allergen: c.allergen });
  });
  return "relate-wasm";
}
