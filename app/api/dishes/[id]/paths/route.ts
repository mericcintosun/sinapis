import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { dishIdSchema, hintOf } from "@/lib/schemas";
import type { AllergenPath, ApiError, ApiResponse } from "@/lib/types";

// GET /api/dishes/:id/paths: every path from one dish to an allergen or an unknown spec.
// A well-formed id that is not on the menu answers with an empty list.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = dishIdSchema.safeParse(id);
  if (!parsed.success) {
    const body: ApiError = { error: "invalid_input", hint: hintOf(parsed.error) };
    return NextResponse.json(body, { status: 400 });
  }
  const adapter = getAdapter();
  const { engine, data } = await adapter.getDishPaths(parsed.data);
  const body: ApiResponse<AllergenPath[]> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
