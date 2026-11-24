# Sinapis demo contract (90 seconds)

**Problem.** Nested sub-recipes hide allergens, and one supplier email touches an unknown number of dishes.

**Trigger.** Antep Tahin Evi emails: "our stone-ground tahini is now roasted on a line shared with peanuts, it may contain peanuts."

**Wow moment.** The chef enters "tahini may contain peanuts", the preview lists the reached dishes with their sauce paths, and Apply turns those matrix cells red.

**Closing line.** "The supplier changed, and we found the 7 dishes in 2 seconds."

Demo start route: `/`

Seed ids used below (checked against `data/kitchen.json`): dish `grilled-sea-bass`, dish `roast-cauliflower`, product `p-tahini` ("Stone-ground tahini, 2 kg tin"), allergens `MUS`, `PNT`, `SES`, `CEL`. The tahini tin reaches 7 dishes: `hummus-plate`, `baba-ghanoush`, `roast-cauliflower`, `fried-calamari`, `lamb-shish`, `falafel-wrap`, `candied-pumpkin`.

## Steps

1. **Matrix.** Open `/` (file `app/page.tsx`). 16 dishes by the 14 EU allergens for Meyhane Lodos, with the allergen load chart above it.
2. **Path click.** Click the Grilled sea bass x Mustard cell. It opens `/dishes/grilled-sea-bass?allergen=MUS` (file `app/dishes/[id]/page.tsx`). The path reads: Grilled sea bass > Green herb sauce > Ready-made mayonnaise > Catering mayonnaise, 5 L (Metro Wholesale Kadıköy) > Mustard.
3. **Supplier change form.** Click "Log supplier change" in the rail to reach `/activity#log-change` (file `app/activity/page.tsx`). Pick "Stone-ground tahini, 2 kg tin" (`p-tahini`), "Peanuts" (`PNT`), "May contain".
4. **Preview, then Apply.** "Preview impact" lists the 7 reached dishes, each with its sauce path (for example Lamb shish > Tahini lemon sauce > Tahini > Stone-ground tahini). Click "Apply to the kitchen graph" (file `components/supplier-change-form.tsx`).
5. **Cells turn red.** Back on `/` (file `app/page.tsx`), the Peanuts column now shows the 7 changed cells, ringed as fresh, and the chart re-stacks.
6. **Guest check, then the store.** On `/dishes` (file `app/dishes/page.tsx`), pick Sesame and Celery. The safe list appears, plus "Roasted cauliflower: garlic yogurt sauce instead of tahini lemon sauce" under "Safe with one swap". Then, in a terminal, run query 2 from the README against the store built by `npm run seed` (`kitchen/store`, replayed from `kitchen/seed.cypher`). It lists the same 7 dishes the preview showed.

## What runs where

- Steps 2 to 5 (path click, preview, Apply, read-back) run on Relate WASM (`@relate/relate-wasm` in a dedicated browser worker, store `opfs://sinapis-kitchen`) when `ADAPTER_MODE=real`, and on the local graph mirror (`lib/kitchen-graph.ts`) when `ADAPTER_MODE=fake`. If the worker cannot load or times out in real mode, the mirror answers instead.
- Every answer carries a note that says which engine produced it: "Live engine: Relate (WASM, stored in this browser with OPFS)." or "Sample data: answered by the local graph mirror, not by Relate."
- The matrix on `/` is drawn from the mirror in both modes, by replaying the applied changes on the seed, so it renders in server HTML.
- Step 6's guest check is still on the mirror. Query 2 runs in the `relate` CLI against `kitchen/store`.

Sinapis is decision support, not a medical guarantee.
