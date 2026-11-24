import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, Dish } from "@/lib/types";

export const dynamic = "force-static";

// GET /api/dishes: the menu as seeded.
export async function GET() {
  const adapter = getAdapter();
  const { engine, data } = await adapter.getKitchen();
  const body: ApiResponse<Dish[]> = { ok: true, data: data.dishes, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
