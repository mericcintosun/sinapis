// Dedicated module worker that owns the Relate WASM database. OPFS stores only work
// inside a worker, and Relate WASM rejects re-entrant calls, so every message runs
// strictly one at a time through the promise queue below.
//
// In:  { id, op: "open" }                         open (and seed once) the store
//      { id, op: "reset" }                        wipe the store and write the seed again
//      { id, op: "run", cypher, params }          one statement
//      { id, op: "batch", batch: [{cypher, params}] }  several statements, one round
// Out: { id, ok: true, rows }  ("batch" answers rows as one row list per statement)
//      { id, ok: false, error: ErrorCode, hint }
import { seedKitchen } from "@/lib/data";
import { CYPHER, seedStatements, type Row } from "@/lib/relate";
import { LOG_PREFIX, RELATE_STORE_URI, RELATE_WASM_URL } from "@/lib/config";
import { CoreError, errorCodeOf } from "@/lib/errors";

type Params = Record<string, unknown>;
type Statement = { cypher: string; params?: Params };
type WorkerRequest =
  | { id: number; op: "open" }
  | { id: number; op: "reset" }
  | { id: number; op: "run"; cypher: string; params?: Params }
  | { id: number; op: "batch"; batch: Statement[] };

// The worker global, typed narrowly so the DOM lib in tsconfig is enough.
const scope = self as unknown as {
  postMessage(message: unknown): void;
  addEventListener(type: "message", handler: (e: MessageEvent<WorkerRequest>) => void): void;
};

// The API of @relate/relate-wasm 1.2.0, read from its relate.d.ts and README:
//   default export init(): instantiates relate_bg.wasm (fetched next to relate.js)
//   RelateDb.open("opfs://<name>"): Promise<RelateDb>, dedicated worker only
//   db.execute(query, paramsJson | null): string, a JSON envelope
//     { columns: string[], rows: Record<string, unknown>[], stats, error: string | null }
//   Engine errors come back in `error`; they do not throw. A throw is a wasm trap, after
//   which the instance is unusable.
interface Db {
  execute(query: string, paramsJson?: string | null): string;
}
interface RelateModule {
  default?: (input?: unknown) => Promise<unknown>;
  RelateDb?: { open(uri: string, readOnly?: boolean | null): Promise<Db> };
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

async function loadModule(): Promise<RelateModule> {
  let mod: RelateModule;
  try {
    mod = (RELATE_WASM_URL
      ? await import(/* webpackIgnore: true */ RELATE_WASM_URL)
      : await import("@relate/relate-wasm")) as RelateModule;
  } catch {
    throw new CoreError("not_configured", "Relate WASM module could not be loaded");
  }
  // wasm-bindgen init: must run before any RelateDb call, or every call fails inside the
  // glue code (the Phase 2 proof hit exactly that: __wbindgen_malloc of undefined).
  try {
    if (typeof mod.default === "function") await mod.default();
  } catch {
    throw new CoreError("not_configured", "Relate WASM binary could not be instantiated");
  }
  if (typeof mod.RelateDb?.open !== "function") {
    throw new CoreError("not_configured", "Relate WASM module has no RelateDb.open");
  }
  return mod;
}

async function openDb(mod: RelateModule): Promise<Db> {
  try {
    return await mod.RelateDb!.open(RELATE_STORE_URI);
  } catch {
    throw new CoreError("upstream_error", "Relate could not open the OPFS store");
  }
}

/** Plain JS value from whatever Relate hands back (Map, BigInt, nested arrays). */
function plain(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Map) return Object.fromEntries([...v.entries()].map(([k, x]) => [String(k), plain(x)]));
  if (Array.isArray(v)) return v.map(plain);
  return v;
}

/** Normalises the result shapes a Cypher call may return into a list of row objects. */
function toRows(result: unknown): Row[] {
  const r: any = plain(result);
  if (r == null) return [];
  if (Array.isArray(r)) return r.map((x) => (x && typeof x === "object" ? (x as Row) : { value: x }));
  if (typeof r === "object") {
    if (Array.isArray(r.columns) && Array.isArray(r.rows)) {
      return r.rows.map((row: unknown) =>
        Array.isArray(row) ? Object.fromEntries(r.columns.map((c: string, i: number) => [c, plain(row[i])])) : (row as Row),
      );
    }
    if (Array.isArray(r.rows)) return toRows(r.rows);
    if (Array.isArray(r.records)) return toRows(r.records.map((x: any) => (typeof x?.toObject === "function" ? x.toObject() : x)));
    if (Array.isArray(r.data)) return toRows(r.data);
  }
  throw new CoreError("parse_failure", "Relate returned a result shape the worker does not know");
}

/** Set after a wasm trap: the instance is dead for the rest of this worker's life. */
let trapped = false;

/** The one place that calls the database: db.execute with JSON params, envelope parsed. */
async function callDb(db: Db, cypher: string, params: Params = {}): Promise<Row[]> {
  if (trapped) throw new CoreError("not_configured", "Relate stopped after a WASM trap; reload the page");
  let raw: string;
  try {
    raw = db.execute(cypher, Object.keys(params).length > 0 ? JSON.stringify(params) : null);
  } catch {
    trapped = true;
    throw new CoreError("not_configured", "Relate stopped after a WASM trap; reload the page");
  }
  let envelope: { error?: unknown };
  try {
    envelope = JSON.parse(raw) as { error?: unknown };
  } catch {
    throw new CoreError("parse_failure", "Relate returned an envelope that is not JSON");
  }
  if (envelope && typeof envelope === "object" && envelope.error) {
    throw new CoreError("upstream_error", "Relate rejected a Cypher statement");
  }
  return toRows(envelope);
}

let dbPromise: Promise<Db> | null = null;

const countOf = (rows: Row[]) => Number(rows[0]?.n ?? Object.values(rows[0] ?? {})[0] ?? 0);

/** Wipes every relationship and node, then writes the seed and the seed marker. */
async function reseed(db: Db): Promise<number> {
  await callDb(db, CYPHER.wipeRelationships);
  await callDb(db, CYPHER.wipeNodes);
  const statements = seedStatements(seedKitchen);
  for (const s of statements) await callDb(db, s);
  // The marker is written last, so a seed cut short (tab closed, init timeout) is redone.
  await callDb(db, CYPHER.seedMarkCreate);
  return statements.length;
}

async function init(): Promise<Db> {
  const t0 = now();
  const mod = await loadModule();
  const db = await openDb(mod);
  const marked = countOf(await callDb(db, CYPHER.seedMarkCount));
  if (marked === 0) {
    const n = await reseed(db);
    console.info(`${LOG_PREFIX} relate seed statements=${n}`);
  }
  const dishes = countOf(await callDb(db, CYPHER.dishCount));
  console.info(`${LOG_PREFIX} relate open ok dishes=${dishes} ${Math.round(now() - t0)}ms`);
  return db;
}

function database(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = init().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

// Relate WASM rejects re-entrant calls: one promise queue, one job at a time.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

async function handle(msg: WorkerRequest): Promise<unknown> {
  const db = await database();
  if (msg.op === "open") return [];
  if (msg.op === "reset") {
    // Runs as one queued job: no other statement can interleave with the wipe and seed.
    const t0 = now();
    const n = await reseed(db);
    console.info(`${LOG_PREFIX} relate reset statements=${n} ${Math.round(now() - t0)}ms`);
    return [];
  }
  if (msg.op === "run") return callDb(db, msg.cypher, msg.params);
  if (msg.op === "batch") {
    const out: Row[][] = [];
    for (const s of msg.batch) out.push(await callDb(db, s.cypher, s.params));
    return out;
  }
  throw new CoreError("invalid_input", "Unknown worker op");
}

scope.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || typeof msg.id !== "number") return;
  enqueue(() => handle(msg)).then(
    (rows) => scope.postMessage({ id: msg.id, ok: true, rows }),
    (err: unknown) => {
      const error = errorCodeOf(err);
      const hint = err instanceof CoreError ? err.message : "Relate call failed";
      console.warn(`${LOG_PREFIX} relate ${msg.op} failed ${error}`);
      scope.postMessage({ id: msg.id, ok: false, error, hint });
    },
  );
});

export {};
