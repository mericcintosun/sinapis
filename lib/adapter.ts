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
  /** Step 6: safe dishes and dishes one swap away; `engine` says who answered. */
  guestCheck(allergens: AllergenCode[], kitchen?: Kitchen): Promise<Answer<GuestAnswer>>;
  /** Demo reset: returns the engine store to the seed (OPFS in real mode). Never rejects. */
  resetStore(): Promise<Engine>;
  /** Synchronous replay of applied changes on the seed, so server HTML stays readable. */
  replay(changes: SpecChange[]): Kitchen;
  /** Synchronous matrix for first render. */
  matrixOf(kitchen: Kitchen): Matrix;
  /**
   * Resolves true once Relate is open in this browser (waits for a cold WASM load), false on
   * the server, in fake mode, or after a real failure this session.
   */
  whenReady(): Promise<boolean>;
}

export type { Engine } from "@/lib/relate";

/** Engine shown next to an answer: "pending" while the mirror stands in for a Relate still opening. */
export type ShownEngine = Engine | "pending";

/**
 * Asks once. If the mirror answered in real mode, Relate may only be still loading its 7 MB
 * WASM (a cold first visit outlasts the 3 s step budget), so that answer is shown as
 * "pending", the call waits for the open and asks again. Only a Relate that truly cannot open
 * leaves the answer labelled "local-mirror".
 */
export async function askRelate<T>(
  adapter: KitchenAdapter,
  ask: () => Promise<Answer<T>>,
  show: (engine: ShownEngine, data: T) => void,
  isLive: () => boolean,
): Promise<void> {
  const first = await ask();
  if (!isLive()) return;
  if (first.engine === "relate-wasm" || adapter.mode !== "real") {
    show(first.engine, first.data);
    return;
  }
  show("pending", first.data);
  if (!(await adapter.whenReady())) {
    if (isLive()) show("local-mirror", first.data);
    return;
  }
  if (!isLive()) return;
  try {
    const again = await ask();
    if (isLive()) show(again.engine, again.data);
  } catch {
    if (isLive()) show("local-mirror", first.data);
  }
}

export function adapterMode(): AdapterMode {
  return ADAPTER_MODE;
}

export function getAdapter(): KitchenAdapter {
  return adapterMode() === "real" ? realAdapter : fakeAdapter;
}
