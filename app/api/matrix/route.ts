import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Matrix } from "@/lib/types";

export const dynamic = "force-static";

// GET /api/matrix: every dish against the 14 allergens, computed from the seed graph.
export async function GET() {
  const adapter = getAdapter();
  const { engine, data } = await adapter.getMatrix();
  const body: ApiResponse<Matrix> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
