import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { hintOf, specChangeSchema } from "@/lib/schemas";
import type { ApiError, ApiResponse, ImpactRow, SpecChange } from "@/lib/types";

// POST /api/impact: read-only preview of a supplier change against the seed graph.
// Nothing is written. Body: { productId, allergen, kind, note? }.
export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  const parsed = specChangeSchema.safeParse(raw);
  if (!parsed.success) {
    const body: ApiError = { error: "invalid_input", hint: hintOf(parsed.error) };
    return NextResponse.json(body, { status: 400 });
  }
  const change: SpecChange = { ...parsed.data, note: parsed.data.note ?? "" };
  const adapter = getAdapter();
  const { engine, data } = await adapter.previewImpact(change);
  const body: ApiResponse<ImpactRow[]> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
