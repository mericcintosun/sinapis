// The single wrapper for browser state. The demo's only mutable state is the list of
// supplier changes applied in this browser; it lives in localStorage and is replayed on
// the seed by the provider. (With ADAPTER_MODE=real the Relate worker also keeps its own
// copy in OPFS at opfs://sinapis-kitchen; adapter.resetStore() clears that one.)
//
// No other module touches localStorage. Nothing here reads `window` at module load, so
// the pure parts (changeKey) are importable by tests in Node.
import type { ChangeEntry } from "@/lib/data";
import type { SpecChange } from "@/lib/kitchen-graph";

export interface AppliedChange extends SpecChange {
  entry: ChangeEntry;
}

const STORAGE_KEY = "sinapis.applied.v1";

/** Identity of a change for idempotency: same product, allergen and declaration. */
export function changeKey(change: Pick<SpecChange, "productId" | "allergen" | "kind">): string {
  return `${change.productId}:${change.allergen}:${change.kind}`;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isApplied(x: unknown): x is AppliedChange {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.productId === "string" &&
    typeof c.allergen === "string" &&
    typeof c.kind === "string" &&
    typeof c.note === "string" &&
    !!c.entry &&
    typeof c.entry === "object"
  );
}

/** Applied changes stored in this browser, oldest first. A corrupt entry clears the key. */
export function loadApplied(): AppliedChange[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isApplied)) throw new Error("bad shape");
    return parsed;
  } catch {
    try {
      s.removeItem(STORAGE_KEY);
    } catch {
      // storage refused; nothing else to do
    }
    return [];
  }
}

export function saveApplied(list: AppliedChange[]): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota or privacy mode: the session still works, it just will not survive a reload
  }
}

export function clearApplied(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(STORAGE_KEY);
  } catch {
    // storage refused; the in-memory state is already cleared by the caller
  }
}
