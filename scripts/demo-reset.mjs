// npm run demo:reset: returns the demo to its start state before a recording or a judge
// walk-through.
// 1. Runs the seed (node scripts/seed-store.mjs): always writes kitchen/seed.cypher, and
//    builds kitchen/store when the relate CLI is on PATH.
// 2. Prints the browser reset URL and the three-cycle walk list from DEMO.md.
// The server holds no state, so there is no migration and no schema push. The browser
// state (localStorage replay plus the OPFS store opfs://sinapis-kitchen) is reset by
// opening <site>/?reset=1 or by the "Reset to seed" button on the overview.
// Always exits 0 and says what happened.
import { spawnSync } from "node:child_process";

const SITE = "https://sinapis-nine.vercel.app";

const seed = spawnSync(process.execPath, ["scripts/seed-store.mjs"], { encoding: "utf8", timeout: 60_000 });
if (seed.error) {
  console.log(`demo:reset: the seed did not start (${seed.error.code ?? seed.error.message}).`);
} else {
  process.stdout.write(seed.stdout ?? "");
  process.stdout.write(seed.stderr ?? "");
  const text = `${seed.stdout ?? ""}${seed.stderr ?? ""}`;
  if (/store not built, the relate CLI is not on PATH/.test(text)) {
    console.log("demo:reset: the relate CLI is missing, so kitchen/store was not rebuilt. kitchen/seed.cypher is up to date.");
  }
}

console.log("");
console.log(`Reset URL: ${SITE}/?reset=1 (local: http://localhost:3000/?reset=1)`);
console.log("");
console.log("Walk DEMO.md three times in a row, opening the reset URL before each cycle:");
console.log("  1. Matrix: open /, 16 dishes by 14 allergens, the Peanuts column has no tahini flag.");
console.log("  2. Path click: Grilled sea bass x Mustard, the path ends at Catering mayonnaise, 5 L > Mustard.");
console.log("  3. Supplier change form: Log supplier change, pick Stone-ground tahini, 2 kg tin, Peanuts, May contain.");
console.log("  4. Preview impact lists 7 dishes with their sauce paths, then Apply to the kitchen graph.");
console.log("  5. Back on /, the 7 Peanuts cells are flagged and ringed as fresh.");
console.log("  6. Guest check on /dishes: Sesame and Celery, the swap line reads");
console.log("     Roasted cauliflower: garlic yogurt sauce instead of tahini lemon sauce.");
console.log("Every cycle must give the same results, with no step over 5 seconds.");
process.exit(0);
