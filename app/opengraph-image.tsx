import { ImageResponse } from "next/og";

export const alt = "Sinapis: the allergen graph for a restaurant kitchen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// IDENTITY.md palette: terracotta ground, cream type, kiln-black accent.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#a8432f", padding: 72, color: "#fff4e6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 6, background: "#fff4e6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#1a1210", display: "flex" }} />
          </div>
          <div style={{ fontSize: 84, fontFamily: "serif" }}>Sinapis</div>
        </div>
        <div style={{ display: "flex", fontSize: 46, lineHeight: 1.25, maxWidth: 1000 }}>
          Every allergen on the menu, traced to the sauce and the supplier product it came from.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: "#ffd0c4", color: "#1a1210", padding: "10px 20px", borderRadius: 6, fontSize: 28 }}>contains</div>
          <div style={{ background: "#ffd98a", color: "#1a1210", padding: "10px 20px", borderRadius: 6, fontSize: 28 }}>may contain</div>
          <div style={{ background: "#1a1210", color: "#fff4e6", padding: "10px 20px", borderRadius: 6, fontSize: 28 }}>Built on Neo4j Relate</div>
        </div>
      </div>
    ),
    size,
  );
}
