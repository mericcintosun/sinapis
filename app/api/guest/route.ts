import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { ALLERGEN_CODES } from "@/lib/data";
import type { AllergenCode, ApiResponse, GuestAnswer } from "@/lib/types";

// POST /api/guest: safe dishes and one-swap dishes for a guest's allergens.
// Body: { allergens: ["SES", "CEL"] }. Unknown codes are ignored; unknown specs are never safe.
export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  const list = (raw as { allergens?: unknown } | null)?.allergens;
  if (!Array.isArray(list)) {
    const body: ApiResponse<never> = {
      ok: false,
      error: { code: "bad_request", message: "Expected { allergens: string[] } with EU allergen codes." },
    };
    return NextResponse.json(body, { status: 400 });
  }
  const codes = list.filter((c): c is AllergenCode => ALLERGEN_CODES.includes(c as AllergenCode));
  const adapter = getAdapter();
  const { engine, data } = await adapter.guestCheck(codes);
  const body: ApiResponse<GuestAnswer> = { ok: true, data, engine, mode: adapter.mode };
  return NextResponse.json(body, { status: 200 });
}
