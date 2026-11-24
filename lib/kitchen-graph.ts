// Local mirror of the Relate graph. It walks exactly the pattern the Cypher in
// lib/relate.ts asks Relate for:
//   (:Dish)-[:USES*]->(:Ingredient)-[:SUPPLIED_AS]->(:SupplierProduct)-[:CONTAINS|MAY_CONTAIN]->(:Allergen)
// It renders the matrix synchronously (so server HTML is readable), answers in fake
// mode, and is the fallback whenever the Relate worker cannot answer.
import {
  ALLERGEN_CODES,
  type AllergenCode,
  type ChangeKind,
  type Dish,
  type Kitchen,
  type Substitution,
} from "@/lib/data";

export type CellStatus = "contains" | "may" | "unknown" | "free";
export type NodeKind = "Dish" | "SubRecipe" | "Ingredient" | "SupplierProduct" | "Supplier" | "Allergen";

export interface PathStep { id: string; label: string; kind: NodeKind }
export interface AllergenPath {
  /** null for an "unknown" path: the product has no spec sheet, so every allergen is in doubt. */
  allergen: AllergenCode | null;
  status: Exclude<CellStatus, "free">;
  steps: PathStep[];
}
export type Matrix = Record<string, Record<AllergenCode, CellStatus>>;

export interface SpecChange {
  productId: string;
  allergen: AllergenCode;
  kind: Exclude<ChangeKind, "unknown">;
  note: string;
}

const RANK: Record<CellStatus, number> = { contains: 3, may: 2, unknown: 1, free: 0 };

export function stepFor(k: Kitchen, id: string): PathStep {
  const dish = k.dishes.find((d) => d.id === id);
  if (dish) return { id, label: dish.name, kind: "Dish" };
  const sr = k.subRecipes.find((s) => s.id === id);
  if (sr) return { id, label: sr.name, kind: "SubRecipe" };
  const ing = k.ingredients.find((i) => i.id === id);
  if (ing) return { id, label: ing.name, kind: "Ingredient" };
  const p = k.products.find((x) => x.id === id);
  if (p) return { id, label: p.name, kind: "SupplierProduct" };
  const s = k.suppliers.find((x) => x.id === id);
  if (s) return { id, label: s.name, kind: "Supplier" };
  const a = k.allergens.find((x) => x.code === id);
  if (a) return { id, label: a.name, kind: "Allergen" };
  return { id, label: id, kind: "Ingredient" };
}

/** Forward traversal: every path from a dish to an allergen (or to an unknown spec). */
export function dishPaths(k: Kitchen, dishId: string): AllergenPath[] {
  const dish = k.dishes.find((d) => d.id === dishId);
  if (!dish) return [];
  const out: AllergenPath[] = [];
  const walk = (id: string, trail: PathStep[], depth: number) => {
    if (depth > 8) return;
    const sr = k.subRecipes.find((s) => s.id === id);
    if (sr) {
      const next = [...trail, stepFor(k, sr.id)];
      sr.uses.forEach((u) => walk(u, next, depth + 1));
      return;
    }
    const ing = k.ingredients.find((i) => i.id === id);
    if (!ing) return;
    const product = k.products.find((p) => p.id === ing.productId);
    if (!product) return;
    const base = [...trail, stepFor(k, ing.id), stepFor(k, product.id)];
    if (!product.specKnown) out.push({ allergen: null, status: "unknown", steps: base });
    product.contains.forEach((a) =>
      out.push({ allergen: a, status: "contains", steps: [...base, stepFor(k, a)] }),
    );
    product.mayContain.forEach((a) =>
      out.push({ allergen: a, status: "may", steps: [...base, stepFor(k, a)] }),
    );
  };
  const root = stepFor(k, dish.id);
  dish.uses.forEach((u) => walk(u, [root], 1));
  return out;
}

export function statusFromPaths(paths: AllergenPath[], code: AllergenCode): CellStatus {
  let best: CellStatus = "free";
  for (const p of paths) {
    const s: CellStatus = p.allergen === code ? p.status : p.allergen === null ? "unknown" : "free";
    if (RANK[s] > RANK[best]) best = s;
  }
  return best;
}

export function buildMatrix(k: Kitchen): Matrix {
  const m: Matrix = {};
  for (const d of k.dishes) {
    const paths = dishPaths(k, d.id);
    m[d.id] = Object.fromEntries(
      ALLERGEN_CODES.map((c) => [c, statusFromPaths(paths, c)]),
    ) as Record<AllergenCode, CellStatus>;
  }
  return m;
}

/** Reverse traversal: which dishes reach this product, and through which chain. */
export function dishesUsingProduct(k: Kitchen, productId: string) {
  return k.dishes
    .map((dish) => {
      const hit = dishPaths(k, dish.id).find((p) => p.steps.some((s) => s.id === productId));
      if (!hit) return null;
      const cut = hit.steps.findIndex((s) => s.id === productId);
      return { dish, steps: hit.steps.slice(0, cut + 1) };
    })
    .filter((x): x is { dish: Dish; steps: PathStep[] } => x !== null);
}

export function applySpecChange(k: Kitchen, c: SpecChange): Kitchen {
  return {
    ...k,
    products: k.products.map((p) => {
      if (p.id !== c.productId) return p;
      const contains = p.contains.filter((a) => a !== c.allergen);
      const mayContain = p.mayContain.filter((a) => a !== c.allergen);
      if (c.kind === "contains") contains.push(c.allergen);
      if (c.kind === "may") mayContain.push(c.allergen);
      return { ...p, contains, mayContain, specDate: new Date().toISOString().slice(0, 10) };
    }),
  };
}

export interface ImpactRow {
  dish: Dish;
  before: CellStatus;
  after: CellStatus;
  via: PathStep[];
}

/** Read-only "what breaks" preview. Nothing is written until the chef applies it. */
export function previewImpact(k: Kitchen, c: SpecChange): ImpactRow[] {
  const next = applySpecChange(k, c);
  return dishesUsingProduct(k, c.productId)
    .map(({ dish, steps }) => ({
      dish,
      before: statusFromPaths(dishPaths(k, dish.id), c.allergen),
      after: statusFromPaths(dishPaths(next, dish.id), c.allergen),
      via: steps,
    }))
    .filter((r) => r.before !== r.after);
}

export interface GuestAnswer {
  safe: Dish[];
  swappable: { dish: Dish; swap: Substitution }[];
  unsafe: { dish: Dish; reasons: AllergenPath[] }[];
}

function blocking(k: Kitchen, dishId: string, codes: AllergenCode[]) {
  return dishPaths(k, dishId).filter((p) => p.allergen === null || codes.includes(p.allergen));
}

function withSwap(k: Kitchen, dishId: string, s: Substitution): Kitchen {
  const swap = (uses: string[]) => uses.map((u) => (u === s.from ? s.to : u));
  return {
    ...k,
    dishes: k.dishes.map((d) => (d.id === dishId ? { ...d, uses: swap(d.uses) } : d)),
    subRecipes: k.subRecipes.map((r) => ({ ...r, uses: swap(r.uses) })),
  };
}

/** Guest mode: safe dishes, and dishes one substitution away from safe. Unknown is never safe. */
export function guestCheck(k: Kitchen, codes: AllergenCode[]): GuestAnswer {
  const answer: GuestAnswer = { safe: [], swappable: [], unsafe: [] };
  for (const dish of k.dishes) {
    const reasons = blocking(k, dish.id, codes);
    if (reasons.length === 0) {
      answer.safe.push(dish);
      continue;
    }
    const inTree = new Set(reasons.flatMap((r) => r.steps.map((s) => s.id)));
    const swap = k.substitutions.find(
      (s) => inTree.has(s.from) && blocking(withSwap(k, dish.id, s), dish.id, codes).length === 0,
    );
    if (swap) answer.swappable.push({ dish, swap });
    else answer.unsafe.push({ dish, reasons });
  }
  return answer;
}

/** Per-allergen counts of flagged dishes, for the overview chart. */
export function allergenLoad(k: Kitchen, m: Matrix) {
  return k.allergens.map((a) => {
    let contains = 0, may = 0, unknown = 0;
    for (const d of k.dishes) {
      const s = m[d.id][a.code];
      if (s === "contains") contains++;
      else if (s === "may") may++;
      else if (s === "unknown") unknown++;
    }
    return { code: a.code, name: a.name, contains, may, unknown };
  });
}
