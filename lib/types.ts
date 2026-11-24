// Shared types: domain types from the seed module, graph types from the local mirror,
// and the response shape every app/api handler returns.
import type { Engine } from "@/lib/relate";

export type {
  Allergen,
  AllergenCode,
  ChangeEntry,
  ChangeKind,
  Dish,
  Ingredient,
  Kitchen,
  MenuSection,
  SubRecipe,
  Substitution,
  Supplier,
  SupplierProduct,
} from "@/lib/data";

export type {
  AllergenPath,
  CellStatus,
  GuestAnswer,
  ImpactRow,
  Matrix,
  PathStep,
  SpecChange,
} from "@/lib/kitchen-graph";

export type { Engine } from "@/lib/relate";

export type AdapterMode = "fake" | "real";

export type ApiResponse<T> =
  | { ok: true; data: T; engine: Engine; mode: AdapterMode }
  | { ok: false; error: { code: string; message: string } };
