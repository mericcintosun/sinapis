"use client";

import * as React from "react";
import { seedKitchen, type ChangeEntry, type Kitchen } from "@/lib/data";
import { getAdapter } from "@/lib/adapter";
import { changeKey, clearApplied, loadApplied, saveApplied, type AppliedChange } from "@/lib/store";
import type { Engine, Matrix, SpecChange } from "@/lib/types";

interface KitchenContextValue {
  kitchen: Kitchen;
  matrix: Matrix;
  log: ChangeEntry[];
  /** "dishId:ALLERGEN" keys that changed in the latest apply; the matrix animates them. */
  fresh: Set<string>;
  /** True while a reset is clearing the browser state and the engine store. */
  resetting: boolean;
  apply: (change: SpecChange, affectedDishIds: string[]) => Promise<Engine>;
  reset: () => Promise<Engine>;
}

const KitchenContext = React.createContext<KitchenContextValue | null>(null);
// Browser state lives behind lib/store.ts (browser storage replay). With ADAPTER_MODE=real the
// Relate graph also persists in OPFS (opfs://sinapis-kitchen); reset clears both.
const adapter = getAdapter();
const PREWARM_DISH = "grilled-sea-bass";

export function KitchenProvider({ children }: { children: React.ReactNode }) {
  const [applied, setApplied] = React.useState<AppliedChange[]>([]);
  const [fresh, setFresh] = React.useState<Set<string>>(new Set());
  const [resetting, setResetting] = React.useState(false);
  // Latest applied list for callbacks, so a fast second click never reads a stale closure.
  const appliedRef = React.useRef<AppliedChange[]>([]);
  // The one write boundary's idempotency guard: the change being applied and its promise.
  const inFlight = React.useRef<{ key: string; promise: Promise<Engine> } | null>(null);
  const booted = React.useRef(false);

  const commitApplied = React.useCallback((next: AppliedChange[]) => {
    appliedRef.current = next;
    setApplied(next);
  }, []);

  const kitchen = React.useMemo(() => adapter.replay(applied), [applied]);
  const matrix = React.useMemo(() => adapter.matrixOf(kitchen), [kitchen]);
  const log = React.useMemo(
    () => [...applied.map((a) => a.entry).reverse(), ...seedKitchen.history],
    [applied],
  );

  // There is no server write route: this callback is the only place a change is written
  // (to the adapter, then to browser storage). It cannot double-apply:
  // 1. a repeat call with the same changeKey while one is pending gets the pending promise;
  // 2. a change equal to the last applied one (same changeKey and note) is written to the
  //    engine again (clear then add, so a replay is harmless) but adds no log entry.
  const apply = React.useCallback(
    (change: SpecChange, affectedDishIds: string[]): Promise<Engine> => {
      const key = changeKey(change);
      if (inFlight.current?.key === key) return inFlight.current.promise;
      const promise = (async () => {
        const current = appliedRef.current;
        const base = adapter.replay(current);
        const { engine } = await adapter.applyChange(change, base);
        const last = current[current.length - 1];
        const repeat = !!last && changeKey(last) === key && last.note === change.note;
        if (!repeat) {
          const entry: ChangeEntry = {
            id: `log-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            productId: change.productId,
            allergen: change.allergen,
            kind: change.kind,
            note: change.note,
            affectedDishIds,
          };
          const next = [...current, { ...change, entry }];
          commitApplied(next);
          saveApplied(next);
        }
        setFresh(new Set(affectedDishIds.map((d) => `${d}:${change.allergen}`)));
        return engine;
      })();
      inFlight.current = { key, promise };
      return promise.finally(() => {
        if (inFlight.current?.promise === promise) inFlight.current = null;
      });
    },
    [commitApplied],
  );

  const reset = React.useCallback(async (): Promise<Engine> => {
    setResetting(true);
    commitApplied([]);
    setFresh(new Set());
    clearApplied();
    try {
      return await adapter.resetStore();
    } finally {
      setResetting(false);
    }
  }, [commitApplied]);

  // One mount effect: either the operator asked for a reset with /?reset=1, or the stored
  // changes are loaded. In real mode it also warms the Relate worker (module download,
  // OPFS open) with one path query, so step 2 does not pay for the init.
  React.useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      params.delete("reset");
      const qs = params.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
      void reset();
    } else {
      commitApplied(loadApplied());
    }
    if (adapter.mode === "real") {
      adapter.getDishPaths(PREWARM_DISH).catch(() => undefined);
    }
  }, [reset, commitApplied]);

  const value = React.useMemo(
    () => ({ kitchen, matrix, log, fresh, resetting, apply, reset }),
    [kitchen, matrix, log, fresh, resetting, apply, reset],
  );
  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}

export function useKitchen() {
  const ctx = React.useContext(KitchenContext);
  if (!ctx) throw new Error("useKitchen must be used inside KitchenProvider");
  return ctx;
}

/** The adapter the provider uses, for components that ask the graph directly. */
export function useKitchenAdapter() {
  return adapter;
}
