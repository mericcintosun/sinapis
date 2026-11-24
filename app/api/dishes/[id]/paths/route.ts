import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { AllergenPath, ApiResponse } from "@/lib/types";

// GET /api/dishes/:id/paths: every path from one dish to an allergen or an unknown spec.
// An unknown id answers with an empty list; the error taxonomy arrives in Phase 2.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adapter = getAdapter();
  const { engine, data } = await adapter.getDishPaths(id);
  const body: ApiResponse<AllergenPath[]> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
