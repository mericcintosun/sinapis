// npm run proof: runs three checks and rewrites the matching README blocks with what
// actually happened. It never invents output: when a check cannot run, its block says
// "Not run in this build: <reason>." Budgets: seed 30 s, tests 60 s, engine 20 s, so it
// finishes in under 2 minutes, and it always exits 0.
//
//   <!-- PROOF:BEGIN tests -->          npm test (60 s budget), pass and fail counts
//   <!-- PROOF:BEGIN relate-engine -->  @relate/relate-wasm in Node, in-memory store,
//                                       CYPHER.productImpact for p-tahini, rows and latency
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

function productImpactCypher() {
  const src = readFileSync("lib/relate.ts", "utf8");
  const m = src.match(/productImpact:\s*`([^`]+)`/);
  return m ? m[1] : null;
}

function plain(v) {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Map) return Object.fromEntries([...v.entries()].map(([k, x]) => [String(k), plain(x)]));
  if (Array.isArray(v)) return v.map(plain);
  return v;
}

function toRows(result) {
  const r = plain(result);
  if (Array.isArray(r)) return r;
  if (r && Array.isArray(r.rows)) return r.rows;
  if (r && Array.isArray(r.records)) return r.records;
  if (r && Array.isArray(r.data)) return r.data;
  throw new Error("unknown result shape");
}

async function proveRelateEngine() {
  const pkgJson = "node_modules/@relate/relate-wasm/package.json";
  if (!existsSync(pkgJson)) return "Not run in this build: @relate/relate-wasm is not installed in node_modules.";
  const version = JSON.parse(readFileSync(pkgJson, "utf8")).version ?? "unknown version";
  const cypher = productImpactCypher();
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
  try {
    if (typeof mod.init === "function") await mod.init();
    else if (typeof mod.default === "function" && typeof mod.default.open !== "function" && !mod.RelateDb && typeof mod.open !== "function") await mod.default();
  } catch (e) {
    return `Not run in this build: @relate/relate-wasm ${version} init failed in Node (${oneLine(e?.message ?? e)}).`;
  }
  const ns = mod.RelateDb ?? mod.default?.RelateDb ?? mod.Relate ?? mod.default ?? mod;
  const open = typeof ns?.open === "function" ? ns.open.bind(ns) : typeof mod.open === "function" ? mod.open.bind(mod) : null;
  if (!open) return `Not run in this build: @relate/relate-wasm ${version} exposes no open().`;

  let db = null;
  const tried = [];
  for (const uri of [undefined, "memory://", ":memory:"]) {
    try {
      db = await withTimeout(Promise.resolve(uri === undefined ? open() : open(uri)), 5_000, "opening a store");
      if (db) break;
    } catch (e) {
      tried.push(`${uri ?? "open()"}: ${oneLine(e?.message ?? e)}`);
    }
  }
  if (!db) return `Not run in this build: no in-memory store opened (${tried.join("; ").slice(0, 200)}).`;
  const method = ["query", "run", "execute"].find((m) => typeof db[m] === "function");
  if (!method) return `Not run in this build: the database exposes no query, run or execute method.`;

  try {
    await withTimeout(
      (async () => {
        for (const s of statements) await db[method](s, {});
      })(),
      15_000,
      "seeding",
    );
    const t0 = performance.now();
    const rows = toRows(await withTimeout(Promise.resolve(db[method](cypher, { productId: "p-tahini" })), 5_000, "the query"));
    const ms = (performance.now() - t0).toFixed(1);
    const dishes = new Set(rows.map((r) => (r && typeof r === "object" ? r.dish : undefined)).filter(Boolean));
    return `\`CYPHER.productImpact\` for \`p-tahini\` on @relate/relate-wasm ${version} in Node, in-memory store seeded with ${statements.length} statements, on ${today}: ${rows.length} rows, ${dishes.size} distinct dishes, ${ms} ms.`;
  } catch (e) {
    return `Not run in this build: the Relate query failed in Node (${oneLine(e?.message ?? e)}).`;
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

  if (!existsSync(README)) {
    console.log("proof: README.md not found, nothing written");
  } else {
    let readme = readFileSync(README, "utf8");
    for (const name of ["tests", "relate-engine", "seed-store"]) readme = rewrite(readme, name, results[name]);
    writeFileSync(README, readme);
  }
  for (const name of ["tests", "relate-engine", "seed-store"]) console.log(`proof ${name}: ${results[name]}`);
}

main()
  .catch((e) => console.log(`proof: stopped early (${oneLine(e?.message ?? e)})`))
  .finally(() => process.exit(0));
