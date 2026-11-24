import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand-colors";

export const alt = "Sinapis: allergens traced to the supplier";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// IDENTITY.md palette: terracotta ground, cream type, kiln-black accent.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BRAND.ground, padding: 72, color: BRAND.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 6, background: BRAND.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: BRAND.kiln, display: "flex" }} />
          </div>
          <div style={{ fontSize: 84, fontFamily: "serif" }}>Sinapis</div>
        </div>
        <div style={{ display: "flex", fontSize: 46, lineHeight: 1.25, maxWidth: 1000 }}>
          Allergens traced to the supplier: every flag on the menu, through the sauce to the product it came from.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: BRAND.bad, color: BRAND.kiln, padding: "10px 20px", borderRadius: 6, fontSize: 28 }}>contains</div>
          <div style={{ background: BRAND.warn, color: BRAND.kiln, padding: "10px 20px", borderRadius: 6, fontSize: 28 }}>may contain</div>
          <div style={{ background: BRAND.kiln, color: BRAND.onKiln, padding: "10px 20px", borderRadius: 6, fontSize: 28 }}>Built on Neo4j Relate</div>
        </div>
      </div>
    ),
    size,
  );
}
