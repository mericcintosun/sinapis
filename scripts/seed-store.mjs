// Builds the persistent Relate store that judges can inspect.
// 1. Reads data/kitchen.json (the same seed the browser loads).
// 2. Always writes kitchen/seed.cypher (one statement per line, diffable in git). The
//    statements match seedStatements() in lib/relate.ts, in the same order.
// 3. If the `relate` CLI is on PATH, replays the file into the ./kitchen/store directory
//    store with JSON snapshots. Each candidate invocation below is tried in order with a
//    fresh store directory, and the first one that exits 0 wins.
// Deterministic: no clock, no randomness. Always exits 0 and says what happened.
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

const SEED_FILE = "kitchen/seed.cypher";
const STORE = "kitchen/store";
const seedText = out.map((s) => s + ";").join("\n") + "\n";

mkdirSync("kitchen", { recursive: true });
writeFileSync(SEED_FILE, seedText);
console.log(`seed: wrote ${SEED_FILE} (${out.length} statements, ${k.dishes.length} dishes)`);

const probe = spawnSync("relate", ["--version"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  console.log(`seed: store not built, the relate CLI is not on PATH (${probe.error ? probe.error.code : `exit ${probe.status}`}).`);
  process.exit(0);
}

// Flag names from the Relate docs: --database <dir> and --snapshot-format json.
// The subcommand and the way the script is passed vary by CLI version, so try each.
const DB = ["--database", STORE, "--snapshot-format", "json"];
const candidates = [
  { label: "relate run --database --snapshot-format json --file", args: ["run", ...DB, "--file", SEED_FILE] },
  { label: "relate run --database --snapshot-format json <file>", args: ["run", ...DB, SEED_FILE] },
  { label: "relate --database --snapshot-format json --file", args: [...DB, "--file", SEED_FILE] },
  { label: "relate query --database --snapshot-format json --file", args: ["query", ...DB, "--file", SEED_FILE] },
  { label: "relate --database --snapshot-format json < seed.cypher", args: [...DB], input: seedText },
];

const failed = [];
for (const c of candidates) {
  if (existsSync(STORE)) rmSync(STORE, { recursive: true });
  const r = spawnSync("relate", c.args, { encoding: "utf8", input: c.input, timeout: 5_000 });
  if (!r.error && r.status === 0 && existsSync(STORE)) {
    console.log(`seed: built ${STORE} with "${c.label}"`);
    process.exit(0);
  }
  failed.push(`${c.label}: ${r.error ? r.error.code : `exit ${r.status}`}`);
}

if (existsSync(STORE)) rmSync(STORE, { recursive: true });
console.log(`seed: store not built, every relate invocation failed (${failed.join("; ")}).`);
process.exit(0);
