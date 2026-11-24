// The kitchen adapter seam. Every page, component and API handler asks the kitchen
// through getAdapter(), never through lib/kitchen-graph.ts or lib/relate.ts directly.
//
// fake: answers from the local graph mirror (lib/kitchen-graph.ts) over the seed.
// real: answers through lib/relate.ts, which runs Relate WASM when
//       NEXT_PUBLIC_RELATE_WASM_URL is set and falls back to the mirror otherwise.
//
// Every method takes an optional kitchen: the client passes its current state (the seed
// plus the changes applied in this browser); the API handlers use the seed.
import { seedKitchen, type AllergenCode, type Kitchen } from "@/lib/data";
import {
  applySpecChange,
  buildMatrix,
  dishPaths,
  guestCheck as mirrorGuestCheck,
  previewImpact as mirrorPreviewImpact,
  type AllergenPath,
  type GuestAnswer,
  type ImpactRow,
  type Matrix,
  type SpecChange,
} from "@/lib/kitchen-graph";
import { commitSpecChange, fetchDishPaths, fetchImpact, type Engine } from "@/lib/relate";
import type { AdapterMode } from "@/lib/types";

export interface Answer<T> {
  engine: Engine;
  data: T;
}

export interface KitchenAdapter {
  mode: AdapterMode;
  getKitchen(kitchen?: Kitchen): Promise<Answer<Kitchen>>;
  getMatrix(kitchen?: Kitchen): Promise<Answer<Matrix>>;
  getDishPaths(dishId: string, kitchen?: Kitchen): Promise<Answer<AllergenPath[]>>;
  previewImpact(change: SpecChange, kitchen?: Kitchen): Promise<Answer<ImpactRow[]>>;
  /** Writes the change and returns the kitchen as it reads after the write. */
  applyChange(change: SpecChange, kitchen?: Kitchen): Promise<Answer<Kitchen>>;
  guestCheck(allergens: AllergenCode[], kitchen?: Kitchen): Promise<Answer<GuestAnswer>>;
  /** Synchronous replay of applied changes on the seed, so server HTML stays readable. */
  replay(changes: SpecChange[]): Kitchen;
  /** Synchronous matrix for first render. */
  matrixOf(kitchen: Kitchen): Matrix;
}

const MIRROR: Engine = "local-mirror";

const replay = (changes: SpecChange[]) => changes.reduce((k, c) => applySpecChange(k, c), seedKitchen);

export const fakeAdapter: KitchenAdapter = {
  mode: "fake",
  async getKitchen(kitchen = seedKitchen) {
    return { engine: MIRROR, data: kitchen };
  },
  async getMatrix(kitchen = seedKitchen) {
    return { engine: MIRROR, data: buildMatrix(kitchen) };
  },
  async getDishPaths(dishId, kitchen = seedKitchen) {
    return { engine: MIRROR, data: dishPaths(kitchen, dishId) };
  },
  async previewImpact(change, kitchen = seedKitchen) {
    return { engine: MIRROR, data: mirrorPreviewImpact(kitchen, change) };
  },
  async applyChange(change, kitchen = seedKitchen) {
    return { engine: MIRROR, data: applySpecChange(kitchen, change) };
  },
  async guestCheck(allergens, kitchen = seedKitchen) {
    return { engine: MIRROR, data: mirrorGuestCheck(kitchen, allergens) };
  },
  replay,
  matrixOf: buildMatrix,
};

// Thin wrapper over lib/relate.ts. Those functions already fall back to the mirror
// when Relate is not configured; their behavior is unchanged here.
export const realAdapter: KitchenAdapter = {
  mode: "real",
  getKitchen: fakeAdapter.getKitchen,
  getMatrix: fakeAdapter.getMatrix,
  async getDishPaths(dishId, kitchen = seedKitchen) {
    const r = await fetchDishPaths(kitchen, dishId);
    return { engine: r.engine, data: r.paths };
  },
  async previewImpact(change, kitchen = seedKitchen) {
    const r = await fetchImpact(kitchen, change);
    return { engine: r.engine, data: r.rows };
  },
  async applyChange(change, kitchen = seedKitchen) {
    const engine = await commitSpecChange(kitchen, change);
    return { engine, data: applySpecChange(kitchen, change) };
  },
  // Guest mode has no Cypher yet (Phase 2), so it always answers from the mirror.
  guestCheck: fakeAdapter.guestCheck,
  replay,
  matrixOf: buildMatrix,
};

export function adapterMode(): AdapterMode {
  const raw = process.env.ADAPTER_MODE ?? process.env.NEXT_PUBLIC_ADAPTER_MODE;
  return raw === "real" ? "real" : "fake";
}

export function getAdapter(): KitchenAdapter {
  return adapterMode() === "real" ? realAdapter : fakeAdapter;
}
