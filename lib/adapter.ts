// The kitchen adapter seam and the only module that branches on ADAPTER_MODE.
// Every page, component and API handler asks the kitchen through getAdapter().
//
// fake (default): lib/adapter.fake.ts answers from the local graph mirror.
// real: lib/adapter.real.ts asks Relate WASM in a browser worker for the path list,
//       the impact preview and the write, and falls back to the mirror when it cannot.
//
// Every method takes an optional kitchen: the client passes its current state (the seed
// plus the changes applied in this browser); the API handlers use the seed.
import type { AllergenCode, Kitchen } from "@/lib/data";
import type { AllergenPath, GuestAnswer, ImpactRow, Matrix, SpecChange } from "@/lib/kitchen-graph";
import type { Engine } from "@/lib/relate";
import type { AdapterMode } from "@/lib/types";
import { ADAPTER_MODE } from "@/lib/config";
import { fakeAdapter } from "@/lib/adapter.fake";
import { realAdapter } from "@/lib/adapter.real";

export interface Answer<T> {
  engine: Engine;
  data: T;
}

export interface KitchenAdapter {
  mode: AdapterMode;
  /** Engine behind the synchronous replay() and matrixOf(), which draw the overview matrix. */
  matrixEngine: Engine;
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

export type { Engine } from "@/lib/relate";

export function adapterMode(): AdapterMode {
  return ADAPTER_MODE;
}

export function getAdapter(): KitchenAdapter {
  return adapterMode() === "real" ? realAdapter : fakeAdapter;
}
