import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { ALLERGEN_CODES } from "@/lib/data";
import type { AllergenCode, ApiResponse, ImpactRow, SpecChange } from "@/lib/types";

const KINDS: SpecChange["kind"][] = ["contains", "may", "clear"];

function parseChange(input: unknown): SpecChange | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  if (typeof c.productId !== "string" || !c.productId) return null;
  if (!ALLERGEN_CODES.includes(c.allergen as AllergenCode)) return null;
  if (!KINDS.includes(c.kind as SpecChange["kind"])) return null;
  return {
    productId: c.productId,
    allergen: c.allergen as AllergenCode,
    kind: c.kind as SpecChange["kind"],
    note: typeof c.note === "string" ? c.note : "",
  };
}

// POST /api/impact: read-only preview of a supplier change against the seed graph.
// Nothing is written. Body: { productId, allergen, kind, note }.
export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  const change = parseChange(raw);
  if (!change) {
    const body: ApiResponse<never> = {
      ok: false,
      error: {
        code: "bad_request",
        message: "Expected { productId, allergen, kind, note } with kind one of contains, may, clear.",
      },
    };
    return NextResponse.json(body, { status: 400 });
  }
  const adapter = getAdapter();
  const { engine, data } = await adapter.previewImpact(change);
  const body: ApiResponse<ImpactRow[]> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
