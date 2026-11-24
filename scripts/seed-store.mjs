// Builds the persistent Relate store that judges can inspect.
// 1. Reads data/kitchen.json (the same seed the browser loads).
// 2. Writes kitchen/seed.cypher (one statement per line, diffable in git).
// 3. If the `relate` CLI is on PATH, replays it into the ./kitchen directory store
//    with the JSON codec. Idempotent: the store directory is rebuilt from scratch.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const k = JSON.parse(readFileSync("data/kitchen.json", "utf8"));
const q = (s) => JSON.stringify(s);
const out = [];

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
const uses = (a, b) => `MATCH (a {id: ${q(a)}}), (b {id: ${q(b)}}) CREATE (a)-[:USES]->(b)`;
k.subRecipes.forEach((r) => r.uses.forEach((u) => out.push(uses(r.id, u))));
k.dishes.forEach((d) => d.uses.forEach((u) => out.push(uses(d.id, u))));

mkdirSync("kitchen", { recursive: true });
writeFileSync("kitchen/seed.cypher", out.map((s) => s + ";").join("\n") + "\n");
console.log(`seed: wrote kitchen/seed.cypher (${out.length} statements, ${k.dishes.length} dishes)`);

const probe = spawnSync("relate", ["--version"], { encoding: "utf8" });
if (probe.status !== 0) {
  console.log("seed: relate CLI not found, skipped building ./kitchen/store. Install Relate, then run npm run seed again.");
  process.exit(0);
}
// TODO: confirm the flag names against `relate --help` for the pinned CLI version.
if (existsSync("kitchen/store")) rmSync("kitchen/store", { recursive: true });
const run = spawnSync("relate", ["run", "--store", "kitchen/store", "--codec", "json", "--file", "kitchen/seed.cypher"], { stdio: "inherit" });
process.exit(run.status ?? 1);
