// The one reader of process.env for app logic (next.config.ts reads it at build time).
// Every key read here is mirrored in .env.example. None of them is a secret.
//
// Each read is wrapped in a try block because this module also runs inside the Relate
// worker, where `process` may not exist. Next inlines NEXT_PUBLIC_* values at build time,
// so those literal reads keep working in the browser and in the worker.
import type { AdapterMode } from "@/lib/types";

function readAdapterMode(): string | undefined {
  try {
    return process.env.ADAPTER_MODE || process.env.NEXT_PUBLIC_ADAPTER_MODE || undefined;
  } catch {
    return undefined;
  }
}

function readWasmUrl(): string | undefined {
  try {
    return process.env.NEXT_PUBLIC_RELATE_WASM_URL || undefined;
  } catch {
    return undefined;
  }
}

function readBrandFiles(): string {
  try {
    return process.env.NEXT_PUBLIC_BRAND_FILES ?? "";
  } catch {
    return "";
  }
}

/** fake (default) answers from the local mirror; real asks Relate WASM in the browser. */
export const ADAPTER_MODE: AdapterMode = readAdapterMode() === "real" ? "real" : "fake";

/** Optional override: load @relate/relate-wasm from this URL instead of the bundled package. */
export const RELATE_WASM_URL: string | undefined = readWasmUrl();

/** OPFS-backed Relate store, opened inside the dedicated worker only. */
export const RELATE_STORE_URI = "opfs://sinapis-kitchen";

// Five-second rule: no demo step may wait longer than 5 s, even when the worker fails.
// Worst cases: a dead worker falls back after WORKER_INIT_TIMEOUT_MS (3 s); a warm worker
// that stops answering falls back after two attempts of RELATE_TIMEOUT_MS (4 s); a cold
// worker plus a slow query is cut by RELATE_BUDGET_MS: each attempt's timeout is capped to
// what is left of the budget, and the retry is skipped when it would end past it.

/** Per-attempt budget for one Cypher round trip to the worker. */
export const RELATE_TIMEOUT_MS = 2000;

/** Exactly one retry after a failed or timed out call. */
export const RELATE_RETRIES = 1;

/** Budget for loading the WASM module, opening OPFS and seeding an empty store. */
export const WORKER_INIT_TIMEOUT_MS = 3000;

/** Total budget for one call (init wait, first attempt and retry together). */
export const RELATE_BUDGET_MS = 4800;

/** Prefix of every core-path log line. Logs carry ids, counts and durations only. */
export const LOG_PREFIX = "[core]";

/** Comma separated uploaded brand image names, written by next.config.ts at build time. */
export const BRAND_FILES: string = readBrandFiles();
