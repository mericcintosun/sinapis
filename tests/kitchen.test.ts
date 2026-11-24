// Pins the local mirror over the fixed seed with the facts DEMO.md promises.
// Pure modules only: the Relate worker is never imported here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seedKitchen } from "@/lib/data";
import {
  applySpecChange,
  buildMatrix,
  dishesUsingProduct,
  dishPaths,
  previewImpact,
  type SpecChange,
} from "@/lib/kitchen-graph";
import { seedStatements } from "@/lib/relate";

const TAHINI_DISHES = [
  "baba-ghanoush",
  "candied-pumpkin",
  "falafel-wrap",
  "fried-calamari",
  "hummus-plate",
  "lamb-shish",
  "roast-cauliflower",
];

const DEMO_CHANGE: SpecChange = {
  productId: "p-tahini",
  allergen: "PNT",
  kind: "may",
  note: "Antep Tahin Evi: tahini is now roasted on a line shared with peanuts.",
};

test("p-tahini reaches exactly the 7 DEMO.md dishes", () => {
  const reached = dishesUsingProduct(seedKitchen, "p-tahini").map((x) => x.dish.id).sort();
  assert.deepEqual(reached, TAHINI_DISHES);
});

test("the tahini preview lists the same 7 dishes, each moving from clear to may contain", () => {
  const rows = previewImpact(seedKitchen, DEMO_CHANGE);
  assert.deepEqual(rows.map((r) => r.dish.id).sort(), TAHINI_DISHES);
  for (const r of rows) {
    assert.equal(r.before, "free");
    assert.equal(r.after, "may");
    assert.equal(r.via[r.via.length - 1].id, "p-tahini");
  }
});

test("the grilled sea bass mustard path goes through the green herb sauce and the mayonnaise", () => {
  const paths = dishPaths(seedKitchen, "grilled-sea-bass").filter((p) => p.allergen === "MUS");
  assert.equal(paths.length, 1);
  assert.equal(paths[0].status, "contains");
  assert.deepEqual(
    paths[0].steps.map((s) => s.id),
    ["grilled-sea-bass", "sr-green-sauce", "i-mayo", "p-mayo", "MUS"],
  );
  assert.deepEqual(
    paths[0].steps.map((s) => s.label),
    ["Grilled sea bass, green herb sauce", "Green herb sauce", "Ready-made mayonnaise", "Catering mayonnaise, 5 L", "Mustard"],
  );
});

test("after applying {p-tahini, PNT, may} the 7 dishes show PNT as may", () => {
  const before = buildMatrix(seedKitchen);
  const after = buildMatrix(applySpecChange(seedKitchen, DEMO_CHANGE));
  for (const id of TAHINI_DISHES) {
    assert.equal(before[id].PNT, "free", `${id} before`);
    assert.equal(after[id].PNT, "may", `${id} after`);
  }
  const changed = seedKitchen.dishes.filter((d) => before[d.id].PNT !== after[d.id].PNT).map((d) => d.id).sort();
  assert.deepEqual(changed, TAHINI_DISHES);
});

test("a product with specKnown false yields unknown, never free", () => {
  const unknownProducts = seedKitchen.products.filter((p) => !p.specKnown).map((p) => p.id);
  assert.deepEqual(unknownProducts, ["p-pulbiber"]);
  const matrix = buildMatrix(seedKitchen);
  const touched = dishesUsingProduct(seedKitchen, "p-pulbiber").map((x) => x.dish.id).sort();
  assert.deepEqual(touched, ["muhammara", "shepherd-salad"]);
  for (const id of touched) {
    for (const [code, status] of Object.entries(matrix[id])) {
      assert.notEqual(status, "free", `${id} ${code} must not be free`);
    }
  }
  assert.equal(matrix["shepherd-salad"].PNT, "unknown");
});

test("seedStatements is deterministic", () => {
  const a = seedStatements(seedKitchen);
  const b = seedStatements(seedKitchen);
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
});
