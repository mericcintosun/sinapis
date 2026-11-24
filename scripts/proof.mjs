// npm run proof: runs three checks and rewrites the matching README blocks with what
// actually happened. It never invents output: when a check cannot run, its block says
// "Not run in this build: <reason>." Budgets: seed 30 s, tests 60 s, engine 20 s, so it
// finishes in under 2 minutes, and it always exits 0.
//
//   <!-- PROOF:BEGIN tests -->          npm test (60 s budget), pass and fail counts
//   <!-- PROOF:BEGIN relate-engine -->  @relate/relate-wasm in Node, in-memory store,
//                                       CYPHER.productImpact for p-tahini, rows and latency
//   <!-- PROOF:BEGIN guest -->          CYPHER.guestSafeDishes and guestSwap for Sesame plus
//                                       Celery on the same in-memory store (DEMO.md step 6)
//   <!-- PROOF:BEGIN matrix -->         CYPHER.matrixDeclared and matrixUnknown, the overview
//                                       matrix on the same store (DEMO.md step 1)
//   <!-- PROOF:BEGIN seed-store -->     node scripts/seed-store.mjs, statement count, store built
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const README = "README.md";
const today = new Date().toISOString().slice(0, 10);
const results = {};
const oneLine = (s) => String(s).replace(/\s+/g, " ").trim().slice(0, 200);

// 1. Seed store (first, because the engine proof replays kitchen/seed.cypher).
function proveSeedStore() {
  const r = spawnSync(process.execPath, ["scripts/seed-store.mjs"], { encoding: "utf8", timeout: 30_000 });
  const text = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  if (r.error) return `Not run in this build: node scripts/seed-store.mjs failed to start (${r.error.code ?? r.error.message}).`;
  const wrote = text.match(/wrote kitchen\/seed\.cypher \((\d+) statements, (\d+) dishes\)/);
  if (!wrote) return `Not run in this build: seed-store printed no statement count (exit ${r.status}).`;
  const built = text.match(/seed: built kitchen\/store[^\n]*/);
  const notBuilt = text.match(/seed: store not built[^\n]*/);
  const storeLine = built ? `kitchen/store built: yes (${oneLine(built[0])})` : `kitchen/store built: no (${oneLine(notBuilt ? notBuilt[0] : "no store line printed")})`;
  return `\`node scripts/seed-store.mjs\` on ${today}: wrote kitchen/seed.cypher with ${wrote[1]} statements for ${wrote[2]} dishes. ${storeLine}.`;
}

// 2. Tests.
function proveTests() {
  const t0 = performance.now();
  const r = spawnSync("npm", ["test"], {
    encoding: "utf8",
    timeout: 60_000,
    shell: process.platform === "win32",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  if (r.error) {
    const why = r.error.code === "ETIMEDOUT" ? "npm test hit the 60 s timeout" : `npm test failed to start (${r.error.code ?? r.error.message})`;
    return `Not run in this build: ${why}.`;
  }
  const text = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const pass = text.match(/^\s*(?:#|ℹ)\s*pass\s+(\d+)/m);
  const fail = text.match(/^\s*(?:#|ℹ)\s*fail\s+(\d+)/m);
  if (!pass || !fail) return `Not run in this build: npm test exited ${r.status} without pass and fail counts.`;
  return `\`npm test\` on ${today}: ${pass[1]} passed, ${fail[1]} failed, exit ${r.status}, ${secs} s.`;
}

// 3. Relate engine in Node.
function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function cypherOf(key) {
  const src = readFileSync("lib/relate.ts", "utf8");
  const m = src.match(new RegExp(`${key}:\\s*\`([^\`]+)\``));
  return m ? m[1] : null;
}

// @relate/relate-wasm 1.2.0: db.execute(query, paramsJson | null) returns a JSON envelope
// { columns, rows, stats, error }. Engine errors arrive in `error` and do not throw.
function exec(db, cypher, params) {
  const raw = db.execute(cypher, params && Object.keys(params).length > 0 ? JSON.stringify(params) : null);
  const env = JSON.parse(raw);
  if (env && env.error) throw new Error(`Relate error: ${oneLine(env.error)}`);
  const columns = Array.isArray(env?.columns) ? env.columns : [];
  const rows = Array.isArray(env?.rows) ? env.rows : [];
  return rows.map((row) => (Array.isArray(row) ? Object.fromEntries(columns.map((c, i) => [c, row[i]])) : row));
}

// Filled by proveRelateEngine once the in-memory store is seeded, so the guest proof
// reuses the same store instead of loading the module twice.
let seeded = null;

async function proveRelateEngine() {
  const pkgJson = "node_modules/@relate/relate-wasm/package.json";
  if (!existsSync(pkgJson)) return "Not run in this build: @relate/relate-wasm is not installed in node_modules.";
  const version = JSON.parse(readFileSync(pkgJson, "utf8")).version ?? "unknown version";
  const cypher = cypherOf("productImpact");
  if (!cypher) return "Not run in this build: CYPHER.productImpact was not found in lib/relate.ts.";
  if (!existsSync("kitchen/seed.cypher")) return "Not run in this build: kitchen/seed.cypher is missing.";
  const statements = readFileSync("kitchen/seed.cypher", "utf8")
    .split("\n")
    .map((s) => s.trim().replace(/;$/, ""))
    .filter(Boolean);

  let mod;
  try {
    mod = await withTimeout(import("@relate/relate-wasm"), 10_000, "loading the module");
  } catch (e) {
    return `Not run in this build: @relate/relate-wasm ${version} did not load in Node (${oneLine(e?.message ?? e)}).`;
  }
  // In Node, init() cannot fetch a file:// URL, so the binary is handed over as bytes.
  const wasmFile = "node_modules/@relate/relate-wasm/relate_bg.wasm";
  try {
    if (typeof mod.initSync !== "function") throw new Error("no initSync export");
    mod.initSync({ module: readFileSync(wasmFile) });
  } catch (e) {
    return `Not run in this build: @relate/relate-wasm ${version} init failed in Node (${oneLine(e?.message ?? e)}).`;
  }
  if (typeof mod.RelateDb !== "function") return `Not run in this build: @relate/relate-wasm ${version} exports no RelateDb.`;

  let db;
  try {
    db = new mod.RelateDb();
  } catch (e) {
    return `Not run in this build: no in-memory store opened (${oneLine(e?.message ?? e)}).`;
  }

  try {
    for (const s of statements) exec(db, s);
    seeded = { db, version, statements: statements.length };
    const t0 = performance.now();
    const rows = exec(db, cypher, { productId: "p-tahini" });
    const ms = (performance.now() - t0).toFixed(1);
    const dishes = new Set(rows.map((r) => (r && typeof r === "object" ? r.dish : undefined)).filter(Boolean));
    return `\`CYPHER.productImpact\` for \`p-tahini\` on @relate/relate-wasm ${version} in Node, in-memory store seeded with ${statements.length} statements, on ${today}: ${rows.length} rows, ${dishes.size} distinct dishes, ${ms} ms.`;
  } catch (e) {
    return `Not run in this build: the Relate query failed in Node (${oneLine(e?.message ?? e)}).`;
  }
}

// 4. Guest check (DEMO.md step 6) on the same in-memory store: Sesame plus Celery.
async function proveGuest(engineLine) {
  if (!seeded) {
    const why = engineLine.startsWith("Not run in this build: ") ? engineLine.slice("Not run in this build: ".length) : "the engine proof did not seed a store.";
    return `Not run in this build: ${why}`;
  }
  const safeCypher = cypherOf("guestSafeDishes");
  const swapCypher = cypherOf("guestSwap");
  if (!safeCypher || !swapCypher) return "Not run in this build: CYPHER.guestSafeDishes or CYPHER.guestSwap was not found in lib/relate.ts.";
  const kitchen = JSON.parse(readFileSync("data/kitchen.json", "utf8"));
  const swaps = kitchen.substitutions.map((s) => ({ from: s.from, to: s.to }));
  const codes = ["SES", "CEL"];
  const { db, version, statements } = seeded;
  try {
    const t0 = performance.now();
    const safeRows = exec(db, safeCypher, { codes });
    const swapRows = exec(db, swapCypher, { codes, swaps });
    const ms = (performance.now() - t0).toFixed(1);
    const safe = [...new Set(safeRows.map((r) => r?.dish).filter(Boolean))].sort();
    const swapDishes = [...new Set(swapRows.map((r) => r?.dish).filter(Boolean))].sort();
    const cauliflower = swapRows.some((r) => r?.dish === "roast-cauliflower" && r?.swapFrom === "sr-tahini-sauce" && r?.swapTo === "sr-yogurt-sauce");
    return `\`CYPHER.guestSafeDishes\` and \`CYPHER.guestSwap\` for Sesame plus Celery on @relate/relate-wasm ${version} in Node, in-memory store seeded with ${statements} statements, on ${today}: ${safe.length} safe dishes (${safe.join(", ") || "none"}), ${swapDishes.length} safe with one swap (${swapDishes.join(", ") || "none"}), roasted cauliflower with the garlic yogurt sauce swap: ${cauliflower ? "yes" : "no"}, ${ms} ms.`;
  } catch (e) {
    return `Not run in this build: the guest queries failed in Node (${oneLine(e?.message ?? e)}).`;
  }
}

// 5. Overview matrix (DEMO.md step 1) on the same in-memory store: the two queries the
// browser runs for the matrix on `/`, counted by cell status with the app's rank rule.
async function proveMatrix(engineLine) {
  if (!seeded) {
    const why = engineLine.startsWith("Not run in this build: ") ? engineLine.slice("Not run in this build: ".length) : "the engine proof did not seed a store.";
    return `Not run in this build: ${why}`;
  }
  const declaredCypher = cypherOf("matrixDeclared");
  const unknownCypher = cypherOf("matrixUnknown");
  if (!declaredCypher || !unknownCypher) return "Not run in this build: CYPHER.matrixDeclared or CYPHER.matrixUnknown was not found in lib/relate.ts.";
  const kitchen = JSON.parse(readFileSync("data/kitchen.json", "utf8"));
  const codes = kitchen.allergens.map((a) => a.code);
  const rank = { contains: 3, may: 2, unknown: 1, free: 0 };
  const { db, version, statements } = seeded;
  try {
    const t0 = performance.now();
    const declared = exec(db, declaredCypher);
    const unknown = exec(db, unknownCypher);
    const ms = (performance.now() - t0).toFixed(1);
    const unknownDishes = new Set(unknown.map((r) => r?.dish));
    const m = {};
    for (const d of kitchen.dishes) m[d.id] = Object.fromEntries(codes.map((c) => [c, unknownDishes.has(d.id) ? "unknown" : "free"]));
    for (const r of declared) {
      const row = m[r?.dish];
      if (!row || !(r.allergen in row)) continue;
      const s = r.rel === "CONTAINS" ? "contains" : "may";
      if (rank[s] > rank[row[r.allergen]]) row[r.allergen] = s;
    }
    const count = { contains: 0, may: 0, unknown: 0, free: 0 };
    for (const row of Object.values(m)) for (const s of Object.values(row)) count[s]++;
    return `\`CYPHER.matrixDeclared\` and \`CYPHER.matrixUnknown\` on @relate/relate-wasm ${version} in Node, in-memory store seeded with ${statements} statements, on ${today}: ${kitchen.dishes.length} dishes by ${codes.length} allergens, ${count.contains} contains, ${count.may} may contain, ${count.unknown} unknown, ${count.free} clear cells, ${ms} ms.`;
  } catch (e) {
    return `Not run in this build: the matrix queries failed in Node (${oneLine(e?.message ?? e)}).`;
  }
}

function rewrite(readme, name, body) {
  const begin = `<!-- PROOF:BEGIN ${name} -->`;
  const end = `<!-- PROOF:END ${name} -->`;
  const i = readme.indexOf(begin);
  const j = readme.indexOf(end);
  if (i === -1 || j === -1 || j < i) {
    console.log(`proof ${name}: README markers missing, block not written`);
    return readme;
  }
  return `${readme.slice(0, i + begin.length)}\n${body}\n${readme.slice(j)}`;
}

async function main() {
  results["seed-store"] = proveSeedStore();
  results["tests"] = proveTests();
  try {
    results["relate-engine"] = await withTimeout(proveRelateEngine(), 20_000, "the relate-engine proof");
  } catch (e) {
    results["relate-engine"] = `Not run in this build: ${oneLine(e?.message ?? e)}.`;
  }
  try {
    results["guest"] = await withTimeout(proveGuest(results["relate-engine"]), 15_000, "the guest proof");
  } catch (e) {
    results["guest"] = `Not run in this build: ${oneLine(e?.message ?? e)}.`;
  }
  try {
    results["matrix"] = await withTimeout(proveMatrix(results["relate-engine"]), 15_000, "the matrix proof");
  } catch (e) {
    results["matrix"] = `Not run in this build: ${oneLine(e?.message ?? e)}.`;
  }

  const blocks = ["tests", "relate-engine", "guest", "matrix", "seed-store"];
  if (!existsSync(README)) {
    console.log("proof: README.md not found, nothing written");
  } else {
    let readme = readFileSync(README, "utf8");
    for (const name of blocks) readme = rewrite(readme, name, results[name]);
    writeFileSync(README, readme);
  }
  for (const name of blocks) console.log(`proof ${name}: ${results[name]}`);
}

main()
  .catch((e) => console.log(`proof: stopped early (${oneLine(e?.message ?? e)})`))
  .finally(() => process.exit(0));
