// IDENTITY.md key block as constants, for app/opengraph-image.tsx only.
// ImageResponse renders outside the browser and cannot read the CSS variables in
// app/globals.css, so the OG image needs literal values. Keep these in sync with globals.css.
export const BRAND = {
  ground: "#a8432f",
  surface: "#963a28",
  deep: "#84311f",
  line: "#c96a55",
  ink: "#fff4e6",
  kiln: "#1a1210",
  onKiln: "#fff4e6",
  ok: "#c8f0c0",
  warn: "#ffd98a",
  bad: "#ffd0c4",
} as const;
