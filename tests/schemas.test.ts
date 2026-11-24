import { test } from "node:test";
import assert from "node:assert/strict";
import { dishIdSchema, guestSchema, specChangeSchema } from "@/lib/schemas";

const DEMO_INPUT = {
  productId: "p-tahini",
  allergen: "PNT",
  kind: "may",
  note: "Antep Tahin Evi, 24 Nov: tahini is now roasted on a line shared with peanuts.",
};

test("specChangeSchema accepts the DEMO.md input", () => {
  const r = specChangeSchema.safeParse(DEMO_INPUT);
  assert.equal(r.success, true);
});

test("specChangeSchema accepts a change without a note", () => {
  const { note: _note, ...rest } = DEMO_INPUT;
  assert.equal(specChangeSchema.safeParse(rest).success, true);
});

test("specChangeSchema rejects an unknown allergen", () => {
  assert.equal(specChangeSchema.safeParse({ ...DEMO_INPUT, allergen: "XYZ" }).success, false);
});

test("specChangeSchema rejects an empty productId", () => {
  assert.equal(specChangeSchema.safeParse({ ...DEMO_INPUT, productId: "" }).success, false);
});

test("specChangeSchema rejects a bad kind", () => {
  assert.equal(specChangeSchema.safeParse({ ...DEMO_INPUT, kind: "unknown" }).success, false);
});

test("specChangeSchema rejects a note over 280 characters", () => {
  assert.equal(specChangeSchema.safeParse({ ...DEMO_INPUT, note: "x".repeat(281) }).success, false);
});

test("guestSchema accepts EU codes and rejects anything else", () => {
  assert.equal(guestSchema.safeParse({ allergens: ["SES", "CEL"] }).success, true);
  assert.equal(guestSchema.safeParse({ allergens: ["SES", "nope"] }).success, false);
  assert.equal(guestSchema.safeParse({}).success, false);
});

test("dishIdSchema accepts seed ids and rejects odd input", () => {
  assert.equal(dishIdSchema.safeParse("grilled-sea-bass").success, true);
  assert.equal(dishIdSchema.safeParse("").success, false);
  assert.equal(dishIdSchema.safeParse("../etc").success, false);
});
