"use client";

import * as React from "react";
import { seedKitchen, type ChangeEntry, type Kitchen } from "@/lib/data";
import { applySpecChange, buildMatrix, type Matrix, type SpecChange } from "@/lib/kitchen-graph";
import { commitSpecChange, type Engine } from "@/lib/relate";

interface AppliedChange extends SpecChange {
  entry: ChangeEntry;
}

interface KitchenContextValue {
  kitchen: Kitchen;
  matrix: Matrix;
  log: ChangeEntry[];
  /** "dishId:ALLERGEN" keys that changed in the latest apply; the matrix animates them. */
  fresh: Set<string>;
  apply: (change: SpecChange, affectedDishIds: string[]) => Promise<Engine>;
  reset: () => void;
}

const KitchenContext = React.createContext<KitchenContextValue | null>(null);
// Browser persistence for applied changes. With Relate WASM configured, the graph
// itself also persists in OPFS (opfs://sinapis-kitchen).
const STORAGE_KEY = "sinapis.applied.v1";

function replay(changes: AppliedChange[]): Kitchen {
  return changes.reduce((k, c) => applySpecChange(k, c), seedKitchen);
}

export function KitchenProvider({ children }: { children: React.ReactNode }) {
  const [applied, setApplied] = React.useState<AppliedChange[]>([]);
  const [fresh, setFresh] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setApplied(JSON.parse(stored) as AppliedChange[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const kitchen = React.useMemo(() => replay(applied), [applied]);
  const matrix = React.useMemo(() => buildMatrix(kitchen), [kitchen]);
  const log = React.useMemo(
    () => [...applied.map((a) => a.entry).reverse(), ...seedKitchen.history],
    [applied],
  );

  const apply = React.useCallback(
    async (change: SpecChange, affectedDishIds: string[]) => {
      const engine = await commitSpecChange(kitchen, change);
      const entry: ChangeEntry = {
        id: `log-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        productId: change.productId,
        allergen: change.allergen,
        kind: change.kind,
        note: change.note,
        affectedDishIds,
      };
      const next = [...applied, { ...change, entry }];
      setApplied(next);
      setFresh(new Set(affectedDishIds.map((d) => `${d}:${change.allergen}`)));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return engine;
    },
    [applied, kitchen],
  );

  const reset = React.useCallback(() => {
    setApplied([]);
    setFresh(new Set());
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = React.useMemo(
    () => ({ kitchen, matrix, log, fresh, apply, reset }),
    [kitchen, matrix, log, fresh, apply, reset],
  );
  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}

export function useKitchen() {
  const ctx = React.useContext(KitchenContext);
  if (!ctx) throw new Error("useKitchen must be used inside KitchenProvider");
  return ctx;
}
