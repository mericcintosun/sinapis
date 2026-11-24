// Dedicated module worker that owns the Relate WASM database. OPFS stores only work
// inside a worker, and Relate WASM rejects re-entrant calls, so every message runs
// strictly one at a time through the promise queue below.
//
// In:  { id, op: "open" }                         open (and seed once) the store
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
  | { id: number; op: "run"; cypher: string; params?: Params }
  | { id: number; op: "batch"; batch: Statement[] };

// The worker global, typed narrowly so the DOM lib in tsconfig is enough.
const scope = self as unknown as {
  postMessage(message: unknown): void;
  addEventListener(type: "message", handler: (e: MessageEvent<WorkerRequest>) => void): void;
};

// The package's export shape is probed at runtime, so the handles are loosely typed.
type Db = any;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

async function loadModule(): Promise<any> {
  try {
    const mod: any = RELATE_WASM_URL
      ? await import(/* webpackIgnore: true */ RELATE_WASM_URL)
      : await import("@relate/relate-wasm");
    // wasm-bindgen style builds export an init function that fetches the .wasm file.
    if (typeof mod.init === "function") await mod.init();
    else if (
      typeof mod.default === "function" &&
      typeof mod.default.open !== "function" &&
      !mod.RelateDb &&
      typeof mod.open !== "function"
    )
      await mod.default();
    return mod;
  } catch {
    throw new CoreError("not_configured", "Relate WASM module could not be loaded");
  }
}

async function openDb(mod: any): Promise<Db> {
  const ns = mod.RelateDb ?? mod.default?.RelateDb ?? mod.Relate ?? mod.default ?? mod;
  const open = typeof ns?.open === "function" ? ns.open.bind(ns) : typeof mod.open === "function" ? mod.open.bind(mod) : null;
  if (!open) throw new CoreError("not_configured", "Relate WASM module has no open()");
  try {
    return await open(RELATE_STORE_URI);
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

let callName: string | null = null;

/** The one place that calls the database. Method names are probed once: query, run, execute. */
async function callDb(db: Db, cypher: string, params: Params = {}): Promise<Row[]> {
  if (!callName) {
    callName = ["query", "run", "execute"].find((m) => typeof db?.[m] === "function") ?? null;
    if (!callName) throw new CoreError("not_configured", "Relate database exposes no query, run or execute method");
  }
  let result: unknown;
  try {
    result = await db[callName](cypher, params);
  } catch {
    throw new CoreError("upstream_error", "Relate rejected a Cypher statement");
  }
  return toRows(result);
}

let dbPromise: Promise<Db> | null = null;

async function init(): Promise<Db> {
  const t0 = now();
  const mod = await loadModule();
  const db = await openDb(mod);
  const counted = await callDb(db, CYPHER.dishCount);
  const n = Number(counted[0]?.n ?? Object.values(counted[0] ?? {})[0] ?? 0);
  if (n === 0) {
    const statements = seedStatements(seedKitchen);
    for (const s of statements) await callDb(db, s);
    console.info(`${LOG_PREFIX} relate seed statements=${statements.length}`);
  }
  console.info(`${LOG_PREFIX} relate open ok dishes=${n === 0 ? seedKitchen.dishes.length : n} ${Math.round(now() - t0)}ms`);
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
