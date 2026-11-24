// Browser side of the Relate worker. It owns the one dedicated worker, posts Cypher to it
// and waits with a timeout. Every call gets exactly one retry. Failures reject with a
// CoreError whose `code` is an ErrorCode, so the adapter can fall back to the mirror.
//
// Logs carry ids, counts and durations only, never Cypher parameters or rows.
import {
  LOG_PREFIX,
  RELATE_BUDGET_MS,
  RELATE_RETRIES,
  RELATE_TIMEOUT_MS,
  WORKER_INIT_TIMEOUT_MS,
  WORKER_OPEN_MAX_MS,
} from "@/lib/config";
import { CoreError, errorCodeOf, isErrorCode, type ErrorCode } from "@/lib/errors";
import type { Row } from "@/lib/relate";

type Params = Record<string, unknown>;
export type Statement = { cypher: string; params?: Params };
type Outgoing =
  | { op: "open" }
  | { op: "reset" }
  | { op: "run"; cypher: string; params?: Params }
  | { op: "batch"; batch: Statement[] };
type Reply = { id: number; ok: true; rows: unknown } | { id: number; ok: false; error: unknown; hint?: unknown };

interface Pending {
  resolve: (rows: unknown) => void;
  reject: (e: CoreError) => void;
  timer: ReturnType<typeof setTimeout>;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();
let opening: Promise<void> | null = null;
/** Set once the worker cannot serve this session (module missing, crash, init timeout). */
let disabled: ErrorCode | null = null;

export function relateAvailable(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && disabled === null;
}

function failAll(code: ErrorCode, hint: string) {
  for (const [id, p] of pending) {
    clearTimeout(p.timer);
    p.reject(new CoreError(code, hint));
    pending.delete(id);
  }
}

function getWorker(): Worker {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    throw new CoreError("not_configured", "No Worker in this runtime");
  }
  if (!worker) {
    worker = new Worker(new URL("./relate.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const msg = e.data;
      const p = msg && pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) p.resolve(msg.rows);
      else {
        const code: ErrorCode = isErrorCode(msg.error) ? msg.error : "upstream_error";
        p.reject(new CoreError(code, typeof msg.hint === "string" ? msg.hint : "Relate call failed"));
      }
    };
    worker.onerror = () => {
      console.warn(`${LOG_PREFIX} worker crashed`);
      disabled = "upstream_error";
      failAll("upstream_error", "Relate worker crashed");
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function post(msg: Outgoing, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new CoreError("upstream_timeout", `Relate did not answer within ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    w.postMessage({ ...msg, id });
  });
}

/**
 * Loads the module, opens opfs://sinapis-kitchen and seeds it once. The open may take up to
 * WORKER_OPEN_MAX_MS; only a real failure or that limit is sticky for the session.
 */
function ensureOpen(): Promise<void> {
  if (disabled) return Promise.reject(new CoreError(disabled, "Relate is not available in this browser session"));
  if (!opening) {
    const t0 = now();
    opening = post({ op: "open" }, WORKER_OPEN_MAX_MS).then(
      () => {
        console.info(`${LOG_PREFIX} relate open ok ${Math.round(now() - t0)}ms`);
      },
      (e: unknown) => {
        const code = errorCodeOf(e);
        console.warn(`${LOG_PREFIX} relate open failed ${code} ${Math.round(now() - t0)}ms`);
        disabled = code;
        worker?.terminate();
        worker = null;
        throw e;
      },
    );
  }
  return opening;
}

/**
 * Waits for the open, but no longer than WORKER_INIT_TIMEOUT_MS or the call deadline. A step
 * that runs out of time is answered by the mirror; the open keeps going for later steps.
 */
function openWithin(deadline: number): Promise<void> {
  const open = ensureOpen();
  const ms = Math.max(1, Math.min(WORKER_INIT_TIMEOUT_MS, Math.round(deadline - now())));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CoreError("upstream_timeout", "Relate is still opening")), ms);
  });
  return Promise.race([open, late]).finally(() => clearTimeout(timer));
}

/** Resolves true once Relate is open in this browser, false if it cannot open this session. */
export async function relateReady(): Promise<boolean> {
  if (!relateAvailable()) return false;
  try {
    await ensureOpen();
    return true;
  } catch {
    return false;
  }
}

/** One attempt. Its timeout is RELATE_TIMEOUT_MS, cut to what is left of the call budget. */
async function once(msg: Outgoing, deadline: number): Promise<unknown> {
  await openWithin(deadline);
  const left = Math.max(1, Math.min(RELATE_TIMEOUT_MS, Math.round(deadline - now())));
  return post(msg, left);
}

/**
 * One attempt plus exactly RELATE_RETRIES (1) retry. Init failures are not retried, and the
 * retry is skipped when it could end past RELATE_BUDGET_MS, so a step never waits over 5 s.
 */
async function call(label: string, msg: Outgoing): Promise<unknown> {
  const t0 = now();
  const deadline = t0 + RELATE_BUDGET_MS;
  try {
    const rows = await once(msg, deadline);
    console.info(`${LOG_PREFIX} relate ${label} ok ${Math.round(now() - t0)}ms`);
    return rows;
  } catch (first) {
    const code = errorCodeOf(first);
    if (RELATE_RETRIES < 1 || disabled || code === "not_configured" || code === "invalid_input") throw first;
    if (now() - t0 + RELATE_TIMEOUT_MS > RELATE_BUDGET_MS) {
      console.warn(`${LOG_PREFIX} relate ${label} no retry, budget spent after ${code}`);
      throw first;
    }
    console.warn(`${LOG_PREFIX} relate ${label} retry after ${code}`);
    const rows = await once(msg, deadline);
    console.info(`${LOG_PREFIX} relate ${label} ok after retry ${Math.round(now() - t0)}ms`);
    return rows;
  }
}

function asRows(x: unknown): Row[] {
  if (!Array.isArray(x)) throw new CoreError("parse_failure", "Relate worker returned no row list");
  return x as Row[];
}

/** Runs one Cypher statement in the Relate worker. */
export async function runCypher(cypher: string, params: Params = {}): Promise<Row[]> {
  return asRows(await call("run", { op: "run", cypher, params }));
}

/**
 * Wipes the OPFS store and writes the seed again, as one queued worker job (same timeout,
 * retry and error mapping as runBatch). Resolves false without asking when the worker is
 * unavailable (server, no Worker, or a sticky failure this session); true once Relate reset.
 */
export async function resetRelate(): Promise<boolean> {
  if (!relateAvailable()) return false;
  await call("reset", { op: "reset" });
  return true;
}

/** Runs several statements in one worker round, in order. Answers one row list per statement. */
export async function runBatch(batch: Statement[]): Promise<Row[][]> {
  const out = await call(`batch n=${batch.length}`, { op: "batch", batch });
  if (!Array.isArray(out) || out.length !== batch.length) {
    throw new CoreError("parse_failure", "Relate worker returned the wrong number of results");
  }
  return out.map(asRows);
}
