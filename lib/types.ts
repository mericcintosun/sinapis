// Shared types: domain types from the seed module, graph types from the local mirror,
// and the response shape every app/api handler returns.
import type { Engine } from "@/lib/relate";
import type { ApiError } from "@/lib/errors";

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

export type { ApiError, ErrorCode } from "@/lib/errors";

export type AdapterMode = "fake" | "real";

/** Success carries the answer and the engine that produced it; failure is an ApiError. */
export type ApiResponse<T> =
  | { ok: true; data: T; engine: Engine; mode: AdapterMode }
  | ApiError;
