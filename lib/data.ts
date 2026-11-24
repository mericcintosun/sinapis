// The kitchen graph seed for Meyhane Lodos. data/kitchen.json is the single source
// of truth: the browser loads it into Relate (or the local mirror), and
// scripts/seed-store.mjs turns the same file into kitchen/seed.cypher.
import raw from "@/data/kitchen.json";

export const ALLERGEN_CODES = [
  "GLU", "CRU", "EGG", "FSH", "PNT", "SOY", "MLK",
  "NUT", "CEL", "MUS", "SES", "SUL", "LUP", "MOL",
] as const;
export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export interface Allergen { code: AllergenCode; name: string }
export interface Supplier { id: string; name: string; kind: string }
export interface SupplierProduct {
  id: string;
  name: string;
  supplierId: string;
  contains: AllergenCode[];
  mayContain: AllergenCode[];
  /** false means no spec sheet on file: every path through it reads "unknown", never "free". */
  specKnown: boolean;
  specDate: string;
}
export interface Ingredient { id: string; name: string; productId: string }
export interface SubRecipe { id: string; name: string; uses: string[] }
export type MenuSection = "Meze" | "Soup" | "Mains" | "Dessert";
export interface Dish {
  id: string;
  name: string;
  localName: string;
  section: MenuSection;
  price: number;
  uses: string[];
}
export interface Substitution { from: string; to: string; note: string }
export type ChangeKind = "contains" | "may" | "clear" | "unknown";
export interface ChangeEntry {
  id: string;
  date: string;
  productId: string;
  allergen: AllergenCode | null;
  kind: ChangeKind;
  note: string;
  affectedDishIds: string[];
}
export interface Kitchen {
  restaurant: { name: string; city: string; chef: string };
  allergens: Allergen[];
  suppliers: Supplier[];
  products: SupplierProduct[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  dishes: Dish[];
  substitutions: Substitution[];
  history: ChangeEntry[];
}

export const seedKitchen = raw as unknown as Kitchen;

export const allergenName = (code: AllergenCode) =>
  seedKitchen.allergens.find((a) => a.code === code)?.name ?? code;
