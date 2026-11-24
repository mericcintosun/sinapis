// Fake adapter: answers every question from the local graph mirror (lib/kitchen-graph.ts)
// over the seed. It is the default and the permanent fallback.
import { seedKitchen } from "@/lib/data";
import {
  applySpecChange,
  buildMatrix,
  dishPaths,
  guestCheck as mirrorGuestCheck,
  previewImpact as mirrorPreviewImpact,
  type SpecChange,
} from "@/lib/kitchen-graph";
import type { Engine } from "@/lib/relate";
import type { KitchenAdapter } from "@/lib/adapter";

export const MIRROR: Engine = "local-mirror";

export const replay = (changes: SpecChange[]) => changes.reduce((k, c) => applySpecChange(k, c), seedKitchen);

export const fakeAdapter: KitchenAdapter = {
  mode: "fake",
  matrixEngine: MIRROR,
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
