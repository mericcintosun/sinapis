import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { guestSchema, hintOf } from "@/lib/schemas";
import type { ApiError, ApiResponse, GuestAnswer } from "@/lib/types";

// POST /api/guest: safe dishes and one-swap dishes for a guest's allergens.
// Body: { allergens: ["SES", "CEL"] } with EU allergen codes. Unknown specs are never safe.
export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  const parsed = guestSchema.safeParse(raw);
  if (!parsed.success) {
    const body: ApiError = { error: "invalid_input", hint: hintOf(parsed.error) };
    return NextResponse.json(body, { status: 400 });
  }
  const adapter = getAdapter();
  const { engine, data } = await adapter.guestCheck(parsed.data.allergens);
  const body: ApiResponse<GuestAnswer> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
