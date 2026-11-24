// Real adapter: the path list, the impact preview and the write run on Relate WASM in a
// dedicated browser worker with an OPFS store (opfs://sinapis-kitchen).
//
// The guest check (step 6) and the demo reset (wipe and re-seed the OPFS store) run there too.
//
// On the server (no window), when the worker fails, or when it times out, every method
// answers from the local mirror and says so with engine "local-mirror".
// getMatrix asks Relate in the browser for the overview matrix. getKitchen, replay and
// matrixOf stay on the mirror, so the first render (server HTML) is readable without JS.
import { ALLERGEN_CODES, seedKitchen, type Kitchen } from "@/lib/data";
import {
  applySpecChange,
  buildMatrix,
  dishesUsingProduct,
  dishPaths,
  guestCheck as mirrorGuestCheck,
  previewImpact as mirrorPreviewImpact,
  type SpecChange,
} from "@/lib/kitchen-graph";
import { CYPHER, reachedDishes, rowsToGuest, rowsToMatrix, rowsToPaths } from "@/lib/relate";
import { relateAvailable, relateReady, resetRelate, runBatch, runCypher, type Statement } from "@/lib/relate-client";
import { LOG_PREFIX } from "@/lib/config";
import { errorCodeOf, type ErrorCode } from "@/lib/errors";
import { fakeAdapter, replay } from "@/lib/adapter.fake";
import type { KitchenAdapter } from "@/lib/adapter";

const RELATE = "relate-wasm" as const;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function fallback(code: ErrorCode, step: string) {
  console.warn(`${LOG_PREFIX} fallback ${code} step=${step}`);
}

/** False on the server and once the worker has failed for this session. */
function canAsk(step: string): boolean {
  if (relateAvailable()) return true;
  fallback("not_configured", step);
  return false;
}

/** Dishes the mirror expects to reach the product through the new declaration. */
function expectedReach(k: Kitchen, c: SpecChange): Set<string> {
  if (c.kind === "clear") return new Set();
  return new Set(dishesUsingProduct(k, c.productId).map((x) => x.dish.id));
}

export const realAdapter: KitchenAdapter = {
  mode: "real",
  // First render (server HTML) draws the matrix from the seed replay; in the browser the
  // provider then asks getMatrix, which Relate answers, and the note switches to it.
  matrixEngine: fakeAdapter.matrixEngine,
  getKitchen: fakeAdapter.getKitchen,

  async getMatrix(kitchen = seedKitchen) {
    // The API route runs on the server, where no worker exists: the mirror answers there.
    if (typeof window === "undefined") return fakeAdapter.getMatrix(kitchen);
    if (!canAsk("matrix")) return fakeAdapter.getMatrix(kitchen);
    // The seed matrix is already on screen ("Asking Relate"), so this call may wait for the
    // whole open (up to WORKER_OPEN_MAX_MS) instead of the per-step budget.
    if (!(await relateReady())) {
      fallback("not_configured", "matrix");
      return fakeAdapter.getMatrix(kitchen);
    }
    const t0 = now();
    try {
      const [declared, unknown] = await runBatch([
        { cypher: CYPHER.matrixDeclared },
        { cypher: CYPHER.matrixUnknown },
      ]);
      const data = rowsToMatrix(kitchen, declared, unknown);
      const local = buildMatrix(kitchen);
      let mismatch = 0;
      for (const d of kitchen.dishes) {
        for (const c of ALLERGEN_CODES) {
          if (local[d.id][c] !== data[d.id]?.[c]) mismatch++;
        }
      }
      console.info(`${LOG_PREFIX} matrix rows=${declared.length + unknown.length} ${Math.round(now() - t0)}ms`);
      if (mismatch === 0) console.info(`${LOG_PREFIX} parity ok`);
      else console.warn(`${LOG_PREFIX} parity mismatch ${mismatch}`);
      return { engine: RELATE, data };
    } catch (e) {
      fallback(errorCodeOf(e), "matrix");
      return fakeAdapter.getMatrix(kitchen);
    }
  },

  async getDishPaths(dishId, kitchen = seedKitchen) {
    if (!canAsk("paths")) return { engine: "local-mirror", data: dishPaths(kitchen, dishId) };
    const t0 = now();
    try {
      const [known, unknown] = await runBatch([
        { cypher: CYPHER.dishAllergenPaths, params: { dishId } },
        { cypher: CYPHER.dishUnknownPaths, params: { dishId } },
      ]);
      const data = rowsToPaths(kitchen, known, unknown);
      console.info(`${LOG_PREFIX} paths dish=${dishId} rows=${data.length} ${Math.round(now() - t0)}ms`);
      return { engine: RELATE, data };
    } catch (e) {
      fallback(errorCodeOf(e), "paths");
      return { engine: "local-mirror", data: dishPaths(kitchen, dishId) };
    }
  },

  async previewImpact(change, kitchen = seedKitchen) {
    // Statuses (before, after) come from the mirror; Relate decides which dishes are reached.
    const local = mirrorPreviewImpact(kitchen, change);
    if (!canAsk("preview")) return { engine: "local-mirror", data: local };
    const t0 = now();
    try {
      const hits = await runCypher(CYPHER.productImpact, { productId: change.productId });
      const reached = reachedDishes(kitchen, hits);
      const data = local
        .filter((r) => reached.has(r.dish.id))
        .map((r) => ({ ...r, via: reached.get(r.dish.id) ?? r.via }));
      console.info(`${LOG_PREFIX} preview product=${change.productId} reached=${reached.size} rows=${data.length} ${Math.round(now() - t0)}ms`);
      return { engine: RELATE, data };
    } catch (e) {
      fallback(errorCodeOf(e), "preview");
      return { engine: "local-mirror", data: local };
    }
  },

  async applyChange(change, kitchen = seedKitchen) {
    const next = applySpecChange(kitchen, change);
    if (!canAsk("apply")) return { engine: "local-mirror", data: next };
    const t0 = now();
    const p = { productId: change.productId, allergen: change.allergen };
    const batch: Statement[] = [{ cypher: CYPHER.clearDeclaration, params: p }];
    if (change.kind === "contains") batch.push({ cypher: CYPHER.addContains, params: p });
    if (change.kind === "may") batch.push({ cypher: CYPHER.addMayContain, params: p });
    batch.push({ cypher: CYPHER.productReach, params: p });
    try {
      const results = await runBatch(batch);
      const readBack = new Set(results[results.length - 1].map((r) => String(r.dish)));
      const expected = expectedReach(next, change);
      const mismatch =
        [...readBack].filter((d) => !expected.has(d)).length + [...expected].filter((d) => !readBack.has(d)).length;
      console.info(`${LOG_PREFIX} apply product=${change.productId} allergen=${change.allergen} dishes=${readBack.size} ${Math.round(now() - t0)}ms`);
      if (mismatch === 0) console.info(`${LOG_PREFIX} parity ok`);
      else console.warn(`${LOG_PREFIX} parity mismatch ${mismatch}`);
      return { engine: RELATE, data: next };
    } catch (e) {
      fallback(errorCodeOf(e), "apply");
      return { engine: "local-mirror", data: next };
    }
  },

  async guestCheck(allergens, kitchen = seedKitchen) {
    // Step 6. Relate decides safe and one-swap dishes; the mirror answer is the fallback,
    // computed here so a failure never leaves the guest list empty.
    const local = mirrorGuestCheck(kitchen, allergens);
    if (allergens.length === 0 || !canAsk("guest")) return { engine: "local-mirror", data: local };
    const t0 = now();
    try {
      const swaps = kitchen.substitutions.map((s) => ({ from: s.from, to: s.to }));
      const [safeRows, swapRows] = await runBatch([
        { cypher: CYPHER.guestSafeDishes, params: { codes: allergens } },
        { cypher: CYPHER.guestSwap, params: { codes: allergens, swaps } },
      ]);
      const data = rowsToGuest(kitchen, allergens, safeRows, swapRows);
      const relateSafe = new Set(data.safe.map((d) => d.id));
      const mirrorSafe = new Set(local.safe.map((d) => d.id));
      const mismatch =
        [...relateSafe].filter((d) => !mirrorSafe.has(d)).length + [...mirrorSafe].filter((d) => !relateSafe.has(d)).length;
      console.info(
        `${LOG_PREFIX} guest codes=${allergens.join(",")} safe=${data.safe.length} swap=${data.swappable.length} ${Math.round(now() - t0)}ms`,
      );
      if (mismatch === 0) console.info(`${LOG_PREFIX} parity ok`);
      else console.warn(`${LOG_PREFIX} parity mismatch ${mismatch}`);
      return { engine: RELATE, data };
    } catch (e) {
      fallback(errorCodeOf(e), "guest");
      return { engine: "local-mirror", data: local };
    }
  },

  async resetStore() {
    if (!canAsk("reset")) return "local-mirror";
    try {
      const done = await resetRelate();
      if (!done) {
        fallback("not_configured", "reset");
        return "local-mirror";
      }
      console.info(`${LOG_PREFIX} reset store=opfs ok`);
      return RELATE;
    } catch (e) {
      fallback(errorCodeOf(e), "reset");
      return "local-mirror";
    }
  },

  replay,
  matrixOf: fakeAdapter.matrixOf,
  whenReady: relateReady,
};
